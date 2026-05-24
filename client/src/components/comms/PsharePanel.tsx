import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { systemFetch } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "../../lib/comms-device-id";
import { ImagePlus, LayoutGrid, RefreshCw, Sparkles } from "lucide-react";
import {
  buildPshareAuthorTabs,
  filterPshareByAuthor,
  matchesPshareFilter,
  pshareMediaDownloadUrl,
  resolvePshareMediaUrl,
  type PshareAuthorFilter,
  type PshareFeedFilter,
} from "../../lib/pshare-utils";
import { PshareComposer } from "./pshare/PshareComposer";
import { PshareAuthorStrip } from "./pshare/PshareAuthorStrip";
import { PshareProfileHeader } from "./pshare/PshareProfileHeader";
import { PshareMediaGrid } from "./pshare/PshareMediaGrid";
import { PshareFeedCard, type PshareComment, type PsharePost } from "./pshare/PshareFeedCard";
import { PshareLightbox } from "./pshare/PshareLightbox";

type PshareUser = { id: string; displayName: string };
type PshareMainTab = "feed" | "upload";

function commsDeviceHeaders(userId?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
  };
  const uid = userId?.trim();
  if (uid) headers["X-User-Id"] = uid;
  return headers;
}

const FEED_FILTERS: { id: PshareFeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "media", label: "Photos & video" },
  { id: "listing", label: "Listings" },
  { id: "links", label: "Links" },
];

export function PsharePanel({
  myUserId,
  myDisplayName,
  allUsers,
  highlightPostId,
  onClearHighlight,
  initialPostBody,
  holoBlend = false,
  getAvatarForUser,
}: {
  myUserId: string;
  myDisplayName?: string;
  allUsers: PshareUser[];
  highlightPostId?: string | null;
  onClearHighlight?: () => void;
  initialPostBody?: string | null;
  holoBlend?: boolean;
  getAvatarForUser?: (userId: string) => string | null | undefined;
}) {
  const [posts, setPosts] = useState<PsharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<PshareMainTab>(initialPostBody?.trim() ? "upload" : "feed");
  const [feedFilter, setFeedFilter] = useState<PshareFeedFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<PshareAuthorFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PshareComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const displayName =
    myDisplayName?.trim() ||
    allUsers.find((u) => u.id === myUserId)?.displayName ||
    "You";

  const others = useMemo(
    () => allUsers.filter((u) => u.id && u.id !== myUserId),
    [allUsers, myUserId],
  );

  const authorTabs = useMemo(
    () => buildPshareAuthorTabs(posts, myUserId, displayName),
    [posts, myUserId, displayName],
  );

  const filteredPosts = useMemo(() => {
    const byAuthor = filterPshareByAuthor(posts, authorFilter, myUserId);
    return byAuthor.filter((p) => matchesPshareFilter(p, feedFilter));
  }, [posts, authorFilter, myUserId, feedFilter]);

  const profileLabel = useMemo(() => {
    if (authorFilter === "mine") return displayName;
    if (authorFilter === "all") return "Everyone";
    const tab = authorTabs.find((t) => t.id === authorFilter);
    return tab?.label || "Creator";
  }, [authorFilter, authorTabs, displayName]);

  const profilePosts = useMemo(() => {
    if (authorFilter === "all") return [];
    return filterPshareByAuthor(posts, authorFilter, myUserId).filter((p) =>
      matchesPshareFilter(p, feedFilter),
    );
  }, [posts, authorFilter, myUserId, feedFilter]);

  const showProfileView = mainTab === "feed" && authorFilter !== "all";

  const lightboxImages = useMemo(
    () =>
      posts
        .filter((p) => p.fileUrl && resolvePshareMediaUrl(p.fileUrl))
        .map((p) => ({
          url: resolvePshareMediaUrl(p.fileUrl)!,
          alt: p.fileName || p.authorName,
          downloadUrl: pshareMediaDownloadUrl(p.fileUrl),
        })),
    [posts],
  );

  const loadPosts = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else {
      setError(null);
      setLoading(true);
    }
    try {
      const res = await systemFetch("/api/comms/pshare/posts", {
        headers: commsDeviceHeaders(myUserId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPosts(data.posts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myUserId]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (initialPostBody?.trim()) setMainTab("upload");
  }, [initialPostBody]);

  useEffect(() => {
    if (highlightPostId && posts.length) {
      setMainTab("feed");
      const el = cardRefs.current[highlightPostId];
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
        onClearHighlight?.();
      }
    }
  }, [highlightPostId, posts, onClearHighlight]);

  const onPosted = (post: unknown) => {
    if (post && typeof post === "object" && "id" in post) {
      setPosts((p) => [post as PsharePost, ...p]);
      setMainTab("feed");
      setAuthorFilter("mine");
    } else {
      void loadPosts(true);
      setMainTab("feed");
      setAuthorFilter("mine");
    }
  };

  const toggleLike = async (id: string) => {
    const res = await systemFetch(`/api/comms/pshare/posts/${id}/like`, {
      method: "POST",
      headers: commsDeviceHeaders(myUserId),
    });
    const data = await res.json();
    if (!res.ok) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, likedByMe: data.liked, likeCount: data.likeCount } : p,
      ),
    );
  };

  const loadComments = async (id: string) => {
    setLoadingComments((c) => ({ ...c, [id]: true }));
    try {
      const res = await systemFetch(`/api/comms/pshare/posts/${id}/comments`, {
        headers: commsDeviceHeaders(myUserId),
      });
      const data = await res.json();
      if (res.ok) setCommentsByPost((m) => ({ ...m, [id]: data.comments || [] }));
    } finally {
      setLoadingComments((c) => ({ ...c, [id]: false }));
    }
  };

  const expandComments = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (!commentsByPost[id] && !loadingComments[id]) void loadComments(id);
  };

  const sendComment = async (id: string) => {
    const t = (commentDraft[id] || "").trim();
    if (!t) return;
    const res = await systemFetch(`/api/comms/pshare/posts/${id}/comments`, {
      method: "POST",
      headers: commsDeviceHeaders(myUserId),
      body: JSON.stringify({ body: t }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Comment failed");
      return;
    }
    setCommentDraft((d) => ({ ...d, [id]: "" }));
    setCommentsByPost((m) => ({ ...m, [id]: [...(m[id] || []), data.comment] }));
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, commentCount: p.commentCount + 1 } : p)),
    );
  };

  const removePost = async (id: string) => {
    if (!window.confirm("Delete this post?")) return;
    const res = await systemFetch(`/api/comms/pshare/posts/${id}`, {
      method: "DELETE",
      headers: commsDeviceHeaders(myUserId),
    });
    if (res.ok) {
      setPosts((p) => {
        const next = p.filter((x) => x.id !== id);
        const stillMine = next.some((x) => x.authorId === myUserId);
        if (authorFilter === "mine" && !stillMine) setAuthorFilter("all");
        return next;
      });
    }
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
      post.postKind === "listing"
        ? [post.listingTitle, post.listingPrice, post.listingCurrency].filter(Boolean).join(" ")
        : null,
      post.body,
      post.linkUrl,
      post.fileUrl ? resolvePshareMediaUrl(post.fileUrl) : null,
    ]
      .filter(Boolean)
      .join(" — ");
    const url = shareUrl(post.id);
    try {
      if (navigator.share) await navigator.share({ title: "Pshare", text, url });
      else void navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      void navigator.clipboard.writeText(url);
    }
  };

  const openLightbox = (url: string) => {
    const idx = lightboxImages.findIndex((img) => img.url === url);
    setLightbox({ index: idx >= 0 ? idx : 0 });
  };

  const scrollToPost = (postId: string) => {
    cardRefs.current[postId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const profileAvatar =
    authorFilter === "mine"
      ? getAvatarForUser?.(myUserId)
      : authorFilter !== "all"
        ? getAvatarForUser?.(authorFilter)
        : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-950/40 to-transparent">
      <header
        className={`sticky top-0 z-20 shrink-0 border-b backdrop-blur-xl ${
          holoBlend
            ? "border-cyan-500/20 bg-slate-950/85"
            : "border-amber-500/15 bg-slate-950/85"
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div>
            <h2
              className={`flex items-center gap-2 text-lg font-bold tracking-tight ${
                holoBlend
                  ? "bg-gradient-to-r from-cyan-200 via-sky-100 to-violet-200 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent"
              }`}
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              <Sparkles className="h-4 w-4 text-cyan-400/80" />
              Pshare
            </h2>
            <p className="text-[11px] text-white/45">Timeline · upload · creator profiles</p>
          </div>
          <button
            type="button"
            onClick={() => void loadPosts(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70 transition hover:border-cyan-500/30 hover:text-cyan-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Feed vs Upload */}
        <div className="mx-auto flex max-w-xl gap-2 px-3 pb-2 sm:px-4">
          <button
            type="button"
            onClick={() => setMainTab("feed")}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
              mainTab === "feed"
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-50"
                : "border-white/10 text-white/55 hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setMainTab("upload")}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
              mainTab === "upload"
                ? "border-violet-400/40 bg-violet-500/15 text-violet-50"
                : "border-white/10 text-white/55 hover:bg-white/5"
            }`}
          >
            <ImagePlus className="h-4 w-4" />
            Upload
          </button>
        </div>

        {mainTab === "feed" && (
          <>
            <PshareAuthorStrip
              tabs={authorTabs}
              activeId={authorFilter}
              onSelect={setAuthorFilter}
              getAvatarForUser={getAvatarForUser}
              myUserId={myUserId}
            />
            <div className="mx-auto flex max-w-xl gap-1 overflow-x-auto px-3 pb-2 sm:px-4">
              {FEED_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFeedFilter(id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition ${
                    feedFilter === id
                      ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-xl space-y-4 px-2 py-3 sm:px-3 sm:py-4">
          {mainTab === "upload" && (
            <>
              <div className="rounded-xl border border-violet-500/20 bg-violet-950/25 px-3 py-2 text-xs text-violet-100/90">
                Add photos, videos, listings, or updates here. After you publish, your profile tab
                appears on the Timeline with everything you&apos;ve shared.
              </div>
              <PshareComposer
                myUserId={myUserId}
                others={others}
                holoBlend={holoBlend}
                initialBody={initialPostBody}
                alwaysExpanded
                onPosted={onPosted}
                onError={(msg) => setError(msg || null)}
              />
            </>
          )}

          {mainTab === "feed" && error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          {mainTab === "feed" && loading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-white/8 bg-slate-950/50 p-4"
                >
                  <div className="mb-3 flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-white/10" />
                      <div className="h-2 w-16 rounded bg-white/5" />
                    </div>
                  </div>
                  <div className="h-48 rounded-xl bg-white/5" />
                </div>
              ))}
            </div>
          )}

          {mainTab === "feed" && !loading && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/12 bg-slate-950/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-white/60">No posts on the timeline yet</p>
              <p className="mt-2 text-xs text-white/40">
                Open the Upload tab to share your first photo, video, or update.
              </p>
              <button
                type="button"
                onClick={() => setMainTab("upload")}
                className="mt-4 rounded-full border border-cyan-500/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
              >
                Go to Upload
              </button>
            </div>
          )}

          {mainTab === "feed" && !loading && showProfileView && (
            <>
              <PshareProfileHeader
                label={profileLabel}
                posts={profilePosts}
                avatarUrl={profileAvatar}
                isMe={authorFilter === "mine"}
                onUploadClick={() => setMainTab("upload")}
              />
              <PshareMediaGrid
                posts={profilePosts}
                onSelectPost={scrollToPost}
                onImageClick={openLightbox}
              />
            </>
          )}

          {mainTab === "feed" &&
            !loading &&
            filteredPosts.length === 0 &&
            posts.length > 0 && (
              <div className="rounded-2xl border border-dashed border-white/12 bg-slate-950/40 px-6 py-8 text-center">
                <p className="text-sm text-white/55">No posts match this filter.</p>
              </div>
            )}

          {mainTab === "feed" &&
            filteredPosts.map((post) => (
              <PshareFeedCard
                key={post.id}
                post={post}
                myUserId={myUserId}
                holoBlend={holoBlend}
                highlighted={highlightPostId === post.id}
                getAvatarForUser={getAvatarForUser}
                cardRef={(el) => {
                  cardRefs.current[post.id] = el;
                }}
                commentsExpanded={Boolean(expanded[post.id])}
                comments={commentsByPost[post.id] || []}
                loadingComments={Boolean(loadingComments[post.id])}
                commentDraft={commentDraft[post.id] || ""}
                onCommentDraftChange={(v) =>
                  setCommentDraft((d) => ({ ...d, [post.id]: v }))
                }
                onToggleLike={() => void toggleLike(post.id)}
                onToggleComments={() => expandComments(post.id)}
                onSendComment={() => void sendComment(post.id)}
                onDelete={() => void removePost(post.id)}
                onShareCopy={() => copyShare(post.id)}
                onShareSystem={() => void systemShare(post)}
                onImageClick={openLightbox}
              />
            ))}
        </div>
      </div>

      {lightbox && (
        <PshareLightbox
          images={lightboxImages}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox({ index: i })}
        />
      )}
    </div>
  );
}
