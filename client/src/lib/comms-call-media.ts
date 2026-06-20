/**
 * Comms call media — capture fallbacks, voice/video filters, sender tuning.
 */
import {
  AdaptiveBitrateController,
  applyBandwidthConstraints,
  applyCommsSenderTuning,
  applyPreferredCodecsToPeerConnection,
  AudioProcessor,
  detectNetworkType,
  getAudioConstraints,
  getCyrusCommsNetworkMode,
  getVideoConstraintsForCommsCall,
  isAudioProcessingEnabled,
  MEDIA_CONSTRAINTS,
  QUALITY_PRESETS,
  type CyrusCommsNetworkMode,
} from "./webrtc-config";
import {
  applyCommsMediaFilters,
  enhanceLocalVideoTrackHints,
  type CommsMediaFilterMode,
} from "./comms-media-filters";
import {
  enumerateMediaDevices,
  parseMediaError,
  getBrowserSpecificInstructions,
  type PermissionCheckResult,
} from "./media-permissions";
import { getMediaDevices } from "./secure-media-context";

export type CommsCallQualityLabel = "HD" | "SD" | "Low";

export function getInitialQualityPreset(
  callType: "audio" | "video",
  networkMode: CyrusCommsNetworkMode,
): keyof typeof QUALITY_PRESETS {
  if (networkMode === "low_bandwidth" || networkMode === "degraded" || networkMode === "emergency") {
    return callType === "video" ? "low" : "audioOnly";
  }
  if (networkMode === "audio_priority") {
    return callType === "video" ? "low" : "audioOnly";
  }
  if (callType === "audio") return "high";
  const link = detectNetworkType();
  if (link === "wifi" || link === "ethernet") return "high";
  return "medium";
}

export function presetToCallQualityLabel(preset: string): CommsCallQualityLabel {
  if (preset === "ultra" || preset === "high") return "HD";
  if (preset === "medium") return "SD";
  return "Low";
}

export function enhanceLocalVideoTracks(stream: MediaStream): void {
  enhanceLocalVideoTrackHints(stream);
}

export type CommsAcquiredMedia = {
  stream: MediaStream;
  audioProcessor: AudioProcessor | null;
  filterMode: CommsMediaFilterMode;
  disposeMediaPipeline: () => void;
  permissionResult?: PermissionCheckResult;
};

/**
 * Acquire user media with pre-flight permission checks and graceful fallbacks
 */
export async function acquireCommsUserMedia(
  callType: "audio" | "video",
  networkMode?: CyrusCommsNetworkMode,
): Promise<CommsAcquiredMedia> {
  const mode = networkMode ?? getCyrusCommsNetworkMode();
  const deviceType = callType === "video" ? "both" : "microphone";

  let mediaDevices: MediaDevices;
  try {
    mediaDevices = getMediaDevices();
  } catch (err) {
    const result = parseMediaError(err, deviceType);
    const error = new Error(result.error);
    (error as Error & { name?: string }).name = "SecurityError";
    (error as Error & { permissionResult?: PermissionCheckResult }).permissionResult = result;
    throw error;
  }
  
  // Step 1: Optional device hint (do not block — Safari/Firefox often hide devices until after permission)
  try {
    const deviceInfo = await enumerateMediaDevices();
    console.log(
      "[CommsMedia] Pre-permission device hint — Cameras:",
      deviceInfo.cameraCount,
      "Microphones:",
      deviceInfo.microphoneCount,
    );
  } catch {
    /* ignore */
  }

  // Step 2: Build constraint attempts with fallbacks
  const primaryVideo = getVideoConstraintsForCommsCall(callType, mode);
  const audioConstraints = getAudioConstraints();

  const attempts: MediaStreamConstraints[] = [];
  
  if (callType === "video") {
    // Try high quality first, then fall back to lower qualities
    attempts.push(
      { video: primaryVideo, audio: audioConstraints },
      { video: MEDIA_CONSTRAINTS.video.sd, audio: audioConstraints },
      { video: MEDIA_CONSTRAINTS.video.mobile, audio: audioConstraints },
      { video: true, audio: audioConstraints }, // Minimal fallback
    );
  } else {
    // Audio-only call
    attempts.push({ video: false, audio: audioConstraints });
  }

  let lastError: unknown;
  let permissionResult: PermissionCheckResult | undefined;
  
  // Step 3: Try each constraint set with detailed error handling
  for (let i = 0; i < attempts.length; i++) {
    const constraints = attempts[i];
    const isLastAttempt = i === attempts.length - 1;
    
    try {
      console.log(`[CommsMedia] Attempt ${i + 1}/${attempts.length} with constraints:`, JSON.stringify(constraints));
      
      let stream = await mediaDevices.getUserMedia(constraints);
      
      console.log(`[CommsMedia] Successfully acquired stream - Audio: ${stream.getAudioTracks().length} tracks, Video: ${stream.getVideoTracks().length} tracks`);
      
      // Step 4: Apply media filters and processing
      const filtered = await applyCommsMediaFilters(stream, callType);
      stream = filtered.stream;

      let audioProcessor: AudioProcessor | null = null;
      if (stream.getAudioTracks().length > 0 && isAudioProcessingEnabled()) {
        console.log("[CommsMedia] Applying audio processing...");
        audioProcessor = new AudioProcessor();
        stream = await audioProcessor.processStream(stream);
      }

      const disposeMediaPipeline = () => {
        filtered.disposeVideoEnhancer?.();
        audioProcessor?.destroy();
      };

      return {
        stream,
        audioProcessor,
        filterMode: filtered.mode,
        disposeMediaPipeline,
        permissionResult,
      };
    } catch (err) {
      lastError = err;
      permissionResult = parseMediaError(err, deviceType);
      
      console.warn(`[CommsMedia] Attempt ${i + 1} failed:`, permissionResult.error);
      
      // If it's a permission or hardware error, don't try lower quality
      if (permissionResult.errorType === "permission" || 
          permissionResult.errorType === "hardware" ||
          permissionResult.errorType === "security") {
        console.error("[CommsMedia] Fatal error, stopping fallback attempts:", permissionResult.errorType);
        break;
      }
      
      // Otherwise continue to next fallback
      if (!isLastAttempt) {
        console.log("[CommsMedia] Trying lower quality fallback...");
      }
    }
  }
  
  // Step 5: All attempts failed, throw with detailed error
  console.error("[CommsMedia] All acquisition attempts failed. Last error:", lastError);
  
  if (permissionResult) {
    const error = new Error(permissionResult.error);
    (error as any).name = permissionResult.errorType === "permission" ? "NotAllowedError" : "NotFoundError";
    (error as any).permissionResult = permissionResult;
    (error as any).suggestedAction = permissionResult.suggestedAction;
    (error as any).browserInstructions = getBrowserSpecificInstructions(deviceType);
    throw error;
  }
  
  throw lastError instanceof Error ? lastError : new Error("Could not access media devices");
}

export async function tuneCommsPeerConnection(
  pc: RTCPeerConnection,
  callType: "audio" | "video",
  onPresetChange?: (preset: string) => void,
): Promise<AdaptiveBitrateController> {
  applyPreferredCodecsToPeerConnection(pc);
  await applyCommsSenderTuning(pc, callType);
  const networkMode = getCyrusCommsNetworkMode();
  const initial = getInitialQualityPreset(callType, networkMode);
  await applyBandwidthConstraints(pc, initial, networkMode);
  return new AdaptiveBitrateController(pc, (preset) => {
    onPresetChange?.(preset);
  });
}
