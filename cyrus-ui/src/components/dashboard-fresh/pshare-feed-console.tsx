import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ImagePlus, Loader2, Radio, Send, Share2, X } from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { cn } from "@/lib/utils";
import { TSODILO_HUNT_SYMBOLS_URL } from "@/lib/dashboard-backdrop";
import { CommsUploadProgressBar } from "../../../../client/src/components/comms/CommsUploadProgress";
import { getCommsDeviceId } from "../../../../client/src/lib/comms-device-id";
import { uploadCommsFileSmart, type CommsUploadProgress } from "../../../../client/src/lib/comms-chunk-upload";
import { COMMS_MEDIA_FILE_ACCEPT } from "../../../../client/src/lib/comms-media-upload";
import { formatCommsFileSize, guessCommsMediaMime } from "@shared/comms/media-formats";
import {
  detectPshareMediaKind,
  resolvePshareMediaUrl,
} from "../../../../client/src/lib/pshare-utils";
import { PshareMediaPreview } from "@/components/comms/pshare-media-preview";
import type { PsharePendingMedia, PsharePost } from "@/components/comms/pshare-types";

function timeAgo(iso?: string): string {
  if (!iso) return "now";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 60_000) return "now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function resolveMyUserId(): string {
  try {
    return localStorage.getItem("cyrus_comms_user_id") || "local-operator";
  } catch {
    return "local-operator";
  }
}

export function PshareFeedConsole({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const myUserId = resolveMyUserId();
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PsharePendingMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CommsUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const postsQuery = useQuery<PsharePost[]>({
    queryKey: ["/api/comms/pshare/posts", "dashboard-feed"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/pshare/posts");
      if (!res.ok) throw new Error("Failed to load Pshare posts");
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    },
    refetchInterval: 8_000,
  });

  const posts = (postsQuery.data ?? []).slice(0, 8);
  const activePost = posts[activeIndex];

  useEffect(() => {
    if (posts.length <= 1) {
      setActiveIndex(0);
      return;
    }
    const ticker = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % posts.length);
        setFading(false);
      }, 220);
    }, 5200);
    return () => window.clearInterval(ticker);
  }, [posts.length]);

  useEffect(() => {
    if (activeIndex >= posts.length) setActiveIndex(0);
  }, [activeIndex, posts.length]);

  const clearMedia = useCallback(() => {
    setPendingMedia((prev) => {
      if (prev?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      setUploadProgress({ loaded: 0, total: file.size, percent: 0, phase: "init" });
      try {
        const result = await uploadCommsFileSmart(file, {
          userId: myUserId,
          fileName: file.name,
          onProgress: setUploadProgress,
        });
        const mime = result.mimeType || guessCommsMediaMime(file.name, file.type);
        const kind = detectPshareMediaKind(file.name, mime);
        const previewUrl =
          kind === "image" ? resolvePshareMediaUrl(result.fileUrl) : URL.createObjectURL(file);
        setPendingMedia((prev) => {
          if (prev?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.previewUrl);
          return {
            fileUrl: result.fileUrl,
            fileName: result.fileName || file.name,
            fileMimeType: mime,
            fileSize: result.fileSize || file.size,
            previewUrl,
          };
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Media upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [myUserId],
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const createPost = useMutation({
    mutationFn: async (payload: { body: string; media: PsharePendingMedia | null }) => {
      const res = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getCommsDeviceId(),
          "X-User-Id": myUserId,
        },
        body: JSON.stringify({
          body: payload.body,
          fileUrl: payload.media?.fileUrl || null,
          fileName: payload.media?.fileName || null,
          fileMimeType: payload.media?.fileMimeType || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to post");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      clearMedia();
      void queryClient.invalidateQueries({ queryKey: ["/api/comms/pshare/posts", "dashboard-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
    },
  });

  const submitPost = () => {
    const body = draft.trim();
    if ((!body && !pendingMedia) || createPost.isPending || uploading) return;
    createPost.mutate({ body, media: pendingMedia });
  };

  const pendingKind = pendingMedia
    ? detectPshareMediaKind(pendingMedia.fileName, pendingMedia.fileMimeType)
    : "none";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/60 via-slate-900/78 to-slate-950/90 p-4 shadow-[0_20px_44px_rgba(0,0,0,0.38)] backdrop-blur-xl cyrus-xs-pshare-console",
        className,
      )}
      aria-label="Pshare post feed console"
    >
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.1]" aria-hidden />
      <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 rounded-full bg-white/[0.05] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/35 to-transparent" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 cyrus-xs-pshare-header">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200/25 bg-sky-200/10">
            <Share2 className="h-4 w-4 text-sky-100" aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-sky-100/55">Pshare channel</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/30 bg-sky-200/12 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-sky-100/90">
                <Radio className="h-3 w-3 text-sky-200" />
                Live
              </span>
            </div>
            <h2
              className="text-sm font-semibold text-white/95"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Pshare post feeds console
            </h2>
          </div>
        </div>
        <div
          className="pointer-events-none hidden h-10 w-10 rounded-full border border-violet-300/30 bg-cover bg-center opacity-40 mix-blend-screen sm:block cyrus-symbol-watermark"
          style={{ backgroundImage: `url(${TSODILO_HUNT_SYMBOLS_URL})` }}
          aria-hidden
        />

        <Link href="/comms?tab=pshare">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/12 bg-slate-950/40 px-3 text-[11px] text-white/75 touch-manipulation hover:border-sky-300/35 hover:text-white cyrus-xs-pshare-open"
          >
            Open Pshare
          </button>
        </Link>
      </div>

      <div className="mb-3 rounded-xl border border-white/12 bg-slate-950/46 p-2.5 cyrus-xs-pshare-compose-wrap">
        {pendingMedia && (
          <div className="relative mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            {pendingKind === "image" && pendingMedia.previewUrl && (
              <img src={pendingMedia.previewUrl} alt="" className="max-h-24 w-full object-contain" />
            )}
            {pendingKind === "video" && pendingMedia.previewUrl && (
              <video src={pendingMedia.previewUrl} controls className="max-h-24 w-full" playsInline />
            )}
            {pendingKind === "audio" && pendingMedia.previewUrl && (
              <div className="p-2">
                <audio src={pendingMedia.previewUrl} controls className="w-full" />
              </div>
            )}
            {(pendingKind === "file" || pendingKind === "none") && (
              <p className="truncate p-2 text-[10px] text-white/70">{pendingMedia.fileName}</p>
            )}
            <button
              type="button"
              onClick={clearMedia}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-rose-600/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <CommsUploadProgressBar
          fileName={pendingMedia?.fileName}
          progress={uploadProgress}
          error={uploadError}
        />
        <div className="flex items-end gap-2 cyrus-xs-pshare-compose">
          <input
            ref={fileRef}
            type="file"
            accept={COMMS_MEDIA_FILE_ACCEPT}
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            title="Attach media"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/60 hover:border-sky-300/35 disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Broadcast to Pshare..."
            rows={2}
            className="min-h-11 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-sky-300/35"
          />
          <button
            type="button"
            onClick={submitPost}
            disabled={(!draft.trim() && !pendingMedia) || createPost.isPending || uploading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-sky-200/35 bg-sky-500/20 px-3 text-xs text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-45 cyrus-xs-pshare-post"
          >
            <Send className="h-3.5 w-3.5" />
            Post
          </button>
        </div>
      </div>

      {postsQuery.isLoading ? (
        <p className="text-xs text-white/55">Loading live Pshare posts…</p>
      ) : postsQuery.isError ? (
        <p className="text-xs text-amber-200/80">Pshare feed unavailable right now.</p>
      ) : posts.length === 0 ? (
        <p className="text-xs text-white/55">No Pshare posts yet. Share text or media to publish the first update.</p>
      ) : (
        <article
          className="relative min-h-[8.4rem] overflow-hidden rounded-xl border border-white/12 bg-gradient-to-b from-slate-700/45 via-slate-900/65 to-slate-950/82 p-3 shadow-[0_10px_22px_rgba(0,0,0,0.3)] cyrus-xs-pshare-item transition-opacity duration-200"
          style={{ opacity: fading ? 0.18 : 1 }}
          aria-live="polite"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold text-white/95">
              {activePost?.authorName || "Operator"}
            </span>
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide text-white/45">
              {timeAgo(activePost?.createdAt ?? undefined)}
            </span>
          </div>
          {activePost?.body?.trim() && (
            <p className="line-clamp-3 text-xs leading-relaxed text-slate-100/80">{activePost.body}</p>
          )}
          {activePost?.fileUrl && (
            <div className="mt-2">
              <PshareMediaPreview post={activePost} variant="console" />
            </div>
          )}
          {!activePost?.body?.trim() && !activePost?.fileUrl && (
            <p className="text-xs text-white/45">Shared update</p>
          )}
          {posts.length > 1 && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {posts.map((post, i) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === activeIndex ? 16 : 6,
                    background: i === activeIndex ? "rgba(125,211,252,0.9)" : "rgba(255,255,255,0.22)",
                  }}
                  aria-label={`Show Pshare story ${i + 1}`}
                  title={`Story ${i + 1}${post.fileUrl ? " · media" : ""}`}
                />
              ))}
            </div>
          )}
        </article>
      )}
    </section>
  );
}
