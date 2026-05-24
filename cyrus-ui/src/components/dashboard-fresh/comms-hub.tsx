import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain,
  Camera,
  FileText,
  MessageSquare,
  Mic,
  Phone,
  Users,
  Video,
  ChevronRight,
  Clock,
  Activity,
  Zap,
  MapPin,
  Settings,
  Plus,
  Share2,
  Eye,
  BookOpen,
  Layers,
  ArrowUpRight,
  Scan,
  Globe,
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
        borderColor: "#08080e",
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
    <div className="flex flex-col h-full" style={{ background: "rgba(10,10,20,0.9)" }}>

      {/* ── Profile ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl font-black text-sm text-white"
              style={{
                background: "linear-gradient(135deg, rgba(225,29,72,0.4), rgba(124,58,237,0.3))",
                border: "1px solid rgba(225,29,72,0.4)",
                boxShadow: "0 0 20px rgba(225,29,72,0.2)",
              }}
            >
              {initials(opName)}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{ background: "#22c55e", borderColor: "#08080e", boxShadow: "0 0 8px rgba(34,197,94,0.8)" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white truncate" style={{ fontFamily: "'Orbitron', system-ui", letterSpacing: "0.04em" }}>
              {opName}
            </p>
            <p className="text-[9px] font-mono text-[#22c55e]/70 tracking-widest">● ACTIVE</p>
          </div>
          <Link href="/comms">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-xl cursor-pointer transition-all hover:scale-110"
              style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
              title="Open Comms"
            >
              <MessageSquare className="h-3.5 w-3.5 text-cyan-400" strokeWidth={1.8} />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Sessions (like "Books" in reference) ── */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-mono tracking-[0.3em] text-white/30 uppercase">Sessions</p>
          <Link href="/">
            <Plus className="h-3.5 w-3.5 text-white/25 hover:text-white/60 cursor-pointer transition-colors" />
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-[10px] text-white/20 italic">No sessions yet</p>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => (
              <Link key={s.id} href="/">
                <div
                  className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:brightness-125"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Thumbnail icon */}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: s.hasImage ? "rgba(6,182,212,0.15)" : "rgba(124,58,237,0.12)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {s.hasImage
                      ? <Camera className="h-3 w-3 text-cyan-400/70" strokeWidth={1.6} />
                      : <MessageSquare className="h-3 w-3 text-violet-400/70" strokeWidth={1.6} />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/55 truncate leading-snug">{s.preview || "…"}</p>
                    {s.ts && <p className="text-[8px] font-mono text-white/20">{timeAgo(s.ts)}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Contacts / Friends ── */}
      <div className="px-4 py-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-mono tracking-[0.3em] text-white/30 uppercase">Friends</p>
          <span
            className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            {activeCount} online
          </span>
        </div>

        {onlineUsers.length === 0 ? (
          <p className="text-[10px] text-white/20 italic">Invite others to connect</p>
        ) : (
          <div className="space-y-2.5">
            {onlineUsers.slice(0, 8).map((u) => {
              const live = u.isOnline || u.status === "online";
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar name={u.displayName} src={u.profileImageUrl} size={30} />
                    <StatusDot status={u.status} isOnline={u.isOnline} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white/70 truncate">{u.displayName}</p>
                    <p className="text-[8px] font-mono text-white/25 capitalize">{u.status ?? "offline"}</p>
                  </div>
                  {live && (
                    <Link href="/comms">
                      <Phone className="h-3 w-3 text-[#22c55e]/50 hover:text-[#22c55e] transition-colors cursor-pointer" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {onlineUsers.length > 0 && (
          <Link href="/comms">
            <div
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer transition-all hover:brightness-125"
              style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.14)" }}
            >
              <Users className="h-3 w-3 text-cyan-400/60" />
              <p className="text-[10px] font-mono text-cyan-400/55">See all</p>
            </div>
          </Link>
        )}
      </div>

      {/* ── Settings link ── */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <Link href="/settings">
          <div className="flex items-center gap-2 cursor-pointer group">
            <Settings className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
            <p className="text-[10px] text-white/25 group-hover:text-white/50 transition-colors">Settings</p>
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
        background: "rgba(12,12,24,0.95)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
        minHeight: 220,
      }}
    >
      {/* Left: visual panel — like the book cover */}
      <div
        className="relative shrink-0 flex flex-col items-center justify-center"
        style={{
          width: 140,
          background: "linear-gradient(160deg, #0d1a3a 0%, #0a0f20 50%, #12082a 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(20px)" }} />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)", filter: "blur(18px)" }} />
        </div>
        {/* CYRUS logo mark */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(225,29,72,0.3), rgba(124,58,237,0.25))",
              border: "1px solid rgba(225,29,72,0.35)",
              boxShadow: "0 0 30px rgba(225,29,72,0.2)",
            }}
          >
            <Brain className="h-7 w-7 text-rose-400" strokeWidth={1.5} />
          </div>
          <p
            className="text-[11px] font-black text-white/80 tracking-[0.2em]"
            style={{ fontFamily: "'Orbitron', system-ui" }}
          >
            CYRUS
          </p>
          <p className="text-[8px] font-mono text-white/30 tracking-widest">v3.0</p>
        </div>

        {/* Session timer at bottom */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
          >
            <Clock className="h-2.5 w-2.5 text-cyan-400/70" strokeWidth={1.8} />
            <p className="text-[9px] font-mono text-cyan-400/70">{mm}:{ss}</p>
          </div>
        </div>
      </div>

      {/* Right: info panel — like book title/author */}
      <div className="flex-1 flex flex-col justify-between p-5">
        <div>
          <p className="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase mb-1.5">PRIMARY INTERFACE</p>
          <h2 className="text-2xl font-black leading-tight text-white mb-0.5"
            style={{ fontFamily: "'Orbitron', system-ui" }}>
            Communication
          </h2>
          <h2 className="text-2xl font-black leading-tight mb-3"
            style={{ fontFamily: "'Orbitron', system-ui", color: "#06b6d4" }}>
            & Research
          </h2>
          <p className="text-[10px] text-white/35 mb-1">
            Powered by CYRUS QAI — OMEGA-TIER Intelligence
          </p>

          {/* Active capabilities chips — FUSION INDICATORS */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {[
              { label: "Vision Fused",   color: "#06b6d4", icon: Eye },
              { label: "Docs Live",      color: "#15803d", icon: FileText },
              { label: "Research Ready", color: "#7c3aed", icon: Brain },
            ].map(({ label, color, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: `${color}15`, border: `1px solid ${color}35` }}
              >
                <Icon className="h-2.5 w-2.5" style={{ color }} strokeWidth={2} />
                <p className="text-[8px] font-mono" style={{ color }}>{label}</p>
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
              <p className="text-[9px] font-mono text-white/35">
                {online.length} operator{online.length > 1 ? "s" : ""} in session
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Link href="/comms" className="flex-1">
              <div
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(90deg, rgba(6,182,212,0.25), rgba(124,58,237,0.2))",
                  border: "1px solid rgba(6,182,212,0.3)",
                }}
              >
                <Zap className="h-3 w-3 text-cyan-400" />
                <p className="text-[10px] font-bold text-white/85" style={{ fontFamily: "'Orbitron', system-ui" }}>
                  OPEN COMMS
                </p>
              </div>
            </Link>
            <Link href="/intelligence">
              <div
                className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 cursor-pointer transition-all hover:brightness-110"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.28)" }}
              >
                <Brain className="h-3 w-3 text-violet-400" />
                <p className="text-[10px] font-bold text-violet-300/80" style={{ fontFamily: "'Orbitron', system-ui" }}>RESEARCH</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bento stat card (matches reference image colored cards) ─────── */
function BentoCard({
  icon: Icon, label, value, sub, href, gradient, accent, textColor,
}: {
  icon: typeof Brain; label: string; value: string | number; sub?: string;
  href: string; gradient: string; accent: string; textColor: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group relative overflow-hidden rounded-2xl p-4 cursor-pointer h-full transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98]"
        style={{
          background: gradient,
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
        }}
      >
        {/* Top-right shine */}
        <div
          className="pointer-events-none absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 group-hover:opacity-35 transition-opacity"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)`, filter: "blur(16px)", transform: "translate(30%, -30%)" }}
        />
        {/* Top shimmer line */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-30"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }}
        />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/50">{label}</p>
            <ArrowUpRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
          <p
            className="text-3xl font-black leading-none mb-2 tabular-nums"
            style={{ color: textColor, fontFamily: "'Orbitron', system-ui", textShadow: `0 0 30px ${accent}50` }}
          >
            {value}
          </p>
          {sub && <p className="text-[10px] text-white/45 leading-snug">{sub}</p>}
          <div
            className="mt-3 flex items-center justify-center rounded-lg p-1.5 w-fit"
            style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={1.8} />
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
      color: "#06b6d4", bg: "linear-gradient(135deg, #0c3040, #07202e)",
    },
    {
      href: "/document-builder", icon: FileText, label: "Build Docs", desc: "Create & collaborate",
      color: "#4ade80", bg: "linear-gradient(135deg, #0d2a18, #081810)",
    },
    {
      href: "/comms", icon: Video, label: "Video Call", desc: "HD group sessions",
      color: "#a78bfa", bg: "linear-gradient(135deg, #1e1044, #100824)",
    },
    {
      href: "/intelligence", icon: Globe, label: "Research", desc: "Knowledge queries",
      color: "#fb923c", bg: "linear-gradient(135deg, #2a1200, #1a0c00)",
    },
    {
      href: "/comms", icon: Mic, label: "Voice", desc: "Realtime audio",
      color: "#34d399", bg: "linear-gradient(135deg, #042218, #02100c)",
    },
    {
      href: "/nav", icon: MapPin, label: "Location", desc: "Share position",
      color: "#60a5fa", bg: "linear-gradient(135deg, #0d1e3a, #060e20)",
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map(({ href, icon: Icon, label, desc, color, bg }) => (
        <Link key={href + label} href={href}>
          <div
            className="group flex flex-col items-center gap-2 rounded-2xl py-4 px-2 cursor-pointer transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1"
            style={{
              background: bg,
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all group-hover:scale-110"
              style={{ background: `${color}18`, border: `1px solid ${color}30`, boxShadow: `0 0 14px ${color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 6px ${color}60)` }} strokeWidth={1.7} />
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold text-white/70 leading-tight" style={{ fontFamily: "'Orbitron', system-ui" }}>{label}</p>
              <p className="text-[8px] text-white/30 mt-0.5 leading-tight">{desc}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMMS BENTO GRID — main center layout
══════════════════════════════════════════════════════════════════════ */
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

  const userMsgs  = conversations.filter((c: any) => c.role === "user").length;
  const cyrusMsgs = conversations.filter((c: any) => c.role === "cyrus").length;
  const visionScans = conversations.filter((c: any) => c.hasImage).length;
  const total     = conversations.length;

  return (
    <div className="px-5 pt-5 pb-2 space-y-3">

      {/* ── Section header ── */}
      <div className="flex items-center gap-3 mb-1">
        <div className="h-[2px] w-5 rounded-full" style={{ background: "#06b6d4" }} />
        <p className="text-[9px] font-mono tracking-[0.5em] uppercase text-cyan-400/50">COLLABORATION HUB</p>
        <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.8)" }} />
          <p className="text-[8px] font-mono text-[#22c55e]/80">LIVE</p>
        </div>
      </div>

      {/* ── Hero card ── */}
      <HeroCommsCard onlineUsers={onlineUsers} />

      {/* ── 4-card bento stat row (like the colored cards in reference) ── */}
      <div className="grid grid-cols-4 gap-3">
        <BentoCard
          icon={MessageSquare} label="MESSAGES" value={total}
          sub={`${userMsgs} sent · ${cyrusMsgs} replies`}
          href="/"
          gradient="linear-gradient(145deg, #2d1b69 0%, #1e1044 100%)"
          accent="#a78bfa" textColor="#c4b5fd"
        />
        <BentoCard
          icon={Clock} label="SESSION" value="Active"
          sub="real-time intelligence"
          href="/comms"
          gradient="linear-gradient(145deg, #431407 0%, #2a0d04 100%)"
          accent="#fb923c" textColor="#fed7aa"
        />
        <BentoCard
          icon={Brain} label="RESEARCH" value={cyrusMsgs}
          sub="AI responses generated"
          href="/intelligence"
          gradient="linear-gradient(145deg, #1e3a5f 0%, #0f2040 100%)"
          accent="#60a5fa" textColor="#bfdbfe"
        />
        <BentoCard
          icon={Camera} label="VISION" value={visionScans}
          sub="scans & image analyses"
          href="/scan"
          gradient="linear-gradient(145deg, #065756 0%, #02302e 100%)"
          accent="#34d399" textColor="#6ee7b7"
        />
      </div>

      {/* ── Fusion capability strip — "USE DURING CHAT/CALLS" ── */}
      <div>
        <div className="flex items-center gap-3 mb-2.5">
          <Layers className="h-3.5 w-3.5 text-white/25" strokeWidth={1.6} />
          <p className="text-[9px] font-mono tracking-[0.35em] text-white/25 uppercase">Fused Capabilities — use during chat &amp; calls</p>
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
          className="relative overflow-hidden rounded-2xl p-3"
          style={{
            background: `${color}0a`,
            border: `1px solid ${color}1e`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-3 -right-3 h-12 w-12 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, filter: "blur(10px)" }}
          />
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: `${color}18`, border: `1px solid ${color}28` }}
            >
              <Icon className="h-3 w-3" style={{ color }} strokeWidth={1.8} />
            </div>
            <p className="text-[8px] font-mono tracking-widest text-white/30 uppercase">{label}</p>
          </div>
          <p
            className="text-xl font-black tabular-nums"
            style={{ color, fontFamily: "'Orbitron', system-ui", textShadow: `0 0 20px ${color}40` }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACTIVITY FEED PANEL — right panel, like reference image
══════════════════════════════════════════════════════════════════════ */
export function ActivityFeedPanel({ stackSummary }: { stackSummary?: any }) {
  const { data: conversations = [] } = useConversations(undefined, 30);
  const { data: onlineUsers = [] }   = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/users/all?includeSelf=1");
      return r.ok ? r.json() : [];
    },
    refetchInterval: 15000,
  });

  const activities = conversations.slice(0, 14).map((c: any) => ({
    id: c.id,
    role: c.role as "user" | "cyrus",
    name: c.role === "cyrus" ? "CYRUS AI" : "You",
    preview: (c.content ?? "").slice(0, 88),
    ts: c.createdAt ?? "",
    hasImage: c.hasImage,
    tag: c.hasImage ? "vision" : c.role === "cyrus" ? "ai" : "query",
  }));

  const aiOk       = stackSummary?.cyrusAiReachable;
  const onlineCount = onlineUsers.filter((u) => u.isOnline || u.status === "online").length;

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(10,10,20,0.9)" }}>

      {/* ── Header (matches reference "Activity" header) ── */}
      <div
        className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <p className="text-xs font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Activity</p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: "0 0 5px rgba(34,197,94,0.8)" }} />
          <span className="text-[8px] font-mono text-[#22c55e]/80">live</span>
        </div>
      </div>

      {/* ── System status ── */}
      <div className="px-4 py-2.5 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { label: "AI Service",  val: aiOk ? "Online" : "Standby", color: aiOk ? "#22c55e" : "#f59e0b" },
          { label: "Contacts",    val: `${onlineCount} online`,        color: "#06b6d4" },
          { label: "Vision",      val: "Ready",                        color: "#34d399" },
          { label: "Documents",   val: "Live",                         color: "#4ade80" },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-[4px] w-[4px] rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}80` }} />
              <p className="text-[9px] text-white/35">{label}</p>
            </div>
            <p className="text-[9px] font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* ── Activity list (matches reference style exactly) ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 px-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <MessageSquare className="h-6 w-6 text-white/15" />
            </div>
            <p className="text-[10px] text-white/25 text-center leading-relaxed">
              No activity yet.<br />Start a conversation below.
            </p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1.5">
            {activities.map((item) => {
              const isCyrus = item.role === "cyrus";
              const avatarColor = isCyrus ? "#7c3aed" : "#e11d48";
              return (
                <Link key={item.id} href="/">
                  <div
                    className="group rounded-2xl p-3 cursor-pointer transition-all duration-200 hover:brightness-110"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Top row: avatar + name + time */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="relative shrink-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full font-black text-[10px] text-white"
                          style={{ background: `${avatarColor}25`, border: `1.5px solid ${avatarColor}40` }}
                        >
                          {isCyrus ? "C" : "U"}
                        </div>
                        {item.hasImage && (
                          <div
                            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full"
                            style={{ background: "#06b6d4", border: "1.5px solid #08080e" }}
                          >
                            <Camera className="h-2 w-2 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white/80 leading-none mb-0.5">{item.name}</p>
                        <p className="text-[10px] text-white/45 leading-snug line-clamp-2">{item.preview || "…"}</p>
                      </div>
                      <p className="text-[9px] font-mono text-white/25 shrink-0 mt-0.5">
                        {item.ts ? timeAgo(item.ts) : ""}
                      </p>
                    </div>
                    {/* Reply row */}
                    <div className="flex items-center gap-3 pl-10">
                      <button
                        type="button"
                        className="text-[9px] font-semibold text-white/40 hover:text-white/80 transition-colors"
                      >
                        Reply
                      </button>
                      {item.hasImage && (
                        <>
                          <span className="text-white/15">·</span>
                          <Link href="/scan">
                            <button
                              type="button"
                              className="text-[9px] font-semibold text-cyan-400/50 hover:text-cyan-400 transition-colors flex items-center gap-1"
                            >
                              <Eye className="h-2.5 w-2.5" />
                              View scan
                            </button>
                          </Link>
                        </>
                      )}
                      {isCyrus && (
                        <>
                          <span className="text-white/15">·</span>
                          <Link href="/document-builder">
                            <button
                              type="button"
                              className="text-[9px] font-semibold text-green-400/50 hover:text-green-400 transition-colors flex items-center gap-1"
                            >
                              <FileText className="h-2.5 w-2.5" />
                              Save to doc
                            </button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fusion shortcuts at bottom ── */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-[8px] font-mono tracking-[0.3em] text-white/20 uppercase mb-2">FUSE INTO CHAT</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { href: "/scan",             icon: Scan,     label: "Vision",    color: "#06b6d4" },
            { href: "/document-builder", icon: FileText, label: "Docs",      color: "#4ade80" },
            { href: "/intelligence",     icon: Brain,    label: "Research",  color: "#a78bfa" },
            { href: "/comms",            icon: Share2,   label: "Share",     color: "#fb923c" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href + label} href={href}>
              <div
                className="group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:brightness-125"
                style={{ background: `${color}0c`, border: `1px solid ${color}1a` }}
              >
                <Icon className="h-3 w-3 shrink-0" style={{ color }} strokeWidth={1.8} />
                <p className="text-[9px] font-mono text-white/40 group-hover:text-white/70 transition-colors">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
