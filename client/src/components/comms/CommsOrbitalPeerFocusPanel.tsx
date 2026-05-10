/**
 * VR-style HUD panel for a selected presence node — glass morphism, cyan telemetry,
 * voice / video / text / video-invite matrix (reference-grade visuals).
 */

import { useEffect, useId } from "react";
import { MessageSquare, Phone, UserPlus, Video, X } from "lucide-react";
import type { OrbitalPeerNode } from "./CommsOrbitalCommandDeck";

const CYAN = "#00e5ff";

export function CommsOrbitalPeerFocusPanel({
  peer,
  darkMode,
  onClose,
  onVoice,
  onVideo,
  onText,
  onInvite,
  textDisabled = false,
}: {
  peer: OrbitalPeerNode;
  darkMode: boolean;
  onClose: () => void;
  onVoice: () => void;
  onVideo: () => void;
  onText: () => void;
  onInvite: () => void;
  textDisabled?: boolean;
}) {
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const busy = peer.inCall === true;
  const glass = darkMode
    ? "border-cyan-400/45 bg-[#030810]/88 shadow-[0_0_80px_-12px_rgba(0,229,255,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
    : "border-sky-400/50 bg-white/82 shadow-[0_0_50px_-10px_rgba(14,165,233,0.35)]";

  const actions = [
    {
      id: "voice",
      label: "Voice",
      sub: "Secure audio",
      Icon: Phone,
      onClick: onVoice,
      accent: "from-emerald-500/25 to-emerald-950/40 border-emerald-400/45 text-emerald-200",
    },
    {
      id: "video",
      label: "Video",
      sub: "Live mesh",
      Icon: Video,
      onClick: onVideo,
      accent: "from-sky-500/25 to-slate-950/50 border-sky-400/50 text-sky-100",
    },
    {
      id: "text",
      label: "Text",
      sub: "Data channel",
      Icon: MessageSquare,
      onClick: onText,
      accent: "from-violet-500/25 to-violet-950/40 border-violet-400/45 text-violet-100",
    },
    {
      id: "invite",
      label: "Invite",
      sub: "Video session",
      Icon: UserPlus,
      onClick: onInvite,
      accent: "from-amber-500/20 to-orange-950/40 border-amber-400/45 text-amber-100",
    },
  ] as const;

  return (
    <div
      className="animate-hud-in relative z-[5] mx-auto mb-4 mt-1 w-full max-w-[26rem] px-1 sm:max-w-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`hud-title-${uid}`}
    >
      <div
        className="pointer-events-none absolute -inset-3 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${CYAN}55 0%, transparent 55%)`,
          animation: "hud-breathe 3.2s ease-in-out infinite",
        }}
      />

      <div
        className={`relative overflow-hidden rounded-[1.35rem] border-2 backdrop-blur-2xl ${glass}`}
        style={{
          transform: "perspective(1200px) rotateX(2deg)",
          transformOrigin: "50% 100%",
        }}
      >
        {/* Glass grid + scan */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(${CYAN}33 1px, transparent 1px),
              linear-gradient(90deg, ${CYAN}22 1px, transparent 1px)
            `,
            backgroundSize: "14px 14px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent opacity-80"
          style={{ animation: "hud-scan 4s ease-in-out infinite" }}
        />

        <div className="relative flex items-start justify-between gap-3 border-b border-cyan-500/25 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 scale-110 rounded-full border border-dashed border-cyan-400/35"
                style={{ animation: "hud-ring 8s linear infinite" }}
              />
              <div
                className="absolute inset-[-4px] rounded-full border border-cyan-400/20"
                style={{ animation: "hud-ring-reverse 12s linear infinite" }}
              />
              <div
                className={`relative h-14 w-14 overflow-hidden rounded-full border-2 sm:h-16 sm:w-16 ${
                  busy ? "border-amber-400/70 shadow-[0_0_24px_rgba(251,191,36,0.35)]" : "border-cyan-400/60 shadow-[0_0_28px_rgba(0,229,255,0.35)]"
                }`}
              >
                {peer.avatarUrl ? (
                  <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-900/80 to-slate-950 text-lg font-bold text-cyan-100">
                    {peer.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-cyan-400/85 sm:text-[10px]">
                Selected node
              </p>
              <h3
                id={`hud-title-${uid}`}
                className={`truncate text-base font-bold tracking-tight sm:text-lg ${darkMode ? "text-white" : "text-slate-900"}`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                {peer.displayName}
              </h3>
              <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider sm:text-[11px] ${busy ? "text-amber-300/90" : "text-emerald-400/90"}`}>
                {busy ? "● In active session" : "● Link ready · standby"}
              </p>
              <p className={`mt-1 truncate text-[10px] ${darkMode ? "text-white/40" : "text-slate-600"}`}>
                ID · <span className="font-mono text-cyan-200/80">{peer.id.slice(0, 12)}{peer.id.length > 12 ? "…" : ""}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg border p-2 transition ${
              darkMode
                ? "border-white/15 text-white/70 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
                : "border-slate-300 text-slate-600 hover:border-sky-400 hover:bg-sky-50"
            }`}
            aria-label="Close link panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-3 py-2 sm:px-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-cyan-500/70">Comms matrix</p>
          <div className="mt-2 flex gap-1.5">
            {[0.95, 0.75, 0.55, 0.9, 0.4, 0.85, 0.65].map((op, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full bg-cyan-400/25"
                style={{
                  boxShadow: `0 0 8px rgba(0,229,255,${0.15 + op * 0.35})`,
                  opacity: op,
                  animation: `hud-bar 2.4s ease-in-out ${i * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2 p-3 pt-1 sm:grid-cols-4 sm:gap-2.5 sm:p-4 sm:pt-2">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={
                (busy && a.id !== "text" && a.id !== "invite") || (a.id === "text" && textDisabled)
              }
              onClick={() => {
                a.onClick();
                if (a.id !== "text") onClose();
              }}
              className={`group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border bg-gradient-to-b px-2 py-3 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:pointer-events-none disabled:opacity-35 sm:py-4 ${a.accent}`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 120%, ${CYAN}22 0%, transparent 55%)`,
                }}
              />
              <a.Icon className="relative z-[1] h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
              <span className="relative z-[1] font-mono text-[10px] font-bold uppercase tracking-wider sm:text-[11px]">
                {a.label}
              </span>
              <span className="relative z-[1] text-center text-[8px] uppercase leading-tight opacity-75 sm:text-[9px]">
                {a.sub}
              </span>
            </button>
          ))}
        </div>

        <p className={`px-4 pb-3 text-center text-[9px] ${darkMode ? "text-white/35" : "text-slate-500"}`}>
          ESC to dismiss · Voice/Video/Invite close panel after dispatch · Text keeps channel open
        </p>
      </div>

      <style>{`
        @keyframes hud-in {
          from { opacity: 0; transform: perspective(1200px) rotateX(8deg) translateY(12px) scale(0.96); }
          to { opacity: 1; transform: perspective(1200px) rotateX(2deg) translateY(0) scale(1); }
        }
        @keyframes hud-breathe {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes hud-scan {
          0%, 100% { opacity: 0.35; transform: translateX(-8%); }
          50% { opacity: 0.9; transform: translateX(8%); }
        }
        @keyframes hud-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hud-ring-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes hud-bar {
          from { transform: scaleY(0.65); opacity: 0.45; }
          to { transform: scaleY(1); opacity: 1; }
        }
        .animate-hud-in {
          animation: hud-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}
