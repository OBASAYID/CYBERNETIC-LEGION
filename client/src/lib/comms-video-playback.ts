/**
 * Reliable remote/local media playback — autoplay recovery, GPU layer, separate audio path.
 */

export type AttachMediaOptions = {
  muted?: boolean;
  volume?: number;
  onPlaybackBlocked?: () => void;
  onPlaybackStarted?: () => void;
};

export async function attachMediaStreamToVideo(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
  opts: AttachMediaOptions = {},
): Promise<void> {
  if (!video) return;
  if (!stream) {
    video.srcObject = null;
    return;
  }

  video.srcObject = stream;
  video.muted = opts.muted ?? false;
  video.volume = opts.volume ?? 1;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute("playsinline", "true");
  video.style.transform = "translateZ(0)";

  try {
    await video.play();
    opts.onPlaybackStarted?.();
  } catch {
    opts.onPlaybackBlocked?.();
  }
}

export async function attachMediaStreamToAudio(
  audio: HTMLAudioElement | null,
  stream: MediaStream | null,
  opts: AttachMediaOptions = {},
): Promise<void> {
  if (!audio) return;
  if (!stream) {
    audio.srcObject = null;
    return;
  }

  const audioOnly = new MediaStream(stream.getAudioTracks());
  if (audioOnly.getAudioTracks().length === 0) {
    audio.srcObject = null;
    return;
  }

  audio.srcObject = audioOnly;
  audio.muted = opts.muted ?? false;
  audio.volume = opts.volume ?? 1;
  audio.autoplay = true;

  try {
    await audio.play();
    opts.onPlaybackStarted?.();
  } catch {
    opts.onPlaybackBlocked?.();
  }
}

/** Prefer dedicated audio element for remote voice — clearer than routing through <video>. */
export function extractAudioOnlyStream(stream: MediaStream | null): MediaStream | null {
  if (!stream) return null;
  const tracks = stream.getAudioTracks();
  if (!tracks.length) return null;
  return new MediaStream(tracks);
}
