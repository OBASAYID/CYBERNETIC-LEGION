/**
 * Key Event Assurance Service — layout matched to reference:
 * header (title + subtitle) → timeline arc (Before / In / After) → nine function icons on one curved arc
 * → Global Service Center hub → five forward nodes (TAC…GSLC) with tethers.
 */

import { useCallback, useId, useMemo, useRef, type ReactNode } from "react";
import {
  Camera,
  ClipboardList,
  Cog,
  Database,
  Handshake,
  Headphones,
  LineChart,
  MessageSquare,
  Phone,
  Share2,
  Users,
  Video,
  Wrench,
  Cable,
} from "lucide-react";
import { CommsGeodesicSphere } from "./CommsGeodesicSphere";

export type OrbitalMainTab = "chat" | "calls" | "people" | "streams" | "monitor" | "pshare";

export interface OrbitalPeerNode {
  id: string;
  displayName: string;
  inCall?: boolean;
  avatarUrl: string | null;
}

const DEEP_NAVY = "#000b1a";
const CYAN = "#00e5ff";

/** Reference timeline segment for each function (0 = Before, 1 = In, 2 = After). */
type PhaseIdx = 0 | 1 | 2;

type AssuranceModule = {
  id: string;
  tab: OrbitalMainTab;
  /** Exact reference label (may wrap). */
  label: string;
  Icon: typeof Users;
  phase: PhaseIdx;
};

/** Nine functions along the middle arc — labels match reference; tabs wire Cyrus modules. */
const ASSURANCE_ARC: AssuranceModule[] = [
  { id: "consulting", tab: "people", label: "Consulting", Icon: Users, phase: 0 },
  { id: "integration", tab: "pshare", label: "Network Integration", Icon: Cable, phase: 0 },
  { id: "capacity", tab: "chat", label: "Resource Capacity Assessment", Icon: Database, phase: 0 },
  { id: "netcheck", tab: "monitor", label: "Netcheck", Icon: Wrench, phase: 0 },
  { id: "adjustment", tab: "monitor", label: "Network Adjustment", Icon: LineChart, phase: 0 },
  {
    id: "contingency",
    tab: "calls",
    label: "Contingency Plan, Preparation & Drill",
    Icon: Handshake,
    phase: 1,
  },
  { id: "spare", tab: "people", label: "Spare Parts Assurance", Icon: Cog, phase: 1 },
  { id: "onduty", tab: "calls", label: "On-duty Support", Icon: Headphones, phase: 1 },
  { id: "summary", tab: "monitor", label: "Adjustment & Summary", Icon: ClipboardList, phase: 2 },
];

/** Fixed reference labels for the five forward nodes (avatar fills when a peer is present). */
const FORWARD_NODE_LABELS = ["TAC", "GTAC", "RSPC", "GSPC", "GSLC"] as const;

const PEER_ANCHOR_X = [70, 160, 250, 340, 430];

export function CommsOrbitalCommandDeck({
  darkMode,
  displayName,
  isConnected,
  mainUserPhotoUrl,
  onMainUserPhotoUpload,
  photoUploading,
  peers,
  activeTab,
  onSelectTab,
  onPeerCall,
  onPeerMessage,
  onPeerVideoInvite,
  className = "",
  serviceTitle = "Key Event Assurance Service",
  serviceSubtitle = "— Delivering Network Resilience to Maintain Customer Satisfaction",
}: {
  darkMode: boolean;
  displayName: string;
  isConnected: boolean;
  mainUserPhotoUrl: string | null;
  onMainUserPhotoUpload: (file: File) => void;
  photoUploading: boolean;
  peers: OrbitalPeerNode[];
  activeTab: OrbitalMainTab;
  onSelectTab: (t: OrbitalMainTab) => void;
  onPeerCall: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string) => void;
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
  className?: string;
  serviceTitle?: string;
  serviceSubtitle?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const gradId = `kess-grad-${uid}`;
  const glowId = `kess-glow-${uid}`;
  const tetherGrad = `kess-tether-${uid}`;
  const timelineId = `kess-tl-${uid}`;

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onMainUserPhotoUpload(f);
      e.target.value = "";
    },
    [onMainUserPhotoUpload]
  );

  const activePhase = useMemo((): PhaseIdx | null => {
    const m = ASSURANCE_ARC.find((x) => x.tab === activeTab);
    return m ? m.phase : null;
  }, [activeTab]);

  const forwardSlots = useMemo(() => {
    return FORWARD_NODE_LABELS.map((refLabel, i) => ({
      refLabel,
      peer: peers[i] ?? null,
    }));
  }, [peers]);

  const shell = darkMode
    ? "border-cyan-400/25 bg-black/40 shadow-[0_0_80px_-30px_rgba(0,229,255,0.35),inset_0_1px_0_rgba(0,229,255,0.1)]"
    : "border-sky-400/40 bg-white/50 shadow-[0_0_36px_-14px_rgba(14,165,233,0.28)]";

  const textMuted = darkMode ? "text-white/55" : "text-slate-600";
  const textTitle = darkMode ? "text-white" : "text-slate-900";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${shell} backdrop-blur-2xl ${className}`}
      aria-label="Key Event Assurance Service"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${CYAN}28 1px, transparent 1px),
            linear-gradient(180deg, transparent 0%, ${DEEP_NAVY} 50%, transparent 100%)
          `,
          backgroundSize: "44px 44px, 100% 100%",
          transform: "perspective(520px) rotateX(58deg) scale(1.12)",
          transformOrigin: "50% 100%",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 32%, black 85%, transparent 100%)",
        }}
      />

      <div className="relative z-[1] flex flex-col px-3 pb-5 pt-4 sm:px-6 sm:pb-7 sm:pt-5">
        {/* Header — reference: top left, white typography */}
        <div className="mb-4 flex w-full max-w-6xl flex-col gap-1 self-start text-left sm:mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                className={`text-base font-bold leading-tight tracking-tight sm:text-lg md:text-xl ${textTitle}`}
                style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif" }}
              >
                {serviceTitle}
              </h2>
              <p className={`mt-1 max-w-xl text-[11px] font-normal leading-snug sm:text-xs ${textTitle} opacity-90`}>
                {serviceSubtitle}
              </p>
            </div>
            <span
              className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                isConnected
                  ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200/90"
                  : "border-white/15 bg-white/5 text-white/50"
              }`}
            >
              {isConnected ? "Linked" : "Sync"}
            </span>
          </div>
        </div>

        {/* Timeline arc + phase markers */}
        <div className="relative mx-auto mb-1 w-full max-w-5xl px-1">
          <svg className="h-14 w-full overflow-visible sm:h-16" viewBox="0 0 800 80" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs>
              <linearGradient id={timelineId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={CYAN} stopOpacity="0.2" />
                <stop offset="50%" stopColor={CYAN} stopOpacity="0.85" />
                <stop offset="100%" stopColor={CYAN} stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M 40 58 Q 400 8 760 58"
              fill="none"
              stroke={`url(#${timelineId})`}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {[
              { x: 160, label: "Before Event", phase: 0 as PhaseIdx },
              { x: 400, label: "In Event", phase: 1 as PhaseIdx },
              { x: 640, label: "After Event", phase: 2 as PhaseIdx },
            ].map(({ x, label, phase }) => {
              const live = activePhase === phase;
              return (
                <g key={label}>
                  <line x1={x} y1={52} x2={x} y2={62} stroke={live ? CYAN : `${CYAN}55`} strokeWidth={live ? 2 : 1} />
                  <text
                    x={x}
                    y={74}
                    textAnchor="middle"
                    fill={live ? CYAN : darkMode ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.65)"}
                    fontSize="11"
                    fontFamily="system-ui, sans-serif"
                    fontWeight={live ? 700 : 500}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Nine functions — single curved arc */}
        <div
          className="relative mx-auto mt-1 w-full max-w-6xl"
          style={{ perspective: "900px" }}
        >
          <div
            className="relative flex h-[118px] w-full items-end justify-center sm:h-[132px]"
            style={{ transform: "rotateX(12deg)", transformOrigin: "50% 100%" }}
          >
            {ASSURANCE_ARC.map((mod, i) => {
              const n = ASSURANCE_ARC.length;
              const t = n > 1 ? i / (n - 1) : 0.5;
              const arcLift = 26 - Math.pow(t - 0.5, 2) * 95;
              const active = activeTab === mod.tab;
              return (
                <button
                  key={mod.id}
                  type="button"
                  title={mod.label}
                  onClick={() => onSelectTab(mod.tab)}
                  className="absolute flex w-[10.2%] min-w-[52px] max-w-[92px] flex-col items-center gap-1 rounded-lg border px-0.5 py-1.5 transition-all sm:min-w-[64px] sm:max-w-[100px] sm:py-2"
                  style={{
                    left: `${4 + t * 88}%`,
                    transform: `translateX(-50%) translateY(-${arcLift}px)`,
                    borderColor: active
                      ? "rgba(0,229,255,0.7)"
                      : darkMode
                        ? "rgba(0,229,255,0.2)"
                        : "rgba(14,165,233,0.35)",
                    boxShadow: active
                      ? "0 0 22px -4px rgba(0,229,255,0.5)"
                      : "0 0 12px -6px rgba(0,229,255,0.12)",
                    background: active
                      ? darkMode
                        ? "rgba(0,229,255,0.12)"
                        : "rgba(14,165,233,0.14)"
                      : darkMode
                        ? "rgba(0,15,35,0.5)"
                        : "rgba(255,255,255,0.82)",
                  }}
                >
                  <mod.Icon
                    className={`h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] ${active ? "text-cyan-200" : "text-cyan-300/85"}`}
                    strokeWidth={1.65}
                    aria-hidden
                  />
                  <span
                    className={`text-center text-[5px] font-medium leading-[1.15] sm:text-[6px] ${
                      darkMode ? "text-white/90" : "text-slate-800"
                    }`}
                    style={{ textShadow: darkMode ? "0 0 12px rgba(0,229,255,0.35)" : undefined }}
                  >
                    {mod.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Service Center */}
        <div className="relative z-[4] -mt-2 flex w-full flex-col items-center sm:-mt-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onFileChange}
          />

          <div className="relative flex items-center justify-center pt-2">
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
              <CommsGeodesicSphere size={276} className="opacity-[0.94]" />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 sm:hidden">
              <CommsGeodesicSphere size={228} className="opacity-[0.94]" />
            </div>
            <div
              className="absolute left-1/2 top-1/2 z-[1] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400/30 via-cyan-500/10 to-transparent blur-2xl"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              className="group relative z-[2] flex h-[5.75rem] w-[5.75rem] cursor-pointer items-center justify-center rounded-full border-2 border-cyan-400/60 bg-gradient-to-b from-slate-900/95 to-[#000b1a] shadow-[0_0_48px_-4px_rgba(0,229,255,0.55)] transition hover:border-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:opacity-60 sm:h-32 sm:w-32"
              aria-label="Operator photo"
            >
              <div className="absolute inset-[5px] z-[1] overflow-hidden rounded-full border border-white/15 bg-slate-950/85">
                {mainUserPhotoUrl ? (
                  <img src={mainUserPhotoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-cyan-950/85 to-slate-950">
                    <span className="text-xl font-bold text-cyan-100 sm:text-2xl">
                      {displayName.charAt(0).toUpperCase() || "?"}
                    </span>
                    <Camera className="h-3.5 w-3.5 text-cyan-400/65" aria-hidden />
                  </div>
                )}
              </div>
            </button>
          </div>
          <p
            className={`relative z-[3] mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100 sm:text-[11px]`}
            style={{ textShadow: "0 0 24px rgba(0,229,255,0.4)" }}
          >
            Global Service Center
          </p>
        </div>

        {/* Five forward nodes — reference labels; peers fill slots left-to-right */}
        <div className="relative z-[5] mx-auto mt-3 w-full max-w-2xl">
          <div className="relative min-h-[130px] w-full sm:min-h-[145px]">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 500 155"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id={`${tetherGrad}-l`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={CYAN} stopOpacity="0.06" />
                </linearGradient>
                <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.8" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {PEER_ANCHOR_X.map((x) => (
                <line
                  key={x}
                  x1={250}
                  y1={22}
                  x2={x}
                  y2={118}
                  stroke={`url(#${tetherGrad}-l)`}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div className="relative flex items-end justify-center gap-1.5 pt-7 sm:gap-3 sm:pt-9">
              {forwardSlots.map(({ refLabel, peer }) => (
                <div key={refLabel} className="group relative flex max-w-[19%] flex-1 flex-col items-center">
                  <div
                    className={`relative aspect-square w-full max-w-[3.25rem] overflow-hidden rounded-full border-2 sm:max-w-[3.75rem] ${
                      peer
                        ? "border-cyan-400/70 shadow-[0_0_22px_-4px_rgba(0,229,255,0.5)]"
                        : "border-cyan-500/25 bg-cyan-950/40 shadow-[0_0_16px_-6px_rgba(0,229,255,0.2)]"
                    }`}
                  >
                    {peer?.avatarUrl ? (
                      <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : peer ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-900/60 to-slate-950 text-sm font-semibold text-cyan-100">
                        {peer.displayName.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-cyan-950/50 text-[10px] font-mono text-cyan-400/45">
                        ···
                      </div>
                    )}
                    {peer?.inCall ? (
                      <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.9)]" />
                    ) : peer ? (
                      <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    ) : null}
                  </div>
                  <span className="mt-1.5 text-center font-mono text-[8px] font-bold uppercase tracking-wide text-cyan-100 sm:text-[9px]">
                    {refLabel}
                  </span>
                  {peer ? (
                    <span className="max-w-full truncate text-center text-[6px] uppercase text-white/45 sm:text-[7px]">
                      {peer.displayName}
                    </span>
                  ) : null}
                  {peer ? (
                    <div className="mt-1 flex justify-center gap-0.5 opacity-0 transition group-hover:opacity-100 sm:gap-1">
                      <button
                        type="button"
                        title="Voice"
                        disabled={peer.inCall}
                        onClick={() => onPeerCall(peer.id, peer.displayName, "audio")}
                        className="rounded border border-emerald-500/40 bg-emerald-950/60 p-0.5 text-emerald-200 hover:bg-emerald-900/60 disabled:opacity-40"
                      >
                        <Phone className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        title="Video"
                        disabled={peer.inCall}
                        onClick={() => onPeerCall(peer.id, peer.displayName, "video")}
                        className="rounded border border-sky-500/40 bg-sky-950/60 p-0.5 text-sky-200 hover:bg-sky-900/60 disabled:opacity-40"
                      >
                        <Video className="h-2.5 w-2.5" />
                      </button>
                      {onPeerMessage ? (
                        <button
                          type="button"
                          title="Message"
                          onClick={() => onPeerMessage(peer.id, peer.displayName)}
                          className="rounded border border-violet-500/40 bg-violet-950/50 p-0.5 text-violet-200"
                        >
                          <MessageSquare className="h-2.5 w-2.5" />
                        </button>
                      ) : null}
                      {onPeerVideoInvite ? (
                        <button
                          type="button"
                          title="Invite"
                          onClick={() => onPeerVideoInvite(peer.id, peer.displayName)}
                          className="rounded border border-amber-500/35 bg-amber-950/40 p-0.5 text-amber-200"
                        >
                          <Share2 className="h-2.5 w-2.5" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.04" />
            <stop offset="50%" stopColor={CYAN} stopOpacity="0.35" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <line x1="50" y1="62" x2="18" y2="28" stroke={`url(#${gradId})`} strokeWidth="0.08" />
        <line x1="50" y1="62" x2="82" y2="28" stroke={`url(#${gradId})`} strokeWidth="0.08" />
      </svg>
    </section>
  );
}
