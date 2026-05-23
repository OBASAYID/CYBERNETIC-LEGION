import { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe,
  ImagePlus,
  Link2,
  Loader2,
  Megaphone,
  Send,
  ShoppingBag,
  UserCheck,
  X,
} from "lucide-react";
import { systemFetch } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "../../../lib/comms-device-id";
import { COMMS_MEDIA_FILE_ACCEPT } from "../../../lib/comms-media-upload";
import { uploadCommsFileSmart, type CommsUploadProgress } from "../../../lib/comms-chunk-upload";
import { CommsUploadProgressBar } from "../CommsUploadProgress";
import {
  detectPshareMediaKind,
  resolvePshareMediaUrl,
} from "../../../lib/pshare-utils";
import { formatCommsFileSize, guessCommsMediaMime } from "@shared/comms/media-formats";

export type PsharePendingMedia = {
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  previewUrl?: string;
};

type PshareUser = { id: string; displayName: string };

export function PshareComposer({
  myUserId,
  others,
  holoBlend,
  initialBody,
  onPosted,
  onError,
}: {
  myUserId: string;
  others: PshareUser[];
  holoBlend?: boolean;
  initialBody?: string | null;
  onPosted: (post: unknown) => void;
  onError: (msg: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(Boolean(initialBody?.trim()));
  const [body, setBody] = useState(initialBody?.trim() || "");
  const [linkInput, setLinkInput] = useState("");
  const [visibility, setVisibility] = useState<"all" | "selected">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [postKind, setPostKind] = useState<"general" | "listing">("general");
  const [listingTitle, setListingTitle] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CommsUploadProgress | null>(null);
  const [pendingMedia, setPendingMedia] = useState<PsharePendingMedia | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const handoffApplied = useRef(false);

  useEffect(() => {
    if (handoffApplied.current || !initialBody?.trim()) return;
    setBody(initialBody.trim());
    setExpanded(true);
    handoffApplied.current = true;
  }, [initialBody]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadProgress({ loaded: 0, total: file.size, percent: 0, phase: "init" });
      onError(null);
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
        if (!expanded) setExpanded(true);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Media upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [myUserId, expanded, onError],
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  };

  const clearMedia = () => {
    setPendingMedia((prev) => {
      if (prev?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const submit = async () => {
    if (submitting || uploading) return;
    setSubmitting(true);
    onError(null);
    try {
      const res = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getCommsDeviceId(),
          "X-User-Id": myUserId,
        },
        body: JSON.stringify({
          body: body.trim(),
          linkUrl: linkInput.trim() || null,
          fileUrl: pendingMedia?.fileUrl || null,
          fileName: pendingMedia?.fileName || null,
          fileMimeType: pendingMedia?.fileMimeType || null,
          postKind,
          listingTitle: postKind === "listing" ? listingTitle.trim() || null : null,
          listingPrice: postKind === "listing" ? listingPrice.trim() || null : null,
          listingCurrency: postKind === "listing" ? listingCurrency.trim() || null : null,
          visibility,
          allowComments,
          allowedUserIds: visibility === "selected" ? selectedUserIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Post failed");
      setBody("");
      setLinkInput("");
      clearMedia();
      setPostKind("general");
      setListingTitle("");
      setListingPrice("");
      setListingCurrency("");
      setVisibility("all");
      setSelectedUserIds([]);
      setExpanded(false);
      onPosted(data.post);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setSubmitting(false);
    }
  };

  const mediaKind = pendingMedia
    ? detectPshareMediaKind(pendingMedia.fileName, pendingMedia.fileMimeType)
    : "none";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-b from-slate-950/80 to-slate-950/40 p-3 shadow-lg backdrop-blur-md ${
        holoBlend ? "border-cyan-500/25 shadow-cyan-500/10" : "border-amber-500/20 shadow-amber-500/10"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-500/35 hover:bg-cyan-500/5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600/50 to-violet-600/40 text-sm font-bold text-white">
            +
          </span>
          <span className="text-sm text-white/55">Share a photo, video, update, or listing…</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Create post</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "general" as const, label: "Update", icon: Megaphone },
                { id: "listing" as const, label: "For sale", icon: ShoppingBag },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPostKind(id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  postKind === id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/55 hover:border-white/25"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {postKind === "listing" && (
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="rounded-xl border border-emerald-500/25 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none sm:col-span-3"
                placeholder="Listing title"
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
              />
              <input
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none"
                placeholder="Price"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
              />
              <input
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none sm:col-span-2"
                placeholder="Currency / terms"
                value={listingCurrency}
                onChange={(e) => setListingCurrency(e.target.value)}
              />
            </div>
          )}

          <textarea
            className="min-h-[5rem] w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white/90 placeholder:text-white/35 focus:border-cyan-500/45 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            placeholder="Write a caption…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div
            className={`rounded-xl border-2 border-dashed p-3 transition ${
              dragOver ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/10 bg-black/20"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={COMMS_MEDIA_FILE_ACCEPT}
              className="sr-only"
              onChange={onPickFile}
            />
            {!pendingMedia ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 py-4 text-white/50 transition hover:text-cyan-200/90 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                ) : (
                  <ImagePlus className="h-8 w-8" />
                )}
                <span className="text-xs font-medium">
                  {uploading ? "Uploading media…" : "Tap or drop photo, video, or file (up to 2 GB)"}
                </span>
              </button>
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40">
                {mediaKind === "image" && pendingMedia.previewUrl && (
                  <img
                    src={pendingMedia.previewUrl}
                    alt=""
                    className="max-h-80 w-full object-contain"
                  />
                )}
                {mediaKind === "video" && pendingMedia.previewUrl && (
                  <video src={pendingMedia.previewUrl} controls className="max-h-80 w-full" playsInline />
                )}
                {mediaKind === "audio" && pendingMedia.previewUrl && (
                  <div className="p-4">
                    <audio src={pendingMedia.previewUrl} controls className="w-full" />
                  </div>
                )}
                {(mediaKind === "file" || mediaKind === "none") && (
                  <div className="flex items-center gap-2 p-4 text-sm text-white/75">
                    <span className="truncate">{pendingMedia.fileName}</span>
                    <span className="text-white/40">{formatCommsFileSize(pendingMedia.fileSize)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-rose-600/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <CommsUploadProgressBar
              fileName={pendingMedia?.fileName}
              progress={uploadProgress}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/25 px-2">
            <Link2 className="h-4 w-4 shrink-0 text-cyan-400/70" />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-xs text-white/85 placeholder:text-white/30 focus:outline-none"
              placeholder="Optional link"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/45">
            <button
              type="button"
              onClick={() => setVisibility("all")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                visibility === "all" ? "border-cyan-500/45 bg-cyan-500/12 text-cyan-100" : "border-white/10"
              }`}
            >
              <Globe className="h-3 w-3" />
              Everyone
            </button>
            <button
              type="button"
              onClick={() => setVisibility("selected")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                visibility === "selected" ? "border-violet-500/45 bg-violet-500/12 text-violet-100" : "border-white/10"
              }`}
            >
              <UserCheck className="h-3 w-3" />
              Selected
            </button>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 normal-case">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="rounded"
              />
              Comments
            </label>
          </div>

          {visibility === "selected" && (
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-violet-500/25 bg-black/30 p-2">
              {others.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    selectedUserIds.includes(u.id)
                      ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                      : "border-white/10 text-white/55"
                  }`}
                >
                  {u.displayName}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={submitting || uploading}
            onClick={() => void submit()}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
              holoBlend
                ? "border-cyan-400/40 bg-gradient-to-r from-cyan-600/50 to-violet-600/40 hover:from-cyan-500/60"
                : "border-amber-500/35 bg-gradient-to-r from-amber-600/45 to-cyan-600/35"
            }`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Publishing…" : "Publish to timeline"}
          </button>
        </div>
      )}
    </div>
  );
}
