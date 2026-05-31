import { systemFetch } from "@shared/cyrus-api-client";
import {
  adviseLiveBroadcast,
  pshareLiveRecorderMime,
  type PshareBroadcastSource,
} from "@shared/comms/pshare-engine";
import { uploadCommsFileSmart } from "./comms-chunk-upload";
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

/** Request camera (+ mic) permission and return a preview stream. */
export async function requestPshareCameraAccess(
  facingMode: "user" | "environment" = "environment",
): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
    },
    audio: true,
  });
}

export class PshareMobileLiveBroadcaster {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private session: PshareLiveSession | null = null;
  private uploading = false;
  private stopped = false;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  getSession(): PshareLiveSession | null {
    return this.session;
  }

  async preparePreview(facingMode: "user" | "environment" = "environment"): Promise<MediaStream> {
    this.stopTracks();
    this.stream = await requestPshareCameraAccess(facingMode);
    return this.stream;
  }

  async goLive(caption: string, callbacks: LiveCallbacks = {}): Promise<PshareLiveSession> {
    if (!this.stream) {
      this.stream = await this.preparePreview();
      callbacks.onPreview?.(this.stream);
    }

    const advice = adviseLiveBroadcast({
      source: "mobile_camera",
      networkType: detectNetworkType(),
      hasAudio: this.stream.getAudioTracks().length > 0,
    });

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
    if (!this.stream || !this.session) return;
    const mime = pshareLiveRecorderMime();
    const advice = adviseLiveBroadcast({ source: "mobile_camera" });
    const intervalMs = advice.profile.chunkIntervalMs;

    const recordSegment = () => {
      if (this.stopped || !this.stream || !this.session) return;
      const chunks: Blob[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(this.stream, { mimeType: mime });
      } catch {
        recorder = new MediaRecorder(this.stream);
      }
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (chunks.length && this.session && !this.uploading) {
          void this.uploadSegment(new Blob(chunks, { type: mime }), callbacks);
        }
        if (!this.stopped) window.setTimeout(recordSegment, 120);
      };
      recorder.start();
      this.recorder = recorder;
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, intervalMs);
    };

    recordSegment();
  }

  private async uploadSegment(blob: Blob, callbacks: LiveCallbacks) {
    if (!this.session || this.uploading) return;
    this.uploading = true;
    try {
      const uploaded = await uploadCommsFileSmart(blob, {
        userId: this.userId,
        fileName: `pshare-live-${Date.now()}.webm`,
      });
      const res = await systemFetch(`/api/comms/pshare/live/${this.session.postId}/chunk`, {
        method: "POST",
        headers: pshareHeaders(this.userId),
        body: JSON.stringify({
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName,
          fileMimeType: uploaded.mimeType || "video/webm",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        callbacks.onSegmentUploaded?.(data.post?.fileUrl || uploaded.fileUrl);
      }
    } catch (e) {
      callbacks.onError?.(e instanceof Error ? e.message : "Live segment upload failed");
    } finally {
      this.uploading = false;
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

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileMimeType: string | null = null;

    if (finalBlob && finalBlob.size > 0) {
      const uploaded = await uploadCommsFileSmart(finalBlob, {
        userId: this.userId,
        fileName: `pshare-live-final-${Date.now()}.webm`,
      });
      fileUrl = uploaded.fileUrl;
      fileName = uploaded.fileName;
      fileMimeType = uploaded.mimeType || "video/webm";
    }

    await systemFetch(`/api/comms/pshare/live/${this.session.postId}/stop`, {
      method: "POST",
      headers: pshareHeaders(this.userId),
      body: JSON.stringify({ fileUrl, fileName, fileMimeType }),
    });

    this.session = null;
    this.stopTracks();
  }

  stopTracks() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
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
