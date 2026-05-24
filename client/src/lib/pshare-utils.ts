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

export type PshareAuthorFilter = "all" | "mine" | string;

export type PshareAuthorTab = {
  id: PshareAuthorFilter;
  label: string;
  postCount: number;
  isMe?: boolean;
};

export function buildPshareAuthorTabs(
  posts: { authorId: string; authorName?: string }[],
  myUserId: string,
  myDisplayName?: string,
): PshareAuthorTab[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const p of posts) {
    const cur = counts.get(p.authorId);
    if (cur) cur.count += 1;
    else counts.set(p.authorId, { name: p.authorName || p.authorId.slice(0, 8), count: 1 });
  }

  const tabs: PshareAuthorTab[] = [{ id: "all", label: "Everyone", postCount: posts.length }];

  const mine = counts.get(myUserId);
  if (mine && mine.count > 0) {
    tabs.push({
      id: "mine",
      label: myDisplayName?.trim() || "You",
      postCount: mine.count,
      isMe: true,
    });
  }

  const others = [...counts.entries()]
    .filter(([id]) => id !== myUserId)
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name));

  for (const [id, { name, count }] of others) {
    tabs.push({ id, label: name, postCount: count });
  }

  return tabs;
}

export function filterPshareByAuthor<T extends { authorId: string }>(
  posts: T[],
  authorFilter: PshareAuthorFilter,
  myUserId: string,
): T[] {
  if (authorFilter === "all") return posts;
  if (authorFilter === "mine") return posts.filter((p) => p.authorId === myUserId);
  return posts.filter((p) => p.authorId === authorFilter);
}

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
