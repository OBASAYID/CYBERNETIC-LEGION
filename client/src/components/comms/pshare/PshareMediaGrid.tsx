import {
  detectPshareMediaKind,
  resolvePshareMediaUrl,
} from "../../../lib/pshare-utils";
import type { PsharePost } from "./PshareFeedCard";
import { FileText, Volume2 } from "lucide-react";

export function PshareMediaGrid({
  posts,
  onSelectPost,
  onImageClick,
}: {
  posts: PsharePost[];
  onSelectPost: (postId: string) => void;
  onImageClick?: (url: string, alt: string) => void;
}) {
  const withMedia = posts.filter((p) => p.fileUrl);
  if (withMedia.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5">
      {withMedia.map((post) => {
        const kind = detectPshareMediaKind(post.fileName, post.fileMimeType);
        const url = resolvePshareMediaUrl(post.fileUrl);

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => {
              if (kind === "image" && url) onImageClick?.(url, post.fileName || "Photo");
              else onSelectPost(post.id);
            }}
            className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/40"
          >
            {kind === "image" && url && (
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            )}
            {kind === "video" && url && (
              <>
                <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-white/90">
                  VIDEO
                </span>
              </>
            )}
            {kind === "audio" && (
              <span className="flex h-full flex-col items-center justify-center gap-1 bg-violet-950/50 text-violet-200">
                <Volume2 className="h-6 w-6" />
                <span className="px-1 text-[9px]">Audio</span>
              </span>
            )}
            {(kind === "file" || kind === "none") && (
              <span className="flex h-full flex-col items-center justify-center gap-1 bg-slate-900/80 p-1 text-white/70">
                <FileText className="h-5 w-5" />
                <span className="line-clamp-2 text-center text-[9px]">{post.fileName || "File"}</span>
              </span>
            )}
            {post.body && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-2 text-left text-[9px] leading-tight text-white/90 line-clamp-2">
                {post.body}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
