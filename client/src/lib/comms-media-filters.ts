/**
 * Voice + video clean filters for comms and broadcasts.
 * Default "clean" mode uses browser AEC/NS/AGC + light video enhancement (no WebAudio loop).
 * "Studio" adds WebAudio post-processing (may reduce echo cancellation — opt-in).
 */
import { getAudioConstraints } from "./webrtc-config";

export type CommsMediaFilterMode = "clean" | "studio" | "off";

const STORAGE_KEY = "cyrus-media-filters";

export function getCommsMediaFilterMode(): CommsMediaFilterMode {
  if (import.meta.env.VITE_RTC_MEDIA_FILTERS === "false") return "off";
  if (typeof window === "undefined") return "clean";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "off" || raw === "studio" || raw === "clean") return raw;
  } catch {
    /* ignore */
  }
  return "clean";
}

export function setCommsMediaFilterMode(mode: CommsMediaFilterMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent("cyrus-media-filters-changed", { detail: mode }));
  } catch {
    /* ignore */
  }
}

export function cycleCommsMediaFilterMode(): CommsMediaFilterMode {
  const order: CommsMediaFilterMode[] = ["clean", "studio", "off"];
  const idx = order.indexOf(getCommsMediaFilterMode());
  const next = order[(idx + 1) % order.length]!;
  setCommsMediaFilterMode(next);
  return next;
}

export function isCleanAvFiltersEnabled(): boolean {
  return getCommsMediaFilterMode() !== "off";
}

export function isStudioWebAudioEnabled(): boolean {
  if (import.meta.env.VITE_RTC_AUDIO_PROCESSING === "true") return true;
  if (getCommsMediaFilterMode() === "studio") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("cyrus-audio-processing") === "1";
  } catch {
    return false;
  }
}

export function getCommsMediaFilterLabel(mode?: CommsMediaFilterMode): string {
  const m = mode ?? getCommsMediaFilterMode();
  if (m === "clean") return "Clean AV";
  if (m === "studio") return "Studio AV";
  return "Filters off";
}

export async function applyCleanAudioTrackSettings(track: MediaStreamTrack): Promise<void> {
  if (track.kind !== "audio") return;
  const constraints = getAudioConstraints();
  try {
    await track.applyConstraints(constraints);
  } catch {
    try {
      await track.applyConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    } catch {
      /* device may not support re-apply */
    }
  }
  try {
    track.contentHint = "speech";
  } catch {
    /* unsupported */
  }
}

export async function applyCleanAudioToStream(stream: MediaStream): Promise<void> {
  await Promise.all(stream.getAudioTracks().map((t) => applyCleanAudioTrackSettings(t)));
}

export function enhanceLocalVideoTrackHints(stream: MediaStream): void {
  for (const track of stream.getVideoTracks()) {
    try {
      track.contentHint = "detail";
    } catch {
      try {
        track.contentHint = "motion";
      } catch {
        /* unsupported */
      }
    }
  }
}

class CommsVideoEnhancer {
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private rafId = 0;
  private outputTrack: MediaStreamTrack | null = null;
  private stopped = false;

  static async enhance(sourceStream: MediaStream): Promise<{ stream: MediaStream; stop: () => void }> {
    const enhancer = new CommsVideoEnhancer();
    return enhancer.start(sourceStream);
  }

  private async start(sourceStream: MediaStream): Promise<{ stream: MediaStream; stop: () => void }> {
    const sourceVideoTrack = sourceStream.getVideoTracks()[0];
    if (!sourceVideoTrack) {
      return { stream: sourceStream, stop: () => {} };
    }

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.srcObject = new MediaStream([sourceVideoTrack]);
    this.videoEl = video;

    try {
      await video.play();
    } catch {
      /* autoplay policy — frames may still arrive once attached */
    }

    const settings = sourceVideoTrack.getSettings();
    const canvas = document.createElement("canvas");
    canvas.width = settings.width && settings.width > 0 ? settings.width : 640;
    canvas.height = settings.height && settings.height > 0 ? settings.height : 480;
    this.canvas = canvas;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      return { stream: sourceStream, stop: () => {} };
    }

    const targetFps = Math.min(30, settings.frameRate && settings.frameRate > 0 ? settings.frameRate : 30);
    const outputStream = canvas.captureStream(targetFps);
    this.outputTrack = outputStream.getVideoTracks()[0] ?? null;

    const filtered = new MediaStream();
    for (const t of outputStream.getVideoTracks()) filtered.addTrack(t);
    for (const t of sourceStream.getAudioTracks()) filtered.addTrack(t);

    const draw = () => {
      if (this.stopped || !this.videoEl || !this.canvas) return;
      const v = this.videoEl;
      if (v.videoWidth > 0 && (this.canvas.width !== v.videoWidth || this.canvas.height !== v.videoHeight)) {
        this.canvas.width = v.videoWidth;
        this.canvas.height = v.videoHeight;
      }
      if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.filter = "brightness(1.06) contrast(1.1) saturate(1.04)";
        ctx.drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
      }
      this.rafId = requestAnimationFrame(draw);
    };
    this.rafId = requestAnimationFrame(draw);

    return { stream: filtered, stop: () => this.stop() };
  }

  private stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.rafId);
    this.outputTrack?.stop();
    this.outputTrack = null;
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
    }
    this.videoEl = null;
    this.canvas = null;
  }
}

export type CommsMediaFilterResult = {
  stream: MediaStream;
  mode: CommsMediaFilterMode;
  /** Stops canvas video pipeline (does not stop mic/camera source tracks). */
  disposeVideoEnhancer: (() => void) | null;
};

/** Apply clean audio constraints and optional canvas video enhancement. */
export async function applyCommsMediaFilters(
  stream: MediaStream,
  callType: "audio" | "video",
): Promise<CommsMediaFilterResult> {
  const mode = getCommsMediaFilterMode();
  if (mode === "off") {
    return { stream, mode, disposeVideoEnhancer: null };
  }

  if (stream.getAudioTracks().length > 0) {
    await applyCleanAudioToStream(stream);
  }

  if (callType !== "video" || stream.getVideoTracks().length === 0) {
    return { stream, mode, disposeVideoEnhancer: null };
  }

  enhanceLocalVideoTrackHints(stream);
  // Raw camera for WebRTC — canvas captureStream can stall and send black frames.
  return { stream, mode, disposeVideoEnhancer: null };
}
