import { systemFetch } from "@shared/cyrus-api-client";
import {
  adviseLiveBroadcast,
  pshareLiveFileExtension,
  pshareLiveRecorderMime,
  type PshareBroadcastSource,
} from "@shared/comms/pshare-engine";
import { uploadCommsFileSmart } from "./comms-chunk-upload";
import { acquireCommsUserMedia } from "./comms-call-media";
import { parseMediaError } from "./media-permissions";
import { getCommsDeviceId } from "./comms-device-id";

export type PshareLiveSession = {
  postId: string;
  streamId: string;
  source: PshareBroadcastSource;
};

type LiveCallbacks = {
  onPreview?: (stream: MediaStream) => void;
  onError?: (message: string) => void;
  onSegmentUploaded?: (fileUrl: string) => void;
};

function pshareHeaders(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
    "X-User-Id": userId,
  };
}

function detectNetworkType(): string | undefined {
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType;
}

/** Request camera (+ mic) with comms fallbacks (HTTPS check, constraint downgrade). */
export async function requestPshareCameraAccess(
  _facingMode: "user" | "environment" = "environment",
): Promise<MediaStream> {
  try {
    const { stream } = await acquireCommsUserMedia("video");
    if (!stream.getVideoTracks().length) {
      throw new Error("No camera track available");
    }
    return stream;
  } catch (err) {
    const parsed = parseMediaError(err, "both");
    throw new Error(parsed.error);
  }
}

export class PshareMobileLiveBroadcaster {
  private previewStream: MediaStream | null = null;
  private recordStream: MediaStream | null = null;
  private samplerVideo: HTMLVideoElement | null = null;
  private samplerCanvas: HTMLCanvasElement | null = null;
  private samplerCtx: CanvasRenderingContext2D | null = null;
  private samplerRaf: number | null = null;
  private recorder: MediaRecorder | null = null;
  private session: PshareLiveSession | null = null;
  private segmentQueue: Blob[] = [];
  private draining = false;
  private stopped = false;
  private recordedMime = "video/webm";
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  getSession(): PshareLiveSession | null {
    return this.session;
  }

  getPreviewStream(): MediaStream | null {
    return this.previewStream;
  }

  async preparePreview(facingMode: "user" | "environment" = "environment"): Promise<MediaStream> {
    this.stopTracks();
    this.previewStream = await requestPshareCameraAccess(facingMode);
    return this.previewStream;
  }

  private stopSampler() {
    if (this.samplerRaf != null) cancelAnimationFrame(this.samplerRaf);
    this.samplerRaf = null;
    this.samplerVideo?.pause();
    if (this.samplerVideo) this.samplerVideo.srcObject = null;
    this.samplerVideo = null;
    this.samplerCanvas = null;
    this.samplerCtx = null;
    this.recordStream?.getTracks().forEach((t) => t.stop());
    this.recordStream = null;
  }

  private drawCoverToCanvas(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sw: number,
    sh: number,
    w: number,
    h: number,
  ) {
    const scale = Math.max(w / sw, h / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
  }

  private startSamplerLoop() {
    const tick = () => {
      const video = this.samplerVideo;
      const canvas = this.samplerCanvas;
      const ctx = this.samplerCtx;
      if (!video || !canvas || !ctx) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        this.drawCoverToCanvas(ctx, video, video.videoWidth, video.videoHeight, canvas.width, canvas.height);
      }
      this.samplerRaf = requestAnimationFrame(tick);
    };
    this.samplerRaf = requestAnimationFrame(tick);
  }

  /** Record from canvas so MediaRecorder does not freeze the camera preview track. */
  private async setupRecordingPipeline(): Promise<void> {
    if (!this.previewStream) throw new Error("Camera not ready");

    this.stopSampler();

    const profile = adviseLiveBroadcast({
      source: "mobile_camera",
      networkType: detectNetworkType(),
      hasAudio: this.previewStream.getAudioTracks().length > 0,
    }).profile;

    this.samplerVideo = document.createElement("video");
    this.samplerVideo.srcObject = this.previewStream;
    this.samplerVideo.muted = true;
    this.samplerVideo.playsInline = true;
    this.samplerVideo.setAttribute("playsinline", "true");
    await new Promise<void>((resolve, reject) => {
      this.samplerVideo!.onloadedmetadata = () => resolve();
      this.samplerVideo!.onerror = () => reject(new Error("Camera preview failed"));
    });
    await this.samplerVideo.play().catch(() => undefined);
    await new Promise<void>((resolve) => {
      const video = this.samplerVideo!;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        resolve();
        return;
      }
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      window.setTimeout(resolve, 1000);
    });

    this.samplerCanvas = document.createElement("canvas");
    this.samplerCanvas.width = profile.maxWidth;
    this.samplerCanvas.height = profile.maxHeight;
    this.samplerCtx = this.samplerCanvas.getContext("2d");
    if (!this.samplerCtx) throw new Error("Canvas unavailable");

    this.startSamplerLoop();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    this.recordStream = this.samplerCanvas.captureStream(24);
    for (const track of this.previewStream.getAudioTracks()) {
      this.recordStream.addTrack(track);
    }
  }

  private createRecorder(): MediaRecorder {
    if (!this.recordStream) throw new Error("Recording pipeline not ready");
    const preferredMime = pshareLiveRecorderMime();
    const bitrate = adviseLiveBroadcast({ source: "mobile_camera" }).profile.targetBitrateKbps * 1000;
    try {
      if (preferredMime && MediaRecorder.isTypeSupported(preferredMime)) {
        const recorder = new MediaRecorder(this.recordStream, {
          mimeType: preferredMime,
          videoBitsPerSecond: bitrate,
        });
        this.recordedMime = recorder.mimeType || preferredMime;
        return recorder;
      }
    } catch {
      // fall through
    }
    const recorder = new MediaRecorder(this.recordStream);
    this.recordedMime = recorder.mimeType || preferredMime || "video/webm";
    return recorder;
  }

  async goLive(caption: string, callbacks: LiveCallbacks = {}): Promise<PshareLiveSession> {
    if (!this.previewStream) {
      this.previewStream = await this.preparePreview();
    }
    callbacks.onPreview?.(this.previewStream);

    await this.setupRecordingPipeline();

    const res = await systemFetch("/api/comms/pshare/live/start", {
      method: "POST",
      headers: pshareHeaders(this.userId),
      body: JSON.stringify({
        caption,
        source: "mobile_camera",
        streamName: caption || "Mobile live",
      }),
    });
    if (!res.ok) {
      this.stopSampler();
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Failed to go live");
    }
    const data = await res.json();
    this.session = {
      postId: data.post.id,
      streamId: data.streamId,
      source: "mobile_camera",
    };
    this.stopped = false;
    this.startSegmentLoop(callbacks);
    return this.session;
  }

  private startSegmentLoop(callbacks: LiveCallbacks) {
    if (!this.recordStream || !this.session) return;
    const intervalMs = adviseLiveBroadcast({ source: "mobile_camera" }).profile.chunkIntervalMs;
    let firstSegment = true;

    const recordSegment = () => {
      if (this.stopped || !this.recordStream || !this.session) return;
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = this.createRecorder();
      } catch {
        callbacks.onError?.("Recording not supported on this device");
        return;
      }
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (chunks.length && this.session) {
          const mime = this.recordedMime || chunks[0]?.type || "video/webm";
          this.enqueueSegment(new Blob(chunks, { type: mime }), callbacks);
        }
        if (!this.stopped) {
          window.setTimeout(recordSegment, firstSegment ? 200 : 150);
        }
        firstSegment = false;
      };
      try {
        recorder.start(250);
      } catch {
        recorder.start();
      }
      this.recorder = recorder;
      const segmentMs = firstSegment ? 1500 : intervalMs;
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, segmentMs);
    };

    recordSegment();
  }

  private enqueueSegment(blob: Blob, callbacks: LiveCallbacks) {
    if (blob.size < 256) return;
    this.segmentQueue.push(blob);
    void this.drainSegmentQueue(callbacks);
  }

  private async drainSegmentQueue(callbacks: LiveCallbacks) {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.segmentQueue.length > 0 && this.session) {
        const blob = this.segmentQueue.shift()!;
        await this.uploadSegment(blob, callbacks);
      }
    } finally {
      this.draining = false;
      if (this.segmentQueue.length > 0) void this.drainSegmentQueue(callbacks);
    }
  }

  private async uploadSegment(blob: Blob, callbacks: LiveCallbacks) {
    if (!this.session) return;
    try {
      const mime = blob.type || this.recordedMime || "video/webm";
      const ext = pshareLiveFileExtension(mime);
      const uploaded = await uploadCommsFileSmart(blob, {
        userId: this.userId,
        fileName: `pshare-live-${Date.now()}.${ext}`,
      });
      const res = await systemFetch(`/api/comms/pshare/live/${this.session.postId}/chunk`, {
        method: "POST",
        headers: pshareHeaders(this.userId),
        body: JSON.stringify({
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName,
          fileMimeType: uploaded.mimeType || mime,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        callbacks.onSegmentUploaded?.(data.post?.fileUrl || uploaded.fileUrl);
      }
    } catch (e) {
      callbacks.onError?.(e instanceof Error ? e.message : "Live segment upload failed");
    }
  }

  async stopLive(finalBlob?: Blob | null): Promise<void> {
    this.stopped = true;
    if (this.recorder && this.recorder.state === "recording") {
      this.recorder.stop();
    }
    if (!this.session) {
      this.stopTracks();
      return;
    }

    const session = this.session;
    this.session = null;

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileMimeType: string | null = null;

    if (finalBlob && finalBlob.size > 0) {
      const mime = finalBlob.type || this.recordedMime || "video/webm";
      const ext = pshareLiveFileExtension(mime);
      const uploaded = await uploadCommsFileSmart(finalBlob, {
        userId: this.userId,
        fileName: `pshare-live-final-${Date.now()}.${ext}`,
      });
      fileUrl = uploaded.fileUrl;
      fileName = uploaded.fileName;
      fileMimeType = uploaded.mimeType || mime;
    }

    await systemFetch(`/api/comms/pshare/live/${session.postId}/stop`, {
      method: "POST",
      headers: pshareHeaders(this.userId),
      body: JSON.stringify({ fileUrl, fileName, fileMimeType }),
    });

    this.stopTracks();
  }

  stopTracks() {
    this.stopSampler();
    this.previewStream?.getTracks().forEach((t) => t.stop());
    this.previewStream = null;
  }
}

export async function startPshareDroneLive(
  userId: string,
  input: { caption?: string; droneUrl: string; streamName?: string },
): Promise<{ post: { id: string }; streamId: string }> {
  const res = await systemFetch("/api/comms/pshare/live/start", {
    method: "POST",
    headers: pshareHeaders(userId),
    body: JSON.stringify({
      caption: input.caption || "",
      source: "drone",
      droneUrl: input.droneUrl.trim(),
      streamName: input.streamName || "Drone live",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to start drone broadcast");
  }
  return res.json();
}

export async function stopPshareLivePost(userId: string, postId: string): Promise<void> {
  const res = await systemFetch(`/api/comms/pshare/live/${postId}/stop`, {
    method: "POST",
    headers: pshareHeaders(userId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to stop broadcast");
  }
}
