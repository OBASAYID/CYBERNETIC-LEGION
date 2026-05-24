/**
 * Orbital contact hub — headset-inspired ring of communication modes (CYRUS holo).
 */

import { MessageSquare, Phone, Users, Video, X } from "lucide-react";
import { useEffect, useId, type RefObject } from "react";
import { COMMS_CYAN } from "./comms-nexus-motion";

type HubAction = {
  id: "voice" | "video" | "text" | "group";
  label: string;
  sub: string;
  Icon: typeof Phone;
  accent: string;
  border: string;
  hoverGlow: string;
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
  const uid = useId().replace(/:/g, "");
  const arcGradId = `hub-arc-${uid}`;

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
      border: "border-emerald-400/55",
      hoverGlow: "hover:bg-emerald-500/20 hover:shadow-[0_0_16px_rgba(52,211,153,0.35)]",
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
      border: "border-sky-400/55",
      hoverGlow: "hover:bg-sky-500/20 hover:shadow-[0_0_16px_rgba(56,189,248,0.35)]",
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
      border: "border-violet-400/55",
      hoverGlow: "hover:bg-violet-500/20 hover:shadow-[0_0_16px_rgba(167,139,250,0.35)]",
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
      border: "border-amber-400/55",
      hoverGlow: "hover:bg-amber-500/20 hover:shadow-[0_0_16px_rgba(251,191,36,0.3)]",
      onSelect: () => {
        onGroup();
        onClose();
      },
    },
  ];

  const positions = [
    { top: "2%", left: "50%", tx: "-50%", ty: "0" },
    { top: "50%", left: "94%", tx: "-50%", ty: "-50%" },
    { top: "90%", left: "50%", tx: "-50%", ty: "-100%" },
    { top: "50%", left: "6%", tx: "-50%", ty: "-50%" },
  ];

  return (
    <div
      className="absolute left-1/2 top-0 z-[200]"
      style={{ animation: "commsHubEnter 0.22s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Contact hub for ${displayName}`}
    >
      <div
        className="relative w-[min(188px,46vw)] rounded-2xl border border-cyan-400/60 bg-[#020810]/97 p-2.5 shadow-[0_0_56px_rgba(0,229,255,0.4)] backdrop-blur-lg"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 85% 65% at 50% 30%, rgba(0,229,255,0.14) 0%, transparent 72%)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1.5 top-1.5 z-10 rounded-md p-1 text-cyan-200/55 transition hover:bg-cyan-500/15 hover:text-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/70"
          aria-label="Close contact hub"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="mb-1.5 text-center font-mono text-[7px] font-bold uppercase tracking-[0.24em] text-cyan-300/85 sm:text-[8px]">
          NEXUS · contact hub
        </p>

        <div className="relative mx-auto aspect-square w-full max-w-[160px]">
          <svg
            viewBox="0 0 120 120"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id={arcGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={COMMS_CYAN} stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <path
              d="M 18 62 A 42 42 0 1 1 102 62"
              fill="none"
              stroke={`url(#${arcGradId})`}
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.8"
            />
            <rect x="8" y="52" width="12" height="22" rx="4" fill={COMMS_CYAN} opacity="0.6" />
            <rect x="100" y="52" width="12" height="22" rx="4" fill={COMMS_CYAN} opacity="0.6" />
            <circle cx="60" cy="60" r="34" fill="none" stroke={COMMS_CYAN} strokeWidth="0.75" opacity="0.28" />
          </svg>

          <div className="absolute left-1/2 top-1/2 z-[1] flex h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 flex-col items-center overflow-hidden rounded-lg border border-cyan-400/50 bg-gradient-to-b from-[#0a2038] to-[#020810] shadow-[inset_0_0_24px_rgba(0,229,255,0.18)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover object-top" draggable={false} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-cyan-100/90">
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
                className={`absolute z-[2] flex w-[min(58px,15vw)] flex-col items-center gap-0.5 rounded-xl border bg-[#021018]/95 px-1.5 py-2 backdrop-blur-sm transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40 ${action.border} ${action.hoverGlow}`}
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: `translate(${pos.tx}, ${pos.ty})`,
                }}
              >
                <action.Icon className={`h-4 w-4 ${action.accent}`} strokeWidth={2} aria-hidden />
                <span className={`text-[8px] font-semibold leading-none ${action.accent}`}>{action.label}</span>
                <span className="hidden text-[6px] leading-none text-white/45 sm:block">{action.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 border-t border-cyan-500/25 px-1 pt-1.5 text-center">
          <p className="truncate text-[10px] font-semibold text-white sm:text-[11px]">{displayName}</p>
          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-cyan-400/75">{refLabel}</p>
          {inCall ? (
            <p className="mt-0.5 text-[7px] text-fuchsia-300/90">In call — dial paused</p>
          ) : (
            <p className="mt-0.5 text-[6px] text-cyan-400/50">Choose a channel</p>
          )}
        </div>
      </div>
    </div>
  );
}
