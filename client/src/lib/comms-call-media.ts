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

export type CommsCallQualityLabel = "HD" | "SD" | "Low";

export function getInitialQualityPreset(
  callType: "audio" | "video",
  networkMode: CyrusCommsNetworkMode,
): keyof typeof QUALITY_PRESETS {
  if (networkMode === "low_bandwidth" || networkMode === "degraded" || networkMode === "emergency") {
    return callType === "video" ? "low" : "audioOnly";
  }
  if (networkMode === "audio_priority") return "audioOnly";
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
};

export async function acquireCommsUserMedia(
  callType: "audio" | "video",
  networkMode?: CyrusCommsNetworkMode,
): Promise<CommsAcquiredMedia> {
  const mode = networkMode ?? getCyrusCommsNetworkMode();
  const primaryVideo = getVideoConstraintsForCommsCall(callType, mode);
  const audioConstraints = getAudioConstraints();

  const attempts: MediaStreamConstraints[] = [
    { video: primaryVideo, audio: audioConstraints },
  ];
  if (callType === "video") {
    attempts.push(
      { video: MEDIA_CONSTRAINTS.video.sd, audio: audioConstraints },
      { video: MEDIA_CONSTRAINTS.video.mobile, audio: audioConstraints },
    );
  } else {
    attempts.push({ video: false, audio: audioConstraints });
  }

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      let stream = await navigator.mediaDevices.getUserMedia(constraints);
      const filtered = await applyCommsMediaFilters(stream, callType);
      stream = filtered.stream;

      let audioProcessor: AudioProcessor | null = null;
      if (stream.getAudioTracks().length > 0 && isAudioProcessingEnabled()) {
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
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not access microphone");
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
