import { Download, FileText, Volume2 } from "lucide-react";
import { guessCommsMediaMime, inferCommsMediaCategory } from "@shared/comms/media-formats";
import {
  detectPshareMediaKind,
  pshareCategoryLabel,
  pshareMediaDownloadUrl,
  resolvePshareMediaUrl,
} from "../../../../client/src/lib/pshare-utils";
import type { PsharePost } from "./pshare-types";

type PshareMediaPreviewProps = {
  post: Pick<PsharePost, "fileUrl" | "fileName" | "fileMimeType">;
  /** Full-width feed card vs compact command-console ticker. */
  variant?: "feed" | "console";
  className?: string;
};

export function PshareMediaPreview({
  post,
  variant = "feed",
  className = "",
}: PshareMediaPreviewProps) {
  if (!post.fileUrl) return null;

  const mime = guessCommsMediaMime(post.fileName, post.fileMimeType);
  const kind = detectPshareMediaKind(post.fileName, mime);
  const url = resolvePshareMediaUrl(post.fileUrl);
  const downloadUrl = pshareMediaDownloadUrl(post.fileUrl);
  const isConsole = variant === "console";

  if (kind === "image") {
    return (
      <div className={`overflow-hidden rounded-lg bg-black/40 ${className}`}>
        <img
          src={url}
          alt={post.fileName || "Shared photo"}
          className={
            isConsole
              ? "max-h-28 w-full object-cover"
              : "max-h-[min(60vh,420px)] w-full object-contain"
          }
          loading="lazy"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`overflow-hidden rounded-lg bg-black/50 ${className}`}>
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className={isConsole ? "max-h-28 w-full object-cover" : "max-h-[min(60vh,400px)] w-full"}
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 ${className}`}
      >
        <Volume2 className="h-4 w-4 shrink-0 text-white/50" />
        <div className="min-w-0 flex-1">
          {!isConsole && (
            <p className="mb-1 truncate text-[11px] text-white/70">{post.fileName || "Audio"}</p>
          )}
          <audio src={url} controls className="h-8 w-full" preload="metadata" />
        </div>
      </div>
    );
  }

  const cat = inferCommsMediaCategory(post.fileName, mime);
  return (
    <a
      href={downloadUrl}
      className={`flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 transition hover:bg-white/[0.06] ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        <FileText className="h-4 w-4 text-white/55" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-white/85">{post.fileName || "Attachment"}</p>
        <p className="text-[10px] text-white/45">{pshareCategoryLabel(cat)} · Download</p>
      </div>
      <Download className="h-3.5 w-3.5 shrink-0 text-white/40" />
    </a>
  );
}
