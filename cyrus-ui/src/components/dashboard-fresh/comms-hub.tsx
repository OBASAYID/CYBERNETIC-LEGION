import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain,
  Camera,
  FileText,
  FolderOpen,
  MessageSquare,
  Mic,
  Phone,
  Scan,
  Users,
  Video,
  ChevronRight,
  Clock,
  Activity,
  Zap,
  BookOpen,
  MapPin,
  MoreHorizontal,
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
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/* ── Avatar component ───────────────────────────────────────────────── */
function UserAvatar({
  name,
  src,
  size = 32,
  color = "#7c3aed",
}: {
  name: string;
  src?: string | null;
  size?: number;
  color?: string;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-bold text-white select-none overflow-hidden"
      style={{
        width: size,
        height: size,
        background: src ? "transparent" : `${color}30`,
        border: `1px solid ${color}50`,
        fontSize: size * 0.35,
      }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SOCIAL LEFT PANEL  — conversations + online contacts
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

  /* Group conversations into pseudo-threads: each "thread" is the last
     exchange — pairs of (user → cyrus) messages. */
  const threads = (() => {
    const seen = new Map<string, { content: string; ts: string; role: string }>();
    for (const c of [...conversations].reverse()) {
      const key = (c as any).content?.slice(0, 40) ?? "";
      if (!seen.has(c.role)) {
        seen.set(c.role + c.id, { content: (c as any).content ?? "", ts: (c as any).createdAt ?? "", role: c.role });
      }
    }
    return conversations
      .slice(0, 6)
      .map((c: any) => ({
        id: c.id,
        role: c.role,
        preview: (c.content ?? "").slice(0, 52),
        ts: c.createdAt ?? "",
      }));
  })();

  const activeCount = onlineUsers.filter((u) => u.isOnline || u.status === "online").length;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* User identity */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm text-white"
          style={{ background: "rgba(225,29,72,0.2)", border: "1px solid rgba(225,29,72,0.4)", boxShadow: "0 0 16px rgba(225,29,72,0.2)" }}
        >
          {initials(displayName ?? "OP")}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{displayName ?? "OPERATOR"}</p>
          <div className="flex items-center gap-1.5">
            <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e]" style={{ boxShadow: "0 0 5px rgba(34,197,94,0.8)" }} />
            <p className="text-[9px] font-mono text-[#22c55e]/70">ACTIVE</p>
          </div>
        </div>
        <Link href="/comms" className="ml-auto">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer transition-all hover:brightness-125"
            style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}
          >
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
          </div>
        </Link>
      </div>

      {/* Online contacts */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[8px] font-mono tracking-[0.35em] text-white/30 uppercase">CONTACTS</p>
          <span
            className="text-[8px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
          >
            {activeCount} online
          </span>
        </div>

        {onlineUsers.length === 0 ? (
          <p className="text-[10px] text-white/25 italic">No contacts yet</p>
        ) : (
          <div className="space-y-2">
            {onlineUsers.slice(0, 5).map((u) => {
              const isLive = u.isOnline || u.status === "online";
              const dotColor = u.status === "busy" || u.status === "in_call" ? "#e11d48" : isLive ? "#22c55e" : "#374151";
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="relative">
                    <UserAvatar name={u.displayName} src={u.profileImageUrl} size={28} color="#06b6d4" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#080810]"
                      style={{ background: dotColor, boxShadow: isLive ? `0 0 5px ${dotColor}` : "none" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-white/70 truncate">{u.displayName}</p>
                    <p className="text-[9px] font-mono text-white/30 capitalize">{u.status ?? "offline"}</p>
                  </div>
                  {isLive && (
                    <Link href="/comms">
                      <Phone className="h-3 w-3 text-[#22c55e]/60 hover:text-[#22c55e] transition-colors cursor-pointer" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Link href="/comms">
          <div
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg py-1.5 cursor-pointer transition-all hover:brightness-125"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <Users className="h-3 w-3 text-cyan-400/70" />
            <p className="text-[10px] font-mono text-cyan-400/60">Open Comms</p>
          </div>
        </Link>
      </div>

      {/* Recent chats */}
      <div className="px-4 py-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <p className="text-[8px] font-mono tracking-[0.35em] text-white/30 uppercase mb-2.5">RECENT CHATS</p>
        {threads.length === 0 ? (
          <p className="text-[10px] text-white/25 italic">No conversations yet</p>
        ) : (
          <div className="space-y-1.5">
            {threads.slice(0, 8).map((t) => (
              <Link key={t.id} href="/">
                <div
                  className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:brightness-110"
                  style={{
                    background: t.role === "cyrus" ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-black"
                    style={{
                      background: t.role === "cyrus" ? "rgba(124,58,237,0.3)" : "rgba(225,29,72,0.2)",
                      color: t.role === "cyrus" ? "#c4b5fd" : "#fda4af",
                    }}
                  >
                    {t.role === "cyrus" ? "C" : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/55 truncate leading-relaxed">{t.preview || "…"}</p>
                  </div>
                  {t.ts && (
                    <p className="text-[8px] font-mono text-white/20 shrink-0 mt-0.5">{timeAgo(t.ts)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick shortcuts at bottom */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-[8px] font-mono tracking-[0.35em] text-white/25 uppercase mb-2">TOOLS</p>
        <div className="grid grid-cols-4 gap-1">
          {[
            { href: "/scan",             icon: Camera,  color: "#06b6d4", label: "Vision"  },
            { href: "/intelligence",     icon: Brain,   color: "#7c3aed", label: "Research" },
            { href: "/document-builder", icon: FileText, color: "#15803d", label: "Docs"  },
            { href: "/files",            icon: FolderOpen, color: "#2563eb", label: "Files" },
          ].map(({ href, icon: Icon, color, label }) => (
            <Link key={href} href={href}>
              <div
                className="group flex flex-col items-center gap-0.5 rounded-lg py-2 cursor-pointer transition-all hover:brightness-125"
                style={{ background: `${color}0e`, border: `1px solid ${color}18` }}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                <p className="text-[7px] font-mono text-white/35 group-hover:text-white/60">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMMS BENTO GRID — communication-first bento layout
══════════════════════════════════════════════════════════════════════ */

/* Individual bento stat card */
function BentoStatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  bg,
  border,
  iconColor,
  valueColor,
}: {
  icon: typeof Brain;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  bg: string;
  border: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group relative overflow-hidden rounded-2xl p-4 cursor-pointer h-full transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Corner glow */}
        <div
          className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ background: `radial-gradient(circle, ${iconColor}, transparent 70%)`, filter: "blur(12px)" }}
        />
        {/* Top shimmer */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${iconColor}cc, transparent)` }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}35` }}
            >
              <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={1.6} />
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
          </div>
          <p className="text-[9px] font-mono uppercase tracking-widest mb-1 text-white/40">{label}</p>
          <p
            className="text-2xl font-black tabular-nums leading-none"
            style={{ color: valueColor, fontFamily: "'Orbitron', system-ui" }}
          >
            {value}
          </p>
          {sub && <p className="mt-1.5 text-[10px] text-white/35 leading-snug">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

/* The main hub card — featured large card */
function CommsHubCard({ onlineUsers }: { onlineUsers: OnlineUser[] }) {
  const online = onlineUsers.filter((u) => u.isOnline || u.status === "online");
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const sessionHrs = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const sessionMins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");

  const capabilities = [
    { href: "/comms",            icon: Phone,    label: "Voice Call",   color: "#22c55e" },
    { href: "/comms",            icon: Video,    label: "Video Call",   color: "#06b6d4" },
    { href: "/comms",            icon: MessageSquare, label: "Messages", color: "#7c3aed" },
    { href: "/intelligence",     icon: Brain,    label: "Research",     color: "#4f46e5" },
    { href: "/document-builder", icon: FileText, label: "Build Docs",   color: "#15803d" },
    { href: "/scan",             icon: Camera,   label: "Vision",       color: "#0891b2" },
  ];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl h-full flex flex-col"
      style={{
        background: "linear-gradient(145deg, #0d1a2e 0%, #081020 60%, #0a1428 100%)",
        border: "1px solid rgba(6,182,212,0.2)",
        boxShadow: "0 0 60px rgba(6,182,212,0.06), 0 8px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.7) 40%, rgba(124,58,237,0.5) 70%, transparent)" }}
      />
      {/* BG radial */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 70% at 80% 20%, rgba(6,182,212,0.07), transparent)" }}
      />

      <div className="relative flex flex-col h-full p-5 gap-4">
        {/* Header */}
        <div>
          <p className="text-[9px] font-mono tracking-[0.4em] text-cyan-400/50 uppercase mb-1">PRIMARY INTERFACE</p>
          <h2
            className="text-2xl font-black text-white leading-tight"
            style={{ fontFamily: "'Orbitron', system-ui", textShadow: "0 0 30px rgba(6,182,212,0.4)" }}
          >
            COMMUNICATION
            <br />
            <span style={{ color: "#06b6d4" }}>HUB</span>
          </h2>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}
          >
            <span className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.8)" }} />
            <p className="text-[10px] font-mono text-[#22c55e]">{online.length} ONLINE</p>
          </div>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.18)" }}
          >
            <Clock className="h-3 w-3 text-cyan-400/60" />
            <p className="text-[10px] font-mono text-cyan-400/70">{sessionHrs}:{sessionMins} session</p>
          </div>
        </div>

        {/* Online avatars */}
        {online.length > 0 && (
          <div>
            <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2">IN SESSION</p>
            <div className="flex items-center gap-1.5">
              {online.slice(0, 5).map((u, i) => (
                <div key={u.id} className="relative" style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 10 - i }}>
                  <UserAvatar name={u.displayName} src={u.profileImageUrl} size={30} color="#06b6d4" />
                </div>
              ))}
              {online.length > 5 && (
                <div
                  className="flex h-[30px] items-center justify-center rounded-full px-2 text-[9px] font-bold text-white/60"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", marginLeft: "-8px" }}
                >
                  +{online.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Capabilities grid */}
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2.5">SHARED CAPABILITIES</p>
          <div className="grid grid-cols-3 gap-2">
            {capabilities.map(({ href, icon: Icon, label, color }) => (
              <Link key={label} href={href}>
                <div
                  className="group/cap flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 cursor-pointer transition-all hover:scale-105"
                  style={{ background: `${color}10`, border: `1px solid ${color}22` }}
                >
                  <Icon className="h-4 w-4" style={{ color, filter: `drop-shadow(0 0 6px ${color}50)` }} strokeWidth={1.6} />
                  <p className="text-[8px] font-mono text-white/45 text-center leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Launch button */}
        <Link href="/comms">
          <div
            className="flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(90deg, rgba(6,182,212,0.2), rgba(124,58,237,0.15))",
              border: "1px solid rgba(6,182,212,0.3)",
              boxShadow: "0 0 20px rgba(6,182,212,0.1)",
            }}
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <p className="text-xs font-bold text-white/80" style={{ fontFamily: "'Orbitron', system-ui" }}>
              OPEN COMMS
            </p>
          </div>
        </Link>
      </div>
    </div>
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

  const userMessages  = conversations.filter((c: any) => c.role === "user").length;
  const cyrusMessages = conversations.filter((c: any) => c.role === "cyrus").length;
  const totalMessages = conversations.length;

  return (
    <div className="px-5 pt-5 pb-3">
      {/* Section label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px w-6" style={{ background: "#06b6d4" }} />
        <p className="text-[9px] font-mono tracking-[0.45em] uppercase text-cyan-400/60">COLLABORATION HUB</p>
      </div>

      {/* Bento grid — mirrors reference image layout */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "auto auto",
        }}
      >
        {/* LARGE CARD: Comms Hub (spans 1 col, 2 rows) */}
        <div style={{ gridColumn: "1", gridRow: "1 / 3" }}>
          <CommsHubCard onlineUsers={onlineUsers} />
        </div>

        {/* MESSAGES card */}
        <div style={{ gridColumn: "2", gridRow: "1" }}>
          <BentoStatCard
            icon={MessageSquare}
            label="Messages"
            value={totalMessages}
            sub="conversations with CYRUS"
            href="/"
            bg="linear-gradient(135deg, #2d1b69 0%, #1e1044 100%)"
            border="rgba(124,58,237,0.3)"
            iconColor="#a78bfa"
            valueColor="#c4b5fd"
          />
        </div>

        {/* RESEARCH card */}
        <div style={{ gridColumn: "3", gridRow: "1" }}>
          <BentoStatCard
            icon={Brain}
            label="Research"
            value={cyrusMessages}
            sub="AI responses generated"
            href="/intelligence"
            bg="linear-gradient(135deg, #1e3a5f 0%, #102040 100%)"
            border="rgba(37,99,235,0.3)"
            iconColor="#93c5fd"
            valueColor="#bfdbfe"
          />
        </div>

        {/* DOCUMENTS card */}
        <div style={{ gridColumn: "2", gridRow: "2" }}>
          <BentoStatCard
            icon={FileText}
            label="Documents"
            value="Build"
            sub="create professional docs"
            href="/document-builder"
            bg="linear-gradient(135deg, #14532d 0%, #0a3018 100%)"
            border="rgba(21,128,61,0.3)"
            iconColor="#86efac"
            valueColor="#4ade80"
          />
        </div>

        {/* VISION card */}
        <div style={{ gridColumn: "3", gridRow: "2" }}>
          <BentoStatCard
            icon={Camera}
            label="Vision"
            value="Scan"
            sub="real-time object detection"
            href="/scan"
            bg="linear-gradient(135deg, #0c4a6e 0%, #062030 100%)"
            border="rgba(8,145,178,0.3)"
            iconColor="#67e8f9"
            valueColor="#22d3ee"
          />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACTIVITY FEED PANEL — right panel, like reference image
══════════════════════════════════════════════════════════════════════ */
export function ActivityFeedPanel({ stackSummary }: { stackSummary?: any }) {
  const { data: conversations = [] } = useConversations(undefined, 30);
  const { data: onlineUsers = [] } = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all"],
    queryFn: async () => {
      const r = await systemFetch("/api/comms/users/all?includeSelf=1");
      return r.ok ? r.json() : [];
    },
    refetchInterval: 15000,
  });

  /* Build activity items from conversations */
  const activities = conversations
    .slice(0, 12)
    .map((c: any) => ({
      id: c.id,
      role: c.role as "user" | "cyrus",
      name: c.role === "cyrus" ? "CYRUS" : "You",
      preview: (c.content ?? "").slice(0, 90),
      ts: c.createdAt ?? "",
      hasImage: c.hasImage,
    }));

  const aiReachable   = stackSummary?.cyrusAiReachable;
  const mcpActive     = stackSummary?.mcp?.health?.activeCount ?? 0;
  const mcpTotal      = stackSummary?.mcp?.health?.totalServers ?? 3;
  const onlineCount   = onlineUsers.filter((u) => u.isOnline || u.status === "online").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p className="text-[8px] font-mono tracking-[0.4em] text-[#e11d48]/50 uppercase">ACTIVITY</p>
          <p className="text-xs font-bold text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Live Feed</p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <Activity className="h-3 w-3 text-[#22c55e]" />
          <span className="text-[9px] font-mono text-[#22c55e]">live</span>
        </div>
      </div>

      {/* System status pills */}
      <div className="px-4 py-2.5 flex flex-col gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { label: "AI Service",   val: aiReachable ? "Online" : "Standby", color: aiReachable ? "#22c55e" : "#f59e0b", dot: true },
          { label: "MCP Servers",  val: `${mcpActive}/${mcpTotal}`,          color: "#7c3aed", dot: mcpActive > 0 },
          { label: "Contacts",     val: `${onlineCount} online`,             color: "#06b6d4", dot: onlineCount > 0 },
        ].map(({ label, val, color, dot }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: dot ? color : "#374151", boxShadow: dot ? `0 0 5px ${color}80` : "none" }}
              />
              <p className="text-[9px] text-white/35">{label}</p>
            </div>
            <p className="text-[9px] font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Activity list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ scrollbarWidth: "none" }}
      >
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MessageSquare className="h-8 w-8 text-white/15" />
            <p className="text-[10px] text-white/25 text-center">
              No activity yet.<br />Start a conversation.
            </p>
          </div>
        ) : (
          activities.map((item) => (
            <Link key={item.id} href="/">
              <div
                className="group rounded-xl px-3 py-2.5 cursor-pointer transition-all hover:brightness-110"
                style={{
                  background: item.role === "cyrus"
                    ? "rgba(124,58,237,0.07)"
                    : "rgba(225,29,72,0.06)",
                  border: item.role === "cyrus"
                    ? "1px solid rgba(124,58,237,0.12)"
                    : "1px solid rgba(225,29,72,0.1)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-black shrink-0"
                      style={{
                        background: item.role === "cyrus" ? "rgba(124,58,237,0.35)" : "rgba(225,29,72,0.25)",
                        color: item.role === "cyrus" ? "#c4b5fd" : "#fda4af",
                      }}
                    >
                      {item.role === "cyrus" ? "C" : "U"}
                    </div>
                    <p className="text-[10px] font-bold" style={{ color: item.role === "cyrus" ? "#c4b5fd" : "#fda4af" }}>
                      {item.name}
                    </p>
                    {item.hasImage ? <Camera className="h-2.5 w-2.5 text-cyan-400/60" /> : null}
                  </div>
                  <p className="text-[8px] font-mono text-white/25 shrink-0">{item.ts ? timeAgo(item.ts) : ""}</p>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{item.preview}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    className="text-[8px] font-mono tracking-wide text-white/30 hover:text-white/60 transition-colors"
                  >
                    REPLY
                  </button>
                  <span className="text-white/15 text-[8px]">·</span>
                  <button
                    type="button"
                    className="text-[8px] font-mono tracking-wide text-white/30 hover:text-white/60 transition-colors"
                  >
                    VIEW
                  </button>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Research & docs quick access */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2">USE IN CHAT</p>
        <div className="space-y-1.5">
          {[
            { href: "/scan",             icon: Camera,    label: "Vision — attach camera scan",  color: "#06b6d4" },
            { href: "/document-builder", icon: FileText,  label: "Docs — build & share document", color: "#15803d" },
            { href: "/intelligence",     icon: Brain,     label: "Research — query knowledge",   color: "#7c3aed" },
            { href: "/nav",              icon: MapPin,    label: "Nav — share location",         color: "#4f46e5" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <div
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all hover:brightness-125 group"
                style={{ background: `${color}0c`, border: `1px solid ${color}18` }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" style={{ color }} />
                <p className="text-[9px] text-white/45 group-hover:text-white/70 transition-colors leading-tight">{label}</p>
                <ChevronRight className="h-3 w-3 text-white/15 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   RESEARCH SNAPSHOT — shows quick research/intelligence stats
══════════════════════════════════════════════════════════════════════ */
export function ResearchSnapshot({ conversations }: { conversations: any[] }) {
  const aiMessages = conversations.filter((c: any) => c.role === "cyrus");
  const userMessages = conversations.filter((c: any) => c.role === "user");
  const withImages = conversations.filter((c: any) => c.hasImage).length;

  const stats = [
    { label: "AI Responses",  value: aiMessages.length,  color: "#7c3aed", icon: Brain    },
    { label: "Your Queries",   value: userMessages.length, color: "#e11d48", icon: MessageSquare },
    { label: "Vision Scans",   value: withImages,          color: "#06b6d4", icon: Camera   },
    { label: "Total Exchange", value: conversations.length, color: "#22c55e", icon: Activity },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 px-5 pb-3">
      {stats.map(({ label, value, color, icon: Icon }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-xl p-3"
          style={{ background: `${color}0c`, border: `1px solid ${color}20` }}
        >
          <div className="pointer-events-none absolute -top-2 -right-2 h-10 w-10 rounded-full opacity-25" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, filter: "blur(8px)" }} />
          <Icon className="h-3.5 w-3.5 mb-1.5" style={{ color }} strokeWidth={1.6} />
          <p className="text-xl font-black tabular-nums text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>{value}</p>
          <p className="text-[8px] font-mono text-white/30 mt-0.5 uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}
