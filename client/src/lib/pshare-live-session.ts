import { PshareMobileLiveBroadcaster } from "./pshare-live-broadcast";

let activeBroadcaster: PshareMobileLiveBroadcaster | null = null;
let activeUserId: string | null = null;

/** Shared broadcaster — survives Pshare tab / panel unmount while a session is active. */
export function getPshareLiveBroadcaster(userId: string): PshareMobileLiveBroadcaster {
  if (!activeBroadcaster || activeUserId !== userId) {
    activeBroadcaster?.stopTracks();
    activeBroadcaster = new PshareMobileLiveBroadcaster(userId);
    activeUserId = userId;
  }
  return activeBroadcaster;
}

export function isPshareLiveBroadcasting(): boolean {
  return Boolean(activeBroadcaster?.getSession());
}

export function clearPshareLiveBroadcaster(): void {
  activeBroadcaster?.stopTracks();
  activeBroadcaster = null;
  activeUserId = null;
}

export function attachMediaStreamToVideo(
  video: HTMLVideoElement | null | undefined,
  stream: MediaStream | null | undefined,
): void {
  if (!video || !stream) return;
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.autoplay = true;
  void video.play().catch(() => undefined);
}
