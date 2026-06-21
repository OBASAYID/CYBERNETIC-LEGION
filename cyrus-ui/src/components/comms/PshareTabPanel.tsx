/**
 * Pshare broadcast feed — wired to server comms engine (/api/comms/pshare/*).
 * Supports text + media attachments (photo, video, audio, files).
 */
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, History, ImagePlus, Loader2, Paperclip, Radio, Send, Video, X } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { systemFetch } from "@/lib/system-api";
import { usePresence } from "../../../../client/src/contexts/PresenceContext";
import { CommsUploadProgressBar } from "../../../../client/src/components/comms/CommsUploadProgress";
import { getCommsDeviceId } from "../../../../client/src/lib/comms-device-id";
import { uploadCommsFileSmart, type CommsUploadProgress } from "../../../../client/src/lib/comms-chunk-upload";
import {
  COMMS_MEDIA_FILE_ACCEPT,
} from "../../../../client/src/lib/comms-media-upload";
import { formatCommsFileSize, guessCommsMediaMime } from "@shared/comms/media-formats";
import {
  detectPshareMediaKind,
  resolvePshareMediaUrl,
} from "../../../../client/src/lib/pshare-utils";
import { PsharePostCard } from "./pshare-post-card";
import { PshareStudio } from "./pshare-studio";
import { PshareLivePanel } from "./pshare-live-panel";
import { PshareHistoryPanel } from "./pshare-history-panel";
import type { PsharePendingMedia, PsharePost } from "./pshare-types";

type PshareView = "feed" | "studio" | "live" | "history";

const C = {
  crimson: "#e11d48",
  border: "rgba(255,255,255,0.08)",
  sidebarInput: "#222222",
  sidebarDivider: "#2E2E2E",
} as const;

type PshareTabPanelProps = {
  myUserId: string;
  displayName?: string;
};

export function PshareTabPanel({ myUserId, displayName }: PshareTabPanelProps) {
  const qc = useQueryClient();
  const userRole = useUserRole();
  const { wsRef, isConnected } = usePresence();
  const isAdmin = userRole === "admin";
  const [view, setView] = useState<PshareView>("feed");
  const [draft, setDraft] = useState("");
  const [pendingMedia, setPendingMedia] = useState<PsharePendingMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CommsUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const postsQuery = useQuery<PsharePost[]>({
    queryKey: ["/api/comms/pshare/posts", "comms-hub"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/pshare/posts");
      if (!res.ok) throw new Error("Failed to load Pshare");
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    },
    refetchInterval: (query) => {
      const posts = query.state.data;
      const hasLive = Array.isArray(posts) && posts.some((p) => p.postKind === "live" && p.liveStatus === "live");
      return hasLive ? 3000 : 6000;
    },
  });

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
        const mimeGuess = guessCommsMediaMime(file.name, file.type);
        const mediaKind = detectPshareMediaKind(file.name, mimeGuess);
        const result = await uploadCommsFileSmart(file, {
          userId: myUserId,
          fileName: file.name,
          priority: mediaKind === "image" ? "photo" : "normal",
          onProgress: setUploadProgress,
        });
        const mime = result.mimeType || mimeGuess;
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
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Post failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      clearMedia();
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
    },
  });

  const submit = () => {
    const text = draft.trim();
    if ((!text && !pendingMedia) || createPost.isPending || uploading) return;
    createPost.mutate({ body: text, media: pendingMedia });
  };

  const posts = postsQuery.data ?? [];
  const pendingKind = pendingMedia
    ? detectPshareMediaKind(pendingMedia.fileName, pendingMedia.fileMimeType)
    : "none";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center justify-between px-5 py-3.5"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div>
          <p className="text-sm font-bold text-white">Pshare</p>
          <p className="text-[10px] text-white/35">
            {view === "studio"
              ? "Stories, clips, soundtrack polish — preview before you post"
              : view === "live"
                ? "Go live from mobile camera or a linked drone feed"
                : view === "history"
                  ? "Archived broadcasts after the 24-hour live feed window"
                  : "Live feed — photo uploads prioritized · moves to chat history after 24h"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}
          >
            {(["feed", "studio", "live", "history"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide transition"
                style={{
                  background: view === tab ? `${C.crimson}28` : "transparent",
                  color: view === tab ? "#fda4af" : "rgba(255,255,255,0.45)",
                }}
              >
                {tab === "studio" ? <Clapperboard className="h-3 w-3" /> : null}
                {tab === "live" ? <Video className="h-3 w-3" /> : null}
                {tab === "history" ? <History className="h-3 w-3" /> : null}
                {tab === "feed"
                  ? "Feed"
                  : tab === "studio"
                    ? "Studio"
                    : tab === "live"
                      ? "Live"
                      : "History"}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: `${C.crimson}18`, border: `1px solid ${C.crimson}35` }}
          >
            <Radio className="h-2.5 w-2.5 text-rose-400" strokeWidth={2} />
            <span className="text-[8px] font-bold text-rose-400">LIVE</span>
          </div>
        </div>
      </div>

      {view === "studio" ? (
        <div className="flex-1 overflow-y-auto py-3">
          <PshareStudio myUserId={myUserId} onPosted={() => setView("feed")} />
        </div>
      ) : null}

      {view === "live" ? (
        <div className="flex-1 overflow-y-auto py-3">
          <PshareLivePanel
            myUserId={myUserId}
            displayName={displayName || myUserId}
            socketRef={wsRef}
            isSocketConnected={isConnected}
            onLiveStarted={() => {
              void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
            }}
          />
        </div>
      ) : null}

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto py-3">
          <PshareHistoryPanel myUserId={myUserId} isAdmin={isAdmin} />
        </div>
      ) : null}

      {view === "feed" ? (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {postsQuery.isLoading && (
          <p className="text-[11px] text-white/40">Loading feed…</p>
        )}
        {postsQuery.isError && (
          <p className="text-[11px] text-amber-300/80">Pshare unavailable — check server comms routes.</p>
        )}
        {!postsQuery.isLoading && posts.length === 0 && (
          <p className="text-[11px] text-white/35">No broadcasts yet. Post the first update or share media.</p>
        )}
        {posts.map((p) => (
          <PsharePostCard
            key={p.id}
            post={p}
            myUserId={myUserId}
            variant="feed"
            isAdmin={isAdmin}
          />
        ))}
      </div>
      ) : null}

      {view === "feed" ? (
      <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: C.border }}>
        {pendingMedia && (
          <div className="relative mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            {pendingKind === "image" && pendingMedia.previewUrl && (
              <img src={pendingMedia.previewUrl} alt="" className="max-h-40 w-full object-contain" />
            )}
            {pendingKind === "video" && pendingMedia.previewUrl && (
              <video src={pendingMedia.previewUrl} controls className="max-h-40 w-full" playsInline />
            )}
            {pendingKind === "audio" && pendingMedia.previewUrl && (
              <div className="p-3">
                <audio src={pendingMedia.previewUrl} controls className="w-full" />
              </div>
            )}
            {(pendingKind === "file" || pendingKind === "none") && (
              <div className="flex items-center gap-2 p-3 text-[11px] text-white/75">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">{pendingMedia.fileName}</span>
                <span className="text-white/40">{formatCommsFileSize(pendingMedia.fileSize)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={clearMedia}
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-rose-600/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <CommsUploadProgressBar
          fileName={pendingMedia?.fileName}
          progress={uploadProgress}
          error={uploadError}
        />
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={COMMS_MEDIA_FILE_ACCEPT}
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            title="Attach media or file"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/60" />
            ) : (
              <ImagePlus className="h-4 w-4 text-white/55" />
            )}
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Caption or broadcast… (⌘↵ to send)"
            rows={2}
            className="flex-1 resize-none rounded-xl bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
            style={{ border: `1px solid ${C.border}` }}
          />
          <button
            type="button"
            disabled={(!draft.trim() && !pendingMedia) || createPost.isPending || uploading}
            onClick={submit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: `${C.crimson}22`, border: `1px solid ${C.crimson}40` }}
          >
            <Send className="h-4 w-4 text-rose-300" />
          </button>
        </div>
        {createPost.isError && (
          <p className="mt-2 text-[10px] text-rose-300/90">
            {createPost.error instanceof Error ? createPost.error.message : "Post failed"}
          </p>
        )}
      </div>
      ) : null}
    </div>
  );
}
