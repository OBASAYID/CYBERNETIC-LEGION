import { Download, FileText, Radio, Volume2 } from "lucide-react";
import { guessCommsMediaMime, inferCommsMediaCategory } from "@shared/comms/media-formats";
import { isHlsOrDashUrl, pshareBroadcastSourceLabel } from "@shared/comms/pshare-engine";
import { polishCssFilter, type PsharePolishPreset } from "@shared/comms/pshare-studio";
import {
  detectPshareMediaKind,
  pshareCategoryLabel,
  pshareMediaDownloadUrl,
  resolvePshareMediaUrl,
} from "../../../../client/src/lib/pshare-utils";
import type { PsharePost } from "./pshare-types";
import { PshareLiveViewerVideo } from "./pshare-live-viewer-video";

type PshareMediaPreviewProps = {
  post: Pick<PsharePost, "fileUrl" | "fileName" | "fileMimeType" | "polishPreset" | "postKind" | "liveStatus" | "liveStreamId" | "broadcastSource"> & {
    mediaManifest?: { polishPreset?: PsharePolishPreset; polishIntensity?: number } | null;
  };
  /** Full-width feed card vs compact command-console ticker. */
  variant?: "feed" | "console";
  className?: string;
  /** Poll for next live segment when the current clip ends. */
  onLiveNeedRefresh?: () => void;
};

export function PshareMediaPreview({
  post,
  variant = "feed",
  className = "",
  onLiveNeedRefresh,
}: PshareMediaPreviewProps) {
  const isLive = post.postKind === "live" && post.liveStatus === "live";
  const isConsole = variant === "console";

  if (!post.fileUrl) {
    if (isLive) {
      return (
        <div
          className={`flex aspect-video items-center justify-center gap-2 rounded-lg bg-black/70 ${
            isConsole ? "min-h-[7.5rem]" : ""
          } ${className}`}
        >
          <Radio className="h-4 w-4 animate-pulse text-rose-300" />
          <p className="text-[10px] text-white/55">Connecting to live feed…</p>
        </div>
      );
    }
    return null;
  }

  const mime = guessCommsMediaMime(post.fileName, post.fileMimeType);
  const kind = isLive || mime.startsWith("video/") || post.fileMimeType === "application/x-pshare-live"
    ? "video"
    : detectPshareMediaKind(post.fileName, mime);
  const baseUrl = resolvePshareMediaUrl(post.fileUrl);
  const url = baseUrl;
  const downloadUrl = pshareMediaDownloadUrl(post.fileUrl);
  const manifest = post.mediaManifest as { polishPreset?: PsharePolishPreset; polishIntensity?: number } | undefined;
  const preset = (post.polishPreset || manifest?.polishPreset || "clean") as PsharePolishPreset;
  const polish = polishCssFilter(preset, manifest?.polishIntensity ?? 65);

  if (kind === "image") {
    return (
      <div
        className={`overflow-hidden rounded-lg bg-black/60 ${
          isConsole ? "flex h-full min-h-[7.5rem] items-center justify-center" : ""
        } ${className}`}
      >
        <img
          src={url}
          alt={post.fileName || "Shared photo"}
          className={
            isConsole
              ? "max-h-full max-w-full object-contain"
              : "max-h-[min(60vh,420px)] w-full object-contain"
          }
          style={{ filter: polish }}
          loading="lazy"
        />
      </div>
    );
  }

  if (kind === "video" || isLive) {
    const hls = isHlsOrDashUrl(post.fileUrl);
    if (isLive && !hls && (post.liveStreamId || baseUrl)) {
      return (
        <PshareLiveViewerVideo
          liveStreamId={post.liveStreamId}
          fileUrl={post.fileUrl}
          broadcastSource={post.broadcastSource}
          polish={polish}
          isConsole={isConsole}
          className={className}
          onNeedRefresh={onLiveNeedRefresh}
        />
      );
    }
    return (
      <div
        className={`relative overflow-hidden rounded-lg bg-black/50 ${
          isConsole ? "flex h-full min-h-[7.5rem] items-center justify-center" : ""
        } ${className}`}
      >
        {isLive && hls && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-600/80 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
            {post.broadcastSource ? (
              <span className="font-normal normal-case opacity-80">
                · {pshareBroadcastSourceLabel(post.broadcastSource)}
              </span>
            ) : null}
          </span>
        )}
        <video
          src={url}
          controls={!isLive}
          autoPlay={isLive}
          muted={isLive}
          playsInline
          preload={isLive ? "auto" : "metadata"}
          onLoadedData={(e) => {
            if (!isLive) return;
            void (e.currentTarget as HTMLVideoElement).play().catch(() => undefined);
          }}
          className={
            isConsole
              ? "max-h-full max-w-full object-contain"
              : isLive
                ? "max-h-[min(60vh,400px)] w-full object-contain"
                : "max-h-[min(60vh,400px)] w-full"
          }
          style={{ filter: polish }}
        />
        {isLive && hls && !isConsole && (
          <p className="px-2 py-1 text-[9px] text-white/45">HLS drone feed — use controls if autoplay is blocked.</p>
        )}
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
