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
        <div className="h-[2px] w-5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
        <p className="text-[9px] font-semibold tracking-widest uppercase text-white/40">COLLABORATION HUB</p>
        <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}>
          <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e] animate-pulse" />
          <p className="text-[8px] font-mono text-[#22c55e]/80">LIVE</p>
        </div>
      </div>

      {/* ── Hero card ── */}
      <HeroCommsCard onlineUsers={onlineUsers} />

      {/* ── 4-card bento stat row — bold solid-color backgrounds (reference style) ── */}
      <div className="grid grid-cols-4 gap-3">
        <BentoCard
          icon={MessageSquare} label="MESSAGES" value={total}
          sub={`${userMsgs} sent · ${cyrusMsgs} replies`}
          href="/"
          gradient="linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%)"
          accent="#a78bfa" textColor="#ffffff"
        />
        <BentoCard
          icon={Clock} label="SESSION" value="Active"
          sub="real-time intelligence"
          href="/comms"
          gradient="linear-gradient(145deg, #f97316 0%, #c2410c 100%)"
          accent="#fb923c" textColor="#ffffff"
        />
        <BentoCard
          icon={Brain} label="RESEARCH" value={cyrusMsgs}
          sub="AI responses generated"
          href="/intelligence"
          gradient="linear-gradient(145deg, #2563eb 0%, #1d4ed8 100%)"
          accent="#60a5fa" textColor="#ffffff"
        />
        <BentoCard
          icon={Camera} label="VISION" value={visionScans}
          sub="scans & image analyses"
          href="/scan"
          gradient="linear-gradient(145deg, #059669 0%, #047857 100%)"
          accent="#34d399" textColor="#ffffff"
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
    <div className="flex flex-col h-full">

      {/* ── Header (matches reference "Activity" header) ── */}
      <div
        className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-sm font-bold text-white">Activity</p>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}
        >
          <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[8px] font-medium text-[#22c55e]/80">live</span>
        </div>
      </div>

      {/* ── System status ── */}
      <div className="px-4 py-2.5 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {[
          { label: "AI Service",  val: aiOk ? "Online" : "Standby", color: aiOk ? "#22c55e" : "#f59e0b" },
          { label: "Contacts",    val: `${onlineCount} online`,        color: "#06b6d4" },
          { label: "Vision",      val: "Ready",                        color: "#34d399" },
          { label: "Documents",   val: "Live",                         color: "#4ade80" },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-[4px] w-[4px] rounded-full" style={{ background: color }} />
              <p className="text-[9px] text-white/40">{label}</p>
            </div>
            <p className="text-[9px] font-medium" style={{ color }}>{val}</p>
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
                    className="group rounded-2xl p-3 cursor-pointer transition-all duration-200 hover:brightness-115"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
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
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[8px] font-semibold tracking-widest text-white/25 uppercase mb-2">FUSE INTO CHAT</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { href: "/scan",             icon: Scan,     label: "Vision",    color: "#06b6d4" },
            { href: "/document-builder", icon: FileText, label: "Docs",      color: "#4ade80" },
            { href: "/intelligence",     icon: Brain,    label: "Research",  color: "#a78bfa" },
            { href: "/comms",            icon: Share2,   label: "Share",     color: "#fb923c" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href + label} href={href}>
              <div
                className="group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:bg-white/[0.07]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <Icon className="h-3 w-3 shrink-0" style={{ color }} strokeWidth={1.8} />
                <p className="text-[9px] font-medium text-white/45 group-hover:text-white/75 transition-colors">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
