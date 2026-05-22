/**
 * Orbital contact hub — headset-inspired ring of communication modes (CYRUS holo).
 */

import { MessageSquare, Phone, Users, Video, X } from "lucide-react";
import { useEffect, type RefObject } from "react";

const CYAN = "#00e5ff";

type HubAction = {
  id: "voice" | "video" | "text" | "group";
  label: string;
  sub: string;
  Icon: typeof Phone;
  accent: string;
  border: string;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  displayName: string;
  refLabel: string;
  avatarUrl: string | null;
  inCall?: boolean;
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  onVoice: () => void;
  onVideo: () => void;
  onText: () => void;
  onGroup: () => void;
};

export function CommsContactHubPopover({
  displayName,
  refLabel,
  avatarUrl,
  inCall,
  open,
  onClose,
  anchorRef,
  onVoice,
  onVideo,
  onText,
  onGroup,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const initial = (displayName.trim().charAt(0) || "?").toUpperCase();

  const actions: HubAction[] = [
    {
      id: "voice",
      label: "Voice",
      sub: "Audio call",
      Icon: Phone,
      accent: "text-emerald-300",
      border: "border-emerald-400/50 hover:bg-emerald-500/15",
      disabled: inCall,
      onSelect: () => {
        onVoice();
        onClose();
      },
    },
    {
      id: "video",
      label: "Video",
      sub: "Face-to-face",
      Icon: Video,
      accent: "text-sky-300",
      border: "border-sky-400/50 hover:bg-sky-500/15",
      disabled: inCall,
      onSelect: () => {
        onVideo();
        onClose();
      },
    },
    {
      id: "text",
      label: "Text",
      sub: "Open chat",
      Icon: MessageSquare,
      accent: "text-violet-300",
      border: "border-violet-400/50 hover:bg-violet-500/15",
      onSelect: () => {
        onText();
        onClose();
      },
    },
    {
      id: "group",
      label: "Group",
      sub: "Round table",
      Icon: Users,
      accent: "text-amber-300",
      border: "border-amber-400/50 hover:bg-amber-500/15",
      onSelect: () => {
        onGroup();
        onClose();
      },
    },
  ];

  const positions = [
    { top: "4%", left: "50%", tx: "-50%", ty: "0" },
    { top: "50%", left: "92%", tx: "-50%", ty: "-50%" },
    { top: "88%", left: "50%", tx: "-50%", ty: "-100%" },
    { top: "50%", left: "8%", tx: "-50%", ty: "-50%" },
  ];

  return (
    <div
      className="absolute left-1/2 top-0 z-[200] -translate-x-1/2 -translate-y-[108%] animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-label={`Contact hub for ${displayName}`}
    >
      <div
        className="relative w-[min(168px,42vw)] rounded-2xl border border-cyan-400/55 bg-[#020810]/96 p-2 shadow-[0_0_48px_rgba(0,229,255,0.35)] backdrop-blur-md"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, rgba(0,229,255,0.12) 0%, transparent 70%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1 top-1 z-10 rounded-md p-0.5 text-cyan-200/50 transition hover:bg-cyan-500/15 hover:text-cyan-100"
          aria-label="Close contact hub"
        >
          <X className="h-3 w-3" />
        </button>

        <p className="mb-1 text-center font-mono text-[6px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
          NEXUS contact hub
        </p>

        <div className="relative mx-auto aspect-square w-full max-w-[148px]">
          {/* Headset arc frame */}
          <svg
            viewBox="0 0 120 120"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="hub-arc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={CYAN} stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <path
              d="M 18 62 A 42 42 0 1 1 102 62"
              fill="none"
              stroke="url(#hub-arc)"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <rect x="8" y="52" width="12" height="22" rx="4" fill={CYAN} opacity="0.55" />
            <rect x="100" y="52" width="12" height="22" rx="4" fill={CYAN} opacity="0.55" />
            <circle cx="60" cy="60" r="34" fill="none" stroke={CYAN} strokeWidth="0.6" opacity="0.25" />
          </svg>

          {/* Center portrait */}
          <div className="absolute left-1/2 top-1/2 z-[1] flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center overflow-hidden rounded-lg border border-cyan-400/45 bg-gradient-to-b from-[#0a2038] to-[#020810] shadow-[inset_0_0_20px_rgba(0,229,255,0.15)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover object-top" draggable={false} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-cyan-100/90">
                {initial}
              </span>
            )}
          </div>

          {actions.map((action, i) => {
            const pos = positions[i];
            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                title={`${action.label} — ${action.sub}`}
                onClick={action.onSelect}
                className={`absolute z-[2] flex w-[min(52px,14vw)] flex-col items-center gap-0.5 rounded-xl border bg-[#021018]/90 px-1 py-1.5 backdrop-blur-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${action.border}`}
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: `translate(${pos.tx}, ${pos.ty})`,
                }}
              >
                <action.Icon className={`h-3.5 w-3.5 ${action.accent}`} strokeWidth={2} aria-hidden />
                <span className={`text-[7px] font-semibold leading-none ${action.accent}`}>{action.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-1 border-t border-cyan-500/20 px-1 pt-1 text-center">
          <p className="truncate text-[9px] font-semibold text-white">{displayName}</p>
          <p className="font-mono text-[6px] uppercase tracking-[0.14em] text-cyan-400/70">{refLabel}</p>
          {inCall ? (
            <p className="mt-0.5 text-[6px] text-fuchsia-300/90">In call — voice/video paused</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
