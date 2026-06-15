/**
 * Media Permissions Manager - Production-grade permission handling
 * 
 * Features:
 * - Pre-flight device detection
 * - Permission state checking
 * - User-friendly error messages
 * - Graceful fallbacks
 * - Permission recovery workflows
 */

export type MediaDeviceType = "camera" | "microphone" | "both";

export interface PermissionCheckResult {
  granted: boolean;
  available: boolean;
  error?: string;
  errorType?: "permission" | "hardware" | "busy" | "constraint" | "security" | "unknown";
  suggestedAction?: string;
  canRetry: boolean;
}

export interface DeviceInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraCount: number;
  microphoneCount: number;
  devices: MediaDeviceInfo[];
}

/**
 * Check if media permissions API is supported
 */
export function isPermissionsAPISupported(): boolean {
  return Boolean(
    navigator.permissions &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

/**
 * Enumerate available media devices (pre-permission check)
 */
export async function enumerateMediaDevices(): Promise<DeviceInfo> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const cameras = devices.filter(d => d.kind === "videoinput");
    const microphones = devices.filter(d => d.kind === "audioinput");
    
    return {
      hasCamera: cameras.length > 0,
      hasMicrophone: microphones.length > 0,
      cameraCount: cameras.length,
      microphoneCount: microphones.length,
      devices,
    };
  } catch (error) {
    console.error("[MediaPermissions] Failed to enumerate devices:", error);
    return {
      hasCamera: false,
      hasMicrophone: false,
      cameraCount: 0,
      microphoneCount: 0,
      devices: [],
    };
  }
}

/**
 * Check permission state for camera/microphone
 */
export async function checkPermissionState(deviceType: MediaDeviceType): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions) return "unsupported";
  
  try {
    // Try to check camera permission
    if (deviceType === "camera" || deviceType === "both") {
      try {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        return result.state;
      } catch {
        // Camera permission check not supported in this browser
      }
    }
    
    // Try to check microphone permission
    if (deviceType === "microphone" || deviceType === "both") {
      try {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        return result.state;
      } catch {
        // Microphone permission check not supported in this browser
      }
    }
  } catch (error) {
    console.warn("[MediaPermissions] Permission query failed:", error);
  }
  
  return "unsupported";
}

/**
 * Parse getUserMedia error and provide user-friendly message
 */
export function parseMediaError(error: unknown, deviceType: MediaDeviceType): PermissionCheckResult {
  const err = error as Error & { name?: string; constraint?: string };
  const isVideo = deviceType === "camera" || deviceType === "both";
  const isAudio = deviceType === "microphone" || deviceType === "both";
  
  const deviceLabel = deviceType === "both" 
    ? "camera and microphone"
    : deviceType === "camera" ? "camera" : "microphone";
  
  // Permission denied
  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    return {
      granted: false,
      available: true,
      error: `${deviceLabel.charAt(0).toUpperCase() + deviceLabel.slice(1)} permission denied`,
      errorType: "permission",
      suggestedAction: `Please allow ${deviceLabel} access in your browser settings and reload the page`,
      canRetry: true,
    };
  }
  
  // Device not found
  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    return {
      granted: true,
      available: false,
      error: `No ${deviceLabel} found`,
      errorType: "hardware",
      suggestedAction: `Please connect a ${deviceLabel} and try again`,
      canRetry: true,
    };
  }
  
  // Device busy/in use
  if (err.name === "NotReadableError" || err.name === "TrackStartError") {
    return {
      granted: true,
      available: true,
      error: `${deviceLabel.charAt(0).toUpperCase() + deviceLabel.slice(1)} is already in use`,
      errorType: "busy",
      suggestedAction: `Close other applications using your ${deviceLabel} and try again`,
      canRetry: true,
    };
  }
  
  // Constraints not met
  if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
    const constraint = err.constraint || "quality requirements";
    return {
      granted: true,
      available: true,
      error: `${deviceLabel.charAt(0).toUpperCase() + deviceLabel.slice(1)} doesn't meet ${constraint}`,
      errorType: "constraint",
      suggestedAction: "Try using a different device or lower quality settings",
      canRetry: true,
    };
  }
  
  // Security error (HTTPS required, etc.)
  if (err.name === "SecurityError") {
    return {
      granted: false,
      available: true,
      error: "Media access blocked due to security policy",
      errorType: "security",
      suggestedAction: "Ensure the page is loaded over HTTPS and try again",
      canRetry: false,
    };
  }
  
  // Abort error (user cancelled)
  if (err.name === "AbortError") {
    return {
      granted: false,
      available: true,
      error: "Media access request was cancelled",
      errorType: "permission",
      suggestedAction: "Please try again and allow access when prompted",
      canRetry: true,
    };
  }
  
  // Unknown error
  const message = err instanceof Error ? err.message : String(error);
  return {
    granted: false,
    available: false,
    error: `Media access failed: ${message}`,
    errorType: "unknown",
    suggestedAction: "Please check your device settings and try again",
    canRetry: true,
  };
}

/**
 * Request media permissions with pre-flight checks
 */
export async function requestMediaPermissions(
  deviceType: MediaDeviceType,
  constraints?: MediaStreamConstraints
): Promise<{
  success: boolean;
  stream?: MediaStream;
  result: PermissionCheckResult;
  deviceInfo?: DeviceInfo;
}> {
  // Step 1: Check if API is supported
  if (!isPermissionsAPISupported()) {
    return {
      success: false,
      result: {
        granted: false,
        available: false,
        error: "Media permissions API not supported in this browser",
        errorType: "security",
        suggestedAction: "Please use a modern browser like Chrome, Firefox, or Edge",
        canRetry: false,
      },
    };
  }
  
  // Step 2: Enumerate devices
  const deviceInfo = await enumerateMediaDevices();
  
  // Step 3: Check if required devices are available
  if (deviceType === "camera" && !deviceInfo.hasCamera) {
    return {
      success: false,
      deviceInfo,
      result: {
        granted: true,
        available: false,
        error: "No camera found",
        errorType: "hardware",
        suggestedAction: "Please connect a camera and try again",
        canRetry: true,
      },
    };
  }
  
  if (deviceType === "microphone" && !deviceInfo.hasMicrophone) {
    return {
      success: false,
      deviceInfo,
      result: {
        granted: true,
        available: false,
        error: "No microphone found",
        errorType: "hardware",
        suggestedAction: "Please connect a microphone and try again",
        canRetry: true,
      },
    };
  }
  
  if (deviceType === "both" && (!deviceInfo.hasCamera || !deviceInfo.hasMicrophone)) {
    const missing = !deviceInfo.hasCamera && !deviceInfo.hasMicrophone
      ? "camera and microphone"
      : !deviceInfo.hasCamera ? "camera" : "microphone";
    
    return {
      success: false,
      deviceInfo,
      result: {
        granted: true,
        available: false,
        error: `No ${missing} found`,
        errorType: "hardware",
        suggestedAction: `Please connect a ${missing} and try again`,
        canRetry: true,
      },
    };
  }
  
  // Step 4: Build constraints
  const videoConstraints = deviceType === "camera" || deviceType === "both";
  const audioConstraints = deviceType === "microphone" || deviceType === "both";
  
  const finalConstraints: MediaStreamConstraints = constraints || {
    video: videoConstraints ? { facingMode: "user" } : false,
    audio: audioConstraints ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } : false,
  };
  
  // Step 5: Request permissions
  try {
    console.log("[MediaPermissions] Requesting access:", finalConstraints);
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    
    console.log("[MediaPermissions] Access granted - Audio tracks:", stream.getAudioTracks().length, "Video tracks:", stream.getVideoTracks().length);
    
    return {
      success: true,
      stream,
      deviceInfo,
      result: {
        granted: true,
        available: true,
        canRetry: false,
      },
    };
  } catch (error) {
    console.error("[MediaPermissions] Access failed:", error);
    const result = parseMediaError(error, deviceType);
    
    return {
      success: false,
      deviceInfo,
      result,
    };
  }
}

/**
 * Test camera/microphone without showing a permission prompt
 * (Only works if permission was previously granted)
 */
export async function testMediaAccess(deviceType: MediaDeviceType): Promise<boolean> {
  const permissionState = await checkPermissionState(deviceType);
  
  // If permission was explicitly denied, don't try
  if (permissionState === "denied") {
    return false;
  }
  
  // If permission was granted, test access
  if (permissionState === "granted") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceType === "camera" || deviceType === "both",
        audio: deviceType === "microphone" || deviceType === "both",
      });
      
      // Stop tracks immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }
  
  // Unknown state - permission needs to be requested
  return false;
}

/**
 * Show browser-specific instructions for enabling permissions
 */
export function getBrowserSpecificInstructions(deviceType: MediaDeviceType): string {
  const deviceLabel = deviceType === "both" 
    ? "camera and microphone"
    : deviceType === "camera" ? "camera" : "microphone";
  
  const ua = navigator.userAgent;
  
  // Chrome
  if (ua.includes("Chrome") && !ua.includes("Edge")) {
    return `Chrome: Click the lock icon in the address bar → Site settings → Allow ${deviceLabel}`;
  }
  
  // Firefox
  if (ua.includes("Firefox")) {
    return `Firefox: Click the lock icon in the address bar → Permissions → Allow ${deviceLabel}`;
  }
  
  // Safari
  if (ua.includes("Safari") && !ua.includes("Chrome")) {
    return `Safari: Safari menu → Settings for This Website → ${deviceLabel} → Allow`;
  }
  
  // Edge
  if (ua.includes("Edge")) {
    return `Edge: Click the lock icon in the address bar → Permissions for this site → Allow ${deviceLabel}`;
  }
  
  // Fallback
  return `Please check your browser settings to allow ${deviceLabel} access`;
}
