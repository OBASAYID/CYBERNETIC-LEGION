import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Film,
  Flame,
  Heart,
  MessageCircle,
  Share2,
  Zap,
} from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { getCommsDeviceId } from "../../../../client/src/lib/comms-device-id";
import { formatPshareRelativeTime } from "../../../../client/src/lib/pshare-utils";
import { PSHARE_REACTION_EMOJIS } from "@shared/comms/pshare-engagement";
import { normalizePostKind, pshareKindLabel } from "@shared/comms/pshare-studio";
import { PshareDiamondBadge } from "./pshare-diamond-badge";
import { PshareMediaPreview } from "./pshare-media-preview";
import type { PshareComment, PsharePost } from "./pshare-types";

const C = {
  crimson: "#E70011",
  border: "rgba(255,255,255,0.08)",
  sidebarInput: "#222222",
} as const;

type PsharePostCardProps = {
  post: PsharePost;
  myUserId: string;
  variant?: "feed" | "console";
};

function pshareHeaders(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
    "X-User-Id": userId,
  };
}

export function PsharePostCard({ post, myUserId, variant = "feed" }: PsharePostCardProps) {
  const qc = useQueryClient();
  const [local, setLocal] = useState(post);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PshareComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const isConsole = variant === "console";

  useEffect(() => {
    setLocal(post);
  }, [post]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
  }, [qc]);

  const patchPost = (patch: Partial<PsharePost>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const likeMut = useMutation({
    mutationFn: async () => {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/like`, {
        method: "POST",
        headers: pshareHeaders(myUserId),
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json();
    },
    onSuccess: (data) => {
      patchPost({
        likedByMe: data.liked,
        likeCount: data.likeCount,
        diamondGrade: data.diamondGrade ?? local.diamondGrade,
      });
      invalidate();
    },
  });

  const reactionMut = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/reaction`, {
        method: "POST",
        headers: pshareHeaders(myUserId),
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Reaction failed");
      return res.json();
    },
    onSuccess: (data) => {
      patchPost({
        myReaction: data.myReaction,
        reactionSummary: data.reactionSummary,
        reactionCount: data.reactionCount,
        diamondGrade: data.diamondGrade ?? local.diamondGrade,
      });
      setEmojiOpen(false);
      invalidate();
    },
  });

  const shareMut = useMutation({
    mutationFn: async () => {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/share`, {
        method: "POST",
        headers: pshareHeaders(myUserId),
      });
      if (!res.ok) throw new Error("Share failed");
      return res.json();
    },
    onSuccess: async (data) => {
      patchPost({
        shareCount: data.shareCount,
        diamondGrade: data.diamondGrade ?? local.diamondGrade,
      });
      const url = `${window.location.origin}/comms?tab=pshare&post=${local.id}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Pshare · ${local.authorName ?? "Operator"}`,
            text: local.body?.trim() || "Check this Pshare post",
            url,
          });
        } else {
          await navigator.clipboard.writeText(url);
          setShareMsg("Link copied");
        }
      } catch {
        try {
          await navigator.clipboard.writeText(url);
          setShareMsg("Link copied");
        } catch {
          setShareMsg("Shared");
        }
      }
      window.setTimeout(() => setShareMsg(null), 2000);
      invalidate();
    },
  });

  const hypeMut = useMutation({
    mutationFn: async () => {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/hype`, {
        method: "POST",
        headers: pshareHeaders(myUserId),
      });
      if (!res.ok) throw new Error("Hype failed");
      return res.json();
    },
    onSuccess: (data) => {
      patchPost({
        hypedByMe: data.hyped,
        hypeCount: data.hypeCount,
        recentHypeCount: data.recentHypeCount,
        isTrending: data.isTrending,
        diamondGrade: data.diamondGrade ?? local.diamondGrade,
      });
      invalidate();
    },
  });

  const commentMut = useMutation({
    mutationFn: async (body: string) => {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/comments`, {
        method: "POST",
        headers: pshareHeaders(myUserId),
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Comment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCommentDraft("");
      setComments((prev) => [...prev, data.comment]);
      patchPost({ commentCount: (local.commentCount ?? 0) + 1 });
      invalidate();
    },
  });

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await systemFetch(`/api/comms/pshare/posts/${local.id}/comments`, {
        headers: pshareHeaders(myUserId),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data.comments) ? data.comments : []);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) void loadComments();
  };

  const topReactions = Object.entries(local.reactionSummary ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const grade = (local.diamondGrade ?? 0) as 0 | 1 | 2 | 3 | 4 | 5;
  const postKind = normalizePostKind(local.postKind);
  const isStudioPost = postKind === "clip" || postKind === "story" || postKind === "reel";
  const kindLabel = pshareKindLabel(postKind);
  const durationLabel =
    local.durationSec && local.durationSec > 0
      ? `${Math.round(local.durationSec)}s`
      : null;

  return (
    <div
      className={`overflow-hidden rounded-xl ${local.isTrending ? "ring-1 ring-rose-500/40" : ""}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${local.isTrending ? "rgba(231,0,17,0.35)" : C.border}`,
      }}
    >
      <div className={`px-3 ${isConsole ? "py-2" : "py-2.5"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[10px] font-semibold text-rose-300/90">
                {local.authorName ?? "Operator"}
              </p>
              {local.isTrending && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                  style={{ background: `${C.crimson}22`, color: C.crimson }}
                >
                  <Flame className="h-2.5 w-2.5" />
                  Trending
                </span>
              )}
              {isStudioPost && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                  style={{ background: "rgba(56,189,248,0.12)", color: "rgb(125,211,252)" }}
                >
                  {postKind === "story" ? (
                    <Clapperboard className="h-2.5 w-2.5" />
                  ) : (
                    <Film className="h-2.5 w-2.5" />
                  )}
                  {kindLabel}
                  {durationLabel ? ` · ${durationLabel}` : ""}
                </span>
              )}
            </div>
            {local.createdAt && (
              <span className="text-[9px] text-white/30">
                {formatPshareRelativeTime(local.createdAt)}
              </span>
            )}
          </div>
          <PshareDiamondBadge grade={grade} variant={isConsole ? "compact" : "full"} />
        </div>
        {local.body?.trim() && (
          <p className={`mt-1 text-white/85 whitespace-pre-wrap ${isConsole ? "text-[11px] line-clamp-3" : "text-[12px]"}`}>
            {local.body}
          </p>
        )}
      </div>

      {local.fileUrl && (
        <div className="px-3 pb-2">
          <PshareMediaPreview post={local} variant={isConsole ? "console" : "feed"} />
        </div>
      )}

      {local.linkUrl && (
        <div className="px-3 pb-2">
          <a
            href={local.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[11px] text-sky-300/90 hover:underline"
          >
            {local.linkUrl}
          </a>
        </div>
      )}

      {(local.likeCount || local.commentCount || local.shareCount || local.hypeCount || topReactions.length) ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-1.5 text-[9px] text-white/40">
          {local.likeCount ? <span>{local.likeCount} likes</span> : null}
          {local.commentCount ? <span>{local.commentCount} comments</span> : null}
          {local.shareCount ? <span>{local.shareCount} shares</span> : null}
          {local.hypeCount ? <span>{local.hypeCount} hype</span> : null}
          {topReactions.map(([emoji, n]) => (
            <span key={emoji}>{emoji} {n}</span>
          ))}
        </div>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-0.5 border-t px-1 py-1"
        style={{ borderColor: C.border }}
      >
        <button
          type="button"
          disabled={likeMut.isPending}
          onClick={() => likeMut.mutate()}
          className={`flex flex-1 min-w-[3.5rem] items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition ${
            local.likedByMe ? "text-rose-400" : "text-white/50 hover:bg-white/[0.04] hover:text-rose-300"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${local.likedByMe ? "fill-rose-400" : ""}`} />
          Like
        </button>

        <div className="relative flex flex-1 min-w-[3.5rem]">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className={`flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition ${
              local.myReaction ? "text-amber-300" : "text-white/50 hover:bg-white/[0.04]"
            }`}
          >
            <span className="text-sm leading-none">{local.myReaction ?? "😊"}</span>
            React
          </button>
          {emojiOpen && (
            <>
              <button type="button" className="fixed inset-0 z-10" aria-label="Close" onClick={() => setEmojiOpen(false)} />
              <div
                className="absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-0.5 rounded-xl border border-white/10 bg-[#1a1a1a] p-1.5 shadow-xl"
              >
                {PSHARE_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={reactionMut.isPending}
                    onClick={() => reactionMut.mutate(emoji)}
                    className={`rounded-lg px-1.5 py-1 text-base hover:bg-white/10 ${
                      local.myReaction === emoji ? "bg-white/10 ring-1 ring-rose-500/50" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleComments}
          className="flex flex-1 min-w-[3.5rem] items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white/80"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comment
        </button>

        <button
          type="button"
          disabled={shareMut.isPending}
          onClick={() => shareMut.mutate()}
          className="flex flex-1 min-w-[3.5rem] items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-sky-200"
        >
          <Share2 className="h-3.5 w-3.5" />
          {shareMsg ?? "Share"}
        </button>

        <button
          type="button"
          disabled={hypeMut.isPending}
          onClick={() => hypeMut.mutate()}
          className={`flex flex-1 min-w-[3.5rem] items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition ${
            local.hypedByMe
              ? "text-amber-400"
              : "text-white/50 hover:bg-white/[0.04] hover:text-amber-300"
          }`}
          title="Hype keeps this post trending"
        >
          <Zap className={`h-3.5 w-3.5 ${local.hypedByMe ? "fill-amber-400" : ""}`} />
          Hype
        </button>
      </div>

      {commentsOpen && (
        <div className="border-t px-3 py-2" style={{ borderColor: C.border, background: "rgba(0,0,0,0.25)" }}>
          {loadingComments && <p className="mb-2 text-[10px] text-white/35">Loading…</p>}
          <ul className="mb-2 max-h-36 space-y-1.5 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg px-2 py-1.5 text-[11px]" style={{ background: C.sidebarInput }}>
                <span className="font-semibold text-rose-200/90">{c.authorName ?? "Operator"}</span>
                <span className="ml-2 text-[9px] text-white/30">
                  {c.createdAt ? formatPshareRelativeTime(c.createdAt) : ""}
                </span>
                <p className="mt-0.5 text-white/75">{c.body}</p>
              </li>
            ))}
            {!loadingComments && comments.length === 0 && (
              <p className="text-[10px] text-white/35">No comments yet.</p>
            )}
          </ul>
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && commentDraft.trim()) commentMut.mutate(commentDraft.trim());
              }}
              placeholder="Add a comment…"
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-white outline-none placeholder:text-white/30"
            />
            <button
              type="button"
              disabled={!commentDraft.trim() || commentMut.isPending}
              onClick={() => commentMut.mutate(commentDraft.trim())}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-rose-300 disabled:opacity-40"
              style={{ border: `1px solid ${C.crimson}44`, background: `${C.crimson}18` }}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
