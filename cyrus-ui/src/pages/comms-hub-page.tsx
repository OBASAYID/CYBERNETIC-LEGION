/**
 * CYRUS COMMS HUB — Redesigned with crimson aerospace theme
 * Tabs: CHAT · VOICE · VIDEO · GROUP · VOICE NOTE · VIDEO NOTE
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Mic,
  Film,
  MicOff,
  VideoOff,
  PhoneOff,
  Send,
  Search,
  Circle,
  Shield,
  SignalHigh,
  Radio,
  Zap,
  Camera,
  StopCircle,
  Play,
  Trash2,
  ChevronRight,
  PhoneCall,
  Wifi,
  Lock,
} from "lucide-react";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { useCyrusGroupCall } from "../../../client/src/hooks/useCyrusGroupCall";
import { CallView } from "../../../client/src/components/comms/CallView";
import { systemFetch } from "@shared/cyrus-api-client";

/* ══════════════════════════════════════════════════════════════════════
   THEME CONSTANTS
══════════════════════════════════════════════════════════════════════ */
const C = {
  crimson: "#e11d48",
  cyan:    "#06b6d4",
  purple:  "#7c3aed",
  green:   "#22c55e",
  orange:  "#f97316",
  yellow:  "#eab308",
  bg:      "rgba(8,8,16,0.97)",
  card:    "rgba(12,12,28,0.95)",
  border:  "rgba(255,255,255,0.06)",
} as const;

/* ══════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════ */
type CommsTab = "chat" | "voice" | "video" | "group" | "vnote" | "vidnote";

interface OnlineUser {
  id: string;
  displayName: string;
  status?: "online" | "offline" | "busy" | "in_call";
  isOnline?: boolean;
}

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  messageType?: string;
}

/* ══════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════ */
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}
function colorForName(name: string) {
  const cols = [C.crimson, C.cyan, C.purple, C.green, C.orange, C.yellow];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
}
function formatDur(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

/* ══════════════════════════════════════════════════════════════════════
   SHARED KEYFRAME STYLE
══════════════════════════════════════════════════════════════════════ */
const ANIM_CSS = `
@keyframes cy-orbit  { from { transform: rotate(0deg)  } to { transform: rotate(360deg)  } }
@keyframes cy-orbit2 { from { transform: rotate(0deg)  } to { transform: rotate(-360deg) } }
@keyframes cy-pulse-ring { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.3;transform:scale(1.06)} }
@keyframes cy-bar1   { 0%,100%{height:4px}  50%{height:16px} }
@keyframes cy-bar2   { 0%,100%{height:8px}  50%{height:20px} }
@keyframes cy-bar3   { 0%,100%{height:6px}  50%{height:14px} }
@keyframes cy-bar4   { 0%,100%{height:12px} 50%{height:24px} }
@keyframes cy-scan   { 0%{opacity:0;transform:translateY(-100%)} 100%{opacity:.5;transform:translateY(100%)} }
@keyframes cy-blink  { 0%,100%{opacity:1} 50%{opacity:.3} }
`;

/* ══════════════════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════════════════ */
function Avatar({ name, size = 36, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const c = colorForName(name);
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-black text-white select-none"
      style={{
        width: size, height: size,
        background: `${c}22`,
        border: ring ? `2px solid ${c}` : `1px solid ${c}40`,
        fontSize: Math.max(9, size * 0.33),
        boxShadow: ring ? `0 0 14px ${c}50` : "none",
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STATUS DOT
══════════════════════════════════════════════════════════════════════ */
function StatusDot({ status }: { status?: string }) {
  const col = status === "online" ? C.green : status === "busy" ? C.orange : status === "in_call" ? C.crimson : "#555";
  return (
    <span
      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2"
      style={{ background: col, borderColor: "rgba(8,8,16,1)" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ONLINE USERS RAIL
══════════════════════════════════════════════════════════════════════ */
function UsersRail({
  users,
  myId,
  onCallVoice,
  onCallVideo,
  onMessage,
}: {
  users: OnlineUser[];
  myId: string;
  onCallVoice: (userId: string, name: string) => void;
  onCallVideo: (userId: string, name: string) => void;
  onMessage: (userId: string, name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(
    (u) => u.id !== myId && u.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 220,
        borderRight: `1px solid ${C.border}`,
        background: "rgba(8,8,18,0.85)",
        height: "100%",
      }}
    >
      {/* Search */}
      <div className="p-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
        >
          <Search className="h-3.5 w-3.5 text-white/25 shrink-0" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="Search operators…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Label */}
      <p
        className="px-4 pt-3 pb-1 text-[8px] font-black tracking-[0.4em] text-white/20 uppercase shrink-0"
        style={{ fontFamily: "'Orbitron', system-ui" }}
      >
        ONLINE · {filtered.filter((u) => u.isOnline).length}
      </p>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0 ? (
          <p className="text-center text-[10px] text-white/20 pt-6">No operators found</p>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="group flex items-center gap-2.5 rounded-xl px-2 py-2.5 mb-1 cursor-pointer transition-all hover:bg-white/[0.04]"
            >
              <div className="relative shrink-0">
                <Avatar name={u.displayName} size={32} />
                <StatusDot status={u.status ?? (u.isOnline ? "online" : "offline")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white/75 truncate">{u.displayName}</p>
                <p className="text-[8px] font-mono text-white/25 uppercase">
                  {u.status === "in_call" ? "in call" : u.isOnline ? "online" : "offline"}
                </p>
              </div>
              {/* Hover actions */}
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onMessage(u.id, u.displayName)}
                  className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                  title="Message"
                >
                  <MessageSquare className="h-3 w-3" style={{ color: C.cyan }} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => onCallVoice(u.id, u.displayName)}
                  className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                  title="Voice call"
                >
                  <Phone className="h-3 w-3" style={{ color: C.green }} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => onCallVideo(u.id, u.displayName)}
                  className="rounded-lg p-1 hover:bg-white/10 transition-colors"
                  title="Video call"
                >
                  <Video className="h-3 w-3" style={{ color: C.crimson }} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Encryption indicator */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <Lock className="h-3 w-3 shrink-0" style={{ color: C.green }} strokeWidth={1.8} />
        <p className="text-[7px] font-mono text-white/25 uppercase tracking-widest">
          AES-256 ENCRYPTED
        </p>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CHAT PANEL
══════════════════════════════════════════════════════════════════════ */
function ChatPanel({
  myId,
  myName,
  targetUser,
}: {
  myId: string;
  myName: string;
  targetUser: { id: string; name: string } | null;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetUser) return;
    systemFetch(`/api/comms/messages/${targetUser.id}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d?.messages ?? [];
        setMessages(arr);
      })
      .catch(() => {});
    const t = setInterval(() => {
      systemFetch(`/api/comms/messages/${targetUser.id}`)
        .then((r) => r.json())
        .then((d) => {
          const arr = Array.isArray(d) ? d : d?.messages ?? [];
          setMessages(arr);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [targetUser?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !targetUser || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const optimistic: ChatMsg = {
      id: `opt-${Date.now()}`,
      senderId: myId,
      senderName: myName,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await systemFetch("/api/comms/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: targetUser.id, content: text }),
      });
    } catch {/* silent */}
    setSending(false);
  };

  if (!targetUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
        <MessageSquare className="h-10 w-10" style={{ color: C.crimson }} strokeWidth={1} />
        <p className="text-[11px] font-mono text-white/40">Select an operator to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div className="relative">
          <Avatar name={targetUser.name} size={34} ring />
          <StatusDot status="online" />
        </div>
        <div>
          <p className="text-[12px] font-bold text-white/85">{targetUser.name}</p>
          <div className="flex items-center gap-1.5">
            <Shield className="h-2.5 w-2.5" style={{ color: C.green }} strokeWidth={2} />
            <p className="text-[8px] font-mono text-white/30">ENCRYPTED · DIRECT</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2`}>
              {!isMine && <Avatar name={msg.senderName} size={26} />}
              <div style={{ maxWidth: "70%" }}>
                {!isMine && (
                  <p className="text-[8px] font-mono text-white/30 mb-0.5 ml-1">{msg.senderName}</p>
                )}
                <div
                  className="rounded-2xl px-3.5 py-2"
                  style={{
                    background: isMine
                      ? `linear-gradient(135deg, ${C.crimson}22, ${C.purple}18)`
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isMine ? C.crimson + "30" : C.border}`,
                  }}
                >
                  <p className="text-[11px] text-white/80 leading-relaxed">{msg.content}</p>
                </div>
                <p className="text-[7px] font-mono text-white/20 mt-0.5 px-1">{timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div
          className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-2.5"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message… (Enter to send)"
            className="flex-1 bg-transparent text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center h-9 w-9 rounded-xl transition-all hover:scale-110 disabled:opacity-30"
          style={{ background: `linear-gradient(135deg, ${C.crimson}, ${C.purple})` }}
        >
          <Send className="h-4 w-4 text-white" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VOICE / VIDEO DIALER PANEL
══════════════════════════════════════════════════════════════════════ */
function DialerPanel({
  mode,
  users,
  myId,
  isConnected,
  onCall,
}: {
  mode: "voice" | "video";
  users: OnlineUser[];
  myId: string;
  isConnected: boolean;
  onCall: (userId: string, name: string) => void;
}) {
  const online = users.filter((u) => u.id !== myId && u.isOnline);
  const accent = mode === "video" ? C.crimson : C.green;
  const Icon   = mode === "video" ? Video : Phone;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5">
      {/* Status banner */}
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-5 shrink-0"
        style={{ background: `${accent}0c`, border: `1px solid ${accent}20` }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={1.8} />
        </div>
        <div>
          <p
            className="text-[10px] font-black text-white/70 tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Orbitron', system-ui" }}
          >
            {mode === "video" ? "VIDEO CALL" : "VOICE CALL"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: isConnected ? C.green : "#ef4444", boxShadow: `0 0 6px ${isConnected ? C.green : "#ef4444"}` }}
            />
            <p className="text-[9px] font-mono text-white/35">
              {isConnected ? "SIGNALING READY" : "CONNECTING…"}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" style={{ color: C.green }} strokeWidth={1.8} />
          <p className="text-[8px] font-mono text-white/30">AES-256</p>
        </div>
      </div>

      <p
        className="text-[8px] font-black tracking-[0.4em] text-white/25 uppercase mb-3 shrink-0"
        style={{ fontFamily: "'Orbitron', system-ui" }}
      >
        AVAILABLE OPERATORS · {online.length}
      </p>

      {online.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
          <Wifi className="h-8 w-8 text-white/20" strokeWidth={1} />
          <p className="text-[11px] font-mono text-white/30">No operators online</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid gap-2" style={{ scrollbarWidth: "thin", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", alignContent: "start" }}>
          {online.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onCall(u.id, u.displayName)}
              className="flex flex-col items-center gap-3 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
              style={{
                background: `${accent}08`,
                border: `1px solid ${accent}18`,
              }}
            >
              <div className="relative">
                <Avatar name={u.displayName} size={48} ring />
                <StatusDot status="online" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-white/80">{u.displayName}</p>
                <p className="text-[8px] font-mono text-white/30 mt-0.5">ONLINE</p>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 mt-1"
                style={{ background: `${accent}20`, border: `1px solid ${accent}35` }}
              >
                <Icon className="h-3 w-3" style={{ color: accent }} strokeWidth={2} />
                <span className="text-[8px] font-black tracking-wide text-white/70" style={{ fontFamily: "'Orbitron', system-ui" }}>
                  {mode === "video" ? "VIDEO CALL" : "VOICE CALL"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ANIMATED GROUP CALL HUB
══════════════════════════════════════════════════════════════════════ */
function AudioBars({ active = false, color = C.cyan }: { active?: boolean; color?: string }) {
  if (!active) return <div className="flex items-end gap-0.5 h-5 opacity-20">{[1,2,3,4].map((i) => <div key={i} className="w-[3px] rounded-full" style={{ height: 4, background: color }} />)}</div>;
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[
        { anim: "cy-bar1", delay: "0ms" },
        { anim: "cy-bar2", delay: "100ms" },
        { anim: "cy-bar3", delay: "200ms" },
        { anim: "cy-bar4", delay: "50ms" },
      ].map(({ anim, delay }, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: color,
            animation: `${anim} 0.8s ease-in-out infinite`,
            animationDelay: delay,
          }}
        />
      ))}
    </div>
  );
}

function GroupCallHub({
  myUserId,
  myName,
  users,
  sfuMode,
  activeGroupCall,
  incomingGroupCall,
  onStartGroupCall,
  onJoinByRoomId,
  onAcceptGroupCall,
  onDeclineGroupCall,
  onEndGroupCall,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoEnabled,
}: {
  myUserId: string;
  myName: string;
  users: OnlineUser[];
  sfuMode: string;
  activeGroupCall: any;
  incomingGroupCall: any;
  onStartGroupCall: (peerIds: string[], type: "audio" | "video") => void;
  onJoinByRoomId: (roomId: string) => void;
  onAcceptGroupCall: () => void;
  onDeclineGroupCall: () => void;
  onEndGroupCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  isMuted: boolean;
  isVideoEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 800);
    return () => clearInterval(t);
  }, []);

  const available = users.filter((u) => u.id !== myUserId && u.isOnline);

  const togglePeer = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  /* ── INCOMING CALL OVERLAY ── */
  if (incomingGroupCall) {
    const caller = incomingGroupCall.initiatorName ?? "Unknown";
    const c = colorForName(caller);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        {/* Orbit rings */}
        {[140, 200, 260].map((r, i) => (
          <div
            key={r}
            className="absolute rounded-full"
            style={{
              width: r, height: r,
              border: `1px solid ${C.cyan}${i === 0 ? "35" : i === 1 ? "20" : "10"}`,
              animation: `cy-pulse-ring ${1.2 + i * 0.4}s ease-in-out infinite`,
            }}
          />
        ))}
        <div className="relative">
          <Avatar name={caller} size={80} ring />
          <div
            className="absolute -bottom-1 -right-1 flex items-center justify-center h-7 w-7 rounded-full"
            style={{ background: C.purple, border: "2px solid rgba(8,8,16,1)" }}
          >
            <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="text-center relative z-10">
          <p className="text-[9px] font-mono tracking-[0.4em] text-white/30 uppercase mb-1">INCOMING GROUP CALL</p>
          <p className="text-lg font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>{caller}</p>
          <p className="text-[10px] text-white/40 mt-1">
            {incomingGroupCall.participants?.length ?? 0} participant{(incomingGroupCall.participants?.length ?? 0) !== 1 ? "s" : ""} · {incomingGroupCall.callType ?? "video"}
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button
            type="button"
            onClick={onDeclineGroupCall}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 font-bold text-[11px] transition-all hover:scale-105"
            style={{ background: "#ef444420", border: "1px solid #ef444435", color: "#ef4444", fontFamily: "'Orbitron', system-ui" }}
          >
            <PhoneOff className="h-4 w-4" strokeWidth={2} />
            DECLINE
          </button>
          <button
            type="button"
            onClick={onAcceptGroupCall}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 font-bold text-[11px] transition-all hover:scale-105"
            style={{ background: `${C.green}20`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: "'Orbitron', system-ui" }}
          >
            <PhoneCall className="h-4 w-4" strokeWidth={2} />
            ACCEPT
          </button>
        </div>
      </div>
    );
  }

  /* ── ACTIVE GROUP CALL ── */
  if (activeGroupCall) {
    const participants: any[] = activeGroupCall.participants ?? [];
    const allParticipants = [
      { id: myUserId, displayName: myName, isSelf: true, isMuted, stream: null },
      ...participants.map((p: any) => ({ ...p, isSelf: false })),
    ];
    const N = allParticipants.length;
    const RADIUS = Math.min(180, 120 + N * 10);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Room info */}
        <div
          className="flex items-center gap-3 px-6 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{ background: `${C.green}10`, border: `1px solid ${C.green}22` }}
          >
            <span className="h-[5px] w-[5px] rounded-full animate-pulse" style={{ background: C.green }} />
            <span className="text-[8px] font-mono text-white/40 uppercase">LIVE</span>
          </div>
          <p className="text-[9px] font-mono text-white/30">ROOM: <span className="text-white/60">{activeGroupCall.roomId ?? "—"}</span></p>
          <p className="text-[9px] font-mono text-white/30 ml-auto">{N} PARTICIPANT{N !== 1 ? "S" : ""} · {sfuMode?.toUpperCase()}</p>
        </div>

        {/* Orbit arena */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Rotating orbital rings */}
          <div
            className="absolute rounded-full"
            style={{
              width: RADIUS * 2 + 60,
              height: RADIUS * 2 + 60,
              border: `1px solid ${C.cyan}12`,
              animation: "cy-orbit 12s linear infinite",
            }}
          >
            <div
              className="absolute top-[-4px] left-1/2 -translate-x-1/2 h-2 w-2 rounded-full"
              style={{ background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }}
            />
          </div>
          <div
            className="absolute rounded-full"
            style={{
              width: RADIUS * 2 + 110,
              height: RADIUS * 2 + 110,
              border: `1px solid ${C.purple}10`,
              animation: "cy-orbit2 18s linear infinite",
            }}
          >
            <div
              className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: C.purple, boxShadow: `0 0 6px ${C.purple}` }}
            />
          </div>

          {/* Centre pulse */}
          <div
            className="absolute rounded-full"
            style={{
              width: 60, height: 60,
              background: `radial-gradient(circle, ${C.crimson}18, transparent)`,
              animation: "cy-pulse-ring 2s ease-in-out infinite",
            }}
          />

          {/* Participants in a circle */}
          {allParticipants.map((p, i) => {
            const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * RADIUS;
            const y = Math.sin(angle) * RADIUS;
            const speaking = !p.isMuted && ((tick + i) % 3 !== 0); // simulate
            const c = p.isSelf ? C.crimson : colorForName(p.displayName);

            return (
              <div
                key={p.id}
                className="absolute flex flex-col items-center gap-1.5 transition-all"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                {/* Speaking ring */}
                {speaking && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 56, height: 56,
                      border: `2px solid ${c}`,
                      boxShadow: `0 0 16px ${c}50`,
                      animation: "cy-pulse-ring 0.9s ease-in-out infinite",
                    }}
                  />
                )}
                <Avatar name={p.displayName} size={44} ring={speaking} />
                <p className="text-[7px] font-bold text-white/60 text-center max-w-[64px] truncate leading-tight">
                  {p.isSelf ? "YOU" : p.displayName}
                </p>
                <AudioBars active={speaking} color={c} />
                {p.isMuted && <MicOff className="h-2.5 w-2.5 text-white/30" strokeWidth={2} />}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div
          className="flex items-center justify-center gap-4 px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            type="button"
            onClick={onToggleMute}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all hover:scale-110"
            style={{
              background: isMuted ? `${C.crimson}20` : "rgba(255,255,255,0.06)",
              border: `1px solid ${isMuted ? C.crimson + "35" : C.border}`,
              minWidth: 60,
            }}
          >
            {isMuted ? <MicOff className="h-5 w-5 text-rose-400" strokeWidth={1.8} /> : <Mic className="h-5 w-5 text-white/60" strokeWidth={1.8} />}
            <span className="text-[7px] font-mono text-white/30">{isMuted ? "UNMUTE" : "MUTE"}</span>
          </button>

          <button
            type="button"
            onClick={onToggleVideo}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all hover:scale-110"
            style={{
              background: !isVideoEnabled ? `${C.orange}20` : "rgba(255,255,255,0.06)",
              border: `1px solid ${!isVideoEnabled ? C.orange + "35" : C.border}`,
              minWidth: 60,
            }}
          >
            {!isVideoEnabled ? <VideoOff className="h-5 w-5 text-orange-400" strokeWidth={1.8} /> : <Video className="h-5 w-5 text-white/60" strokeWidth={1.8} />}
            <span className="text-[7px] font-mono text-white/30">{!isVideoEnabled ? "ENABLE" : "DISABLE"}</span>
          </button>

          <button
            type="button"
            onClick={onEndGroupCall}
            className="flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 transition-all hover:scale-105"
            style={{ background: `${C.crimson}20`, border: `1px solid ${C.crimson}35` }}
          >
            <PhoneOff className="h-6 w-6 text-rose-400" strokeWidth={2} />
            <span className="text-[7px] font-mono text-rose-400">END CALL</span>
          </button>
        </div>
      </div>
    );
  }

  /* ── SETUP SCREEN ── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      {/* Header card */}
      <div
        className="flex items-center gap-4 rounded-2xl p-4 shrink-0"
        style={{ background: `${C.purple}0c`, border: `1px solid ${C.purple}20` }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}30` }}
        >
          <Users className="h-5 w-5" style={{ color: C.purple }} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-white/65 tracking-[0.3em] uppercase" style={{ fontFamily: "'Orbitron', system-ui" }}>
            GROUP CALL HUB
          </p>
          <p className="text-[9px] text-white/30 mt-0.5">
            Multi-party {sfuMode === "mediasoup" ? "SFU" : "star relay"} · up to 50 participants
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
        >
          <Zap className="h-2.5 w-2.5" style={{ color: C.yellow }} strokeWidth={2} />
          <span className="text-[7px] font-mono text-white/35">{sfuMode?.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
        {/* Left: peer selection */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Call type */}
          <div className="flex gap-2 shrink-0">
            {(["audio", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCallType(t)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black tracking-wide transition-all"
                style={{
                  background: callType === t ? (t === "video" ? `${C.crimson}18` : `${C.green}18`) : "rgba(255,255,255,0.04)",
                  border: `1px solid ${callType === t ? (t === "video" ? C.crimson + "35" : C.green + "35") : C.border}`,
                  color: callType === t ? "#fff" : "rgba(255,255,255,0.35)",
                  fontFamily: "'Orbitron', system-ui",
                }}
              >
                {t === "audio" ? <Phone className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="text-[8px] font-black tracking-[0.35em] text-white/20 uppercase shrink-0" style={{ fontFamily: "'Orbitron', system-ui" }}>
            SELECT PARTICIPANTS — {selected.size} SELECTED
          </p>

          <div className="flex-1 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: "thin" }}>
            {available.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <Users className="h-8 w-8 text-white/20" strokeWidth={1} />
                <p className="text-[10px] font-mono text-white/30">No operators online</p>
              </div>
            ) : (
              available.map((u) => {
                const sel = selected.has(u.id);
                const c = colorForName(u.displayName);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => togglePeer(u.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                    style={{
                      background: sel ? `${c}12` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${sel ? c + "30" : C.border}`,
                    }}
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded shrink-0" style={{ background: sel ? c : "rgba(255,255,255,0.06)", border: `1px solid ${sel ? c : C.border}` }}>
                      {sel && <span className="text-[8px] text-white font-black">✓</span>}
                    </div>
                    <div className="relative shrink-0">
                      <Avatar name={u.displayName} size={30} />
                      <StatusDot status="online" />
                    </div>
                    <p className="text-[11px] font-bold text-white/75 truncate">{u.displayName}</p>
                    {sel && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => { onStartGroupCall(Array.from(selected), callType); setSelected(new Set()); }}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 font-black text-[10px] transition-all hover:scale-[1.02] disabled:opacity-30 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${C.crimson}, ${C.purple})`,
              boxShadow: selected.size > 0 ? `0 4px 24px ${C.crimson}30` : "none",
              fontFamily: "'Orbitron', system-ui",
            }}
          >
            {callType === "video" ? <Video className="h-4 w-4 text-white" strokeWidth={2} /> : <Phone className="h-4 w-4 text-white" strokeWidth={2} />}
            START {callType.toUpperCase()} CALL · {selected.size}
          </button>
        </div>

        {/* Right: join by room ID */}
        <div
          className="shrink-0 flex flex-col gap-3 rounded-2xl p-4"
          style={{ width: 200, background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}` }}
        >
          <p className="text-[8px] font-black tracking-[0.35em] text-white/25 uppercase" style={{ fontFamily: "'Orbitron', system-ui" }}>JOIN BY ROOM ID</p>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter room ID…"
            className="rounded-xl px-3 py-2 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && joinRoomId.trim()) {
                onJoinByRoomId(joinRoomId.trim());
                setJoinRoomId("");
              }
            }}
          />
          <button
            type="button"
            disabled={!joinRoomId.trim()}
            onClick={() => { onJoinByRoomId(joinRoomId.trim()); setJoinRoomId(""); }}
            className="flex items-center justify-center gap-2 rounded-xl py-2 text-[8px] font-black transition-all hover:scale-105 disabled:opacity-30"
            style={{
              background: `${C.cyan}15`,
              border: `1px solid ${C.cyan}28`,
              color: C.cyan,
              fontFamily: "'Orbitron', system-ui",
            }}
          >
            <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
            JOIN ROOM
          </button>
          <div className="flex-1" />
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <p className="text-[7px] font-mono text-white/20 leading-relaxed">
              Host: <span className="text-white/40">{myName}</span>
              <br />
              Mode: <span className="text-white/40">{sfuMode}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VOICE NOTE PANEL
══════════════════════════════════════════════════════════════════════ */
function VoiceNotePanel({ targetUser }: { targetUser: { id: string; name: string } | null }) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      console.warn("Mic access denied", e);
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discard = () => { setRecordedBlob(null); setRecordedUrl(null); setDuration(0); setSent(false); };

  const sendNote = async () => {
    if (!recordedBlob || !targetUser || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", recordedBlob, "voice-note.webm");
      fd.append("recipientId", targetUser.id);
      fd.append("messageType", "voice-note");
      await systemFetch("/api/comms/upload", { method: "POST", body: fd });
      setSent(true);
      setTimeout(discard, 2000);
    } catch {/* silent */}
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: `${C.orange}15`, border: `1px solid ${C.orange}28` }}
      >
        <Mic className="h-6 w-6" style={{ color: C.orange }} strokeWidth={1.8} />
      </div>

      <p className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase" style={{ fontFamily: "'Orbitron', system-ui" }}>
        VOICE NOTE {targetUser ? `→ ${targetUser.name}` : ""}
      </p>

      {/* Waveform visual */}
      <div className="flex items-end gap-1 h-12">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full transition-all"
            style={{
              background: recording ? C.orange : "rgba(255,255,255,0.1)",
              height: recording ? `${Math.max(8, Math.random() * 40 + 4)}px` : "8px",
              animation: recording ? `cy-bar${(i % 4) + 1} ${0.6 + (i % 3) * 0.2}s ease-in-out infinite` : "none",
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>

      {recording && (
        <p className="text-2xl font-black tabular-nums" style={{ color: C.orange, fontFamily: "'Orbitron', system-ui" }}>
          {formatDur(duration)}
        </p>
      )}

      {recordedUrl && !sent && (
        <audio src={recordedUrl} controls className="w-full max-w-xs rounded-xl" />
      )}
      {sent && <p className="text-[11px] font-mono" style={{ color: C.green }}>✓ VOICE NOTE SENT</p>}

      <div className="flex gap-3">
        {!recording && !recordedBlob && (
          <button type="button" onClick={startRec} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: `${C.orange}20`, border: `1px solid ${C.orange}35`, color: C.orange, fontFamily: "'Orbitron', system-ui" }}>
            <Mic className="h-4 w-4" strokeWidth={2} />RECORD
          </button>
        )}
        {recording && (
          <button type="button" onClick={stopRec} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: `${C.crimson}20`, border: `1px solid ${C.crimson}35`, color: C.crimson, fontFamily: "'Orbitron', system-ui" }}>
            <StopCircle className="h-4 w-4" strokeWidth={2} />STOP
          </button>
        )}
        {recordedBlob && !sent && (
          <>
            <button type="button" onClick={discard} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: "rgba(255,255,255,0.4)", fontFamily: "'Orbitron', system-ui" }}>
              <Trash2 className="h-4 w-4" strokeWidth={2} />DISCARD
            </button>
            <button type="button" onClick={sendNote} disabled={!targetUser || sending} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105 disabled:opacity-30" style={{ background: `${C.green}20`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: "'Orbitron', system-ui" }}>
              <Send className="h-4 w-4" strokeWidth={2} />{sending ? "SENDING…" : "SEND"}
            </button>
          </>
        )}
      </div>
      {!targetUser && <p className="text-[9px] font-mono text-white/25">Select an operator from the sidebar to send</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VIDEO NOTE PANEL
══════════════════════════════════════════════════════════════════════ */
function VideoNotePanel({ targetUser }: { targetUser: { id: string; name: string } | null }) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (previewRef.current) { previewRef.current.srcObject = stream; previewRef.current.play(); }
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (previewRef.current) previewRef.current.srcObject = null;
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      console.warn("Camera access denied", e);
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const discard = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setSent(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const sendNote = async () => {
    if (!recordedBlob || !targetUser || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", recordedBlob, "video-note.webm");
      fd.append("recipientId", targetUser.id);
      fd.append("messageType", "video-note");
      await systemFetch("/api/comms/upload", { method: "POST", body: fd });
      setSent(true);
      setTimeout(discard, 2000);
    } catch {/* silent */}
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: `${C.purple}15`, border: `1px solid ${C.purple}28` }}
      >
        <Film className="h-6 w-6" style={{ color: C.purple }} strokeWidth={1.8} />
      </div>

      <p className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase" style={{ fontFamily: "'Orbitron', system-ui" }}>
        VIDEO NOTE {targetUser ? `→ ${targetUser.name}` : ""}
      </p>

      {/* Preview */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ width: 280, height: 160, background: "rgba(0,0,0,0.6)", border: `1px solid ${C.purple}25` }}
      >
        <video ref={previewRef} className="w-full h-full object-cover" muted playsInline style={{ display: recording ? "block" : "none" }} />
        {recordedUrl && !sent && (
          <video ref={playbackRef} src={recordedUrl} controls className="w-full h-full object-cover" />
        )}
        {!recording && !recordedUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Camera className="h-8 w-8 text-white/15" strokeWidth={1} />
            <p className="text-[9px] font-mono text-white/20">Camera preview</p>
          </div>
        )}
        {recording && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: `${C.crimson}cc` }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[8px] font-mono text-white">{formatDur(duration)}</span>
          </div>
        )}
      </div>

      {sent && <p className="text-[11px] font-mono" style={{ color: C.green }}>✓ VIDEO NOTE SENT</p>}

      <div className="flex gap-3">
        {!recording && !recordedBlob && (
          <button type="button" onClick={startRec} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: `${C.purple}20`, border: `1px solid ${C.purple}35`, color: C.purple, fontFamily: "'Orbitron', system-ui" }}>
            <Camera className="h-4 w-4" strokeWidth={2} />RECORD
          </button>
        )}
        {recording && (
          <button type="button" onClick={stopRec} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: `${C.crimson}20`, border: `1px solid ${C.crimson}35`, color: C.crimson, fontFamily: "'Orbitron', system-ui" }}>
            <StopCircle className="h-4 w-4" strokeWidth={2} />STOP
          </button>
        )}
        {recordedBlob && !sent && (
          <>
            <button type="button" onClick={discard} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-black text-[10px] transition-all hover:scale-105" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: "rgba(255,255,255,0.4)", fontFamily: "'Orbitron', system-ui" }}>
              <Trash2 className="h-4 w-4" strokeWidth={2} />DISCARD
            </button>
            <button type="button" onClick={sendNote} disabled={!targetUser || sending} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105 disabled:opacity-30" style={{ background: `${C.green}20`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: "'Orbitron', system-ui" }}>
              <Send className="h-4 w-4" strokeWidth={2} />{sending ? "SENDING…" : "SEND"}
            </button>
          </>
        )}
      </div>
      {!targetUser && <p className="text-[9px] font-mono text-white/25">Select an operator from the sidebar to send</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB CONFIG
══════════════════════════════════════════════════════════════════════ */
const TABS: Array<{ id: CommsTab; label: string; icon: typeof MessageSquare; color: string }> = [
  { id: "chat",    label: "CHAT",       icon: MessageSquare, color: C.cyan    },
  { id: "voice",   label: "VOICE",      icon: Phone,         color: C.green   },
  { id: "video",   label: "VIDEO",      icon: Video,         color: C.crimson },
  { id: "group",   label: "GROUP",      icon: Users,         color: C.purple  },
  { id: "vnote",   label: "VOICE NOTE", icon: Mic,           color: C.orange  },
  { id: "vidnote", label: "VIDEO NOTE", icon: Film,          color: "#f43f5e" },
];

/* ══════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════ */
export default function CommsHubPage() {
  const displayName = (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "CYRUS OPERATOR";

  const {
    onlineUsers,
    isConnected,
    myUserId,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    callDuration,
    connectPresence,
    callUser,
    acceptCall,
    declineCall,
    endCall,
    toggleMute: toggleP2PMute,
    toggleVideo: toggleP2PVideo,
    mediaControls,
    wsRef,
    isScreenSharing,
    screenShareStream,
    remoteScreenSharerName,
    startScreenShare,
    stopScreenShare,
    sendCallChatMessage,
  } = usePresence();

  const myId = myUserId || `local-${Date.now()}`;

  const {
    sfuStatus,
    incomingGroupCall,
    activeGroupCall,
    isMuted: groupMuted,
    isVideoEnabled: groupVideoEnabled,
    createGroupCall,
    joinGroupCall,
    acceptIncomingGroupCall,
    declineIncomingGroupCall,
    endGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
  } = useCyrusGroupCall({ socketRef: wsRef, selfId: myId, displayName, isConnected });

  /* URL tab routing */
  const [activeTab, setActiveTab] = useState<CommsTab>(() => {
    if (typeof window === "undefined") return "chat";
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t === "video") return "video";
    if (t === "voice") return "voice";
    if (t === "vnote") return "vnote";
    if (t === "vidnote") return "vidnote";
    if (t === "p2p") return "voice";
    return "chat";
  });

  const [targetUser, setTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [callChatMessages, setCallChatMessages] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => { connectPresence(displayName); }, [displayName]);

  const handleCallVoice = (userId: string, name: string) => {
    setActiveTab("voice");
    callUser(userId, name, "audio");
  };
  const handleCallVideo = (userId: string, name: string) => {
    setActiveTab("video");
    callUser(userId, name, "video");
  };
  const handleMessage = (userId: string, name: string) => {
    setTargetUser({ id: userId, name });
    setActiveTab("chat");
  };

  const handleToggleMute = () => {
    toggleP2PMute();
    setIsMuted((v) => !v);
  };
  const handleToggleVideo = () => {
    toggleP2PVideo();
    setIsVideoOff((v) => !v);
  };

  const users: OnlineUser[] = (onlineUsers ?? []).map((u: any) => ({
    id: u.userId ?? u.id,
    displayName: u.displayName ?? u.name ?? "Operator",
    status: u.status ?? (u.isOnline ? "online" : "offline"),
    isOnline: u.isOnline ?? true,
  }));

  /* Active P2P call overlay */
  const showP2PCall = Boolean(activeCall);
  /* Incoming P2P call */
  const showIncomingP2P = Boolean(incomingCall && !activeCall);

  return (
    <>
      <style>{ANIM_CSS}</style>

      <div className="flex flex-col overflow-hidden text-white" style={{ height: "100vh", background: C.bg }}>

        {/* ══ HEADER ══════════════════════════════════════════════════ */}
        <header
          className="shrink-0 flex items-center gap-0 px-5"
          style={{
            height: 52,
            background: "rgba(8,8,16,0.98)",
            borderBottom: `1px solid ${C.crimson}18`,
            boxShadow: "0 2px 24px rgba(0,0,0,0.6)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-6 shrink-0">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
              style={{ background: `${C.crimson}18`, border: `1px solid ${C.crimson}35` }}
            >
              <Radio className="h-4 w-4" style={{ color: C.crimson }} strokeWidth={1.8} />
            </div>
            <p
              className="text-[11px] font-black text-white/70 tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Orbitron', system-ui" }}
            >
              COMMS
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[9px] font-black tracking-wide transition-all duration-200 whitespace-nowrap shrink-0"
                style={{
                  background:  activeTab === id ? `${color}18` : "transparent",
                  border:      activeTab === id ? `1px solid ${color}35` : "1px solid transparent",
                  color:       activeTab === id ? "#fff" : "rgba(255,255,255,0.35)",
                  boxShadow:   activeTab === id ? `0 0 12px ${color}20` : "none",
                  fontFamily: "'Orbitron', system-ui",
                }}
              >
                <Icon className="h-3 w-3" style={{ color: activeTab === id ? color : undefined }} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: isConnected ? `${C.green}10` : "rgba(255,255,255,0.05)", border: `1px solid ${isConnected ? C.green + "22" : C.border}` }}
            >
              <span className={`h-[4px] w-[4px] rounded-full ${isConnected ? "animate-pulse" : ""}`} style={{ background: isConnected ? C.green : "#555" }} />
              <span className="text-[7px] font-mono text-white/30 uppercase">{isConnected ? "CONNECTED" : "OFFLINE"}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}15` }}>
              <SignalHigh className="h-2.5 w-2.5" style={{ color: C.cyan }} strokeWidth={2} />
              <span className="text-[7px] font-mono" style={{ color: C.cyan }}>ENCRYPTED</span>
            </div>
          </div>
        </header>

        {/* ══ BODY ════════════════════════════════════════════════════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Users rail */}
          <UsersRail
            users={users}
            myId={myId}
            onCallVoice={handleCallVoice}
            onCallVideo={handleCallVideo}
            onMessage={handleMessage}
          />

          {/* Main content */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {activeTab === "chat" && (
              <ChatPanel myId={myId} myName={displayName} targetUser={targetUser} />
            )}

            {activeTab === "voice" && (
              <DialerPanel mode="voice" users={users} myId={myId} isConnected={isConnected} onCall={handleCallVoice} />
            )}

            {activeTab === "video" && (
              <DialerPanel mode="video" users={users} myId={myId} isConnected={isConnected} onCall={handleCallVideo} />
            )}

            {activeTab === "group" && (
              <GroupCallHub
                myUserId={myId}
                myName={displayName}
                users={users}
                sfuMode={typeof sfuStatus === "string" ? sfuStatus : "star"}
                activeGroupCall={activeGroupCall}
                incomingGroupCall={incomingGroupCall}
                onStartGroupCall={createGroupCall}
                onJoinByRoomId={joinGroupCall}
                onAcceptGroupCall={acceptIncomingGroupCall}
                onDeclineGroupCall={declineIncomingGroupCall}
                onEndGroupCall={endGroupCall}
                onToggleMute={toggleGroupMute}
                onToggleVideo={toggleGroupVideo}
                isMuted={groupMuted}
                isVideoEnabled={groupVideoEnabled}
              />
            )}

            {activeTab === "vnote" && <VoiceNotePanel targetUser={targetUser} />}
            {activeTab === "vidnote" && <VideoNotePanel targetUser={targetUser} />}
          </main>
        </div>

        {/* ══ INCOMING P2P CALL OVERLAY ═══════════════════════════════ */}
        {showIncomingP2P && incomingCall && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}>
            <div
              className="flex flex-col items-center gap-5 rounded-3xl p-10"
              style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
            >
              {[100, 140, 180].map((r, i) => (
                <div key={r} className="absolute rounded-full" style={{ width: r, height: r, border: `1px solid ${C.green}${i === 0 ? "40" : "20"}`, animation: `cy-pulse-ring ${1 + i * 0.5}s ease-in-out infinite` }} />
              ))}
              <div className="relative z-10">
                <Avatar name={incomingCall.callerName ?? "Caller"} size={72} ring />
              </div>
              <div className="text-center relative z-10">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">
                  INCOMING {incomingCall.callType?.toUpperCase() ?? "CALL"}
                </p>
                <p className="text-xl font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>
                  {incomingCall.callerName ?? "Unknown"}
                </p>
              </div>
              <div className="flex gap-5 relative z-10">
                <button type="button" onClick={declineCall} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px]" style={{ background: "#ef444420", border: "1px solid #ef444435", color: "#ef4444", fontFamily: "'Orbitron', system-ui" }}>
                  <PhoneOff className="h-4 w-4" strokeWidth={2} />DECLINE
                </button>
                <button type="button" onClick={acceptCall} className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px]" style={{ background: `${C.green}20`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: "'Orbitron', system-ui" }}>
                  <Phone className="h-4 w-4" strokeWidth={2} />ACCEPT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACTIVE P2P CALL OVERLAY ═════════════════════════════════ */}
        {showP2PCall && activeCall && (
          <div className="fixed inset-0 z-[200]">
            <CallView
              roomId={activeCall.roomId ?? ""}
              callType={activeCall.callType ?? "audio"}
              participants={[]}
              localStream={localStream}
              currentUserId={myId}
              currentUserName={displayName}
              isMuted={isMuted}
              isVideoEnabled={!isVideoOff}
              callDuration={callDuration}
              isScreenSharing={isScreenSharing}
              screenShareStream={screenShareStream}
              screenSharerName={remoteScreenSharerName ?? undefined}
              onToggleMute={handleToggleMute}
              onToggleVideo={handleToggleVideo}
              onEndCall={endCall}
              onStartScreenShare={startScreenShare}
              onStopScreenShare={stopScreenShare}
              onSendChatMessage={(msg) => sendCallChatMessage?.({ message: msg, messageType: "text" })}
              chatMessages={callChatMessages}
            />
          </div>
        )}
      </div>
    </>
  );
}
