import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { systemFetch, systemApiUrl } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "../../lib/comms-device-id";
import {
  Send,
  Link2,
  Paperclip,
  Heart,
  MessageCircle,
  Download,
  Share2,
  Globe,
  UserCheck,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  ShoppingBag,
  Megaphone,
} from "lucide-react";

type PshareUser = { id: string; displayName: string };

type PsharePost = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  linkUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  postKind?: string;
  listingTitle?: string | null;
  listingPrice?: string | null;
  listingCurrency?: string | null;
  visibility: string;
  allowComments: boolean;
  allowedUserIds: string[];
  createdAt: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

type PshareComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string | null;
};

function commsDeviceHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
  };
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Same-origin or split API base — media URLs from uploads are often `/api/comms/media/...`. */
function resolveMediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  return systemApiUrl(pathOrUrl);
}

export function PsharePanel({
  myUserId,
  allUsers,
  highlightPostId,
  onClearHighlight,
  initialPostBody,
}: {
  myUserId: string;
  allUsers: PshareUser[];
  highlightPostId?: string | null;
  onClearHighlight?: () => void;
  /** Pre-fills the composer (e.g. module pipeline handoff from Command or Vision). */
  initialPostBody?: string | null;
}) {
  const [posts, setPosts] = useState<PsharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const handoffApplied = useRef(false);
  const [linkInput, setLinkInput] = useState("");
  const [visibility, setVisibility] = useState<"all" | "selected">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [allowComments, setAllowComments] = useState(true);
  const [postKind, setPostKind] = useState<"general" | "listing">("general");
  const [listingTitle, setListingTitle] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingCurrency, setListingCurrency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    fileUrl: string;
    fileName: string;
    fileMimeType: string;
  } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PshareComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const others = useMemo(
    () => allUsers.filter((u) => u.id && u.id !== myUserId),
    [allUsers, myUserId]
  );

  useEffect(() => {
    if (handoffApplied.current || !initialPostBody?.trim()) return;
    setBody(initialPostBody.trim());
    handoffApplied.current = true;
  }, [initialPostBody]);

  const loadPosts = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await systemFetch("/api/comms/pshare/posts", { headers: commsDeviceHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPosts(data.posts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (highlightPostId && posts.length) {
      const el = cardRefs.current[highlightPostId];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
        onClearHighlight?.();
      }
    }
  }, [highlightPostId, posts, onClearHighlight]);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    const res = await systemFetch("/api/comms/upload", {
      method: "POST",
      headers: { "X-Device-Id": getCommsDeviceId() },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }
    setPendingFile({
      fileUrl: data.fileUrl,
      fileName: data.fileName || f.name,
      fileMimeType: data.mimeType || f.type,
    });
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: commsDeviceHeaders(),
        body: JSON.stringify({
          body: body.trim(),
          linkUrl: linkInput.trim() || null,
          fileUrl: pendingFile?.fileUrl || null,
          fileName: pendingFile?.fileName || null,
          fileMimeType: pendingFile?.fileMimeType || null,
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
      setPendingFile(null);
      setPostKind("general");
      setListingTitle("");
      setListingPrice("");
      setListingCurrency("");
      setVisibility("all");
      setSelectedUserIds([]);
      setAllowComments(true);
      if (data.post) setPosts((p) => [data.post, ...p]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (id: string) => {
    const res = await systemFetch(`/api/comms/pshare/posts/${id}/like`, {
      method: "POST",
      headers: commsDeviceHeaders(),
    });
    const data = await res.json();
    if (!res.ok) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
          : p
      )
    );
  };

  const loadComments = async (id: string) => {
    setLoadingComments((c) => ({ ...c, [id]: true }));
    try {
      const res = await systemFetch(`/api/comms/pshare/posts/${id}/comments`, { headers: commsDeviceHeaders() });
      const data = await res.json();
      if (res.ok) {
        setCommentsByPost((m) => ({ ...m, [id]: data.comments || [] }));
      }
    } finally {
      setLoadingComments((c) => ({ ...c, [id]: false }));
    }
  };

  const expandComments = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (!commentsByPost[id] && !loadingComments[id]) {
      void loadComments(id);
    }
  };

  const sendComment = async (id: string) => {
    const t = (commentDraft[id] || "").trim();
    if (!t) return;
    const res = await systemFetch(`/api/comms/pshare/posts/${id}/comments`, {
      method: "POST",
      headers: commsDeviceHeaders(),
      body: JSON.stringify({ body: t }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Comment failed");
      return;
    }
    setCommentDraft((d) => ({ ...d, [id]: "" }));
    setCommentsByPost((m) => ({
      ...m,
      [id]: [...(m[id] || []), data.comment],
    }));
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, commentCount: p.commentCount + 1 } : p))
    );
  };

  const removePost = async (id: string) => {
    if (!window.confirm("Delete this Pshare post?")) return;
    const res = await systemFetch(`/api/comms/pshare/posts/${id}`, {
      method: "DELETE",
      headers: commsDeviceHeaders(),
    });
    if (res.ok) setPosts((p) => p.filter((x) => x.id !== id));
  };

  const shareUrl = (postId: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set("tab", "pshare");
    u.searchParams.set("post", postId);
    return u.toString();
  };

  const copyShare = (postId: string) => {
    void navigator.clipboard.writeText(shareUrl(postId));
  };

  const systemShare = async (post: PsharePost) => {
    const text = [
      post.postKind === "listing" ? [post.listingTitle, post.listingPrice, post.listingCurrency].filter(Boolean).join(" ") : null,
      post.body,
      post.linkUrl,
      post.fileUrl ? resolveMediaUrl(post.fileUrl) : null,
    ]
      .filter(Boolean)
      .join(" — ");
    const url = shareUrl(post.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Pshare", text, url });
      } else {
        void navigator.clipboard.writeText(`${text}\n${url}`);
      }
    } catch {
      void navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-amber-500/25 p-3 sm:p-4">
        <div>
          <h2
            className="bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-200/90 bg-clip-text text-base font-bold text-transparent"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Pshare
          </h2>
          <p className="text-[11px] text-white/50">
            Community timeline — post updates, photos, and listings. Everyone (or a chosen audience) can like, comment, and share.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2">
          <span className="w-full text-[10px] font-mono uppercase tracking-wider text-white/45">Post type</span>
          <button
            type="button"
            onClick={() => setPostKind("general")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
              postKind === "general"
                ? "border-cyan-500/45 bg-cyan-500/15 text-cyan-100"
                : "border-white/10 text-white/55 hover:border-white/20"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Update / share
          </button>
          <button
            type="button"
            onClick={() => setPostKind("listing")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
              postKind === "listing"
                ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 text-white/55 hover:border-white/20"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            For sale / offer
          </button>
        </div>

        {postKind === "listing" && (
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-xl border border-emerald-500/20 bg-slate-950/60 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-emerald-500/40 focus:outline-none sm:col-span-3"
              placeholder="Title (e.g. Vintage synth, 2-bedroom sublet)"
              value={listingTitle}
              onChange={(e) => setListingTitle(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none"
              placeholder="Price (e.g. 1200)"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none sm:col-span-2"
              placeholder="Currency / label (e.g. USD, ZAR, or “negotiable”)"
              value={listingCurrency}
              onChange={(e) => setListingCurrency(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <textarea
            className="min-h-[4.5rem] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-cyan-500/40 focus:outline-none"
            placeholder={
              postKind === "listing"
                ? "Describe the item or service, condition, pickup, contact preference…"
                : "What do you want to share with the community?"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
              <input
                className="w-full min-w-0 border-0 bg-transparent py-1.5 text-xs text-white/85 placeholder:text-white/30 focus:outline-none"
                placeholder="Optional link (opens for viewers)"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-200/90 transition hover:bg-cyan-500/20">
              <Paperclip className="h-3.5 w-3.5" />
              Attach
              <input type="file" className="sr-only" onChange={onPickFile} />
            </label>
          </div>
          {pendingFile && (
            <p className="text-[11px] text-cyan-200/80">
              Attached: {pendingFile.fileName}
              <button
                type="button"
                className="ml-2 text-amber-300/90 underline"
                onClick={() => setPendingFile(null)}
              >
                remove
              </button>
            </p>
          )}

          <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-slate-950/40 p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/50">
              <span className="text-cyan-200/60">Who can see</span>
              <button
                type="button"
                onClick={() => setVisibility("all")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition ${
                  visibility === "all"
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-white/60"
                }`}
              >
                <Globe className="h-3 w-3" />
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setVisibility("selected")}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition ${
                  visibility === "selected"
                    ? "border-orange-500/45 bg-orange-500/15 text-orange-100"
                    : "border-white/10 text-white/60"
                }`}
              >
                <UserCheck className="h-3 w-3" />
                Selected
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-mono text-white/60">
              <input
                type="checkbox"
                className="rounded border-white/20"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
              />
              Allow comments
            </label>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-gradient-to-r from-amber-600/35 to-cyan-600/25 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/95 shadow-lg shadow-amber-500/15 transition hover:from-amber-500/45 hover:to-cyan-500/30 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </div>

          {visibility === "selected" && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-orange-500/20 bg-slate-950/50 p-2">
              <p className="mb-1 text-[10px] font-mono uppercase text-amber-200/55">Include users (required)</p>
              {others.length === 0 ? (
                <p className="text-xs text-white/40">No other users in directory yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {others.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
                        selectedUserIds.includes(u.id)
                          ? "border-orange-500/45 bg-orange-500/15 text-orange-100"
                          : "border-white/10 text-white/55 hover:border-white/25"
                      }`}
                    >
                      {u.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-300/90">{error}</p>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-2 sm:p-3">
        {loading && <p className="text-center text-sm text-white/40">Loading feed…</p>}
        {!loading && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-center">
            <p className="text-sm text-white/55">No posts yet — this is your system timeline.</p>
            <p className="mt-2 text-xs text-white/40">
              Share text and images, sell or offer something, and let others comment and react.
            </p>
          </div>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            ref={(el) => {
              cardRefs.current[post.id] = el;
            }}
            className="rounded-2xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_0_30px_-12px_rgba(251,146,60,0.22)]"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-cyan-100/90">{post.authorName}</p>
                <p className="text-[10px] font-mono text-white/40">{formatTime(post.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {post.postKind === "listing" && (
                  <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/35 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-mono uppercase text-emerald-200/90">
                    <ShoppingBag className="h-3 w-3" />
                    For sale
                  </span>
                )}
                {post.visibility === "selected" && (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase text-amber-200/85">
                    Selected
                  </span>
                )}
                {post.authorId === myUserId && (
                  <button
                    type="button"
                    onClick={() => void removePost(post.id)}
                    className="rounded p-1.5 text-white/40 transition hover:bg-rose-500/20 hover:text-rose-200"
                    title="Delete"
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {post.postKind === "listing" && (post.listingTitle || post.listingPrice || post.listingCurrency) && (
              <div className="mb-2 rounded-xl border border-emerald-500/20 bg-emerald-950/25 px-3 py-2">
                {post.listingTitle ? (
                  <p className="text-sm font-semibold text-emerald-100/95">{post.listingTitle}</p>
                ) : null}
                {(post.listingPrice || post.listingCurrency) ? (
                  <p className="mt-0.5 text-sm text-white/85">
                    {[post.listingCurrency, post.listingPrice].filter(Boolean).join(" ") || post.listingPrice}
                  </p>
                ) : null}
              </div>
            )}
            {post.body ? <p className="whitespace-pre-wrap text-sm text-white/90">{post.body}</p> : null}
            {post.linkUrl ? (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline"
              >
                {post.linkUrl} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {post.fileUrl && (
              <div className="mt-2">
                {post.fileMimeType?.startsWith("image/") ? (
                  <img
                    src={resolveMediaUrl(post.fileUrl)}
                    alt={post.fileName || ""}
                    className="max-h-72 max-w-full rounded-lg border border-white/10 object-contain"
                  />
                ) : post.fileMimeType?.startsWith("video/") ? (
                  <video
                    src={resolveMediaUrl(post.fileUrl)}
                    controls
                    className="max-h-64 max-w-full rounded-lg border border-white/10"
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/50 p-2 text-xs text-white/70">
                    <FileText className="h-4 w-4 text-amber-300/80" />
                    {post.fileName || "File"}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-2">
              <button
                type="button"
                onClick={() => void toggleLike(post.id)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition ${
                  post.likedByMe
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                    : "border-white/10 text-white/60 hover:border-white/25"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${post.likedByMe ? "fill-rose-300" : ""}`} />
                {post.likeCount}
              </button>
              <button
                type="button"
                onClick={() => expandComments(post.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:border-cyan-500/30"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount}
              </button>
              {post.fileUrl && (
                <a
                  href={resolveMediaUrl(post.fileUrl)}
                  download={post.fileName || undefined}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60"
                >
                  <Download className="h-3.5 w-3.5" />
                  Get file
                </a>
              )}
              {post.fileUrl && post.fileMimeType?.startsWith("image/") && (
                <a
                  href={resolveMediaUrl(post.fileUrl)}
                  download={post.fileName || "image"}
                  className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80"
                >
                  <ImageIcon className="h-3 w-3" />
                  download image
                </a>
              )}
              <button
                type="button"
                onClick={() => copyShare(post.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60"
              >
                <Share2 className="h-3.5 w-3.5" />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => void systemShare(post)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 px-2 py-1 text-[11px] text-amber-200/80"
              >
                <Share2 className="h-3.5 w-3.5" />
                System share
              </button>
            </div>
            {expanded[post.id] && (
              <div className="mt-2 border-t border-white/5 pt-2">
                {loadingComments[post.id] && (
                  <p className="text-[11px] text-white/40">Loading comments…</p>
                )}
                <ul className="mb-2 space-y-1.5">
                  {(commentsByPost[post.id] || []).map((c) => (
                    <li key={c.id} className="rounded-md bg-slate-900/50 px-2 py-1 text-xs">
                      <span className="font-medium text-cyan-200/80">{c.authorName}</span>{" "}
                      <span className="text-white/70">{c.body}</span>
                    </li>
                  ))}
                </ul>
                {post.allowComments ? (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-white/90"
                      placeholder="Write a comment…"
                      value={commentDraft[post.id] || ""}
                      onChange={(e) =>
                        setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void sendComment(post.id)}
                      className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-mono uppercase text-cyan-100"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/40">Comments are off for this post.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
