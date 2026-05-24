/**
 * Client-side call / session recorder — mixes local + remote media, uploads to server.
 */
import { systemFetch } from "@shared/cyrus-api-client";
import type { CommsRecordingUploadResult } from "@shared/comms/recording-types";

export type SessionRecorderOptions = {
  roomId: string;
  callType: "audio" | "video";
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  /** Include screen share track when active */
  screenShareStream?: MediaStream | null;
  recordedBy?: string;
  displayName?: string;
};

export type SessionRecorderState = "idle" | "recording" | "uploading" | "saved" | "error";

function pickRecorderMime(callType: "audio" | "video"): string {
  if (callType === "video") {
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
    if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  }
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  return "audio/webm";
}

function uniqueStreams(streams: (MediaStream | null | undefined)[]): MediaStream[] {
  const out: MediaStream[] = [];
  const seen = new Set<string>();
  for (const s of streams) {
    if (!s) continue;
    const key = s.id || s.getTracks().map((t) => t.id).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function mixAudioStreams(streams: MediaStream[]): { stream: MediaStream; dispose: () => void } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const sources: MediaStreamAudioSourceNode[] = [];
  for (const s of streams) {
    if (s.getAudioTracks().length === 0) continue;
    const node = ctx.createMediaStreamSource(s);
    node.connect(dest);
    sources.push(node);
  }
  return {
    stream: dest.stream,
    dispose: () => {
      for (const n of sources) n.disconnect();
      void ctx.close().catch(() => {});
    },
  };
}

function buildCompositeVideoStream(
  localStream: MediaStream | null,
  remoteStreams: MediaStream[],
  screenShareStream: MediaStream | null | undefined,
  fps = 24,
): { stream: MediaStream; dispose: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    const empty = new MediaStream();
    return { stream: empty, dispose: () => {} };
  }

  const videos: HTMLVideoElement[] = [];
  const attach = (stream: MediaStream) => {
    const el = document.createElement("video");
    el.playsInline = true;
    el.muted = true;
    el.autoplay = true;
    el.srcObject = stream;
    void el.play().catch(() => {});
    videos.push(el);
    return el;
  };

  const screenEl = screenShareStream?.getVideoTracks().length ? attach(screenShareStream) : null;
  const remoteEls = remoteStreams
    .filter((s) => s.getVideoTracks().length > 0)
    .map((s) => attach(s));
  const localEl = localStream?.getVideoTracks().length ? attach(localStream) : null;

  let rafId = 0;
  let stopped = false;

  const draw = () => {
    if (stopped) return;
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const main = screenEl || remoteEls[0] || localEl;
    if (main && main.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(main, 0, 0, canvas.width, canvas.height);
    }

    const pip = main === screenEl ? localEl || remoteEls[0] : localEl;
    if (pip && pip !== main && pip.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const pipW = canvas.width * 0.22;
      const pipH = canvas.height * 0.22;
      const x = canvas.width - pipW - 20;
      const y = canvas.height - pipH - 20;
      ctx.drawImage(pip, x, y, pipW, pipH);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, pipW, pipH);
    }

    rafId = requestAnimationFrame(draw);
  };
  rafId = requestAnimationFrame(draw);

  const out = canvas.captureStream(fps);
  return {
    stream: out,
    dispose: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      for (const v of videos) {
        v.pause();
        v.srcObject = null;
      }
      out.getTracks().forEach((t) => t.stop());
    },
  };
}

function buildRecordingStream(options: SessionRecorderOptions): {
  stream: MediaStream;
  dispose: () => void;
} {
  const sources = uniqueStreams([
    options.localStream,
    ...options.remoteStreams,
    options.screenShareStream,
  ]);

  const audioMixer = mixAudioStreams(sources);
  const disposers: Array<() => void> = [audioMixer.dispose];

  const out = new MediaStream();
  for (const t of audioMixer.stream.getAudioTracks()) out.addTrack(t);

  const hasVideo =
    options.callType === "video" &&
    sources.some((s) => s.getVideoTracks().some((t) => t.readyState === "live"));

  if (hasVideo) {
    const composite = buildCompositeVideoStream(
      options.localStream,
      options.remoteStreams,
      options.screenShareStream,
    );
    disposers.push(composite.dispose);
    for (const t of composite.stream.getVideoTracks()) out.addTrack(t);
  }

  return {
    stream: out,
    dispose: () => disposers.forEach((d) => d()),
  };
}

export async function uploadSessionRecording(
  roomId: string,
  blob: Blob,
  meta: {
    callType: "audio" | "video";
    durationSeconds: number;
    recordedBy?: string;
    displayName?: string;
  },
): Promise<CommsRecordingUploadResult> {
  const form = new FormData();
  const ext = meta.callType === "video" ? "webm" : "webm";
  form.append("file", blob, `session-${roomId}-${Date.now()}.${ext}`);
  form.append("callType", meta.callType);
  form.append("durationSeconds", String(meta.durationSeconds));
  if (meta.recordedBy) form.append("recordedBy", meta.recordedBy);
  if (meta.displayName) form.append("displayName", meta.displayName);

  const res = await systemFetch(`/api/comms/sessions/${encodeURIComponent(roomId)}/recording`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Recording upload failed");
  }
  return res.json() as Promise<CommsRecordingUploadResult>;
}

export function downloadRecordingBlob(blob: Blob, roomId: string, callType: "audio" | "video"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cyrus-${callType}-${roomId.slice(0, 12)}-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
}

export class CommsSessionRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private pipelineDispose: (() => void) | null = null;
  private startedAt = 0;
  private state: SessionRecorderState = "idle";
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private durationSec = 0;

  constructor(
    private readonly onStateChange?: (state: SessionRecorderState, detail?: { durationSec: number; error?: string }) => void,
  ) {}

  getState(): SessionRecorderState {
    return this.state;
  }

  getDurationSec(): number {
    return this.durationSec;
  }

  isRecording(): boolean {
    return this.state === "recording";
  }

  start(options: SessionRecorderOptions): boolean {
    if (this.state === "recording" || this.state === "uploading") return false;

    const sources = uniqueStreams([
      options.localStream,
      ...options.remoteStreams,
      options.screenShareStream,
    ]);
    if (sources.length === 0) {
      this.setState("error", { error: "No media streams available to record" });
      return false;
    }

    try {
      const pipeline = buildRecordingStream(options);
      this.pipelineDispose = pipeline.dispose;

      const mimeType = pickRecorderMime(options.callType);
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(pipeline.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onerror = () => {
        this.cleanupPipeline();
        this.setState("error", { error: "MediaRecorder error" });
      };

      this.mediaRecorder.start(1000);
      this.startedAt = Date.now();
      this.durationSec = 0;
      this.durationTimer = setInterval(() => {
        this.durationSec = Math.floor((Date.now() - this.startedAt) / 1000);
        this.onStateChange?.(this.state, { durationSec: this.durationSec });
      }, 1000);
      this.setState("recording");
      this.lastOptions = options;
      return true;
    } catch (err) {
      this.cleanupPipeline();
      this.setState("error", {
        error: err instanceof Error ? err.message : "Could not start recording",
      });
      return false;
    }
  }

  private lastOptions: SessionRecorderOptions | null = null;

  async stop(upload = true, downloadLocal = true): Promise<CommsRecordingUploadResult | null> {
    if (!this.mediaRecorder || this.state !== "recording") return null;

    const options = this.lastOptions;
    const durationSeconds = Math.max(1, Math.floor((Date.now() - this.startedAt) / 1000));

    return new Promise((resolve) => {
      const recorder = this.mediaRecorder!;
      recorder.onstop = async () => {
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
          this.durationTimer = null;
        }

        const mimeType = recorder.mimeType || pickRecorderMime(options?.callType || "audio");
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        this.mediaRecorder = null;
        this.cleanupPipeline();

        if (blob.size === 0) {
          this.setState("error", { error: "Recording was empty" });
          resolve(null);
          return;
        }

        if (downloadLocal && options) {
          downloadRecordingBlob(blob, options.roomId, options.callType);
        }

        if (!upload || !options) {
          this.setState("saved", { durationSec: durationSeconds });
          resolve(null);
          return;
        }

        this.setState("uploading", { durationSec: durationSeconds });
        try {
          const result = await uploadSessionRecording(options.roomId, blob, {
            callType: options.callType,
            durationSeconds,
            recordedBy: options.recordedBy,
            displayName: options.displayName,
          });
          this.setState("saved", { durationSec: durationSeconds });
          resolve(result);
        } catch (err) {
          this.setState("error", {
            durationSec: durationSeconds,
            error: err instanceof Error ? err.message : "Upload failed",
          });
          resolve(null);
        }
      };

      if (recorder.state !== "inactive") recorder.stop();
    });
  }

  cancel(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.cleanupPipeline();
    this.setState("idle");
  }

  private cleanupPipeline(): void {
    this.pipelineDispose?.();
    this.pipelineDispose = null;
  }

  private setState(state: SessionRecorderState, detail?: { durationSec?: number; error?: string }): void {
    this.state = state;
    this.onStateChange?.(state, {
      durationSec: detail?.durationSec ?? this.durationSec,
      error: detail?.error,
    });
  }
}
