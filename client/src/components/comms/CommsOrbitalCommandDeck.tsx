/**
 * Key Event Assurance Service — tuned for reference fidelity:
 * neon depth, glowing timeline, glass icon arc, luminous hub, bright forward tethers.
 */

import { useCallback, useId, useMemo, useRef } from "react";
import {
  ClipboardList,
  Cog,
  Database,
  Handshake,
  Headphones,
  LineChart,
  Users,
  Wrench,
  Cable,
} from "lucide-react";
import { CommsOrbitalScene3D } from "./CommsOrbitalScene3D";

export type OrbitalMainTab = "chat" | "calls" | "people" | "streams" | "monitor" | "pshare";

export interface OrbitalPeerNode {
  id: string;
  displayName: string;
  inCall?: boolean;
  avatarUrl: string | null;
}

const CYAN = "#00e5ff";

type PhaseIdx = 0 | 1 | 2;

type AssuranceModule = {
  id: string;
  tab: OrbitalMainTab;
  label: string;
  Icon: typeof Users;
  phase: PhaseIdx;
};

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

const FORWARD_NODE_LABELS = ["TAC", "GTAC", "RSPC", "GSPC", "GSLC"] as const;
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
  const orbitPhaseRef = useRef(0);
  const uid = useId();
  const sid = uid.replace(/:/g, "");
  const gradId = `kess-grad-${sid}`;
  const timelineId = `kess-tl-${sid}`;
  const timelineGlow = `kess-tlg-${sid}`;

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

  const textTitle = darkMode ? "text-white" : "text-slate-900";

  return (
    <section
      className={`relative bg-transparent ${className}`}
      aria-label="Key Event Assurance Service"
    >
      <div className="relative z-[1] flex w-full max-w-[min(100%,80rem)] flex-col self-center px-0.5 pb-3 pt-2 sm:px-2 sm:pb-4 sm:pt-3">
        {/* Header */}
        <div className="mb-3 flex w-full flex-col gap-1 text-left sm:mb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                className={`text-xl font-extrabold leading-[1.15] tracking-tight sm:text-2xl md:text-3xl ${textTitle}`}
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  textShadow: darkMode ? "0 0 42px rgba(0,229,255,0.35), 0 0 2px rgba(255,255,255,0.2)" : undefined,
                }}
              >
                {serviceTitle}
              </h2>
              <p
                className={`mt-2 max-w-2xl text-xs font-light leading-relaxed sm:text-sm ${textTitle} ${
                  darkMode ? "opacity-[0.88]" : "opacity-90"
                }`}
                style={{ textShadow: darkMode ? "0 0 20px rgba(0,229,255,0.2)" : undefined }}
              >
                {serviceSubtitle}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] shadow-[0_0_20px_-4px_rgba(0,229,255,0.35)] ${
                isConnected
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                  : "border-white/20 bg-white/5 text-white/55"
              }`}
            >
              {isConnected ? "Linked" : "Sync"}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative mx-auto mb-1.5 w-full px-0 sm:mb-2">
          <svg
            className="h-12 w-full overflow-visible sm:h-14 md:h-[4rem]"
            viewBox="0 0 900 96"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
            style={{ filter: darkMode ? "drop-shadow(0 0 8px rgba(0,229,255,0.25))" : undefined }}
          >
            <defs>
              <linearGradient id={timelineId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={CYAN} stopOpacity="0.15" />
                <stop offset="35%" stopColor={CYAN} stopOpacity="0.95" />
                <stop offset="65%" stopColor={CYAN} stopOpacity="0.95" />
                <stop offset="100%" stopColor={CYAN} stopOpacity="0.15" />
              </linearGradient>
              <filter id={timelineGlow} x="-10%" y="-30%" width="120%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 48 68 Q 450 6 852 68"
              fill="none"
              stroke={`url(#${timelineId})`}
              strokeWidth="2.2"
              strokeLinecap="round"
              filter={`url(#${timelineGlow})`}
            />
            {[
              { x: 200, label: "Before Event", phase: 0 as PhaseIdx },
              { x: 450, label: "In Event", phase: 1 as PhaseIdx },
              { x: 700, label: "After Event", phase: 2 as PhaseIdx },
            ].map(({ x, label, phase }) => {
              const live = activePhase === phase;
              return (
                <g key={label}>
                  <circle
                    cx={x}
                    cy={64}
                    r={live ? 4 : 2.5}
                    fill={live ? CYAN : `${CYAN}99`}
                    opacity={live ? 1 : 0.65}
                    style={{
                      filter: live ? "drop-shadow(0 0 6px rgba(0,229,255,0.95))" : undefined,
                    }}
                  />
                  <line
                    x1={x}
                    y1={64}
                    x2={x}
                    y2={76}
                    stroke={live ? CYAN : `${CYAN}77`}
                    strokeWidth={live ? 2.2 : 1.2}
                    strokeLinecap="round"
                  />
                  <text
                    x={x}
                    y={92}
                    textAnchor="middle"
                    fill={live ? CYAN : darkMode ? "rgba(255,255,255,0.62)" : "rgba(15,23,42,0.72)"}
                    fontSize="13"
                    fontFamily="'Space Grotesk', system-ui, sans-serif"
                    fontWeight={live ? 700 : 500}
                    style={{
                      textShadow: live && darkMode ? "0 0 14px rgba(0,229,255,0.75)" : undefined,
                    }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Nine functions — glass arc */}
        <div className="relative mx-auto w-full max-w-full xl:max-w-[85rem]" style={{ perspective: "1100px" }}>
          <div
            className="relative flex h-[118px] w-full items-end justify-center sm:h-[142px] md:h-[158px]"
            style={{ transform: "rotateX(16deg)", transformOrigin: "50% 100%" }}
          >
            {ASSURANCE_ARC.map((mod, i) => {
              const n = ASSURANCE_ARC.length;
              const t = n > 1 ? i / (n - 1) : 0.5;
              const arcLift = 26 - Math.pow(t - 0.5, 2) * 92;
              const active = activeTab === mod.tab;
              const phaseHot = activePhase === mod.phase;
              return (
                <button
                  key={mod.id}
                  type="button"
                  title={mod.label}
                  onClick={() => onSelectTab(mod.tab)}
                  className={`absolute flex w-[10.8%] min-w-[58px] max-w-[108px] flex-col items-center gap-1 rounded-xl border px-1 py-2 shadow-lg backdrop-blur-xl transition-all duration-200 sm:min-w-[76px] sm:max-w-[118px] sm:rounded-2xl sm:px-1.5 sm:py-2.5 md:min-w-[84px] ${
                    active
                      ? "z-[2] scale-[1.04] ring-2 ring-cyan-300/70"
                      : "z-[1] hover:z-[2] hover:scale-[1.02] hover:ring-1 hover:ring-cyan-400/35"
                  }`}
                  style={{
                    left: `${3.2 + t * 93.6}%`,
                    transform: `translateX(-50%) translateY(-${arcLift}px)`,
                    borderColor: active
                      ? "rgba(0,245,255,0.75)"
                      : darkMode
                        ? "rgba(0,229,255,0.28)"
                        : "rgba(14,165,233,0.4)",
                    boxShadow: active
                      ? "0 0 32px -4px rgba(0,229,255,0.65), inset 0 1px 0 rgba(255,255,255,0.12)"
                      : darkMode
                        ? "0 8px 28px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,229,255,0.08)"
                        : "0 8px 24px -10px rgba(14,165,233,0.2)",
                    background: active
                      ? darkMode
                        ? "linear-gradient(165deg, rgba(0,229,255,0.22) 0%, rgba(0,30,55,0.75) 100%)"
                        : "linear-gradient(165deg, rgba(14,165,233,0.2) 0%, rgba(255,255,255,0.92) 100%)"
                      : darkMode
                        ? "linear-gradient(180deg, rgba(0,25,48,0.72) 0%, rgba(0,8,18,0.88) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(224,242,254,0.88) 100%)",
                  }}
                >
                  <span
                    className={`rounded-lg p-1.5 sm:p-2 ${
                      phaseHot && active
                        ? "bg-cyan-400/15 shadow-[0_0_16px_-2px_rgba(0,229,255,0.5)]"
                        : "bg-black/10 dark:bg-black/25"
                    }`}
                  >
                    <mod.Icon
                      className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 md:h-[26px] md:w-[26px] ${
                        active ? "text-cyan-100" : "text-cyan-200/90"
                      }`}
                      strokeWidth={active ? 2 : 1.75}
                      aria-hidden
                      style={{
                        filter: darkMode
                          ? active
                            ? "drop-shadow(0 0 10px rgba(0,229,255,0.85))"
                            : "drop-shadow(0 0 6px rgba(0,229,255,0.35))"
                          : undefined,
                      }}
                    />
                  </span>
                  <span
                    className={`line-clamp-3 min-h-[2.6rem] w-full px-0.5 text-center text-[6px] font-medium leading-[1.2] sm:min-h-[2.85rem] sm:text-[7px] md:text-[8px] ${
                      darkMode ? "text-white/92" : "text-slate-800"
                    }`}
                    style={{
                      textShadow: darkMode ? "0 0 14px rgba(0,229,255,0.35)" : undefined,
                    }}
                  >
                    {mod.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference arc — perspective grid + portrait presence modules */}
        <div className="relative z-[4] mx-auto -mt-0.5 flex w-full max-w-full flex-col items-center sm:-mt-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onFileChange}
          />

          <div
            className="relative mx-auto w-full overflow-hidden rounded-xl"
            style={{
              width: "min(100%, min(96vw, 920px))",
              height: "min(52dvh, clamp(280px, 52dvh, 520px))",
            }}
            role="region"
            aria-label="Communications presence arc — operator and linked peers"
          >
            {/* City silhouette + horizon glow (reference backdrop) */}
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background: darkMode
                  ? `linear-gradient(180deg, rgba(2,12,28,0.15) 0%, rgba(2,18,38,0.55) 38%, rgba(1,8,18,0.92) 100%),
                     radial-gradient(ellipse 90% 40% at 50% 100%, rgba(0,229,255,0.12), transparent 55%)`
                  : "linear-gradient(180deg, rgba(224,242,254,0.4) 0%, rgba(241,245,249,0.85) 100%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-[8%] bottom-[18%] h-[22%] opacity-40"
              style={{
                background: darkMode
                  ? "linear-gradient(180deg, transparent, rgba(0,229,255,0.08))"
                  : "linear-gradient(180deg, transparent, rgba(14,165,233,0.12))",
                clipPath:
                  "polygon(0% 100%, 4% 55%, 9% 72%, 14% 48%, 20% 68%, 26% 42%, 32% 58%, 38% 38%, 44% 52%, 50% 28%, 56% 50%, 62% 35%, 68% 55%, 74% 40%, 80% 62%, 86% 45%, 92% 70%, 96% 52%, 100% 100%)",
              }}
              aria-hidden
            />

            <div className="absolute inset-0 z-[2]">
              <CommsOrbitalScene3D
                orbitPhaseRef={orbitPhaseRef}
                darkMode={darkMode}
                forwardSlots={forwardSlots}
                mainUserPhotoUrl={mainUserPhotoUrl}
                displayName={displayName}
                photoUploading={photoUploading}
                onPhotoClick={() => fileRef.current?.click()}
                onPeerCall={onPeerCall}
                onPeerMessage={onPeerMessage}
                onPeerVideoInvite={onPeerVideoInvite}
              />
            </div>
          </div>

          <p
            className="relative z-[3] mt-2 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-100/85 sm:mt-3 sm:text-[11px]"
            style={{
              textShadow: "0 0 20px rgba(0,229,255,0.45), 0 0 2px rgba(0,229,255,0.65)",
            }}
          >
            Communications console
          </p>
        </div>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.2] sm:opacity-[0.26]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.08" />
            <stop offset="50%" stopColor={CYAN} stopOpacity="0.45" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <line x1="50" y1="58" x2="14" y2="22" stroke={`url(#${gradId})`} strokeWidth="0.1" />
        <line x1="50" y1="58" x2="86" y2="22" stroke={`url(#${gradId})`} strokeWidth="0.1" />
      </svg>

    </section>
  );
}
