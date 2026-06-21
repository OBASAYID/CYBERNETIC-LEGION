/** Pshare engine — retention window, live broadcast sources, and media routing. */

/** 0 = posts stay until the author deletes them (no auto-archive). */
export const PSHARE_POST_TTL_MS = 0;

export type PshareBroadcastSource = "mobile_camera" | "drone" | "webcam";

export type PshareLiveStatus = "live" | "ended";

export type PshareVideoProfile = {
  maxWidth: number;
  maxHeight: number;
  targetBitrateKbps: number;
  chunkIntervalMs: number;
  mobilePreferredFacing: "user" | "environment";
};

export const PSHARE_MOBILE_VIDEO_PROFILE: PshareVideoProfile = {
  maxWidth: 1280,
  maxHeight: 720,
  targetBitrateKbps: 2500,
  chunkIntervalMs: 3000,
  mobilePreferredFacing: "environment",
};

export const PSHARE_DRONE_VIDEO_PROFILE: PshareVideoProfile = {
  maxWidth: 1920,
  maxHeight: 1080,
  targetBitrateKbps: 4500,
  chunkIntervalMs: 2000,
  mobilePreferredFacing: "environment",
};

export function psharePostExpiresAt(_createdAt: Date | string): Date | null {
  if (PSHARE_POST_TTL_MS <= 0) return null;
  const base = _createdAt instanceof Date ? _createdAt : new Date(_createdAt);
  return new Date(base.getTime() + PSHARE_POST_TTL_MS);
}

export function isPsharePostExpired(createdAt: Date | string | null | undefined, now = Date.now()): boolean {
  if (PSHARE_POST_TTL_MS <= 0) return false;
  if (!createdAt) return false;
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(base.getTime())) return false;
  return now - base.getTime() > PSHARE_POST_TTL_MS;
}

export function pshareRetentionCutoff(now = Date.now()): Date {
  if (PSHARE_POST_TTL_MS <= 0) return new Date(0);
  return new Date(now - PSHARE_POST_TTL_MS);
}

export function normalizePsharePostKind(kind?: string | null): string {
  const k = String(kind || "general").toLowerCase();
  if (["clip", "story", "reel", "listing", "live", "general"].includes(k)) return k;
  return "general";
}

export function psharePostKindLabel(kind?: string | null): string {
  switch (normalizePsharePostKind(kind)) {
    case "clip":
      return "Clip";
    case "story":
      return "Story";
    case "reel":
      return "Reel";
    case "listing":
      return "Listing";
    case "live":
      return "Live";
    default:
      return "Post";
  }
}

export function pshareBroadcastSourceLabel(source?: string | null): string {
  switch (source) {
    case "mobile_camera":
      return "Mobile camera";
    case "drone":
      return "Drone feed";
    case "webcam":
      return "Webcam";
    default:
      return "Live source";
  }
}

/** Pick recorder mime for mobile live segments (Safari prefers mp4). */
export function pshareLiveRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

export function pshareLiveFileExtension(mimeType: string): string {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return "webm";
}

export function isHlsOrDashUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes(".m3u8") || u.includes(".mpd") || u.includes("hls") || u.includes("manifest");
}

export function adviseLiveBroadcast(input: {
  source: PshareBroadcastSource;
  networkType?: string;
  hasAudio?: boolean;
}): {
  profile: PshareVideoProfile;
  tips: string[];
} {
  const tips: string[] = [];
  const profile =
    input.source === "drone" ? { ...PSHARE_DRONE_VIDEO_PROFILE } : { ...PSHARE_MOBILE_VIDEO_PROFILE };

  if (input.source === "mobile_camera") {
    tips.push("Camera permission is required — hold steady in portrait for best feed fit.");
    if (input.networkType === "cellular") {
      profile.targetBitrateKbps = 1800;
      tips.push("Cellular detected — bitrate capped for smoother live segments.");
    }
  } else if (input.source === "drone") {
    tips.push("Link a registered drone RTSP or HLS URL — CYRUS routes the feed into Pshare live.");
    tips.push("Ensure the drone uplink is stable; HLS (.m3u8) plays best in-browser.");
  }

  if (input.hasAudio === false) {
    tips.push("Microphone off — viewers will see video-only broadcast.");
  }

  tips.push("Posts stay on Pshare until you delete them.");

  return { profile, tips };
}

/** User photo uploads get priority in feed ranking and upload pipeline. */
export function isPsharePhotoUpload(fileName?: string | null, mimeType?: string | null): boolean {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = String(fileName || "").toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|heif|avif)$/.test(name);
}

export const PSHARE_PHOTO_FEED_BOOST = 1200;

export function psharePhotoFeedBoost(fileName?: string | null, mimeType?: string | null): number {
  return isPsharePhotoUpload(fileName, mimeType) ? PSHARE_PHOTO_FEED_BOOST : 0;
}

/** Direct upload threshold for priority photo uploads (12 MiB vs default 6 MiB). */
export const PSHARE_PHOTO_DIRECT_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
