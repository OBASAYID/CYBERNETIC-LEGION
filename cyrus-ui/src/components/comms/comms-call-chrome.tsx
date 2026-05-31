/**
 * Original CYRUS comms call chrome — shared between hub and /comms/call shell.
 * Graphics only; WebRTC/signaling lives in PresenceContext.
 */
import { PhoneCall, PhoneOff } from "lucide-react";

export const COMMS_THEME = {
  crimson: "#e11d48",
  cyan: "#06b6d4",
  purple: "#7c3aed",
  green: "#22c55e",
  orange: "#f97316",
  yellow: "#eab308",
  bg: "#1c1c21",
  card: "rgba(42,42,52,0.88)",
  border: "rgba(255,255,255,0.08)",
} as const;

export const COMMS_ANIM_CSS = `
@keyframes cy-pulse   { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.35;transform:scale(1.08)} }
@keyframes cy-float   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
@keyframes cy-ripple  { 0%{transform:scale(0.8);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
`;

function initials(n: string) {
  return n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

function colorForName(n: string) {
  const palette = [
    COMMS_THEME.crimson,
    COMMS_THEME.cyan,
    COMMS_THEME.purple,
    COMMS_THEME.green,
    COMMS_THEME.orange,
    COMMS_THEME.yellow,
  ];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function CommsAvatar({
  name,
  size = 36,
  ring = false,
  speaking = false,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  speaking?: boolean;
}) {
  const c = colorForName(name);
  return (
    <div
      className="relative flex shrink-0 select-none items-center justify-center rounded-full font-black text-white"
      style={{
        width: size,
        height: size,
        background: `${c}22`,
        border: speaking ? `2px solid ${c}` : ring ? `2px solid ${c}80` : `1px solid ${c}40`,
        fontSize: Math.max(9, size * 0.33),
        boxShadow: speaking
          ? `0 0 20px ${c}70, 0 0 40px ${c}30`
          : ring
            ? `0 0 14px ${c}50`
            : "none",
        transition: "all 0.3s ease",
      }}
    >
      {initials(name)}
      {speaking && (
        <div
          className="absolute inset-[-4px] rounded-full"
          style={{ border: `2px solid ${c}40`, animation: "cy-ripple 1.5s ease-out infinite" }}
        />
      )}
    </div>
  );
}

export type CommsIncomingCall = {
  callerName: string;
  callType?: "audio" | "video";
};

/** Original crimson aerospace incoming-call overlay from Comms Hub. */
export function CommsIncomingCallOverlay({
  call,
  onAccept,
  onDecline,
}: {
  call: CommsIncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const c = colorForName(call.callerName ?? "Unknown");
  return (
    <>
      <style>{COMMS_ANIM_CSS}</style>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: "rgba(8,8,16,0.88)", backdropFilter: "blur(8px)" }}
      >
        <div
          className="relative flex flex-col items-center gap-6 rounded-3xl p-10"
          style={{
            background: COMMS_THEME.card,
            border: `1px solid ${c}30`,
            boxShadow: `0 0 60px ${c}20, 0 0 0 1px ${c}15`,
          }}
        >
          {[120, 180, 240].map((r, i) => (
            <div
              key={r}
              className="pointer-events-none absolute rounded-full"
              style={{
                width: r,
                height: r,
                border: `1px solid ${COMMS_THEME.cyan}${i === 0 ? "35" : i === 1 ? "20" : "10"}`,
                animation: `cy-pulse ${1.2 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
          <p className="z-10 text-[8px] font-mono uppercase tracking-[0.5em] text-white/30">
            INCOMING {(call.callType ?? "voice").toUpperCase()} CALL
          </p>
          <div className="z-10" style={{ animation: "cy-float 3s ease-in-out infinite" }}>
            <CommsAvatar name={call.callerName ?? "Unknown"} size={80} ring speaking />
          </div>
          <div className="z-10 text-center">
            <p className="text-xl font-black text-white" style={{ fontFamily: "'Orbitron',system-ui" }}>
              {call.callerName ?? "Unknown"}
            </p>
            <p className="mt-1 text-[9px] font-mono text-white/35">Requesting secure connection</p>
          </div>
          <div className="z-10 flex gap-4">
            <button
              type="button"
              onClick={onDecline}
              className="flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[11px] font-black transition-all hover:scale-105"
              style={{
                background: "#ef444418",
                border: "1px solid #ef444430",
                color: "#ef4444",
                fontFamily: "'Orbitron',system-ui",
              }}
            >
              <PhoneOff className="h-4 w-4" strokeWidth={2} />
              DECLINE
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[11px] font-black transition-all hover:scale-105"
              style={{
                background: `${COMMS_THEME.green}18`,
                border: `1px solid ${COMMS_THEME.green}32`,
                color: COMMS_THEME.green,
                fontFamily: "'Orbitron',system-ui",
              }}
            >
              <PhoneCall className="h-4 w-4" strokeWidth={2} />
              ACCEPT
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
