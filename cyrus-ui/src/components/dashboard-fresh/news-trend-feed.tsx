import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Newspaper,
  TrendingUp,
  Share2,
  Send,
  Heart,
  MessageCircle,
  ExternalLink,
  Building2,
  Globe,
  Zap,
  Flame,
  Radio,
  Image,
  Link2,
  RefreshCw,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import { systemFetch } from "@/lib/system-api";

/* ── Types ──────────────────────────────────────────────────────────── */
interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  category?: string;
  url?: string;
  publishedAt?: string;
  imageUrl?: string;
}

interface PsharePost {
  id: string;
  authorId: string;
  authorName?: string;
  body: string;
  postKind?: string;
  linkUrl?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function categoryColor(cat?: string) {
  const map: Record<string, string> = {
    technology: "#06b6d4",
    science: "#7c3aed",
    finance: "#22c55e",
    health: "#e11d48",
    politics: "#f59e0b",
    ai: "#8b5cf6",
    crypto: "#f97316",
    world: "#60a5fa",
  };
  const key = (cat ?? "").toLowerCase();
  return map[key] ?? "#6b7280";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

/* ── Sample seed data when API has nothing ─────────────────────────── */
const SEED_NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "CYRUS QAI Sets New Benchmark in Multi-Modal Reasoning Tasks",
    summary: "The OMEGA-TIER system achieves state-of-the-art performance across vision, language and code understanding benchmarks.",
    source: "TechCrunch",
    category: "AI",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    url: "#",
  },
  {
    id: "n2",
    title: "Africa's Sovereign AI Revolution: CYRUS Leads the Way",
    summary: "African nations are building autonomous intelligence infrastructure led by CYRUS — moving beyond dependency on foreign AI platforms.",
    source: "Wired",
    category: "Technology",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    url: "#",
  },
  {
    id: "n3",
    title: "Quantum Neural Networks Achieve 40× Speedup in Drug Discovery",
    summary: "Researchers using quantum-enhanced AI systems have dramatically cut the time required to identify viable drug candidates.",
    source: "Nature",
    category: "Science",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    url: "#",
  },
  {
    id: "n4",
    title: "Global Crypto Markets Surge as AI Trading Platforms Gain Adoption",
    summary: "Institutional investors are turning to AI-powered trading systems as digital asset markets see renewed bullish momentum.",
    source: "Bloomberg",
    category: "Crypto",
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    url: "#",
  },
  {
    id: "n5",
    title: "Drone Swarm Technology Achieves Civilian Certification in EU",
    summary: "Multi-drone coordination systems pass European Aviation Safety Agency certification, opening commercial airspace to swarm operations.",
    source: "Aviation Week",
    category: "Technology",
    publishedAt: new Date(Date.now() - 18000000).toISOString(),
    url: "#",
  },
];

const SEED_PSHARE: PsharePost[] = [
  {
    id: "p1",
    authorId: "cyrus-corp",
    authorName: "CYRUS Systems",
    body: "🚀 CYRUS v3.0 OMEGA-TIER is now live across all enterprise instances. Vision fusion, document collaboration and real-time research are all active. Reach out to your operator for access.",
    postKind: "announcement",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    likeCount: 47,
    commentCount: 12,
  },
  {
    id: "p2",
    authorId: "delta-labs",
    authorName: "Delta AI Labs",
    body: "We just integrated CYRUS into our drug discovery pipeline. The Medical Diagnostics module identified 3 novel compound candidates in under 6 minutes. Extraordinary capability.",
    postKind: "research",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    likeCount: 89,
    commentCount: 23,
  },
  {
    id: "p3",
    authorId: "sentinel-sec",
    authorName: "Sentinel Security Corp",
    body: "pshare: Our red team ran a full penetration assessment on the CYRUS Security Module. AES-256-GCM holds. Zero critical findings. Deploying to production next week.",
    postKind: "security",
    createdAt: new Date(Date.now() - 9000000).toISOString(),
    likeCount: 34,
    commentCount: 7,
  },
];

/* ══════════════════════════════════════════════════════════════════════
   NEWS CARD
══════════════════════════════════════════════════════════════════════ */
function NewsCard({ item }: { item: NewsItem }) {
  const color = categoryColor(item.category);
  return (
    <a
      href={item.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.015] hover:-translate-y-0.5 cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
        }}
      >
        {/* Top shimmer on hover */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }}
        />

        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Globe className="h-4 w-4" style={{ color }} strokeWidth={1.6} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Category + source + time */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
                style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
              >
                {item.category ?? "General"}
              </span>
              {item.source && (
                <span className="text-[9px] font-mono text-white/30">{item.source}</span>
              )}
              {item.publishedAt && (
                <span className="text-[9px] font-mono text-white/20">{timeAgo(item.publishedAt)}</span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-bold text-white/85 leading-snug mb-1.5 group-hover:text-white transition-colors">
              {item.title}
            </p>

            {/* Summary */}
            {item.summary && (
              <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{item.summary}</p>
            )}
          </div>

          <ExternalLink className="h-3.5 w-3.5 text-white/15 group-hover:text-white/50 transition-colors shrink-0 mt-1" />
        </div>
      </div>
    </a>
  );
}

/* ── Trend chip ─────────────────────────────────────────────────────── */
function TrendChip({ label, color, rank }: { label: string; color: string; rank: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-all hover:brightness-125"
      style={{ background: `${color}0e`, border: `1px solid ${color}20` }}
    >
      <span className="text-[9px] font-mono text-white/25 w-3 text-right">{rank}</span>
      <Flame className="h-3 w-3 shrink-0" style={{ color }} strokeWidth={2} />
      <p className="text-[10px] font-semibold text-white/65 truncate">{label}</p>
      <TrendingUp className="h-2.5 w-2.5 text-white/20 ml-auto shrink-0" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PSHARE CARD
══════════════════════════════════════════════════════════════════════ */
function PshareCard({ post, onLike, compact = false }: { post: PsharePost; onLike: (id: string) => void; compact?: boolean }) {
  const kindMeta: Record<string, { color: string; label: string; icon: typeof Share2 }> = {
    announcement: { color: "#e11d48", label: "Announcement", icon: Radio },
    research:     { color: "#7c3aed", label: "Research",     icon: Zap    },
    security:     { color: "#f59e0b", label: "Security",     icon: BadgeCheck },
    general:      { color: "#06b6d4", label: "Post",         icon: Share2 },
  };
  const meta = kindMeta[post.postKind ?? "general"] ?? kindMeta.general;
  const KindIcon = meta.icon;
  const aColor = categoryColor(post.authorName ?? "");

  /* ── Compact card for the dock ── */
  if (compact) {
    return (
      <div
        className="shrink-0 relative overflow-hidden rounded-xl p-2.5 flex flex-col gap-1.5 cursor-pointer hover:brightness-110 transition-all"
        style={{
          width: 200,
          background: `${meta.color}07`,
          border: `1px solid ${meta.color}18`,
          height: "calc(100% - 4px)",
        }}
      >
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ background: meta.color }} />
        <div className="pl-2.5 flex flex-col gap-1.5 h-full">
          {/* Author row */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[7px] font-black text-white"
              style={{ background: `${aColor}25`, border: `1px solid ${aColor}35` }}
            >
              {initials(post.authorName ?? post.authorId)}
            </div>
            <p className="text-[8px] font-bold text-white/70 truncate flex-1">{post.authorName ?? post.authorId}</p>
            <div
              className="flex items-center gap-0.5 rounded-full px-1 py-0.5 shrink-0"
              style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}22` }}
            >
              <KindIcon className="h-2 w-2" style={{ color: meta.color }} strokeWidth={2} />
              <p className="text-[6px] font-mono uppercase" style={{ color: meta.color }}>{meta.label}</p>
            </div>
          </div>
          {/* Body */}
          <p className="text-[8px] text-white/55 leading-snug line-clamp-4 flex-1">{post.body}</p>
          {/* Footer */}
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => onLike(post.id)} className="flex items-center gap-1 transition-all hover:scale-110">
              <Heart className="h-2.5 w-2.5" style={{ color: post.isLiked ? "#e11d48" : "rgba(255,255,255,0.2)" }} fill={post.isLiked ? "#e11d48" : "none"} strokeWidth={2} />
              <span className="text-[7px] font-mono text-white/25">{post.likeCount ?? 0}</span>
            </button>
            <button type="button" className="flex items-center gap-1">
              <MessageCircle className="h-2.5 w-2.5 text-white/20" strokeWidth={2} />
              <span className="text-[7px] font-mono text-white/25">{post.commentCount ?? 0}</span>
            </button>
            <p className="text-[6px] font-mono text-white/15 ml-auto">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Full card ── */
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200 hover:brightness-105"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
      }}
    >
      <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full" style={{ background: meta.color }} />
      <div className="pl-3">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
            style={{ background: `${aColor}25`, border: `1.5px solid ${aColor}40` }}
          >
            {initials(post.authorName ?? post.authorId)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-white/80">{post.authorName ?? post.authorId}</p>
              <BadgeCheck className="h-3 w-3 text-cyan-400" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}25` }}
              >
                <KindIcon className="h-2.5 w-2.5" style={{ color: meta.color }} strokeWidth={2} />
                <p className="text-[7px] font-mono uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</p>
              </div>
              <p className="text-[9px] font-mono text-white/20">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <Building2 className="h-4 w-4 text-white/15 shrink-0" />
        </div>
        <p className="text-sm text-white/70 leading-relaxed mb-3">{post.body}</p>
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 transition-all hover:brightness-125"
            style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <Link2 className="h-3 w-3 text-cyan-400/60 shrink-0" />
            <p className="text-[10px] text-cyan-400/60 truncate">{post.linkUrl}</p>
            <ExternalLink className="h-2.5 w-2.5 text-cyan-400/40 ml-auto shrink-0" />
          </a>
        )}
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onLike(post.id)} className="flex items-center gap-1.5 transition-all hover:scale-110 group/like">
            <Heart className="h-3.5 w-3.5 transition-colors" style={{ color: post.isLiked ? "#e11d48" : "rgba(255,255,255,0.2)" }} fill={post.isLiked ? "#e11d48" : "none"} strokeWidth={2} />
            <span className="text-[9px] font-mono text-white/30 group-hover/like:text-white/60 transition-colors">{post.likeCount ?? 0}</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 group/comment">
            <MessageCircle className="h-3.5 w-3.5 text-white/20 group-hover/comment:text-white/50 transition-colors" strokeWidth={2} />
            <span className="text-[9px] font-mono text-white/30 group-hover/comment:text-white/60 transition-colors">{post.commentCount ?? 0}</span>
          </button>
          <button type="button" className="flex items-center gap-1 ml-auto group/share">
            <Share2 className="h-3 w-3 text-white/15 group-hover/share:text-white/45 transition-colors" strokeWidth={2} />
            <span className="text-[9px] font-mono text-white/20 group-hover/share:text-white/50 transition-colors">pshare</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Compose box ─────────────────────────────────────────────────────── */
function PshareCompose({ onPost, compact = false }: { onPost: (body: string, kind: string) => void; compact?: boolean }) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("general");
  const [loading, setLoading] = useState(false);

  const kinds = [
    { value: "general",      label: "Post",         color: "#06b6d4" },
    { value: "announcement", label: "Announce",     color: "#e11d48" },
    { value: "research",     label: "Research",     color: "#7c3aed" },
  ];

  const submit = async () => {
    const t = body.trim();
    if (!t || loading) return;
    setLoading(true);
    try {
      await onPost(t, kind);
      setBody("");
    } finally {
      setLoading(false);
    }
  };

  /* ── Compact version for dock tile ── */
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Kind pills */}
        <div className="flex flex-wrap gap-1">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className="rounded-full px-1.5 py-0.5 text-[6px] font-mono uppercase transition-all"
              style={{
                background: kind === k.value ? `${k.color}20` : "transparent",
                border: `1px solid ${kind === k.value ? k.color + "40" : "rgba(255,255,255,0.08)"}`,
                color: kind === k.value ? k.color : "rgba(255,255,255,0.3)",
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share with the network…"
          rows={3}
          className="w-full resize-none rounded-lg px-2 py-1.5 text-[8px] text-white/70 placeholder:text-white/20 focus:outline-none flex-1"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            fontFamily: "inherit",
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || loading}
          className="flex items-center justify-center gap-1 rounded-lg py-1 text-[7px] font-black transition-all hover:scale-105 disabled:opacity-40"
          style={{
            background: "linear-gradient(90deg, rgba(225,29,72,0.3), rgba(124,58,237,0.25))",
            border: "1px solid rgba(225,29,72,0.3)",
            color: "#fff",
            fontFamily: "'Orbitron', system-ui",
          }}
        >
          {loading ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
          {loading ? "POSTING…" : "PSHARE"}
        </button>
      </div>
    );
  }

  /* ── Full compose ── */
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Share2 className="h-3.5 w-3.5 text-white/25" strokeWidth={1.8} />
        <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mr-2">pshare post</p>
        {kinds.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className="rounded-full px-2.5 py-0.5 text-[8px] font-mono uppercase tracking-wide transition-all"
            style={{
              background: kind === k.value ? `${k.color}20` : "transparent",
              border: `1px solid ${kind === k.value ? k.color + "40" : "rgba(255,255,255,0.06)"}`,
              color: kind === k.value ? k.color : "rgba(255,255,255,0.3)",
            }}
          >
            {k.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a post, announcement or research note with the CYRUS network…"
        rows={3}
        className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          fontFamily: "inherit",
        }}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-1 text-white/25 hover:text-white/50 transition-colors">
            <Image className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="text-[9px]">Image</span>
          </button>
          <button type="button" className="flex items-center gap-1 text-white/25 hover:text-white/50 transition-colors">
            <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span className="text-[9px]">Link</span>
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || loading}
          className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-40"
          style={{
            background: "linear-gradient(90deg, rgba(225,29,72,0.3), rgba(124,58,237,0.25))",
            border: "1px solid rgba(225,29,72,0.35)",
            color: "#fff",
            fontFamily: "'Orbitron', system-ui",
          }}
        >
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          {loading ? "Posting…" : "pshare"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT — NewsTrendFeed
   compact=true → dock layout (horizontal scroll, no outer padding)
══════════════════════════════════════════════════════════════════════ */
export function NewsTrendFeed({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<"news" | "pshare">("news");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  /* ── News query ── */
  const { data: rawNews = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/comms/news"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/news");
      if (!r.ok) return SEED_NEWS;
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d?.items ?? d?.news ?? [];
      return arr.length > 0 ? arr : SEED_NEWS;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  /* ── Pshare query ── */
  const { data: rawPosts = [], isLoading: postsLoading } = useQuery<PsharePost[]>({
    queryKey: ["/api/comms/pshare/posts"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/pshare/posts");
      if (!r.ok) return SEED_PSHARE;
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d?.posts ?? [];
      return arr.length > 0 ? arr : SEED_PSHARE;
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  /* ── Pshare post mutation ── */
  const postMutation = useMutation({
    mutationFn: async ({ body, kind }: { body: string; kind: string }) => {
      const r = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, postKind: kind }),
      });
      if (!r.ok) throw new Error("Post failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] }),
  });

  const handlePost = async (body: string, kind: string) => {
    await postMutation.mutateAsync({ body, kind });
  };

  const handleLike = async (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      await systemFetch(`/api/comms/pshare/posts/${postId}/like`, { method: "POST" });
    } catch {/* silent */}
  };

  const posts = rawPosts.map((p) => ({ ...p, isLiked: likedPosts.has(p.id) }));

  const TRENDS = [
    { label: "Quantum AI Processing",    color: "#7c3aed" },
    { label: "CYRUS Vision Fusion",      color: "#06b6d4" },
    { label: "Drone Swarm Coordination", color: "#f97316" },
    { label: "African Tech Sovereignty", color: "#22c55e" },
    { label: "Neural Language Models",   color: "#e11d48" },
    { label: "Crypto & Forex AI",        color: "#eab308" },
    { label: "Medical AI Diagnostics",   color: "#f43f5e" },
    { label: "Real-Time Edge Computing", color: "#0891b2" },
  ];

  /* ── Compact dock layout ─────────────────────────────────────────── */
  if (compact) {
    return (
      <div className="flex h-full">
        {/* Tab switcher — vertical left strip */}
        <div
          className="flex flex-col gap-1 p-2 shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)", width: 90 }}
        >
          {([
            { id: "news"   as const, label: "NEWS",   icon: Newspaper, color: "#06b6d4" },
            { id: "pshare" as const, label: "PSHARE", icon: Share2,    color: "#e11d48" },
          ]).map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex flex-col items-center gap-1 rounded-xl py-2 px-1 text-[7px] font-black tracking-[0.2em] transition-all duration-200"
              style={{
                background: tab === id ? `${color}15` : "transparent",
                border: `1px solid ${tab === id ? color + "30" : "transparent"}`,
                color: tab === id ? "#fff" : "rgba(255,255,255,0.3)",
                fontFamily: "'Orbitron', system-ui",
              }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: tab === id ? color : undefined }} strokeWidth={1.8} />
              {label}
            </button>
          ))}

          {/* Network stats mini */}
          <div className="mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { label: "OPS",    value: "2.8k", color: "#22c55e" },
              { label: "POSTS",  value: "1.2k", color: "#06b6d4" },
              { label: "SCANS",  value: "9.3k", color: "#7c3aed" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center py-1">
                <p className="text-[9px] font-black tabular-nums" style={{ color, fontFamily: "'Orbitron', system-ui" }}>{value}</p>
                <p className="text-[6px] font-mono text-white/20 tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content — horizontal scrolling cards */}
        <div
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}
        >
          {tab === "news" && (
            <div className="flex gap-2 p-2 h-full items-start">
              {/* Trending strip */}
              <div
                className="shrink-0 rounded-xl p-2.5 h-full flex flex-col gap-1.5 overflow-y-auto"
                style={{ width: 160, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}
              >
                <p className="text-[7px] font-mono tracking-[0.35em] text-white/25 uppercase mb-0.5 shrink-0">TRENDING</p>
                {TRENDS.map((t, i) => (
                  <div key={t.label} className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[7px] font-black tabular-nums w-3 text-right" style={{ color: t.color, fontFamily: "'Orbitron', system-ui" }}>#{i + 1}</span>
                    <span className="text-[8px] text-white/45 truncate leading-tight">{t.label}</span>
                  </div>
                ))}
              </div>

              {/* News cards horizontal */}
              {rawNews.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="shrink-0 rounded-xl p-2.5 flex flex-col gap-1.5 cursor-pointer hover:brightness-110 transition-all"
                  style={{
                    width: 200,
                    background: `${item.color ?? "#06b6d4"}08`,
                    border: `1px solid ${item.color ?? "#06b6d4"}18`,
                    height: "calc(100% - 4px)",
                  }}
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="rounded px-1.5 py-0.5 text-[6px] font-black tracking-wide"
                      style={{ background: `${item.color ?? "#06b6d4"}18`, color: item.color ?? "#06b6d4", fontFamily: "'Orbitron', system-ui" }}
                    >
                      {item.category?.toUpperCase() ?? "NEWS"}
                    </span>
                    {newsLoading && <RefreshCw className="h-2 w-2 text-white/20 animate-spin ml-auto" />}
                  </div>
                  <p className="text-[9px] font-bold text-white/80 leading-snug line-clamp-3 flex-1">{item.title}</p>
                  <p className="text-[8px] text-white/35 leading-snug line-clamp-2 shrink-0">{item.summary}</p>
                  <p className="text-[7px] font-mono text-white/20 shrink-0">{item.source} · {item.publishedAt}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "pshare" && (
            <div className="flex gap-2 p-2 h-full items-start">
              {/* Compose tile */}
              <div
                className="shrink-0 rounded-xl p-2.5 flex flex-col gap-2"
                style={{ width: 220, background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.18)", height: "calc(100% - 4px)" }}
              >
                <p className="text-[7px] font-mono tracking-[0.35em] text-[#e11d48]/50 uppercase shrink-0">POST TO PSHARE</p>
                <PshareCompose onPost={handlePost} compact />
                {/* Featured orgs compact */}
                <div className="mt-auto pt-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[6px] font-mono tracking-widest text-white/20 uppercase mb-1.5">FEATURED ORGS</p>
                  {[
                    { name: "CYRUS Systems",       color: "#e11d48" },
                    { name: "Delta AI Labs",        color: "#7c3aed" },
                    { name: "AfricaTech Institute", color: "#22c55e" },
                    { name: "QuantumEdge Finance",  color: "#06b6d4" },
                  ].map(({ name, color }) => (
                    <div key={name} className="flex items-center gap-1.5 py-0.5 cursor-pointer group">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[6px] font-black text-white"
                        style={{ background: `${color}20`, border: `1px solid ${color}28` }}
                      >
                        {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-[8px] text-white/45 group-hover:text-white/70 transition-colors truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post cards horizontal */}
              {postsLoading ? (
                <div className="flex items-center justify-center w-40 h-full gap-2">
                  <RefreshCw className="h-4 w-4 text-white/30 animate-spin" />
                </div>
              ) : (
                posts.slice(0, 10).map((post) => (
                  <PshareCard key={post.id} post={post} onLike={handleLike} compact />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Full (non-compact) layout ────────────────────────────────────── */
  return (
    <div className="px-5 py-5 space-y-5">

      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-[2px] w-5 rounded-full" style={{ background: "#e11d48" }} />
        <p className="text-[9px] font-mono tracking-[0.5em] uppercase text-[#e11d48]/50">
          NETWORK FEED
        </p>
        <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
          <Radio className="h-2.5 w-2.5 text-orange-400 animate-pulse" strokeWidth={2} />
          <p className="text-[8px] font-mono text-orange-400/80">LIVE</p>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {([
          { id: "news"   as const, label: "News & Trends",    icon: Newspaper,  color: "#06b6d4" },
          { id: "pshare" as const, label: "pshare Feed",      icon: Share2,     color: "#e11d48" },
        ]).map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold tracking-wide transition-all duration-200"
            style={{
              background: tab === id ? `${color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${tab === id ? color + "35" : "rgba(255,255,255,0.06)"}`,
              color: tab === id ? "#fff" : "rgba(255,255,255,0.35)",
              boxShadow: tab === id ? `0 0 16px ${color}15` : "none",
              fontFamily: "'Orbitron', system-ui",
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: tab === id ? color : undefined }} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* ══ NEWS & TRENDS tab ════════════════════════════════════════════ */}
      {tab === "news" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* News articles column */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase">Latest Articles</p>
              {newsLoading && <RefreshCw className="h-3 w-3 text-white/20 animate-spin" />}
            </div>
            {rawNews.slice(0, 6).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>

          {/* Trending topics column */}
          <div className="space-y-3">
            <p className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase mb-1">
              Trending Topics
            </p>
            <div className="space-y-2">
              {TRENDS.map((t, i) => (
                <TrendChip key={t.label} label={t.label} color={t.color} rank={i + 1} />
              ))}
            </div>

            {/* CYRUS network stat */}
            <div
              className="rounded-2xl p-4 mt-4"
              style={{
                background: "linear-gradient(135deg, rgba(225,29,72,0.08), rgba(124,58,237,0.06))",
                border: "1px solid rgba(225,29,72,0.15)",
              }}
            >
              <p className="text-[8px] font-mono tracking-widest text-[#e11d48]/50 uppercase mb-3">CYRUS NETWORK</p>
              {[
                { label: "Active Operators",   value: "2,847",  color: "#22c55e" },
                { label: "pshare Posts Today", value: "1,203",  color: "#06b6d4" },
                { label: "Research Queries",   value: "48,901", color: "#7c3aed" },
                { label: "Vision Scans",       value: "9,341",  color: "#34d399" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <p className="text-[10px] text-white/40">{label}</p>
                  <p className="text-[11px] font-black tabular-nums" style={{ color, fontFamily: "'Orbitron', system-ui" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ PSHARE tab ═══════════════════════════════════════════════════ */}
      {tab === "pshare" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Feed column */}
          <div className="lg:col-span-2 space-y-4">
            <PshareCompose onPost={handlePost} />
            <div className="space-y-3">
              {postsLoading ? (
                <div className="flex items-center justify-center h-24 gap-2">
                  <RefreshCw className="h-4 w-4 text-white/30 animate-spin" />
                  <p className="text-[11px] text-white/30">Loading pshare feed…</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PshareCard key={post.id} post={post} onLike={handleLike} />
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase mb-3">
                Featured Organisations
              </p>
              {[
                { name: "CYRUS Systems",        cat: "AI Platform",   color: "#e11d48" },
                { name: "Delta AI Labs",         cat: "Research",      color: "#7c3aed" },
                { name: "Sentinel Security",     cat: "Cybersecurity", color: "#f59e0b" },
                { name: "AfricaTech Institute",  cat: "Education",     color: "#22c55e" },
                { name: "QuantumEdge Finance",   cat: "FinTech",       color: "#06b6d4" },
              ].map(({ name, cat, color }) => (
                <div key={name} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0 group cursor-pointer">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-[9px] text-white"
                    style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                  >
                    {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white/75 truncate group-hover:text-white transition-colors">{name}</p>
                    <p className="text-[8px] font-mono text-white/25">{cat}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                </div>
              ))}
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(225,29,72,0.05)", border: "1px solid rgba(225,29,72,0.12)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-3.5 w-3.5 text-[#e11d48]/60" strokeWidth={1.8} />
                <p className="text-[9px] font-mono text-[#e11d48]/50 uppercase tracking-widest">About pshare</p>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                pshare is the CYRUS network's shared broadcast layer. Operators, companies and
                institutions can post updates, research findings, announcements and offers — visible
                across the entire CYRUS network. All posts are AI-verified and moderated.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
