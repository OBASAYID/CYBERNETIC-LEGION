/**
 * CYRUS COMMS HUB v3.0 — Crimson Aerospace Communications Suite
 * Tabs: CHAT · VOICE · VIDEO · GROUP · VOICE NOTE · VIDEO NOTE
 */

import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent, type MutableRefObject, type CSSProperties } from "react";
import {
  MessageSquare, Phone, Video, Users, Mic, Film, MicOff, VideoOff,
  PhoneOff, Send, Search, Shield, SignalHigh, Radio, Zap, Camera,
  StopCircle, Trash2, ChevronRight, PhoneCall, Wifi, Lock, Volume2,
  Monitor, Signal, Activity, Globe, Settings2, Antenna, Paperclip,
} from "lucide-react";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { useCyrusGroupCall } from "../../../client/src/hooks/useCyrusGroupCall";
import { CallView } from "../../../client/src/components/comms/CallView";
import { InCallChat, type InCallChatMessage } from "../../../client/src/components/comms/InCallChat";
import { CommsIncomingCallOverlay } from "@/components/comms/comms-call-chrome";
import { PshareTabPanel } from "@/components/comms/PshareTabPanel";
import { systemFetch, systemApiUrl } from "@shared/cyrus-api-client";
import {
  COMMS_MEDIA_FILE_ACCEPT,
  uploadAndBuildCommsMediaPayload,
  type CommsUploadProgress,
} from "../../../client/src/lib/comms-media-upload";
import { isCommsCad3dFile } from "../../../client/src/lib/comms-cad-formats";
import { formatCommsFileSize } from "@shared/comms/media-formats";

/* ══════════════════════════════════════════════════════════════
   THEME — charcoal matte + red accent (Epic / launcher style)
══════════════════════════════════════════════════════════════ */
const C = {
  red: "#E70011",
  redDim: "#B8000E",
  redGlow: "rgba(231,0,17,0.35)",
  steel: "#8B949E",
  slate: "#2A2D32",
  slateLight: "#363A40",
  charcoal: "#121212",
  charcoalDeep: "#0B0B0B",
  sidebar: "#161616",
  sidebarElevated: "#1F1F1F",
  sidebarHover: "#242424",
  sidebarSelected: "#2A2A2A",
  sidebarInput: "#222222",
  sidebarDivider: "#2E2E2E",
  green: "#3DDC84",
  amber: "#F5A663",
  sky: "#82CFFF",
  /** legacy aliases used across panels */
  crimson: "#E70011",
  cyan: "#82CFFF",
  purple: "#6B7280",
  orange: "#F5A663",
  yellow: "#F9D466",
  bg: "#0B0B0B",
  card: "rgba(27,27,27,0.94)",
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.09)",
  textMuted: "#888888",
  bubbleMine: "#242424",
  bubbleMineBorder: "#333333",
  bubbleTheirs: "#1A1A1A",
} as const;

/** Solid sidebar — no grain, stripes, or glass transparency */
const SIDEBAR_SURFACE: CSSProperties = {
  backgroundColor: C.sidebar,
};

const MAIN_SURFACE: CSSProperties = {
  backgroundColor: C.charcoalDeep,
};

type CommsTab = "chat" | "voice" | "video" | "group" | "vnote" | "vidnote" | "pshare";

interface OnlineUser {
  id: string; displayName: string;
  status?: "online" | "offline" | "busy" | "in_call";
  isOnline?: boolean;
}
interface ChatMsg {
  id: string; senderId: string; senderName: string;
  content: string; createdAt: string; messageType?: string;
  fileUrl?: string; fileName?: string; fileMimeType?: string;
  voiceDurationSeconds?: number; fileSizeBytes?: number;
}

function normalizeChatMsg(raw: any, myId: string, myName: string, targetUser: { id: string; name: string } | null): ChatMsg {
  const senderId = String(raw?.senderId ?? raw?.from ?? "");
  const fallbackSender =
    senderId && senderId === myId
      ? myName
      : senderId && targetUser && senderId === targetUser.id
        ? targetUser.name
        : "Operator";
  let voiceDurationSeconds: number | undefined;
  if (raw?.voiceDurationSeconds != null) {
    voiceDurationSeconds = Number(raw.voiceDurationSeconds);
  } else if (raw?.messageType === "voice-note" && raw?.content) {
    try {
      const parsed = JSON.parse(String(raw.content)) as { d?: number };
      if (typeof parsed.d === "number") voiceDurationSeconds = parsed.d;
    } catch {
      /* legacy plain duration */
    }
  }
  return {
    id: String(raw?.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    senderId,
    senderName: String(raw?.senderName ?? raw?.displayName ?? raw?.name ?? fallbackSender),
    content: String(raw?.content ?? raw?.message ?? ""),
    createdAt: String(raw?.createdAt ?? raw?.timestamp ?? new Date().toISOString()),
    messageType: typeof raw?.messageType === "string" ? raw.messageType : undefined,
    fileUrl: typeof raw?.fileUrl === "string" ? raw.fileUrl : undefined,
    fileName: typeof raw?.fileName === "string" ? raw.fileName : undefined,
    fileMimeType: typeof raw?.fileMimeType === "string" ? raw.fileMimeType : undefined,
    voiceDurationSeconds,
    fileSizeBytes: raw?.fileSizeBytes != null ? Number(raw.fileSizeBytes) : undefined,
  };
}

/* ══════════════════════════════════════════════════════════════
   CSS ANIMATIONS
══════════════════════════════════════════════════════════════ */
const ANIM_CSS = `
@keyframes cy-orbit   { from{transform:rotate(0deg)}  to{transform:rotate(360deg)}  }
@keyframes cy-orbit2  { from{transform:rotate(0deg)}  to{transform:rotate(-360deg)} }
@keyframes cy-orbit3  { from{transform:rotate(45deg)} to{transform:rotate(405deg)}  }
@keyframes cy-pulse   { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.35;transform:scale(1.08)} }
@keyframes cy-pulse2  { 0%,100%{opacity:.06;transform:scale(1)} 50%{opacity:.2;transform:scale(1.12)}  }
@keyframes cy-bar1    { 0%,100%{height:4px}  50%{height:18px} }
@keyframes cy-bar2    { 0%,100%{height:9px}  50%{height:26px} }
@keyframes cy-bar3    { 0%,100%{height:6px}  50%{height:20px} }
@keyframes cy-bar4    { 0%,100%{height:13px} 50%{height:30px} }
@keyframes cy-bar5    { 0%,100%{height:5px}  50%{height:22px} }
@keyframes cy-scan    { 0%{opacity:0;transform:translateY(-100%)} 100%{opacity:.4;transform:translateY(100%)} }
@keyframes cy-blink   { 0%,100%{opacity:1}   50%{opacity:.25} }
@keyframes cy-float   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
@keyframes cy-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes cy-ripple  { 0%{transform:scale(0.8);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
@keyframes cy-glow    { 0%,100%{box-shadow:0 0 12px var(--glow)} 50%{box-shadow:0 0 28px var(--glow)} }
@keyframes cy-slide-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes cy-particle { 0%{transform:translate(0,0);opacity:.7} 100%{transform:translate(var(--px),var(--py));opacity:0} }
`;

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function initials(n: string) { return n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function colorForName(n: string) {
  const c = [C.red, C.sky, C.amber, C.green, C.steel, "#C4A882"];
  let h = 0; for(let i=0;i<n.length;i++) h = n.charCodeAt(i)+((h<<5)-h);
  return c[Math.abs(h)%c.length];
}
function fmtDur(s: number) { const m=Math.floor(s/60),sec=s%60; return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
function timeAgo(iso: string) {
  const d = Date.now()-new Date(iso).getTime(), m=Math.floor(d/60000);
  if(m<1) return "now"; if(m<60) return `${m}m`; return `${Math.floor(m/60)}h`;
}

function renderDirectChatBody(msg: ChatMsg) {
  const mediaUrl = msg.fileUrl ? systemApiUrl(msg.fileUrl) : null;
  const mt = msg.messageType || "text";
  const mime = msg.fileMimeType || "";

  if (mediaUrl && mt === "voice-note") {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-wide">Voice note</p>
        <audio src={mediaUrl} controls className="w-full max-w-sm rounded-lg" preload="metadata" />
        {msg.voiceDurationSeconds != null && msg.voiceDurationSeconds > 0 && (
          <p className="text-[9px] text-white/30">{fmtDur(msg.voiceDurationSeconds)}</p>
        )}
      </div>
    );
  }

  if (mediaUrl && (mt === "cad-3d" || isCommsCad3dFile(msg.fileName, mime))) {
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-[12px] underline"
        style={{ color: "rgba(130,207,255,0.85)" }}>
        🧊 {msg.fileName || "CAD file"}
        {msg.content.trim() ? ` — ${msg.content}` : ""}
      </a>
    );
  }

  if (mediaUrl && mime.startsWith("image/")) {
    return (
      <div className="space-y-1.5">
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
          <img src={mediaUrl} alt={msg.fileName || "Shared image"} className="max-h-48 w-full object-cover rounded-lg" />
        </a>
        {msg.content.trim() ? <p className="text-[12px] text-white/70 leading-relaxed">{msg.content}</p> : null}
      </div>
    );
  }

  if (mediaUrl && (mime.startsWith("video/") || mt === "media" && mime.startsWith("video"))) {
    return (
      <div className="space-y-1.5">
        <video src={mediaUrl} controls playsInline className="w-full max-w-sm rounded-lg" preload="metadata" />
        {msg.content.trim() ? <p className="text-[12px] text-white/70 leading-relaxed">{msg.content}</p> : null}
      </div>
    );
  }

  if (mediaUrl && mime.startsWith("audio/")) {
    return (
      <div className="space-y-1.5">
        <audio src={mediaUrl} controls className="w-full max-w-sm rounded-lg" preload="metadata" />
        {msg.content.trim() ? <p className="text-[12px] text-white/70 leading-relaxed">{msg.content}</p> : null}
      </div>
    );
  }

  if (mediaUrl) {
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-[12px] underline"
        style={{ color: "rgba(130,207,255,0.85)" }}>
        📎 {msg.fileName || "Shared file"}
        {msg.fileSizeBytes ? ` · ${formatCommsFileSize(msg.fileSizeBytes)}` : ""}
        {msg.content.trim() ? ` — ${msg.content}` : ""}
      </a>
    );
  }

  return <p className="text-[12px] text-white/70 leading-relaxed">{msg.content || ""}</p>;
}

/* ══════════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════════ */
function Avatar({ name, size=36, ring=false, speaking=false }:
  { name:string; size?:number; ring?:boolean; speaking?:boolean }) {
  const c = colorForName(name);
  return (
    <div className="relative shrink-0 flex items-center justify-center rounded-full font-black text-white select-none"
      style={{ width:size, height:size, background:`${c}22`,
        border: speaking ? `2px solid ${c}` : ring ? `2px solid ${c}80` : `1px solid ${c}40`,
        fontSize: Math.max(9,size*0.33),
        boxShadow: speaking ? `0 0 20px ${c}70, 0 0 40px ${c}30` : ring ? `0 0 14px ${c}50` : "none",
        transition: "all 0.3s ease",
      }}>
      {initials(name)}
      {speaking && (
        <div className="absolute inset-[-4px] rounded-full"
          style={{ border:`2px solid ${c}40`, animation:"cy-ripple 1.5s ease-out infinite" }} />
      )}
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const col = status==="online"?C.green:status==="busy"?C.orange:status==="in_call"?C.crimson:"#555";
  return <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2"
    style={{ background:col, borderColor:"#1e1e24", boxShadow: (status==="online"||status==="busy"||status==="in_call") ? `0 0 6px ${col}80` : "none" }} />;
}

/* ══════════════════════════════════════════════════════════════
   AUDIO BARS VISUALISER
══════════════════════════════════════════════════════════════ */
const BAR_ANIMS = ["cy-bar1","cy-bar2","cy-bar3","cy-bar4","cy-bar5","cy-bar3","cy-bar2","cy-bar1"];

function AudioBars({ active=false, color=C.cyan, bars=8 }: { active?:boolean; color?:string; bars?:number }) {
  if (!active) return (
    <div className="flex items-end gap-[2px]" style={{ height:20 }}>
      {Array.from({length:bars}).map((_,i) => (
        <div key={i} className="w-[3px] rounded-full" style={{ height:3, background:`${color}30` }} />
      ))}
    </div>
  );
  return (
    <div className="flex items-end gap-[2px]" style={{ height:20 }}>
      {Array.from({length:bars}).map((_,i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{ background:color,
            animation:`${BAR_ANIMS[i%BAR_ANIMS.length]} ${0.6+(i%3)*0.15}s ease-in-out ${i*55}ms infinite` }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SIGNAL QUALITY BARS
══════════════════════════════════════════════════════════════ */
function SignalBars({ quality=4, color=C.green }: { quality?:number; color?:string }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[3,5,8,11,14].map((h,i) => (
        <div key={i} className="w-[3px] rounded-sm transition-all"
          style={{ height:h, background: i<quality ? color : `${color}20` }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HEXGRID BACKGROUND (group call)
══════════════════════════════════════════════════════════════ */
function HexGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]"
      style={{ overflow:"hidden" }}>
      <defs>
        <pattern id="hex" x="0" y="0" width="52" height="60" patternUnits="userSpaceOnUse">
          <polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="none" stroke={C.cyan} strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   WAVEFORM — pre-calculated to avoid Math.random in render
══════════════════════════════════════════════════════════════ */
const WAVE_HEIGHTS = [12,22,8,30,16,26,10,20,28,6,18,24,14,32,10,22,16,28,8,20];

function Waveform({ active=false, color=C.orange, bars=20 }: { active?:boolean; color?:string; bars?:number }) {
  return (
    <div className="flex items-end gap-1" style={{ height:40 }}>
      {WAVE_HEIGHTS.slice(0,bars).map((h,i) => (
        <div key={i} className="rounded-full"
          style={{
            width:6, minHeight:4,
            background: active ? color : `${color}20`,
            height: active ? h : 4,
            animation: active
              ? `${BAR_ANIMS[i%BAR_ANIMS.length]} ${0.5+(i%4)*0.15}s ease-in-out ${i*35}ms infinite`
              : "none",
            transition: "background 0.3s, height 0.3s",
          }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STAT PILL
══════════════════════════════════════════════════════════════ */
function StatPill({ label, value, color=C.cyan }:
  { label:string; value:string; color?:string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl px-3 py-2"
      style={{ background:`${color}08`, border:`1px solid ${color}18` }}>
      <span className="text-[7px] font-mono tracking-widest text-white/25 uppercase">{label}</span>
      <span className="text-[11px] font-black tabular-nums" style={{ color, fontFamily:"'Orbitron',system-ui" }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   USERS RAIL  — matches reference Friends sidebar exactly
══════════════════════════════════════════════════════════════ */
function UsersRail({ users, myId, myName, selectedUserId, onCallVoice, onCallVideo, onMessage }:
  { users:OnlineUser[]; myId:string; myName:string; selectedUserId?:string|null;
    onCallVoice:(id:string,name:string)=>void;
    onCallVideo:(id:string,name:string)=>void; onMessage:(id:string,name:string)=>void; }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(u => u.id!==myId && u.displayName.toLowerCase().includes(search.toLowerCase()));
  const online = filtered.filter(u=>u.isOnline).length;

  function initials2(n: string) { return n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }

  return (
    <aside className="flex flex-col shrink-0"
      style={{ width:215, borderRight:`1px solid ${C.sidebarDivider}`, ...SIDEBAR_SURFACE }}>

      {/* ── Profile header ── */}
      <div className="px-4 pt-5 pb-4 shrink-0"
        style={{ borderBottom:`1px solid ${C.sidebarDivider}`, background: C.sidebarElevated }}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-sm text-white"
              style={{ background:`linear-gradient(145deg, ${C.red}, ${C.redDim})`, boxShadow:`0 4px 14px ${C.redGlow}` }}>
              {initials2(myName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{ background:C.green, borderColor:"#1e1e24" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{myName}</p>
            <p className="text-[10px]" style={{ color: C.textMuted }}>Active now</p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-4 pt-3 pb-2 shrink-0" style={{ background: C.sidebar }}>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: C.sidebarInput, border:`1px solid ${C.sidebarDivider}` }}>
          <Search className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} strokeWidth={1.8} />
          <input type="text" placeholder="Search friends…" value={search}
            onChange={e=>setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-white/85 placeholder:text-[#666] focus:outline-none" />
        </div>
      </div>

      {/* ── Friends list — matches reference Friends section ── */}
      <div className="px-4 pt-1 pb-1 shrink-0" style={{ background: C.sidebar }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/70">Friends</p>
          <span className="text-[9px]" style={{ color: C.green }}>{online} online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth:"none", background: C.sidebar }}>
        {filtered.length===0 ? (
          <p className="text-center text-[10px] pt-8 italic" style={{ color: C.textMuted }}>No operators found</p>
        ) : filtered.map(u => {
          const isOnline = u.isOnline || u.status==="online";
          const isSelected = selectedUserId === u.id;
          return (
            <div key={u.id}
              className="group relative flex items-center gap-2.5 rounded-lg px-2 py-2 mb-0.5 cursor-pointer transition-colors"
              style={{
                background: isSelected ? C.sidebarSelected : "transparent",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = C.sidebarHover; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              onClick={()=>onMessage(u.id,u.displayName)}>
              {isSelected && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: C.red }} />
              )}
              <div className="relative shrink-0">
                <Avatar name={u.displayName} size={34} />
                <StatusDot status={u.status??(u.isOnline?"online":"offline")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate"
                  style={{ color: isSelected ? "#fff" : "rgba(255,255,255,0.78)" }}>{u.displayName}</p>
                <p className="text-[9px] capitalize" style={{ color: C.textMuted }}>
                  {u.status==="in_call"?"in call":isOnline?"online":"offline"}
                </p>
              </div>
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={e=>{e.stopPropagation();onCallVoice(u.id,u.displayName);}}
                  className="rounded-lg p-1.5 transition-colors" title="Voice"
                  style={{ background: C.sidebarInput }}>
                  <Phone className="h-3 w-3" style={{ color: C.green }} strokeWidth={1.8} />
                </button>
                <button type="button" onClick={e=>{e.stopPropagation();onCallVideo(u.id,u.displayName);}}
                  className="rounded-lg p-1.5 transition-colors" title="Video"
                  style={{ background: C.sidebarInput }}>
                  <Video className="h-3 w-3" style={{ color: C.steel }} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length > 0 && (
          <p className="mt-2 px-2 text-[10px] font-medium text-white/30 hover:text-white/55 cursor-pointer transition-colors">
            See more
          </p>
        )}
      </div>

      {/* ── Settings footer ── */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderTop:`1px solid ${C.sidebarDivider}`, background: C.sidebarElevated }}>
        <Settings2 className="h-3.5 w-3.5" style={{ color: C.textMuted }} strokeWidth={1.8} />
        <p className="text-[11px]" style={{ color: C.textMuted }}>Settings</p>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHAT PANEL
══════════════════════════════════════════════════════════════ */
function ChatPanel({ myId, myName, targetUser }:
  { myId:string; myName:string; targetUser:{id:string;name:string}|null }) {
  const { sendMessage, sendChatMessage, wsRef } = usePresence();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CommsUploadProgress | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const commIdentityHeaders = useMemo(
    () => ({ "x-device-id": myId, "x-user-id": myId }),
    [myId],
  );

  useEffect(() => {
    if (!targetUser) return;
    setMsgs([]);
    systemFetch(`/api/comms/messages/${targetUser.id}`, { headers: commIdentityHeaders })
      .then(r=>r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d?.messages ?? [];
        console.log("[CommsHub][messages:load]", {
          me: myId,
          peer: targetUser.id,
          count: list.length,
        });
        setMsgs(list.map((m: any) => normalizeChatMsg(m, myId, myName, targetUser)));
      })
      .catch((err)=>{
        console.error("[CommsHub][messages:load:error]", {
          me: myId,
          peer: targetUser.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }, [targetUser?.id, myId, myName, targetUser, commIdentityHeaders]);

  useEffect(() => {
    if (!targetUser) return;
    const socket = wsRef.current;
    if (!socket) return;

    const onNewMessage = (data: {
      id?: string;
      senderId: string;
      senderName: string;
      message: string;
      timestamp: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
      voiceDurationSeconds?: number;
      fileSizeBytes?: number;
    }) => {
      if (data.senderId !== targetUser.id && data.senderId !== myId) return;
      const normalized = normalizeChatMsg(
        {
          id: data.id ?? `msg-${Date.now()}`,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.message,
          createdAt: data.timestamp,
          messageType: data.messageType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMimeType: data.fileMimeType,
          voiceDurationSeconds: data.voiceDurationSeconds,
          fileSizeBytes: data.fileSizeBytes,
        },
        myId,
        myName,
        targetUser,
      );
      setMsgs((prev) => (prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]));
      console.log("[CommsHub][messages:recv:socket]", {
        me: myId,
        peer: targetUser.id,
        messageId: normalized.id,
      });
    };

    const onMessageSent = (data: {
      id?: string;
      recipientId?: string;
      message?: string;
      messageType?: string;
      timestamp?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
      voiceDurationSeconds?: number;
      fileSizeBytes?: number;
    }) => {
      if (data.recipientId !== targetUser.id) return;
      const normalized = normalizeChatMsg(
        {
          id: data.id ?? `msg-${Date.now()}`,
          senderId: myId,
          senderName: myName,
          content: data.message ?? "",
          createdAt: data.timestamp ?? new Date().toISOString(),
          messageType: data.messageType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMimeType: data.fileMimeType,
          voiceDurationSeconds: data.voiceDurationSeconds,
          fileSizeBytes: data.fileSizeBytes,
        },
        myId,
        myName,
        targetUser,
      );
      setMsgs((prev) => (prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]));
    };

    socket.on("new-message", onNewMessage);
    socket.on("message-sent", onMessageSent);
    return () => {
      socket.off("new-message", onNewMessage);
      socket.off("message-sent", onMessageSent);
    };
  }, [targetUser?.id, myId, myName, targetUser, wsRef]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const send = async () => {
    if (!targetUser || sending || uploading) return;

    if (attachFile) {
      setUploading(true);
      setUploadProgress({ loaded: 0, total: attachFile.size, percent: 0, phase: "init" });
      try {
        const payload = await uploadAndBuildCommsMediaPayload(
          attachFile,
          input.trim(),
          myId,
          attachFile.name,
          setUploadProgress,
        );
        if (!payload) return;
        sendChatMessage(targetUser.id, payload);
        setInput("");
        setAttachFile(null);
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
      return;
    }

    if (!input.trim()) return;
    setSending(true);
    const text = input.trim(); setInput("");
    setMsgs(p=>[...p, normalizeChatMsg(
      { id: `opt-${Date.now()}`, senderId: myId, senderName: myName, content: text, createdAt: new Date().toISOString() },
      myId,
      myName,
      targetUser
    )]);
    try {
      console.log("[CommsHub][messages:send:socket]", {
        me: myId,
        peer: targetUser.id,
        size: text.length,
      });
      sendMessage(targetUser.id, text);
    } catch(err){
      console.error("[CommsHub][messages:send:error]", {
        me: myId,
        peer: targetUser.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    setSending(false);
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setAttachFile(file);
  };

  if (!targetUser) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40">
      <div className="h-14 w-14 flex items-center justify-center rounded-2xl"
        style={{ background:`${C.cyan}12`, border:`1px solid ${C.cyan}25` }}>
        <MessageSquare className="h-7 w-7" style={{color:C.cyan}} strokeWidth={1} />
      </div>
      <p className="text-[11px] font-mono text-white/35">Select an operator to begin</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat header — Activity panel style: bold "name" header */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ borderBottom:`1px solid ${C.border}` }}>
        <div className="relative">
          <Avatar name={targetUser.name} size={36} ring />
          <StatusDot status="online" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{targetUser.name}</p>
          <p className="text-[10px] text-white/35">Active now</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" title="Voice call"
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            style={{ background:"rgba(255,255,255,0.07)", border:`1px solid ${C.border}` }}>
            <Phone className="h-3.5 w-3.5 text-green-400" strokeWidth={1.8} />
          </button>
          <button type="button" title="Video call"
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            style={{ background:"rgba(255,255,255,0.07)", border:`1px solid ${C.border}` }}>
            <Video className="h-3.5 w-3.5 text-white/50" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Messages — Activity feed card style matching reference image */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.06) transparent" }}>
        {msgs.length===0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-30 gap-3">
            <MessageSquare className="h-8 w-8 text-white/20" strokeWidth={1} />
            <p className="text-[11px] text-white/30">No messages yet — start a conversation</p>
          </div>
        )}
        {msgs.map(msg => {
          const safeSenderName = msg.senderName || "Operator";
          const safeCreatedAt = msg.createdAt || new Date().toISOString();
          const mine = msg.senderId===myId;
          return (
            /* Activity-feed style card: avatar + name/time + message + Reply */
            <div key={msg.id} className="flex gap-3" style={{ animation:"cy-slide-up 0.2s ease" }}>
              {/* Round avatar — always on left */}
              <div className="relative shrink-0 mt-0.5">
                <Avatar name={safeSenderName} size={36} />
                {mine && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                    style={{ background:C.green, borderColor:"#1e1e24" }} />
                )}
              </div>
              {/* Card body */}
              <div className="flex-1 min-w-0 rounded-2xl px-4 py-3"
                style={{
                  background: mine ? C.bubbleMine : C.bubbleTheirs,
                  border: `1px solid ${mine ? C.bubbleMineBorder : C.border}`,
                }}>
                {/* Name + time row */}
                <div className="flex items-baseline gap-2 mb-1.5">
                  <p className="text-[12px] font-bold text-white/90 truncate">{safeSenderName}</p>
                  <p className="text-[9px] text-white/30 shrink-0">{timeAgo(safeCreatedAt)}</p>
                </div>
                {renderDirectChatBody(msg)}
                {/* Reply button — matches reference "Reply" link */}
                {!mine && (
                  <button type="button"
                    onClick={()=>setInput(`@${safeSenderName} `)}
                    className="mt-2 text-[10px] font-semibold text-white/35 hover:text-white/65 transition-colors">
                    Reply
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — dark pill, red send */}
      <div className="flex flex-col gap-2 px-5 py-3.5 shrink-0"
        style={{ borderTop:`1px solid ${C.sidebarDivider}`, background: C.charcoal }}>
        {attachFile && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-white/70"
            style={{ background: C.sidebarInput, border:`1px solid ${C.sidebarDivider}` }}>
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate flex-1">{attachFile.name}</span>
            <button type="button" onClick={()=>setAttachFile(null)} className="text-white/40 hover:text-white/70">✕</button>
          </div>
        )}
        {uploadProgress && uploading && (
          <p className="text-[10px] text-white/35 font-mono">
            Uploading… {uploadProgress.percent}%
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <input ref={fileRef} type="file" accept={COMMS_MEDIA_FILE_ACCEPT} className="hidden" onChange={handleFilePick} />
          <button type="button" title="Attach file or media" disabled={uploading}
            onClick={()=>fileRef.current?.click()}
            className="flex items-center justify-center h-10 w-10 rounded-lg transition-all hover:scale-105 disabled:opacity-30"
            style={{ background: C.sidebarInput, border:`1px solid ${C.sidebarDivider}` }}>
            <Paperclip className="h-4 w-4 text-white/50" strokeWidth={1.8} />
          </button>
          <div className="flex-1 flex items-center gap-3 rounded-full px-4 py-2.5"
            style={{ background: C.sidebarInput, border:`1px solid ${C.sidebarDivider}` }}>
            <input type="text" value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}
              placeholder={attachFile ? "Add a caption…" : uploading ? "Uploading…" : "Write a message…"}
              disabled={uploading}
              className="flex-1 bg-transparent text-[13px] text-white/85 placeholder:text-white/35 focus:outline-none disabled:opacity-50" />
          </div>
          <button type="button" onClick={()=>void send()} disabled={(!input.trim()&&!attachFile)||sending||uploading}
            className="flex items-center justify-center h-10 w-10 rounded-full transition-all hover:scale-105 disabled:opacity-30"
            style={{
              background: (input.trim()||attachFile) ? C.red : C.slateLight,
              boxShadow: (input.trim()||attachFile) ? `0 4px 14px ${C.redGlow}` : "none",
            }}>
            <Send className="h-4 w-4 text-white" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DIALER PANEL (Voice / Video)
══════════════════════════════════════════════════════════════ */
function DialerPanel({ mode, users, myId, isConnected, onCall }:
  { mode:"voice"|"video"; users:OnlineUser[]; myId:string;
    isConnected:boolean; onCall:(id:string,name:string)=>void }) {
  const online = users.filter(u=>u.id!==myId&&u.isOnline);
  const accent = mode==="video"?C.crimson:C.green;
  const Icon   = mode==="video"?Video:Phone;
  const label  = mode==="video"?"VIDEO CALL":"VOICE CALL";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status banner */}
      <div className="mx-5 mt-5 mb-4 rounded-2xl px-5 py-4 shrink-0 flex items-center gap-4"
        style={{ background:`${accent}0a`, border:`1px solid ${accent}1a` }}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
          style={{ background:`${accent}18`, border:`1px solid ${accent}30` }}>
          <Icon className="h-5 w-5" style={{color:accent}} strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black tracking-[0.3em] text-white/65 uppercase mb-1"
            style={{ fontFamily:"'Orbitron',system-ui" }}>{label}</p>
          <div className="flex items-center gap-2">
            <span className="h-[5px] w-[5px] rounded-full"
              style={{ background:isConnected?C.green:"#ef4444",
                boxShadow:`0 0 8px ${isConnected?C.green:"#ef4444"}`,
                animation:"cy-blink 2s ease-in-out infinite" }} />
            <p className="text-[8px] font-mono text-white/30">
              {isConnected?"SIGNALING READY — CLICK OPERATOR TO CALL":"CONNECTING TO SIGNAL SERVER…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <StatPill label="LATENCY" value="<50ms" color={C.green} />
          <StatPill label="CODEC" value={mode==="video"?"VP8":"OPUS"} color={C.cyan} />
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" style={{color:C.green}} strokeWidth={1.8} />
            <span className="text-[7px] font-mono text-white/30">DTLS-SRTP</span>
          </div>
        </div>
      </div>

      <div className="px-5 mb-3 shrink-0">
        <p className="text-[8px] font-black tracking-[0.4em] text-white/20 uppercase"
          style={{ fontFamily:"'Orbitron',system-ui" }}>
          AVAILABLE OPERATORS · {online.length}
        </p>
      </div>

      {online.length===0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-35">
          <div className="h-16 w-16 flex items-center justify-center rounded-2xl"
            style={{ background:`${accent}10`, border:`1px solid ${accent}20` }}>
            <Wifi className="h-8 w-8" style={{color:accent}} strokeWidth={1} />
          </div>
          <p className="text-[11px] font-mono text-white/35">No operators online</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-5"
          style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.06) transparent" }}>
          <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", alignContent:"start" }}>
            {online.map(u => (
              <button key={u.id} type="button" onClick={()=>onCall(u.id,u.displayName)}
                className="group flex flex-col items-center gap-3 rounded-2xl p-5 transition-all duration-200 hover:scale-[1.03]"
                style={{ background:`${accent}07`, border:`1px solid ${accent}15`,
                  boxShadow:`0 0 0 0 ${accent}00` }}
                onMouseEnter={e=>(e.currentTarget.style.boxShadow=`0 0 24px ${accent}18`)}
                onMouseLeave={e=>(e.currentTarget.style.boxShadow=`0 0 0 0 ${accent}00`)}>
                <div className="relative">
                  <Avatar name={u.displayName} size={52} ring />
                  <StatusDot status="online" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-white/80">{u.displayName}</p>
                  <p className="text-[7px] font-mono text-white/25 mt-0.5 uppercase">ONLINE</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ background:`${accent}18`, border:`1px solid ${accent}30` }}>
                  <Icon className="h-3 w-3" style={{color:accent}} strokeWidth={2} />
                  <span className="text-[8px] font-black tracking-wide text-white/70"
                    style={{ fontFamily:"'Orbitron',system-ui" }}>{label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GROUP CALL HUB
══════════════════════════════════════════════════════════════ */
function ParticleField({ color, count=12 }: { color:string; count?:number }) {
  const particles = useMemo(() =>
    Array.from({length:count}).map((_,i) => ({
      id:i,
      px: `${(Math.sin(i*2.1)*80)}px`,
      py: `${(Math.cos(i*1.7)*80)}px`,
      delay: `${i*0.3}s`,
      dur: `${1.5+i*0.2}s`,
    }))
  ,[count]);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map(p=>(
        <div key={p.id} className="absolute rounded-full"
          style={{
            width:3, height:3,
            background:color,
            top:"50%", left:"50%",
            opacity:0,
            ["--px" as any]:p.px,
            ["--py" as any]:p.py,
            animation:`cy-particle ${p.dur} ease-out ${p.delay} infinite`,
          }} />
      ))}
    </div>
  );
}

function GroupCallHub({
  myUserId, myName, users, sfuMode,
  activeGroupCall, incomingGroupCall,
  onStartGroupCall, onJoinByRoomId,
  onAcceptGroupCall, onDeclineGroupCall, onEndGroupCall,
  onToggleMute, onToggleVideo, isMuted, isVideoEnabled,
  groupCallChatMessages, onSendGroupCallChatMessage, onSendGroupCallMedia,
  wsRef,
}: {
  myUserId:string; myName:string; users:OnlineUser[]; sfuMode:string;
  activeGroupCall:any; incomingGroupCall:any;
  onStartGroupCall:(ids:string[],t:"audio"|"video")=>void;
  onJoinByRoomId:(id:string)=>void;
  onAcceptGroupCall:()=>void; onDeclineGroupCall:()=>void;
  onEndGroupCall:()=>void; onToggleMute:()=>void; onToggleVideo:()=>void;
  isMuted:boolean; isVideoEnabled:boolean;
  groupCallChatMessages: InCallChatMessage[];
  onSendGroupCallChatMessage: (message: string) => void;
  onSendGroupCallMedia: (
    file: File,
    caption: string,
    onProgress?: (progress: CommsUploadProgress) => void,
  ) => Promise<void>;
  wsRef: MutableRefObject<unknown>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [callType, setCallType] = useState<"audio"|"video">("video");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showGroupChat, setShowGroupChat] = useState(false);

  useEffect(() => { const t=setInterval(()=>setTick(v=>v+1),700); return()=>clearInterval(t); },[]);
  useEffect(() => {
    if (!activeGroupCall) { setElapsed(0); return; }
    const t = setInterval(()=>setElapsed(v=>v+1),1000);
    return ()=>clearInterval(t);
  },[activeGroupCall]);

  const available = users.filter(u=>u.id!==myUserId&&u.isOnline);

  /* ── INCOMING CALL ── */
  if (incomingGroupCall) {
    const caller = incomingGroupCall.callerName ?? incomingGroupCall.initiatorName ?? "Unknown";
    const c = colorForName(caller);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <HexGrid />
        {[160,220,290,360].map((r,i)=>(
          <div key={r} className="absolute rounded-full"
            style={{ width:r, height:r,
              border:`1px solid ${C.cyan}${i===0?"40":i===1?"28":i===2?"16":"0a"}`,
              animation:`cy-pulse ${1+i*0.4}s ease-in-out ${i*0.2}s infinite` }} />
        ))}
        <div className="relative" style={{ animation:"cy-float 3s ease-in-out infinite" }}>
          <Avatar name={caller} size={88} ring speaking />
          <div className="absolute -bottom-1 -right-1 flex items-center justify-center h-7 w-7 rounded-full"
            style={{ background:C.steel, border:"2px solid rgba(8,8,16,1)" }}>
            <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
        </div>
        <div className="text-center z-10">
          <p className="text-[8px] font-mono tracking-[0.5em] text-white/30 uppercase mb-1.5">
            INCOMING GROUP CALL
          </p>
          <p className="text-xl font-black text-white mb-1" style={{ fontFamily:"'Orbitron',system-ui" }}>
            {caller}
          </p>
          <p className="text-[10px] text-white/40">
            {incomingGroupCall.participants?.length??0} participant{(incomingGroupCall.participants?.length??0)!==1?"s":""} ·{" "}
            {incomingGroupCall.callType??"video"}
          </p>
        </div>
        <AudioBars active bars={12} color={C.cyan} />
        <div className="flex gap-4 z-10">
          <button type="button" onClick={onDeclineGroupCall}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[11px] transition-all hover:scale-105"
            style={{ background:"#ef444418", border:"1px solid #ef444430", color:"#ef4444", fontFamily:"'Orbitron',system-ui" }}>
            <PhoneOff className="h-4 w-4" strokeWidth={2} />DECLINE
          </button>
          <button type="button" onClick={onAcceptGroupCall}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[11px] transition-all hover:scale-105"
            style={{ background:`${C.green}18`, border:`1px solid ${C.green}32`, color:C.green, fontFamily:"'Orbitron',system-ui" }}>
            <PhoneCall className="h-4 w-4" strokeWidth={2} />ACCEPT
          </button>
        </div>
      </div>
    );
  }

  /* ── ACTIVE GROUP CALL ARENA ── */
  if (activeGroupCall) {
    const parts: any[] = activeGroupCall.participants??[];
    const allP = [
      { id:myUserId, displayName:myName, isSelf:true, isMuted, stream:null },
      ...parts.map((p:any)=>({...p, isSelf:false})),
    ];
    const N = allP.length;
    const RADIUS = Math.min(200, 100+N*22);

    return (
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden">
        <HexGrid />

        {/* Call header bar */}
        <div className="flex items-center gap-4 px-6 py-3 shrink-0 z-10"
          style={{ borderBottom:`1px solid ${C.border}`, background:"rgba(8,8,16,0.8)" }}>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background:`${C.green}10`, border:`1px solid ${C.green}22` }}>
            <span className="h-[5px] w-[5px] rounded-full" style={{ background:C.green, animation:"cy-blink 1.5s ease-in-out infinite" }} />
            <span className="text-[7px] font-black font-mono tracking-[0.3em] text-white/50 uppercase">LIVE</span>
          </div>
          <span className="text-[8px] font-mono text-white/30">
            ROOM <span className="text-white/55">{activeGroupCall.roomId??"—"}</span>
          </span>
          <span className="text-[8px] font-mono text-white/30 font-black tabular-nums"
            style={{ color:C.cyan }}>{fmtDur(elapsed)}</span>
          <div className="ml-auto flex items-center gap-4">
            <StatPill label="PARTICIPANTS" value={String(N)} color={C.amber} />
            <StatPill label="MODE" value={sfuMode?.toUpperCase()??"P2P"} color={C.cyan} />
            <SignalBars quality={4} color={C.green} />
          </div>
        </div>

        {/* ARENA */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Multi-layer orbital rings */}
          {[
            { r:RADIUS*2+50, col:C.cyan,   dur:"10s", dir:1,  w:1 },
            { r:RADIUS*2+90, col:C.steel, dur:"16s", dir:-1, w:1 },
            { r:RADIUS*2+130,col:C.crimson,dur:"22s", dir:1,  w:1 },
            { r:RADIUS*2+170,col:C.cyan,   dur:"30s", dir:-1, w:1 },
          ].map(({r,col,dur,dir,w},i)=>(
            <div key={i} className="absolute rounded-full"
              style={{ width:r, height:r, border:`${w}px solid ${col}${i===0?"20":i===1?"15":i===2?"10":"07"}`,
                animation:`${dir>0?"cy-orbit":"cy-orbit2"} ${dur} linear infinite` }}>
              <div className="absolute rounded-full"
                style={{ width:6, height:6, background:col, boxShadow:`0 0 12px ${col}`,
                  top:i%2===0?"-3px":"auto", bottom:i%2===1?"-3px":"auto",
                  left:"50%", transform:"translateX(-50%)" }} />
            </div>
          ))}

          {/* Centre glow */}
          <div className="absolute rounded-full"
            style={{ width:80, height:80,
              background:`radial-gradient(circle, ${C.red}22, ${C.slate}40, transparent)`,
              animation:"cy-pulse 2.5s ease-in-out infinite",
              filter:"blur(8px)" }} />
          <div className="absolute rounded-full"
            style={{ width:40, height:40,
              background:`radial-gradient(circle, ${C.crimson}40, transparent)`,
              animation:"cy-pulse2 2s ease-in-out infinite" }} />

          {/* Scanning line */}
          <div className="absolute rounded-full overflow-hidden"
            style={{ width:RADIUS*2+40, height:RADIUS*2+40, opacity:0.3 }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px",
              background:`linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
              animation:"cy-scan 3s linear infinite" }} />
          </div>

          {/* Particle field */}
          <ParticleField color={C.cyan} count={10} />

          {/* Participants circle */}
          {allP.map((p,i)=>{
            const angle = (i/N)*Math.PI*2-Math.PI/2;
            const x = Math.cos(angle)*RADIUS;
            const y = Math.sin(angle)*RADIUS;
            const speaking = !p.isMuted && ((tick+i)%4!==0);
            const c = p.isSelf?C.crimson:colorForName(p.displayName);
            return (
              <div key={p.id} className="absolute flex flex-col items-center gap-2 transition-all duration-500"
                style={{ transform:`translate(${x}px,${y}px)` }}>
                {/* Speaking halo */}
                {speaking && (
                  <>
                    <div className="absolute rounded-full"
                      style={{ width:62, height:62, border:`2px solid ${c}60`,
                        animation:"cy-ripple 1.2s ease-out infinite" }} />
                    <div className="absolute rounded-full"
                      style={{ width:62, height:62, border:`1px solid ${c}30`,
                        animation:"cy-ripple 1.2s ease-out 0.4s infinite" }} />
                  </>
                )}
                <Avatar name={p.displayName} size={50} ring={!speaking} speaking={speaking} />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[8px] font-black text-white/70 text-center max-w-[70px] truncate leading-tight"
                    style={{ fontFamily:"'Orbitron',system-ui", color:p.isSelf?C.crimson:"rgba(255,255,255,0.7)" }}>
                    {p.isSelf?"YOU":p.displayName}
                  </p>
                  <AudioBars active={speaking} color={c} bars={6} />
                  {p.isMuted && <MicOff className="h-2.5 w-2.5 text-white/25" strokeWidth={2} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* CALL CONTROLS */}
        <div className="flex items-center justify-center gap-3 px-6 py-5 shrink-0 z-10"
          style={{ borderTop:`1px solid ${C.border}`, background:"rgba(8,8,16,0.85)" }}>
          {[
            { label:isMuted?"UNMUTE":"MUTE", icon:isMuted?MicOff:Mic,
              color:isMuted?C.crimson:C.cyan, active:isMuted, fn:onToggleMute },
            { label:isVideoEnabled?"STOP VID":"START VID", icon:isVideoEnabled?VideoOff:Video,
              color:isVideoEnabled?C.orange:C.cyan, active:!isVideoEnabled, fn:onToggleVideo },
            { label:showGroupChat?"HIDE CHAT":"CHAT", icon:MessageSquare, color:C.red, active:showGroupChat, fn:()=>setShowGroupChat(v=>!v) },
          ].map(({label,icon:Icon,color,active,fn})=>(
            <button key={label} type="button" onClick={fn}
              className="flex flex-col items-center gap-1.5 rounded-2xl px-4 py-3 transition-all hover:scale-110"
              style={{ background:active?`${color}18`:"rgba(255,255,255,0.05)",
                border:`1px solid ${active?color+"30":C.border}`, minWidth:72 }}>
              <Icon className="h-5 w-5" style={{color:active?color:"rgba(255,255,255,0.5)"}} strokeWidth={1.8} />
              <span className="text-[6px] font-black font-mono tracking-widest text-white/30 uppercase">{label}</span>
            </button>
          ))}

          <div className="h-8 w-px mx-2" style={{ background:C.border }} />

          <button type="button" onClick={onEndGroupCall}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 font-black text-[10px] transition-all hover:scale-105"
            style={{ background:`${C.crimson}20`, border:`1px solid ${C.crimson}35`,
              color:C.crimson, fontFamily:"'Orbitron',system-ui",
              boxShadow:`0 0 20px ${C.crimson}20` }}>
            <PhoneOff className="h-4 w-4" strokeWidth={2} />
            LEAVE CALL
          </button>
        </div>
        </div>

        {showGroupChat && activeGroupCall?.roomId && (
          <InCallChat
            roomId={activeGroupCall.roomId}
            currentUserId={myUserId}
            currentUserName={myName}
            messages={groupCallChatMessages}
            onSendMessage={onSendGroupCallChatMessage}
            onSendMedia={onSendGroupCallMedia}
            onClose={()=>setShowGroupChat(false)}
            socketRef={wsRef as MutableRefObject<any>}
          />
        )}
      </div>
    );
  }

  /* ── LOBBY ── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <HexGrid />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 flex items-center justify-center rounded-xl"
            style={{ background:`${C.slateLight}40`, border:`1px solid ${C.borderLight}` }}>
            <Users className="h-4 w-4" style={{color:C.steel}} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[11px] font-black tracking-[0.3em] text-white/65 uppercase"
              style={{ fontFamily:"'Orbitron',system-ui" }}>GROUP CALL HUB</p>
            <p className="text-[7px] font-mono text-white/25">
              MODE: {sfuMode?.toUpperCase()??"P2P"} · {available.length} OPERATORS AVAILABLE
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-5 pb-5 overflow-hidden">
        {/* Left: operator selector */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Call type toggle */}
          <div className="flex items-center gap-2 p-1 rounded-xl shrink-0"
            style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}` }}>
            {(["audio","video"] as const).map(t=>(
              <button key={t} type="button" onClick={()=>setCallType(t)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 transition-all font-black text-[9px] uppercase"
                style={{ fontFamily:"'Orbitron',system-ui",
                  background:callType===t?`${t==="video"?C.crimson:C.green}18`:"transparent",
                  border:callType===t?`1px solid ${t==="video"?C.crimson:C.green}30`:"1px solid transparent",
                  color:callType===t?(t==="video"?C.crimson:C.green):"rgba(255,255,255,0.3)" }}>
                {t==="video"?<Video className="h-3.5 w-3.5" strokeWidth={2}/>:<Phone className="h-3.5 w-3.5" strokeWidth={2}/>}
                {t==="video"?"VIDEO CALL":"VOICE CALL"}
              </button>
            ))}
          </div>

          <p className="text-[7px] font-black tracking-[0.4em] text-white/20 uppercase shrink-0"
            style={{ fontFamily:"'Orbitron',system-ui" }}>
            SELECT PARTICIPANTS ({selected.size} selected)
          </p>

          <div className="flex-1 overflow-y-auto rounded-xl" style={{ scrollbarWidth:"none" }}>
            {available.length===0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-30">
                <Users className="h-6 w-6 text-white/20" strokeWidth={1} />
                <p className="text-[9px] font-mono text-white/25">No operators online</p>
              </div>
            ) : (
              <div className="space-y-1">
                {available.map(u=>{
                  const sel = selected.has(u.id);
                  const c = colorForName(u.displayName);
                  return (
                    <button key={u.id} type="button"
                      onClick={()=>setSelected(p=>{const n=new Set(p);n.has(u.id)?n.delete(u.id):n.add(u.id);return n;})}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                      style={{ background:sel?`${c}0d`:"rgba(255,255,255,0.02)",
                        border:`1px solid ${sel?c+"25":C.border}` }}>
                      <div className="flex h-4 w-4 items-center justify-center rounded shrink-0"
                        style={{ background:sel?c:"rgba(255,255,255,0.06)", border:`1px solid ${sel?c:C.border}` }}>
                        {sel && <span className="text-[8px] text-white font-black">✓</span>}
                      </div>
                      <div className="relative shrink-0">
                        <Avatar name={u.displayName} size={28} />
                        <StatusDot status="online" />
                      </div>
                      <p className="text-[11px] font-bold text-white/70 truncate flex-1">{u.displayName}</p>
                      {sel && <div className="h-2 w-2 rounded-full shrink-0" style={{ background:c }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button type="button" disabled={selected.size===0}
            onClick={()=>{onStartGroupCall(Array.from(selected),callType);setSelected(new Set());}}
            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-[10px] transition-all hover:scale-[1.02] disabled:opacity-30 shrink-0"
            style={{ background:`linear-gradient(135deg, ${C.red}, ${C.redDim})`,
              boxShadow:selected.size>0?`0 6px 28px ${C.crimson}35`:"none",
              fontFamily:"'Orbitron',system-ui" }}>
            {callType==="video"?<Video className="h-4 w-4 text-white" strokeWidth={2}/>:<Phone className="h-4 w-4 text-white" strokeWidth={2}/>}
            LAUNCH {callType.toUpperCase()} CALL · {selected.size} OPERATOR{selected.size!==1?"S":""}
          </button>
        </div>

        {/* Right: join by room + info panel */}
        <div className="flex flex-col gap-3 shrink-0" style={{ width:210 }}>
          {/* Join by ID */}
          <div className="rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}` }}>
            <p className="text-[7px] font-black tracking-[0.35em] text-white/25 uppercase mb-3"
              style={{ fontFamily:"'Orbitron',system-ui" }}>JOIN BY ROOM ID</p>
            <input type="text" value={joinRoomId}
              onChange={e=>setJoinRoomId(e.target.value)}
              placeholder="Enter room ID…"
              className="w-full rounded-xl px-3 py-2 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none mb-2"
              style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}` }}
              onKeyDown={e=>{if(e.key==="Enter"&&joinRoomId.trim()){onJoinByRoomId(joinRoomId.trim());setJoinRoomId("");}}} />
            <button type="button" disabled={!joinRoomId.trim()}
              onClick={()=>{onJoinByRoomId(joinRoomId.trim());setJoinRoomId("");}}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-[8px] font-black transition-all hover:scale-105 disabled:opacity-30"
              style={{ background:`${C.cyan}15`, border:`1px solid ${C.cyan}28`, color:C.cyan, fontFamily:"'Orbitron',system-ui" }}>
              <ChevronRight className="h-3 w-3" strokeWidth={2.5} />JOIN ROOM
            </button>
          </div>

          {/* Network info */}
          <div className="flex-1 rounded-2xl p-4" style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}` }}>
            <p className="text-[7px] font-black tracking-[0.35em] text-white/25 uppercase mb-3"
              style={{ fontFamily:"'Orbitron',system-ui" }}>NETWORK INFO</p>
            <div className="space-y-2.5">
              {[
                { label:"Host", value:myName.slice(0,16), color:C.cyan },
                { label:"Protocol", value:sfuMode?.toUpperCase()??"P2P", color:C.steel },
                { label:"Encryption", value:"DTLS-SRTP", color:C.green },
                { label:"Max peers", value:"16", color:C.orange },
              ].map(({label,value,color})=>(
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-white/25 uppercase">{label}</span>
                  <span className="text-[8px] font-bold" style={{color}}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini visualiser */}
          <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
            style={{ background:`${C.slate}55`, border:`1px solid ${C.border}` }}>
            <p className="text-[7px] font-mono tracking-widest text-white/20 uppercase">SIGNAL</p>
            <AudioBars active bars={10} color={C.amber} />
            <SignalBars quality={5} color={C.green} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOICE NOTE PANEL
══════════════════════════════════════════════════════════════ */
function VoiceNotePanel({ targetUser }: { targetUser:{id:string;name:string}|null }) {
  const { sendChatMessage } = usePresence();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [url, setUrl] = useState<string|null>(null);
  const [dur, setDur] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current,{type:"audio/webm"});
        setBlob(b); setUrl(URL.createObjectURL(b));
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start(); mrRef.current=mr;
      setRecording(true); setDur(0);
      timerRef.current = setInterval(()=>setDur(d=>d+1),1000);
    } catch(e) { console.warn("Mic denied",e); }
  };
  const stopRec = () => { mrRef.current?.stop(); setRecording(false); if(timerRef.current) clearInterval(timerRef.current); };
  const discard = () => { setBlob(null); setUrl(null); setDur(0); setSent(false); };
  const send = async () => {
    if(!blob||!targetUser||sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file",blob,"voice-note.webm");
      const res = await systemFetch("/api/comms/upload",{method:"POST",body:fd});
      if (!res.ok) throw new Error("Upload failed");
      const upload = await res.json() as {
        fileUrl?: string; fileName?: string; mimeType?: string; fileSize?: number;
      };
      sendChatMessage(targetUser.id, {
        message: "",
        messageType: "voice-note",
        fileUrl: upload.fileUrl,
        fileName: upload.fileName || "voice-note.webm",
        fileMimeType: upload.mimeType || "audio/webm",
        fileSizeBytes: upload.fileSize,
        voiceDurationSeconds: dur,
      });
      setSent(true); setTimeout(discard,2500);
    } catch{/*silent*/}
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background:`${C.orange}15`, border:`1px solid ${C.orange}28` }}>
          <Mic className="h-8 w-8" style={{color:C.orange}} strokeWidth={1.8} />
        </div>
        {recording && (
          <div className="absolute inset-[-6px] rounded-2xl"
            style={{ border:`2px solid ${C.orange}40`, animation:"cy-ripple 1.5s ease-out infinite" }} />
        )}
      </div>

      <div className="text-center">
        <p className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase"
          style={{ fontFamily:"'Orbitron',system-ui" }}>
          VOICE NOTE {targetUser?`→ ${targetUser.name}`:""}
        </p>
        {recording && (
          <p className="text-3xl font-black tabular-nums mt-2" style={{ color:C.orange, fontFamily:"'Orbitron',system-ui" }}>
            {fmtDur(dur)}
          </p>
        )}
      </div>

      <Waveform active={recording} color={C.orange} bars={20} />

      {url && !sent && (
        <audio src={url} controls className="w-full max-w-sm rounded-xl" />
      )}
      {sent && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{ background:`${C.green}12`, border:`1px solid ${C.green}25` }}>
          <span style={{color:C.green}}>✓</span>
          <span className="text-[10px] font-mono" style={{color:C.green}}>VOICE NOTE TRANSMITTED</span>
        </div>
      )}

      <div className="flex gap-3">
        {!recording&&!blob && (
          <button type="button" onClick={startRec}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105"
            style={{ background:`${C.orange}18`, border:`1px solid ${C.orange}32`, color:C.orange, fontFamily:"'Orbitron',system-ui" }}>
            <Mic className="h-4 w-4" strokeWidth={2} />RECORD
          </button>
        )}
        {recording && (
          <button type="button" onClick={stopRec}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105"
            style={{ background:`${C.crimson}18`, border:`1px solid ${C.crimson}32`, color:C.crimson, fontFamily:"'Orbitron',system-ui" }}>
            <StopCircle className="h-4 w-4" strokeWidth={2} />STOP
          </button>
        )}
        {blob&&!sent && (
          <>
            <button type="button" onClick={discard}
              className="flex items-center gap-2 rounded-2xl px-5 py-3.5 font-black text-[10px] transition-all hover:scale-105"
              style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:"rgba(255,255,255,0.4)", fontFamily:"'Orbitron',system-ui" }}>
              <Trash2 className="h-4 w-4" strokeWidth={2} />DISCARD
            </button>
            <button type="button" onClick={send} disabled={!targetUser||sending}
              className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105 disabled:opacity-30"
              style={{ background:`${C.green}18`, border:`1px solid ${C.green}32`, color:C.green, fontFamily:"'Orbitron',system-ui" }}>
              <Send className="h-4 w-4" strokeWidth={2} />{sending?"SENDING…":"TRANSMIT"}
            </button>
          </>
        )}
      </div>
      {!targetUser && (
        <p className="text-[9px] font-mono text-white/25">Select an operator from the sidebar to send</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VIDEO NOTE PANEL
══════════════════════════════════════════════════════════════ */
function VideoNotePanel({ targetUser }: { targetUser:{id:string;name:string}|null }) {
  const { sendChatMessage } = usePresence();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [url, setUrl] = useState<string|null>(null);
  const [dur, setDur] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
      if(previewRef.current) { previewRef.current.srcObject=stream; previewRef.current.play(); }
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current,{type:"video/webm"});
        setBlob(b); setUrl(URL.createObjectURL(b));
        if(previewRef.current) previewRef.current.srcObject=null;
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start(); mrRef.current=mr;
      setRecording(true); setDur(0);
      timerRef.current = setInterval(()=>setDur(d=>d+1),1000);
    } catch(e) { console.warn("Camera denied",e); }
  };
  const stopRec = () => { mrRef.current?.stop(); setRecording(false); if(timerRef.current) clearInterval(timerRef.current); };
  const discard = () => { setBlob(null); setUrl(null); setDur(0); setSent(false); };
  const send = async () => {
    if(!blob||!targetUser||sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file",blob,"video-note.webm");
      const res = await systemFetch("/api/comms/upload",{method:"POST",body:fd});
      if (!res.ok) throw new Error("Upload failed");
      const upload = await res.json() as {
        fileUrl?: string; fileName?: string; mimeType?: string; fileSize?: number;
      };
      sendChatMessage(targetUser.id, {
        message: "Video note",
        messageType: "media",
        fileUrl: upload.fileUrl,
        fileName: upload.fileName || "video-note.webm",
        fileMimeType: upload.mimeType || "video/webm",
        fileSizeBytes: upload.fileSize,
      });
      setSent(true); setTimeout(discard,2500);
    } catch{/*silent*/}
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background:`${C.slate}40`, border:`1px solid ${C.borderLight}` }}>
        <Film className="h-6 w-6" style={{color:C.steel}} strokeWidth={1.8} />
      </div>

      <p className="text-[10px] font-black tracking-[0.4em] text-white/40 uppercase"
        style={{ fontFamily:"'Orbitron',system-ui" }}>
        VIDEO NOTE {targetUser?`→ ${targetUser.name}`:""}
      </p>

      {/* Camera preview */}
      <div className="relative rounded-2xl overflow-hidden w-full max-w-sm"
        style={{ height:200, background:"rgba(0,0,0,0.5)", border:`1px solid ${C.border}` }}>
        <video ref={previewRef} className="w-full h-full object-cover" muted playsInline
          style={{ display:recording?"block":"none" }} />
        {url&&!sent && (
          <video ref={playbackRef} src={url} controls className="w-full h-full object-cover" />
        )}
        {!recording&&!url && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Camera className="h-8 w-8 text-white/12" strokeWidth={1} />
            <p className="text-[9px] font-mono text-white/18">Camera preview</p>
          </div>
        )}
        {recording && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background:`${C.crimson}dd` }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white" style={{animation:"cy-blink 1s ease-in-out infinite"}} />
            <span className="text-[8px] font-mono text-white">{fmtDur(dur)}</span>
          </div>
        )}
      </div>

      {sent && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{ background:`${C.green}12`, border:`1px solid ${C.green}25` }}>
          <span style={{color:C.green}}>✓</span>
          <span className="text-[10px] font-mono" style={{color:C.green}}>VIDEO NOTE TRANSMITTED</span>
        </div>
      )}

      <div className="flex gap-3">
        {!recording&&!blob && (
          <button type="button" onClick={startRec}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105"
            style={{ background:`${C.slateLight}50`, border:`1px solid ${C.borderLight}`, color:C.steel, fontFamily:"'Orbitron',system-ui" }}>
            <Camera className="h-4 w-4" strokeWidth={2} />RECORD
          </button>
        )}
        {recording && (
          <button type="button" onClick={stopRec}
            className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105"
            style={{ background:`${C.crimson}18`, border:`1px solid ${C.crimson}32`, color:C.crimson, fontFamily:"'Orbitron',system-ui" }}>
            <StopCircle className="h-4 w-4" strokeWidth={2} />STOP
          </button>
        )}
        {blob&&!sent && (
          <>
            <button type="button" onClick={discard}
              className="flex items-center gap-2 rounded-2xl px-5 py-3.5 font-black text-[10px] transition-all hover:scale-105"
              style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, color:"rgba(255,255,255,0.4)", fontFamily:"'Orbitron',system-ui" }}>
              <Trash2 className="h-4 w-4" strokeWidth={2} />DISCARD
            </button>
            <button type="button" onClick={send} disabled={!targetUser||sending}
              className="flex items-center gap-2 rounded-2xl px-7 py-3.5 font-black text-[10px] transition-all hover:scale-105 disabled:opacity-30"
              style={{ background:`${C.green}18`, border:`1px solid ${C.green}32`, color:C.green, fontFamily:"'Orbitron',system-ui" }}>
              <Send className="h-4 w-4" strokeWidth={2} />{sending?"SENDING…":"TRANSMIT"}
            </button>
          </>
        )}
      </div>
      {!targetUser && (
        <p className="text-[9px] font-mono text-white/25">Select an operator from the sidebar to send</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB CONFIG
══════════════════════════════════════════════════════════════ */
const TABS: Array<{ id:CommsTab; label:string; icon:typeof MessageSquare; color:string; sub:string }> = [
  { id:"chat",    label:"CHAT",       icon:MessageSquare, color:C.sky,     sub:"Secure messaging"  },
  { id:"voice",   label:"VOICE",      icon:Phone,         color:C.green,   sub:"P2P audio call"    },
  { id:"video",   label:"VIDEO",      icon:Video,         color:C.red,     sub:"P2P video call"    },
  { id:"group",   label:"GROUP",      icon:Users,         color:C.amber,   sub:"Multi-party call"  },
  { id:"vnote",   label:"VOICE NOTE", icon:Mic,           color:C.orange,  sub:"Audio message"     },
  { id:"vidnote", label:"VIDEO NOTE", icon:Film,          color:C.steel,   sub:"Video message"     },
  { id:"pshare",  label:"PSHARE",     icon:Radio,         color:C.red,     sub:"Broadcast feed"    },
];

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function CommsHubPage() {
  const displayName =
    (typeof window!=="undefined" && localStorage.getItem("cyrus-display-name")) ||
    "CYRUS OPERATOR";

  const {
    onlineUsers, isConnected, myUserId, notifications,
    incomingCall, activeCall,
    localStream, remoteStream, callDuration,
    callUser, acceptCall, declineCall, endCall,
    toggleMute: toggleP2PMute, toggleVideo: toggleP2PVideo,
    mediaControls, wsRef, isScreenSharing, screenShareStream,
    remoteScreenSharerName, startScreenShare, stopScreenShare,
    sendCallChatMessage, recoverCallMedia, reportRemoteMediaPlayback,
    callChatMessages,
    isCallRecording, isCallRecordingUploading, callRecordingDurationSec,
    remoteRecordingActive, remoteRecordingBy, toggleCallRecording,
    sendCallMedia,
  } = usePresence();

  const myId = useMemo(() => {
    if (myUserId) return myUserId;
    try {
      return localStorage.getItem("cyrus_comms_user_id") || "local-operator";
    } catch {
      return "local-operator";
    }
  }, [myUserId]);

  const {
    sfuStatus, incomingGroupCall, activeGroupCall,
    isMuted: groupMuted, isVideoEnabled: groupVideoEnabled,
    createGroupCall, joinGroupCall,
    acceptIncomingGroupCall, declineIncomingGroupCall,
    endGroupCall, toggleMute: toggleGroupMute, toggleVideo: toggleGroupVideo,
    groupCallChatMessages, sendGroupCallChatMessage, sendGroupCallMedia,
  } = useCyrusGroupCall({ socketRef:wsRef, selfId:myId, displayName, isConnected });

  /* Tab state — support URL query param */
  const [activeTab, setActiveTab] = useState<CommsTab>(() => {
    if(typeof window==="undefined") return "chat";
    const t = new URLSearchParams(window.location.search).get("tab");
    if(t==="video") return "video";
    if(t==="voice"||t==="p2p") return "voice";
    if(t==="vnote") return "vnote";
    if(t==="vidnote") return "vidnote";
    if(t==="group") return "group";
    if(t==="pshare") return "pshare";
    return "chat";
  });

  const [targetUser, setTargetUser] = useState<{id:string;name:string}|null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleCallVoice = useCallback((userId:string, name:string) => {
    setActiveTab("voice"); callUser(userId, name, "audio");
  }, [callUser]);

  const handleCallVideo = useCallback((userId:string, name:string) => {
    setActiveTab("video"); callUser(userId, name, "video");
  }, [callUser]);

  const handleMessage = useCallback((userId:string, name:string) => {
    setTargetUser({id:userId, name}); setActiveTab("chat");
  }, []);

  const handleToggleMute = useCallback(() => { toggleP2PMute(); setIsMuted(v=>!v); }, [toggleP2PMute]);
  const handleToggleVideo = useCallback(() => { toggleP2PVideo(); setIsVideoOff(v=>!v); }, [toggleP2PVideo]);

  const users: OnlineUser[] = useMemo(()=>
    (onlineUsers??[]).map((u:any)=>({
      id: u.userId??u.id,
      displayName: u.displayName??u.name??"Operator",
      status: u.status??(u.isOnline?"online":"offline"),
      isOnline: u.isOnline??true,
    }))
  ,[onlineUsers]);

  const sfuMode: string = (sfuStatus as any) ?? "p2p";

  const tabCfg = TABS.find(t=>t.id===activeTab)!;

  const callAlert = useMemo(() => {
    const err = [...notifications].reverse().find((n) => n.type === "error");
    const warn = [...notifications].reverse().find((n) => n.type === "warning");
    return err ?? warn ?? null;
  }, [notifications]);

  return (
    <>
      <style>{ANIM_CSS}</style>

      {callAlert && !activeCall && !incomingCall && (
        <div
          className="fixed top-3 left-1/2 z-[210] max-w-md -translate-x-1/2 rounded-xl px-4 py-2 text-center text-[11px] font-medium shadow-lg"
          style={{
            background: callAlert.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.12)",
            border: `1px solid ${callAlert.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(234,179,8,0.3)"}`,
            color: callAlert.type === "error" ? "#fca5a5" : "#fde68a",
          }}
          role="status"
        >
          {callAlert.message}
        </div>
      )}

      {incomingCall && !activeCall && (
        <CommsIncomingCallOverlay
          call={{
            callerName: incomingCall.callerName,
            callType: incomingCall.callType,
          }}
          onAccept={() => acceptCall()}
          onDecline={() => declineCall()}
        />
      )}

      {activeCall && (
        <CallView
          roomId={activeCall.roomId}
          callType={activeCall.callType}
          participants={[
            {
              id: activeCall.peerId || "remote-peer",
              displayName: activeCall.peerName,
              stream: remoteStream ?? undefined,
              isMuted: false,
              isVideoEnabled: activeCall.callType === "video",
            },
          ]}
          localStream={localStream ?? null}
          remoteStream={remoteStream ?? null}
          currentUserId={myUserId ?? myId}
          currentUserName={displayName}
          isMuted={isMuted}
          isVideoEnabled={!isVideoOff && (mediaControls?.isVideoEnabled ?? true)}
          callDuration={callDuration}
          mediaEstablishing={activeCall.status !== "connected"}
          onEndCall={endCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          isScreenSharing={isScreenSharing}
          screenShareStream={screenShareStream ?? null}
          screenSharerName={remoteScreenSharerName ?? undefined}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onSendChatMessage={(msg: string) => sendCallChatMessage({ message: msg, messageType: "text" })}
          chatMessages={callChatMessages}
          onRemotePlaybackDiagnostics={({ blocked }) => reportRemoteMediaPlayback(blocked)}
          onRecoverMedia={() => void recoverCallMedia()}
          socketRef={wsRef}
          isRecording={isCallRecording}
          isRecordingUploading={isCallRecordingUploading}
          recordingDurationSec={callRecordingDurationSec}
          remoteRecordingActive={remoteRecordingActive}
          remoteRecordingBy={remoteRecordingBy}
          onToggleRecording={toggleCallRecording}
          onSendCallMedia={sendCallMedia}
        />
      )}

      {activeCall && activeCall.status === "connected" && !remoteStream?.getTracks().length && (
        <button
          type="button"
          className="fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[11px] font-semibold text-amber-100"
          onClick={() => void recoverCallMedia()}
        >
          No remote audio? Tap to recover media
        </button>
      )}

      <div className="flex flex-col overflow-hidden text-white"
        style={{ height:"100vh", ...MAIN_SURFACE }}>

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <header className="shrink-0 flex items-center gap-0 px-5"
          style={{ height:52, background: C.sidebarElevated,
            borderBottom:`1px solid ${C.sidebarDivider}` }}>

          {/* Brand */}
          <div className="flex items-center gap-2.5 mr-5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background:C.red, boxShadow:`0 2px 10px ${C.redGlow}` }}>
              <Radio className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <p className="text-[11px] font-bold text-white/80 tracking-widest uppercase">COMMS HUB</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
            {TABS.map(({id,label,icon:Icon,color})=>{
              const isActive = activeTab===id;
              return (
                <button key={id} type="button" onClick={()=>setActiveTab(id)}
                  className="relative flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all duration-200 shrink-0"
                  style={{
                    background: isActive ? C.sidebarSelected : "transparent",
                    border:`1px solid ${isActive ? C.sidebarDivider : "transparent"}`,
                  }}>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full" style={{ background: C.red }} />
                  )}
                  <Icon className="h-3.5 w-3.5 shrink-0"
                    style={{color:isActive?color:"rgba(255,255,255,0.32)"}} strokeWidth={1.8} />
                  <span className="text-[9px] font-semibold tracking-wide"
                    style={{ color:isActive?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.35)" }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right status pills */}
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: C.sidebarInput, border:`1px solid ${C.sidebarDivider}` }}>
              <span className="h-[5px] w-[5px] rounded-full"
                style={{ background:isConnected?C.green:"#ef4444", animation:"cy-blink 3s ease-in-out infinite" }} />
              <span className="text-[8px] font-medium text-white/40">
                {isConnected?"Secure":"Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[8px] ${isConnected ? "text-emerald-400/80" : "text-amber-300/70"}`}
                title={isConnected ? "Presence connected" : "Connecting to call signaling…"}
              >
                {isConnected ? "● live" : "○ connecting"} · {users.filter(u=>u.isOnline).length} online
              </span>
            </div>
          </div>
        </header>

        {/* ══ BODY ══════════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">

          {/* Users Rail */}
          <UsersRail
            users={users} myId={myId} myName={displayName}
            selectedUserId={targetUser?.id}
            onCallVoice={handleCallVoice}
            onCallVideo={handleCallVideo}
            onMessage={handleMessage} />

          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-hidden">

            {/* Sub-header: active tab info */}
            <div className="flex items-center gap-3 px-5 py-2.5 shrink-0"
              style={{ borderBottom:`1px solid ${C.sidebarDivider}`, background: C.charcoal }}>
              <tabCfg.icon className="h-3.5 w-3.5" style={{color:tabCfg.color}} strokeWidth={1.8} />
              <span className="text-[9px] font-semibold tracking-widest text-white/50 uppercase">{tabCfg.label}</span>
              <span className="text-[8px] text-white/25">{tabCfg.sub}</span>
              {(activeTab==="chat"||activeTab==="vnote"||activeTab==="vidnote") && targetUser && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[8px] font-mono text-white/25">CHANNEL:</span>
                  <Avatar name={targetUser.name} size={18} />
                  <span className="text-[9px] font-bold text-white/55">{targetUser.name}</span>
                </div>
              )}
            </div>

            {/* Panel content */}
            <div className="flex-1 flex overflow-hidden">
              {activeTab==="chat" && (
                <ChatPanel myId={myId} myName={displayName} targetUser={targetUser} />
              )}
              {activeTab==="voice" && (
                <DialerPanel mode="voice" users={users} myId={myId}
                  isConnected={isConnected} onCall={handleCallVoice} />
              )}
              {activeTab==="video" && (
                <DialerPanel mode="video" users={users} myId={myId}
                  isConnected={isConnected} onCall={handleCallVideo} />
              )}
              {activeTab==="group" && (
                <GroupCallHub
                  myUserId={myId} myName={displayName} users={users}
                  sfuMode={sfuMode}
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
                  groupCallChatMessages={groupCallChatMessages}
                  onSendGroupCallChatMessage={sendGroupCallChatMessage}
                  onSendGroupCallMedia={sendGroupCallMedia}
                  wsRef={wsRef}
                />
              )}
              {activeTab==="vnote" && (
                <VoiceNotePanel targetUser={targetUser} />
              )}
              {activeTab==="vidnote" && (
                <VideoNotePanel targetUser={targetUser} />
              )}
              {activeTab==="pshare" && (
                <PshareTabPanel myUserId={myId} />
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
