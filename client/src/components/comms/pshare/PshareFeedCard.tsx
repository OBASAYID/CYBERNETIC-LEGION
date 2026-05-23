import { useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ShoppingBag,
  Trash2,
  Volume2,
} from "lucide-react";
import {
  detectPshareMediaKind,
  formatPshareRelativeTime,
  pshareCategoryLabel,
  pshareMediaDownloadUrl,
  resolvePshareMediaUrl,
} from "../../../lib/pshare-utils";
import { guessCommsMediaMime, inferCommsMediaCategory } from "@shared/comms/media-formats";

export type PsharePost = {
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

export type PshareComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string | null;
};

function AuthorAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full border border-white/15 object-cover ring-2 ring-cyan-500/20`}
      />
    );
  }
  return (
    <span
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600/60 to-violet-600/50 font-semibold text-white ring-2 ring-cyan-500/15`}
    >
      {initials || "?"}
    </span>
  );
}

function PostMedia({
  post,
  onImageClick,
}: {
  post: PsharePost;
  onImageClick?: (url: string, alt: string) => void;
}) {
  if (!post.fileUrl) return null;
  const mime = guessCommsMediaMime(post.fileName, post.fileMimeType);
  const kind = detectPshareMediaKind(post.fileName, mime);
  const url = resolvePshareMediaUrl(post.fileUrl);
  const downloadUrl = pshareMediaDownloadUrl(post.fileUrl);

  if (kind === "image") {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(url, post.fileName || "Photo")}
        className="group relative block w-full overflow-hidden bg-black/50"
      >
        <img
          src={url}
          alt={post.fileName || "Post media"}
          className="max-h-[min(70vh,520px)] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  if (kind === "video") {
    return (
      <div className="bg-black/60">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[min(70vh,480px)] w-full"
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex items-center gap-3 border-y border-white/8 bg-gradient-to-r from-violet-950/40 to-cyan-950/30 px-4 py-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
          <Volume2 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/90">{post.fileName || "Audio"}</p>
          <audio src={url} controls className="mt-1 w-full" preload="metadata" />
        </div>
      </div>
    );
  }

  const cat = inferCommsMediaCategory(post.fileName, mime);
  return (
    <a
      href={downloadUrl}
      className="flex items-center gap-3 border-y border-white/8 bg-slate-900/60 px-4 py-3 transition hover:bg-slate-800/60"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
        <FileText className="h-5 w-5 text-cyan-300" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">{post.fileName || "Attachment"}</p>
        <p className="text-[11px] text-white/45">{pshareCategoryLabel(cat)} · Tap to download</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-white/40" />
    </a>
  );
}

function LinkPreview({ url }: { url: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-slate-900/50 p-3 transition hover:border-cyan-400/35"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
        <ExternalLink className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-cyan-100/90">{host}</p>
        <p className="truncate text-[11px] text-white/45">{url}</p>
      </div>
    </a>
  );
}

export function PshareFeedCard({
  post,
  myUserId,
  holoBlend,
  highlighted,
  cardRef,
  getAvatarForUser,
  commentsExpanded,
  comments,
  loadingComments,
  commentDraft,
  onCommentDraftChange,
  onToggleLike,
  onToggleComments,
  onSendComment,
  onDelete,
  onShareCopy,
  onShareSystem,
  onImageClick,
}: {
  post: PsharePost;
  myUserId: string;
  holoBlend?: boolean;
  highlighted?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  getAvatarForUser?: (userId: string) => string | null | undefined;
  commentsExpanded: boolean;
  comments: PshareComment[];
  loadingComments: boolean;
  commentDraft: string;
  onCommentDraftChange: (v: string) => void;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onSendComment: () => void;
  onDelete: () => void;
  onShareCopy: () => void;
  onShareSystem: () => void;
  onImageClick?: (url: string, alt: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatar = getAvatarForUser?.(post.authorId);
  const hasMedia = Boolean(post.fileUrl);
  const mediaKind = hasMedia
    ? detectPshareMediaKind(post.fileName, post.fileMimeType)
    : "none";

  const handleDoubleTapLike = () => {
    if (!post.likedByMe) onToggleLike();
  };

  return (
    <article
      ref={cardRef}
      className={`overflow-hidden rounded-2xl border bg-slate-950/70 shadow-xl backdrop-blur-sm transition ${
        highlighted
          ? "border-cyan-400/50 ring-2 ring-cyan-400/30"
          : holoBlend
            ? "border-white/10 shadow-[0_8px_40px_-12px_rgba(0,229,255,0.22)]"
            : "border-white/10 shadow-[0_8px_40px_-12px_rgba(251,146,60,0.18)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <AuthorAvatar name={post.authorName} avatarUrl={avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white/95">{post.authorName}</p>
            {post.postKind === "listing" && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200">
                <ShoppingBag className="h-3 w-3" />
                Listing
              </span>
            )}
            {post.visibility === "selected" && (
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium uppercase text-violet-200/90">
                Private
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/40">
            {formatPshareRelativeTime(post.createdAt)}
            {hasMedia && mediaKind !== "none" && (
              <span className="text-white/25"> · {mediaKind}</span>
            )}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"
            aria-label="Post options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 py-1 shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    onShareCopy();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onShareSystem();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share…
                </button>
                {post.authorId === myUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Listing block */}
      {post.postKind === "listing" &&
        (post.listingTitle || post.listingPrice || post.listingCurrency) && (
          <div className="mx-3 mb-3 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 to-slate-950/40 px-4 py-3">
            {post.listingTitle && (
              <p className="text-base font-bold text-emerald-50">{post.listingTitle}</p>
            )}
            {(post.listingPrice || post.listingCurrency) && (
              <p className="mt-1 text-lg font-semibold text-white">
                {[post.listingCurrency, post.listingPrice].filter(Boolean).join(" ")}
              </p>
            )}
          </div>
        )}

      {/* Caption above media (Instagram-style when both exist) */}
      {post.body && (
        <p
          className={`whitespace-pre-wrap px-3 text-[15px] leading-relaxed text-white/92 sm:px-4 ${
            hasMedia ? "pb-3" : "pb-2"
          }`}
        >
          {post.body}
        </p>
      )}

      {/* Full-bleed media */}
      {hasMedia && (
        <div onDoubleClick={handleDoubleTapLike} className="select-none">
          <PostMedia post={post} onImageClick={onImageClick} />
        </div>
      )}

      {post.linkUrl && <LinkPreview url={post.linkUrl} />}

      {/* Engagement stats */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className="flex items-center gap-3 px-3 py-2 text-[11px] text-white/45 sm:px-4">
          {post.likeCount > 0 && (
            <span>
              {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
            </span>
          )}
          {post.commentCount > 0 && (
            <button
              type="button"
              onClick={onToggleComments}
              className="hover:text-white/70"
            >
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center border-t border-white/8 px-1 py-1 sm:px-2">
        <button
          type="button"
          onClick={onToggleLike}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition ${
            post.likedByMe
              ? "text-rose-400"
              : "text-white/55 hover:bg-white/5 hover:text-rose-300"
          }`}
        >
          <Heart className={`h-[18px] w-[18px] ${post.likedByMe ? "fill-rose-400" : ""}`} />
          Like
        </button>
        <button
          type="button"
          onClick={onToggleComments}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-cyan-200"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          Comment
        </button>
        {post.fileUrl && (
          <a
            href={pshareMediaDownloadUrl(post.fileUrl)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-cyan-200"
          >
            <Download className="h-[18px] w-[18px]" />
            Save
          </a>
        )}
        <button
          type="button"
          onClick={onShareCopy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-cyan-200"
        >
          <Share2 className="h-[18px] w-[18px]" />
          Share
        </button>
      </div>

      {/* Comments thread */}
      {commentsExpanded && (
        <div className="border-t border-white/8 bg-black/25 px-3 py-3 sm:px-4">
          {loadingComments && (
            <p className="mb-2 text-[11px] text-white/40">Loading comments…</p>
          )}
          <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-2 text-sm">
                <AuthorAvatar
                  name={c.authorName}
                  avatarUrl={getAvatarForUser?.(c.authorId)}
                  size="sm"
                />
                <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-3 py-2">
                  <span className="font-semibold text-cyan-100/90">{c.authorName}</span>
                  <span className="ml-2 text-[10px] text-white/35">
                    {formatPshareRelativeTime(c.createdAt)}
                  </span>
                  <p className="mt-0.5 text-white/80">{c.body}</p>
                </div>
              </li>
            ))}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs text-white/40">No comments yet — start the conversation.</p>
            )}
          </ul>
          {post.allowComments ? (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-white/90 placeholder:text-white/35 focus:border-cyan-500/40 focus:outline-none"
                placeholder="Add a comment…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSendComment();
                  }
                }}
              />
              <button
                type="button"
                onClick={onSendComment}
                disabled={!commentDraft.trim()}
                className="shrink-0 rounded-full border border-cyan-500/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-40"
              >
                Post
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-white/40">Comments are turned off.</p>
          )}
        </div>
      )}
    </article>
  );
}
