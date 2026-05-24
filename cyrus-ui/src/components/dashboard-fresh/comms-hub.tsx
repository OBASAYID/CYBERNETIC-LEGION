import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain,
  Camera,
  FileText,
  MessageSquare,
  Mic,
  Phone,
  Video,
  Clock,
  Activity,
  Zap,
  MapPin,
  Settings,
  Plus,
  Share2,
  Eye,
  ArrowUpRight,
  Scan,
  Globe,
  Shield,
  TrendingUp,
  Crosshair,
  Cpu,
  Send,
  Radio,
  Play,
  ChevronRight,
  X,
  BookOpen,
  Loader2,
  ExternalLink,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { useConversations } from "@/hooks/use-conversations";

/* ── Types ──────────────────────────────────────────────────────────── */
interface OnlineUser {
  id: string;
  displayName: string;
  status: "online" | "offline" | "busy" | "in_call";
  isOnline?: boolean;
  lastSeen?: string;
  profileImageUrl?: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function colorForName(name: string) {
  const colors = ["#e11d48", "#7c3aed", "#06b6d4", "#0d9488", "#4f46e5", "#ea580c", "#15803d"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ── Avatar ─────────────────────────────────────────────────────────── */
function Avatar({
  name, src, size = 32, ring = false,
}: { name: string; src?: string | null; size?: number; ring?: boolean }) {
  const color = colorForName(name);
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-black text-white select-none overflow-hidden"
      style={{
        width: size, height: size,
        background: src ? "transparent" : `${color}25`,
        border: ring ? `2px solid ${color}60` : `1px solid ${color}35`,
        fontSize: Math.max(9, size * 0.33),
        boxShadow: ring ? `0 0 10px ${color}30` : "none",
      }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials(name)}
    </div>
  );
}

/* ── Status dot ─────────────────────────────────────────────────────── */
function StatusDot({ status, isOnline }: { status: string; isOnline?: boolean }) {
  const live = isOnline || status === "online";
  const busy = status === "busy" || status === "in_call";
  const color = busy ? "#e11d48" : live ? "#22c55e" : "#374151";
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
      style={{
        width: 10, height: 10,
        background: color,
        borderColor: "#1e1e24",
        boxShadow: (live || busy) ? `0 0 6px ${color}` : "none",
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LEFT PANEL — profile + sessions + contacts
══════════════════════════════════════════════════════════════════════ */
export function SocialLeftPanel({ displayName }: { displayName?: string }) {
  const { data: conversations = [] } = useConversations(undefined, 20);
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/users/all?includeSelf=1");
      return r.ok ? r.json() : [];
    },
    refetchInterval: 15000,
  });

  const sessions = conversations
    .filter((c: any) => c.role === "user")
    .slice(0, 7)
    .map((c: any) => ({
      id: c.id,
      preview: (c.content ?? "").slice(0, 44),
      ts: c.createdAt ?? "",
      hasImage: c.hasImage,
    }));

  const activeCount = onlineUsers.filter((u) => u.isOnline || u.status === "online").length;
  const opName = displayName ?? "OPERATOR";

  return (
    <div className="flex flex-col h-full">

      {/* ── Profile — matches reference "Amy Winnar" header ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full font-black text-sm text-white"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
              }}
            >
              {initials(opName)}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{ background: "#22c55e", borderColor: "#1e1e24" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{opName}</p>
            <p className="text-[10px] text-white/40">Active now</p>
          </div>
          <Link href="/comms">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-xl cursor-pointer transition-all hover:bg-white/15"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              title="Open Comms"
            >
              <MessageSquare className="h-3.5 w-3.5 text-white/60" strokeWidth={1.8} />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Sessions (like "Books" in reference) ── */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-white/55">Sessions</p>
          <Link href="/">
            <div className="flex h-5 w-5 items-center justify-center rounded-md cursor-pointer hover:bg-white/10 transition-colors">
              <Plus className="h-3 w-3 text-white/40" />
            </div>
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-[10px] text-white/25 italic">No sessions yet</p>
        ) : (
          <div className="space-y-1">
            {sessions.map((s, i) => {
              const thumbColors = ["#7c3aed", "#f97316", "#059669", "#2563eb", "#e11d48", "#0891b2", "#d97706"];
              const tc = thumbColors[i % thumbColors.length];
              return (
                <Link key={s.id} href="/">
                  <div
                    className="group flex items-center gap-2.5 rounded-xl px-2 py-2 cursor-pointer transition-all hover:bg-white/[0.06]"
                  >
                    {/* Colored thumbnail square — like book covers in reference */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${tc}, ${tc}aa)` }}
                    >
                      {s.hasImage
                        ? <Camera className="h-3.5 w-3.5 text-white" strokeWidth={1.6} />
                        : <MessageSquare className="h-3.5 w-3.5 text-white" strokeWidth={1.6} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-white/70 truncate leading-snug">{s.preview || "…"}</p>
                      {s.ts && <p className="text-[9px] text-white/30">{timeAgo(s.ts)}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Contacts / Friends — matches reference "Friends" section ── */}
      <div className="px-4 py-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-white/55">Friends</p>
          <span className="text-[9px] text-[#22c55e]/70">{activeCount} online</span>
        </div>

        {onlineUsers.length === 0 ? (
          <p className="text-[10px] text-white/25 italic">Invite others to connect</p>
        ) : (
          <div className="space-y-2">
            {onlineUsers.slice(0, 8).map((u) => {
              const live = u.isOnline || u.status === "online";
              return (
                <div key={u.id} className="flex items-center gap-2.5 group cursor-pointer rounded-xl px-1 py-1 hover:bg-white/[0.05] transition-colors">
                  <div className="relative">
                    <Avatar name={u.displayName} src={u.profileImageUrl} size={32} />
                    <StatusDot status={u.status} isOnline={u.isOnline} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white/75 truncate">{u.displayName}</p>
                    <p className="text-[9px] text-white/30 capitalize">{u.status ?? "offline"}</p>
                  </div>
                  {live && (
                    <Link href="/comms">
                      <Phone className="h-3 w-3 text-white/25 group-hover:text-[#22c55e] transition-colors cursor-pointer" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {onlineUsers.length > 0 && (
          <Link href="/comms">
            <p className="mt-3 text-[10px] font-medium text-white/35 hover:text-white/60 transition-colors cursor-pointer">
              See more
            </p>
          </Link>
        )}
      </div>

      {/* ── Settings link — matches reference bottom settings gear ── */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/settings">
          <div className="flex items-center gap-2 cursor-pointer group">
            <Settings className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
            <p className="text-[11px] text-white/35 group-hover:text-white/60 transition-colors">Settings</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HERO CARD — large featured card (like the Harry Potter book card)
══════════════════════════════════════════════════════════════════════ */
function HeroCommsCard({ onlineUsers }: { onlineUsers: OnlineUser[] }) {
  const online = onlineUsers.filter((u) => u.isOnline || u.status === "online");
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div
      className="relative overflow-hidden rounded-3xl flex"
      style={{
        background: "rgba(42,42,52,0.88)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        minHeight: 220,
      }}
    >
      {/* Left: visual panel — like the book cover */}
      <div
        className="relative shrink-0 flex flex-col items-center justify-center"
        style={{
          width: 140,
          background: "linear-gradient(160deg, #2a2a38 0%, #1e1e2c 50%, #252530 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Ambient purple glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", filter: "blur(22px)" }} />
        </div>
        {/* CYRUS logo mark */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              boxShadow: "0 8px 24px rgba(124,58,237,0.5)",
            }}
          >
            <Brain className="h-7 w-7 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-black text-white/90 tracking-[0.2em]" style={{ fontFamily: "'Orbitron', system-ui" }}>
            CYRUS
          </p>
          <p className="text-[8px] text-white/35 tracking-widest">v3.0</p>
        </div>

        {/* Session timer at bottom */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Clock className="h-2.5 w-2.5 text-white/50" strokeWidth={1.8} />
            <p className="text-[9px] font-mono text-white/50">{mm}:{ss}</p>
          </div>
        </div>
      </div>

      {/* Right: info panel — like book title/author */}
      <div className="flex-1 flex flex-col justify-between p-5">
        <div>
          <p className="text-[9px] font-medium tracking-widest text-white/35 uppercase mb-1.5">PRIMARY INTERFACE</p>
          <h2 className="text-2xl font-bold leading-tight text-white mb-0.5">
            Communication
          </h2>
          <h2 className="text-2xl font-bold leading-tight mb-3 text-white/60">
            & Research
          </h2>
          <p className="text-[10px] text-white/30 mb-1">
            Powered by CYRUS QAI — OMEGA-TIER Intelligence
          </p>

          {/* Active capabilities chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {[
              { label: "Vision Fused",   color: "#06b6d4", icon: Eye },
              { label: "Docs Live",      color: "#22c55e", icon: FileText },
              { label: "Research Ready", color: "#7c3aed", icon: Brain },
            ].map(({ label, color, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Icon className="h-2.5 w-2.5" style={{ color }} strokeWidth={2} />
                <p className="text-[8px] font-medium text-white/65">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Online users strip */}
        <div>
          {online.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {online.slice(0, 4).map((u, i) => (
                  <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}>
                    <Avatar name={u.displayName} src={u.profileImageUrl} size={26} ring />
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/35">
                {online.length} operator{online.length > 1 ? "s" : ""} in session
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Link href="/comms" className="flex-1">
              <div
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer transition-all hover:bg-white/15 hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)" }}
              >
                <Zap className="h-3 w-3 text-white/70" />
                <p className="text-[10px] font-semibold text-white/80">OPEN COMMS</p>
              </div>
            </Link>
            <Link href="/intelligence">
              <div
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 cursor-pointer transition-all hover:bg-white/12"
                style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)" }}
              >
                <Brain className="h-3 w-3 text-violet-300" />
                <p className="text-[10px] font-semibold text-violet-200/80">RESEARCH</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bento stat card — bold solid-color background (reference style) ── */
function BentoCard({
  icon: Icon, label, value, sub, href, gradient, accent, textColor: _textColor,
}: {
  icon: typeof Brain; label: string; value: string | number; sub?: string;
  href: string; gradient: string; accent: string; textColor: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group relative overflow-hidden rounded-2xl p-4 cursor-pointer h-full transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 active:scale-[0.97]"
        style={{
          background: gradient,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.12)`,
        }}
      >
        {/* Soft white radial highlight at top-right */}
        <div
          className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-15 group-hover:opacity-25 transition-opacity"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9), transparent 65%)", filter: "blur(18px)" }}
        />
        {/* Subtle top shimmer */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-40" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)" }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/70">{label}</p>
            <ArrowUpRight className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
          </div>
          <p
            className="text-3xl font-black leading-none mb-1.5 tabular-nums text-white"
            style={{ fontFamily: "'Orbitron', system-ui" }}
          >
            {value}
          </p>
          {sub && <p className="text-[10px] text-white/65 leading-snug">{sub}</p>}
          <div
            className="mt-3 flex items-center justify-center rounded-xl p-2 w-fit"
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <Icon className="h-4 w-4 text-white" strokeWidth={1.8} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Fusion capability strip — Vision + Docs available IN CHAT ─────── */
function FusionCapabilityStrip() {
  const items = [
    {
      href: "/scan", icon: Camera, label: "Vision Scan", desc: "Scan & share in chat",
      color: "#06b6d4", bg: "linear-gradient(135deg, #0891b2, #0e7490)",
    },
    {
      href: "/document-builder", icon: FileText, label: "Build Docs", desc: "Create & collaborate",
      color: "#4ade80", bg: "linear-gradient(135deg, #16a34a, #15803d)",
    },
    {
      href: "/comms", icon: Video, label: "Video Call", desc: "HD group sessions",
      color: "#a78bfa", bg: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    },
    {
      href: "/intelligence", icon: Globe, label: "Research", desc: "Knowledge queries",
      color: "#fb923c", bg: "linear-gradient(135deg, #f97316, #c2410c)",
    },
    {
      href: "/comms", icon: Mic, label: "Voice", desc: "Realtime audio",
      color: "#34d399", bg: "linear-gradient(135deg, #059669, #047857)",
    },
    {
      href: "/nav", icon: MapPin, label: "Location", desc: "Share position",
      color: "#60a5fa", bg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map(({ href, icon: Icon, label, desc, color, bg }) => (
        <Link key={href + label} href={href}>
          <div
            className="group flex flex-col items-center gap-2 rounded-2xl py-4 px-2 cursor-pointer transition-all duration-300 hover:scale-[1.06] hover:-translate-y-1"
            style={{
              background: bg,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all group-hover:scale-110"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Icon className="h-4 w-4 text-white" strokeWidth={1.7} />
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-white/90 leading-tight" style={{ fontFamily: "'Orbitron', system-ui" }}>{label}</p>
              <p className="text-[8px] text-white/55 mt-0.5 leading-tight">{desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMMS BENTO GRID — gaming platform aesthetic (Game Prime reference)
══════════════════════════════════════════════════════════════════════ */

const GAMING_CSS = `
@keyframes gm-scan { 0%{transform:translateY(-100%);opacity:0} 15%{opacity:.6} 85%{opacity:.6} 100%{transform:translateY(800%);opacity:0} }
@keyframes gm-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
`;

/* ══════════════════════════════════════════════════════════════════════
   APPLE TV-STYLE NEWS FEED — cinematic auto-advancing channel cards
══════════════════════════════════════════════════════════════════════ */

/* ── News item type ────────────────────────────────────────────────── */
interface LiveNewsItem {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  category?: string;
  url?: string;
  imageUrl?: string;
  publishedAt?: string;
}

/* ── Category → colour theme ──────────────────────────────────────── */
function newsCategoryTheme(cat?: string): { c1: string; c2: string; accent: string } {
  const map: Record<string, { c1: string; c2: string; accent: string }> = {
    world:      { c1: "#1d4ed8", c2: "#0c1a40", accent: "#60a5fa" },
    technology: { c1: "#7c3aed", c2: "#1e1b4b", accent: "#a78bfa" },
    finance:    { c1: "#059669", c2: "#022c22", accent: "#34d399" },
    science:    { c1: "#0891b2", c2: "#0c4a6e", accent: "#22d3ee" },
    health:     { c1: "#e11d48", c2: "#4c0519", accent: "#fb7185" },
    politics:   { c1: "#b45309", c2: "#2d1800", accent: "#f59e0b" },
    crypto:     { c1: "#f97316", c2: "#431407", accent: "#fb923c" },
  };
  return map[(cat ?? "").toLowerCase()] ?? { c1: "#374151", c2: "#111827", accent: "#9ca3af" };
}

/* ── Seed articles shown while RSS loads ─────────────────────────── */
const SEED_BROADCAST: LiveNewsItem[] = [
  { id: "s1", title: "Global Leaders Meet for Emergency Climate Summit", summary: "World leaders convene amid record-breaking temperatures across three continents, with new emissions targets expected.", source: "BBC News", category: "World", publishedAt: new Date(Date.now() - 1800000).toISOString(), url: "#" },
  { id: "s2", title: "AI Chip War: US and China Race to Dominate Next-Gen Processors", summary: "Semiconductor rivalry intensifies as both nations pour billions into domestic chip manufacturing and advanced AI silicon.", source: "BBC News", category: "Technology", publishedAt: new Date(Date.now() - 3600000).toISOString(), url: "#" },
  { id: "s3", title: "Federal Reserve Signals Rate Hold Amid Mixed Economic Data", summary: "Officials cite resilient employment data but remain cautious about persistent inflation in services and energy sectors.", source: "BBC News", category: "Finance", publishedAt: new Date(Date.now() - 5400000).toISOString(), url: "#" },
  { id: "s4", title: "Mars Sample Return Mission Gets Revised Launch Window", summary: "NASA and ESA confirm an updated timeline for the historic mission designed to bring Martian soil to Earth.", source: "BBC News", category: "Science", publishedAt: new Date(Date.now() - 7200000).toISOString(), url: "#" },
  { id: "s5", title: "Tensions Rise as Disputed Maritime Zones Draw Naval Deployments", summary: "Multiple nations scramble vessels to contested waters as diplomatic efforts stall in back-channel negotiations.", source: "BBC News", category: "World", publishedAt: new Date(Date.now() - 9000000).toISOString(), url: "#" },
];

/* ── timeAgo helper ───────────────────────────────────────────────── */
function broadcastTimeAgo(iso?: string) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════════════
   IN-APP NEWS READER MODAL
══════════════════════════════════════════════════════════════════════ */
function NewsReaderModal({ item, onClose }: { item: LiveNewsItem; onClose: () => void }) {
  const [article, setArticle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const theme = newsCategoryTheme(item.category);

  useEffect(() => {
    setLoading(true);
    setArticle("");
    fetch("/api/news/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: item.title, summary: item.summary, category: item.category }),
    })
      .then((r) => r.ok ? r.json() : { article: item.summary ?? "" })
      .then((d) => { setArticle(d.article ?? item.summary ?? ""); setLoading(false); })
      .catch(() => { setArticle(item.summary ?? ""); setLoading(false); });
  }, [item.id]);

  const paragraphs = article.split(/\n+/).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl"
        style={{
          background: `linear-gradient(160deg, ${theme.c2}ee 0%, #09090f 60%)`,
          border: `1px solid ${theme.c1}40`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${theme.c1}20`,
        }}
      >
        {/* Hero image */}
        {item.imageUrl && (
          <div className="relative shrink-0 overflow-hidden" style={{ height: 220 }}>
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ filter: "brightness(0.75) contrast(1.1)" }}
            />
            {/* Gradient fade into content */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${theme.c2}ee 100%)` }} />
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, ${theme.c1}, ${theme.accent}80, transparent)` }} />
            {/* Category + source overlay */}
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <span className="text-[8px] font-black tracking-[0.3em] px-2 py-0.5 rounded-full uppercase"
                style={{ background: `${theme.c1}cc`, color: "#fff", border: `1px solid ${theme.c1}` }}>
                {item.category}
              </span>
              <span className="text-[9px] text-white/50 font-mono">{item.source}</span>
              <span className="text-[8px] text-white/30 font-mono">{broadcastTimeAgo(item.publishedAt)}</span>
            </div>
          </div>
        )}

        {/* Header when no image */}
        {!item.imageUrl && (
          <div className="shrink-0 px-6 pt-6 pb-0 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${theme.c1}25`, border: `1px solid ${theme.c1}40` }}>
              <Newspaper className="h-5 w-5" style={{ color: theme.accent }} strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: theme.accent }}>{item.category}</span>
              <p className="text-[9px] text-white/30 font-mono">{item.source} · {broadcastTimeAgo(item.publishedAt)}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
          <h2
            className="text-xl font-black text-white leading-snug mb-4"
            style={{ fontFamily: "'Orbitron', system-ui", textShadow: `0 0 30px ${theme.c1}60` }}
          >
            {item.title}
          </h2>

          {loading ? (
            <div className="flex items-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.accent }} />
              <span className="text-sm text-white/40 font-mono tracking-wider">CYRUS GENERATING ARTICLE…</span>
            </div>
          ) : (
            <div className="space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[13px] text-white/75 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: `${theme.c1}20`, background: "rgba(0,0,0,0.3)" }}>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" style={{ color: theme.accent }} />
            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">CYRUS News Reader</span>
          </div>
          <div className="flex items-center gap-2">
            {item.url && item.url !== "#" && (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 cursor-pointer transition-all hover:scale-105"
                  style={{ background: `${theme.c1}20`, border: `1px solid ${theme.c1}35`, color: theme.accent }}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-[9px] font-bold">VIEW SOURCE</span>
                </div>
              </a>
            )}
            <button type="button" onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              <X className="h-3.5 w-3.5" />
              <span className="text-[9px] font-bold">CLOSE</span>
            </button>
          </div>
        </div>

        {/* Close X corner */}
        <button type="button" onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-white/15 hover:scale-110"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   APPLE TV-STYLE NEWS FEED
══════════════════════════════════════════════════════════════════════ */
function AppleTVNewsFeed() {
  const [items, setItems]       = useState<LiveNewsItem[]>(SEED_BROADCAST);
  const [active, setActive]     = useState(0);
  const [fading, setFading]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [reader, setReader]     = useState<LiveNewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION                = 7000;

  const loadNews = (quiet = false) => {
    if (!quiet) setRefreshing(true);
    fetch("/api/news/rss")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.items?.length >= 3) {
          setItems(d.items);
          setActive(0);
        }
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  /* ── Fetch on mount + auto-refresh every 5 min ── */
  useEffect(() => {
    loadNews();
    const refreshTimer = setInterval(() => loadNews(true), 5 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, []);

  const advance = (next: number) => {
    setFading(true);
    setTimeout(() => { setActive(next); setFading(false); setProgress(0); }, 350);
  };

  useEffect(() => {
    intervalRef.current  = setInterval(() => advance((active + 1) % items.length), DURATION);
    progressRef.current  = setInterval(() => setProgress((p) => Math.min(p + (100 / (DURATION / 80)), 100)), 80);
    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(progressRef.current!);
    };
  }, [active, items.length]);

  const item  = items[active] ?? items[0];
  const theme = newsCategoryTheme(item?.category);

  if (!item) return null;

  return (
    <>
      {/* ── In-app reader modal ── */}
      {reader && <NewsReaderModal item={reader} onClose={() => setReader(null)} />}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #e11d48, #9f1239)" }} />
            <p className="text-sm font-black text-white tracking-wide" style={{ fontFamily: "'Orbitron', system-ui" }}>LIVE BROADCAST</p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[7px] font-mono font-bold text-red-400 tracking-widest"
              style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.3)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              NEWS FEED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => loadNews()}
              className="transition-all hover:scale-110"
              title="Refresh news">
              <RefreshCw className={`h-3 w-3 text-white/20 hover:text-white/50 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-1.5">
              {items.slice(0, 12).map((_, i) => (
                <button key={i} type="button" onClick={() => advance(i)}
                  className="transition-all duration-300"
                  style={{
                    width: i === active ? 18 : 5, height: 4, borderRadius: 2,
                    background: i === active ? "#e11d48" : "rgba(255,255,255,0.18)",
                    border: "none", cursor: "pointer",
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* Main cinematic card */}
        <div
          className="relative overflow-hidden rounded-2xl cursor-pointer group"
          style={{
            background: item.imageUrl
              ? "transparent"
              : `linear-gradient(135deg, ${theme.c1}33 0%, ${theme.c2}cc 100%)`,
            border: `1px solid ${theme.c1}50`,
            boxShadow: `0 8px 40px ${theme.c1}30`,
            minHeight: 148,
            opacity: fading ? 0 : 1,
            transition: "opacity 0.35s ease",
          }}
          onClick={() => setReader(item)}
        >
          {/* Hero image background */}
          {item.imageUrl && (
            <>
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "brightness(0.45) contrast(1.1) saturate(1.2)" }}
              />
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${theme.c1}55 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.85) 100%)` }} />
            </>
          )}

          {/* Colour wash when no image */}
          {!item.imageUrl && (
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 80% 40%, ${theme.c1}28 0%, transparent 65%)` }} />
          )}

          {/* Scanlines */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 4px)" }} />

          {/* Hover glow hint */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,255,255,0.03)" }} />

          <div className="relative z-10 flex gap-3 p-4">
            {/* Image thumbnail OR category icon */}
            <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
              {item.imageUrl ? (
                <div className="flex h-14 w-14 overflow-hidden rounded-xl border"
                  style={{ border: `1px solid ${theme.c1}60` }}>
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: `${theme.c1}30`, border: `1px solid ${theme.c1}55`, boxShadow: `0 0 24px ${theme.c1}40` }}>
                  <Radio className="h-7 w-7" style={{ color: theme.accent }} strokeWidth={1.3} />
                </div>
              )}
              <span className="text-[7px] font-black tracking-widest px-1.5 py-0.5 rounded text-center"
                style={{ background: `${theme.c1}50`, color: theme.accent, border: `1px solid ${theme.c1}60` }}>
                {(item.category ?? "NEWS").toUpperCase()}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[8px] font-black tracking-[0.25em] px-2 py-0.5 rounded-md"
                  style={{ background: "#e11d4833", color: "#fb7185", border: "1px solid #e11d4855" }}>
                  BREAKING
                </span>
                {item.source && <span className="text-[8px] text-white/35 font-mono">{item.source}</span>}
                {item.publishedAt && <span className="text-[7px] text-white/20 font-mono">{broadcastTimeAgo(item.publishedAt)}</span>}
              </div>
              <h3 className="text-sm font-black text-white leading-tight mb-1.5 line-clamp-2"
                style={{ fontFamily: "'Orbitron', system-ui", textShadow: `0 0 20px ${theme.c1}80` }}>
                {item.title}
              </h3>
              {item.summary && (
                <p className="text-[10px] text-white/50 leading-relaxed mb-3 line-clamp-2">{item.summary}</p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                  style={{ background: theme.c1, boxShadow: `0 4px 16px ${theme.c1}50` }}
                  onClick={(e) => { e.stopPropagation(); setReader(item); }}>
                  <BookOpen className="h-3 w-3 text-white" strokeWidth={2} />
                  <span className="text-[9px] font-black text-white tracking-wide">READ IN APP</span>
                </div>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); advance((active + 1) % items.length); }}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
                  <span className="text-[9px] font-medium text-white/45">Next</span>
                  <ChevronRight className="h-2.5 w-2.5 text-white/30" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full transition-none" style={{ width: `${progress}%`, background: theme.accent }} />
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {items.map((it, i) => {
            const t = newsCategoryTheme(it.category);
            return (
              <button key={it.id} type="button" onClick={() => advance(i)}
                className="shrink-0 relative overflow-hidden flex flex-col items-center gap-0.5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.06]"
                style={{
                  background: i === active ? `${t.c1}25` : "rgba(255,255,255,0.03)",
                  border: i === active ? `1px solid ${t.c1}55` : "1px solid rgba(255,255,255,0.06)",
                  minWidth: it.imageUrl ? 52 : 44,
                  height: 48,
                  padding: 0,
                }}>
                {it.imageUrl ? (
                  <>
                    <img src={it.imageUrl} alt="" className="w-full h-full object-cover"
                      style={{ filter: i === active ? "brightness(0.8)" : "brightness(0.45) grayscale(0.4)" }} />
                    <div className="absolute inset-0" style={{ background: i === active ? `${t.c1}40` : "rgba(0,0,0,0.2)" }} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-0.5 px-2">
                    <span className="text-[8px] font-black" style={{ color: i === active ? t.accent : "rgba(255,255,255,0.25)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[6px] font-mono uppercase tracking-wide"
                      style={{ color: i === active ? t.accent : "rgba(255,255,255,0.2)" }}>
                      {(it.category ?? "news").slice(0, 4)}
                    </span>
                  </div>
                )}
                {/* Active indicator */}
                {i === active && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: t.accent }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function CommsBentoGrid({ displayName }: { displayName?: string }) {
  const { data: conversations = [] } = useConversations(undefined, 100);
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/users/all?includeSelf=1");
      return r.ok ? r.json() : [];
    },
    refetchInterval: 15000,
  });

  const userMsgs    = conversations.filter((c: any) => c.role === "user").length;
  const cyrusMsgs   = conversations.filter((c: any) => c.role === "cyrus").length;
  const visionScans = conversations.filter((c: any) => c.hasImage).length;
  const total       = conversations.length;

  return (
    <div className="px-5 pt-4 pb-3 space-y-4 h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <style>{GAMING_CSS}</style>

      {/* ═══════════════════════════════════════════════════════
          HERO SPOTLIGHT BANNER  (Game Prime "Great New Games")
      ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl flex"
        style={{
          background: "linear-gradient(135deg, #060608 0%, #1c0406 35%, #0c0c14 100%)",
          border: "1px solid rgba(225,29,72,0.28)",
          minHeight: 200,
          boxShadow: "0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>

        {/* Crimson radial glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 22% 50%, rgba(225,29,72,0.25) 0%, transparent 55%)" }} />
        {/* Top crimson line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(225,29,72,0.8) 30%, rgba(225,29,72,0.4) 60%, transparent 100%)" }} />
        {/* Animated scan line */}
        <div className="pointer-events-none absolute left-0 right-0 h-[1px] z-10"
          style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.45), transparent)", animation: "gm-scan 6s ease-in-out infinite" }} />
        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* ── LEFT: text ── */}
        <div className="relative z-10 flex flex-col justify-center p-7 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
              style={{ background: "rgba(225,29,72,0.22)", border: "1px solid rgba(225,29,72,0.45)" }}>
              <span className="h-[5px] w-[5px] rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-black tracking-[0.35em] text-red-400 uppercase">SYSTEM SPOTLIGHT</span>
            </span>
            <span className="text-[8px] text-white/25 font-mono">Build 3.0 · OMEGA-TIER</span>
          </div>
          <h2 className="text-[1.85rem] font-black text-white leading-[1.05] mb-2.5"
            style={{ fontFamily: "'Orbitron', system-ui", textShadow: "0 0 60px rgba(225,29,72,0.4)" }}>
            CYRUS SQUAWK COMM<br/>
            <span style={{ color: "#e11d48", textShadow: "0 0 30px rgba(225,29,72,0.9)" }}>SYSTEM</span><br/>
            SPOTLIGHT
          </h2>
          <p className="text-[11px] text-white/40 mb-4 max-w-xs leading-relaxed">
            Explore the full power of CYRUS OMEGA-TIER — quantum intelligence, vision fusion, and autonomous research.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/intelligence">
              <div className="flex items-center gap-2 rounded-xl px-5 py-2.5 cursor-pointer transition-all hover:scale-105 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #e11d48, #9f1239)",
                  boxShadow: "0 8px 28px rgba(225,29,72,0.55), 0 0 0 1px rgba(225,29,72,0.3)",
                }}>
                <Zap className="h-4 w-4 text-white" strokeWidth={2.2} />
                <span className="text-sm font-bold text-white tracking-wide">Explore Now</span>
              </div>
            </Link>
            <Link href="/">
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 cursor-pointer transition-all hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
                <span className="text-[11px] font-semibold text-white/55">Launch Chat</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-white/40" />
              </div>
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Cinematic Deep Space — Aggressive Red Treatment ── */}
        <div className="relative z-10 shrink-0 flex items-center pr-0 self-stretch"
          style={{ width: 360 }}>
          <div className="relative w-full h-full overflow-hidden" style={{ minHeight: 200 }}>

            {/* Base image — hue-shift toward crimson, ultra-sharp, max contrast */}
            <img
              src="/hero-space.jpg"
              alt="CYRUS Deep Space Command"
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{
                filter: "hue-rotate(-28deg) saturate(2.2) contrast(1.45) brightness(0.88)",
                imageRendering: "crisp-edges",
              }}
            />

            {/* Aggressive blood-red galaxy-core overlay — pumps the gold into deep crimson */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 62% 28%, rgba(180,10,10,0.55) 0%, rgba(120,0,0,0.28) 35%, transparent 70%)",
                mixBlendMode: "multiply",
              }} />

            {/* Outer crimson vignette for aggression */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(120,0,0,0.45) 100%)",
              }} />

            {/* Pulsing red energy ring around galaxy core */}
            <div className="absolute pointer-events-none animate-pulse"
              style={{
                top: "14%", left: "38%", width: 160, height: 80,
                background: "transparent",
                border: "1px solid rgba(225,29,72,0.55)",
                borderRadius: "50%",
                boxShadow: "0 0 28px rgba(225,29,72,0.7), inset 0 0 28px rgba(225,29,72,0.2)",
                animationDuration: "2s",
              }} />

            {/* Left-edge gradient — bleeds into hero card background */}
            <div className="absolute inset-y-0 left-0 w-32 pointer-events-none"
              style={{ background: "linear-gradient(90deg, #1c0406 0%, transparent 100%)" }} />

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
              style={{ background: "linear-gradient(0deg, rgba(6,6,8,0.75) 0%, transparent 100%)" }} />

            {/* Live comm badge — top-right */}
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(225,29,72,0.55)" }}>
                <span className="h-[5px] w-[5px] rounded-full bg-red-500 animate-pulse" />
                <span className="text-[7px] font-black tracking-[0.25em] text-red-400">SQUAWK COMM</span>
              </span>
            </div>

            {/* Bottom-right resolution badge */}
            <div className="absolute bottom-3 right-3 z-10">
              <span className="text-[7px] font-black tracking-widest text-white/30 font-mono">8K · DEEP SPACE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LIVE BROADCAST — Apple TV-style auto-advancing feed
      ═══════════════════════════════════════════════════════ */}
      <AppleTVNewsFeed />

      {/* ═══════════════════════════════════════════════════════
          MISSION STATS  (Game Prime stat cards row)
      ═══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-6 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #e11d48, #9f1239)" }} />
          <p className="text-sm font-black text-white tracking-wide" style={{ fontFamily: "'Orbitron', system-ui" }}>MISSION STATS</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <BentoCard
            icon={MessageSquare} label="MESSAGES" value={total}
            sub={`${userMsgs} sent · ${cyrusMsgs} replies`}
            href="/"
            gradient="linear-gradient(145deg, #7c3aed 0%, #3b0764 100%)"
            accent="#a78bfa" textColor="#ffffff"
          />
          <BentoCard
            icon={Clock} label="SESSION" value="Active"
            sub="real-time intelligence"
            href="/comms"
            gradient="linear-gradient(145deg, #e11d48 0%, #7f1d1d 100%)"
            accent="#fb923c" textColor="#ffffff"
          />
          <BentoCard
            icon={Brain} label="AI RESPONSES" value={cyrusMsgs}
            sub="generated this session"
            href="/intelligence"
            gradient="linear-gradient(145deg, #2563eb 0%, #1e3a8a 100%)"
            accent="#60a5fa" textColor="#ffffff"
          />
          <BentoCard
            icon={Camera} label="VISION" value={visionScans}
            sub="scans & image analyses"
            href="/scan"
            gradient="linear-gradient(145deg, #059669 0%, #064e3b 100%)"
            accent="#34d399" textColor="#ffffff"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          QUICK ACTIONS  (Game Prime "Explore Now" strips)
      ═══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-6 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #e11d48, #9f1239)" }} />
          <p className="text-sm font-black text-white tracking-wide" style={{ fontFamily: "'Orbitron', system-ui" }}>QUICK ACTIONS</p>
        </div>
        <FusionCapabilityStrip />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   RESEARCH SNAPSHOT — 4-stat strip
══════════════════════════════════════════════════════════════════════ */
export function ResearchSnapshot({ conversations }: { conversations: any[] }) {
  const ai   = conversations.filter((c: any) => c.role === "cyrus").length;
  const user = conversations.filter((c: any) => c.role === "user").length;
  const imgs = conversations.filter((c: any) => c.hasImage).length;
  const tot  = conversations.length;

  const stats = [
    { label: "AI Responses",   value: ai,   color: "#7c3aed", icon: Brain         },
    { label: "Your Queries",   value: user,  color: "#e11d48", icon: MessageSquare },
    { label: "Vision Scans",   value: imgs,  color: "#06b6d4", icon: Camera        },
    { label: "Total Exchange", value: tot,   color: "#22c55e", icon: Activity      },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 px-5 pb-3">
      {stats.map(({ label, value, color, icon: Icon }) => (
        <div
          key={label}
          className="group relative overflow-hidden rounded-2xl cursor-default transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5"
          style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}
        >
          {/* Colored header strip */}
          <div className="px-3 py-2 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
            <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Icon className="h-2.5 w-2.5 text-white" strokeWidth={2} />
            </div>
            <p className="text-[8px] font-mono tracking-widest text-white/80 uppercase">{label}</p>
          </div>
          {/* Dark body */}
          <div className="px-3 py-2.5" style={{ background: "rgba(10,10,22,0.97)", border: `1px solid ${color}22`, borderTop: "none" }}>
            <p
              className="text-xl font-black tabular-nums text-white"
              style={{ fontFamily: "'Orbitron', system-ui" }}
            >
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PSHARE PANEL — broadcast posts visible to all active users in real-time
══════════════════════════════════════════════════════════════════════ */
interface PSharePost {
  id: string;
  user: string;
  content: string;
  ts: string;
}

export function PSharePanel() {
  const qc                        = useQueryClient();
  const [draft, setDraft]         = useState("");
  const displayName               = (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "OPERATOR";

  const { data: posts = [] } = useQuery<PSharePost[]>({
    queryKey: ["/api/pshare/posts"],
    queryFn: async () => {
      const r = await systemFetch("/api/pshare/posts");
      return r.ok ? r.json() : [];
    },
    refetchInterval: 3500,
  });

  const { mutate: sendPost, isPending } = useMutation({
    mutationFn: async (content: string) => {
      const r = await systemFetch("/api/pshare/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, user: displayName }),
      });
      return r.json();
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["/api/pshare/posts"] });
    },
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || isPending) return;
    sendPost(text);
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="px-4 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(225,29,72,0.18)" }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="h-[5px] w-[5px] rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>PSHARE</p>
          </div>
          <p className="text-[8px] text-white/30 tracking-widest mt-0.5">BROADCAST TO ALL USERS</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.28)" }}>
          <Radio className="h-2.5 w-2.5 text-red-400" strokeWidth={2} />
          <span className="text-[8px] font-bold text-red-400">LIVE</span>
        </div>
      </div>

      {/* ── Compose box ── */}
      <div className="px-3 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder="Broadcast a message to all active users…"
            rows={3}
            className="w-full resize-none rounded-xl px-3 py-2.5 pr-10 text-[11px] text-white placeholder-white/25 outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || isPending}
            className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:scale-110 disabled:opacity-30"
            style={{
              background: draft.trim() ? "linear-gradient(135deg, #e11d48, #9f1239)" : "rgba(255,255,255,0.08)",
              boxShadow: draft.trim() ? "0 4px 14px rgba(225,29,72,0.5)" : "none",
            }}
          >
            <Send className="h-3 w-3 text-white" strokeWidth={2} />
          </button>
        </div>
        <p className="text-[8px] text-white/20 mt-1.5 px-1">⌘ + Enter to send · visible to all active operators</p>
      </div>

      {/* ── Posts feed ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ scrollbarWidth: "none" }}>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)" }}>
              <Share2 className="h-5 w-5 text-red-500/40" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[11px] text-white/30 font-medium">No broadcasts yet</p>
              <p className="text-[9px] text-white/18 mt-0.5">Be the first to send a message</p>
            </div>
          </div>
        ) : (
          posts.map((post) => {
            const color = colorForName(post.user);
            return (
              <div key={post.id}
                className="rounded-xl p-3 transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full font-black text-[10px] text-white"
                    style={{ background: `${color}25`, border: `1.5px solid ${color}45` }}>
                    {initials(post.user)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[10px] font-bold truncate" style={{ color }}>
                        {post.user}
                      </p>
                      <p className="text-[8px] font-mono text-white/25 shrink-0">{timeAgo(post.ts)}</p>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed break-words">{post.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer status ── */}
      <div className="px-4 py-3 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[8px] text-white/25 font-mono">{posts.length} BROADCAST{posts.length !== 1 ? "S" : ""}</p>
          <p className="text-[8px] text-white/20">↻ live every 3.5s</p>
        </div>
      </div>
    </div>
  );
}
