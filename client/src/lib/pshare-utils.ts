import { guessCommsMediaMime, inferCommsMediaCategory, type CommsMediaCategory } from "@shared/comms/media-formats";
import { commsAssetUrl } from "@shared/cyrus-api-client";

export type PshareMediaKind = "image" | "video" | "audio" | "file" | "none";

export function resolvePshareMediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  return commsAssetUrl(pathOrUrl) ?? pathOrUrl;
}

export function pshareMediaDownloadUrl(pathOrUrl: string | null | undefined): string {
  const base = resolvePshareMediaUrl(pathOrUrl);
  if (!base) return "";
  return base.includes("?") ? `${base}&download=1` : `${base}?download=1`;
}

export function detectPshareMediaKind(
  fileName?: string | null,
  mimeType?: string | null,
): PshareMediaKind {
  const mime = guessCommsMediaMime(fileName, mimeType);
  const cat = inferCommsMediaCategory(fileName, mime);
  if (cat === "image") return "image";
  if (cat === "video") return "video";
  if (cat === "audio" || cat === "audiobook") return "audio";
  if (!fileName && !mimeType) return "none";
  return "file";
}

export function formatPshareRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type PshareFeedFilter = "all" | "media" | "listing" | "links";

export function matchesPshareFilter(
  post: {
    postKind?: string;
    fileUrl?: string | null;
    linkUrl?: string | null;
    fileMimeType?: string | null;
    fileName?: string | null;
  },
  filter: PshareFeedFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "listing") return post.postKind === "listing";
  if (filter === "links") return Boolean(post.linkUrl?.trim());
  if (filter === "media") {
    return Boolean(post.fileUrl && detectPshareMediaKind(post.fileName, post.fileMimeType) !== "file");
  }
  return true;
}

export function pshareCategoryLabel(cat: CommsMediaCategory): string {
  const map: Record<CommsMediaCategory, string> = {
    image: "Photo",
    video: "Video",
    audio: "Audio",
    audiobook: "Audiobook",
    ebook: "E-book",
    document: "Document",
    html: "Web page",
    archive: "Archive",
    cad3d: "3D model",
    other: "File",
  };
  return map[cat] || "File";
}
