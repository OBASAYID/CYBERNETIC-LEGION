/**
 * KEAS reference layout — top-left title, sweeping assurance arc with modules,
 * central globe + satellite nodes (3D), bottom value pills.
 */

import { useCallback, useId, useMemo, useRef, useState } from "react";
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
import { CommsOrbitalScene3D, type ForwardOrbitSlot } from "./CommsOrbitalScene3D";
import { COMMS_AVATAR_FILE_ACCEPT } from "@shared/comms/avatar-image-formats";

export type { ForwardOrbitSlot };

export type OrbitalMainTab = "chat" | "calls" | "people" | "streams" | "monitor" | "pshare";

type PhaseIdx = 0 | 1 | 2;

type AssuranceModule = {
  id: string;
  tab: OrbitalMainTab;
  label: string;
  Icon: typeof Users;
  phase: PhaseIdx;
  /** Position along main arc (0–1). */
  arcT: number;
};

type ValuePill = "challenge" | "solution" | "capability" | "value";

const CYAN = "#00e5ff";

const ASSURANCE_ARC: AssuranceModule[] = [
  { id: "consulting", tab: "people", label: "Consulting", Icon: Users, phase: 0, arcT: 0.06 },
  { id: "integration", tab: "pshare", label: "Network Integration", Icon: Cable, phase: 0, arcT: 0.16 },
  { id: "capacity", tab: "chat", label: "Resource Capacity Assessment", Icon: Database, phase: 0, arcT: 0.26 },
  { id: "netcheck", tab: "monitor", label: "Netcheck", Icon: Wrench, phase: 0, arcT: 0.36 },
  { id: "adjustment", tab: "monitor", label: "Network Adjustment", Icon: LineChart, phase: 0, arcT: 0.44 },
  { id: "contingency", tab: "calls", label: "Contingency Plan, Preparation & Drill", Icon: Handshake, phase: 0, arcT: 0.52 },
  { id: "spare", tab: "people", label: "Spare Parts Assurance", Icon: Cog, phase: 1, arcT: 0.64 },
  { id: "onduty", tab: "calls", label: "On-duty Support", Icon: Headphones, phase: 1, arcT: 0.76 },
  { id: "summary", tab: "monitor", label: "Adjustment & Summary", Icon: ClipboardList, phase: 2, arcT: 0.9 },
];

const VALUE_PILLS: { id: ValuePill; label: string; tab: OrbitalMainTab }[] = [
  { id: "challenge", label: "Challenge", tab: "people" },
  { id: "solution", label: "Solution", tab: "chat" },
  { id: "capability", label: "Capability", tab: "calls" },
  { id: "value", label: "Value", tab: "monitor" },
];

/** Quadratic bezier — matches reference arc curve in viewBox 0 0 1000 520. */
function arcPoint(t: number): { x: number; y: number } {
  const p0 = { x: 40, y: 430 };
  const p1 = { x: 500, y: 55 };
  const p2 = { x: 960, y: 430 };
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

export function CommsOrbitalCommandDeck({
  darkMode,
  displayName,
  isConnected,
  mainUserPhotoUrl,
  onMainUserPhotoUpload,
  photoUploading,
  forwardSlots,
  selectedPeerId,
  activeTab,
  onSelectTab,
  onPeerCall,
  onPeerMessage,
  onPeerGroupCall,
  onPeerVideoInvite,
  openHubPeerId,
  onHubPeerChange,
  onEmptySlotClick,
  onHubActivate,
  className = "",
  serviceTitle = "Key Event Assurance Service",
  serviceSubtitle = "— Delivering Network Resilience to Maintain Customer Satisfaction",
  sceneMode = "round-table",
}: {
  darkMode: boolean;
  displayName: string;
  isConnected: boolean;
  mainUserPhotoUrl: string | null;
  onMainUserPhotoUpload: (file: File) => void;
  photoUploading: boolean;
  forwardSlots: ForwardOrbitSlot[];
  selectedPeerId?: string | null;
  activeTab: OrbitalMainTab;
  onSelectTab: (t: OrbitalMainTab) => void;
  onPeerCall: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string, slotIndex: number) => void;
  onPeerGroupCall?: (peerId: string, peerName: string, slotIndex: number) => void;
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
  openHubPeerId?: string | null;
  onHubPeerChange?: (peerId: string | null) => void;
  onEmptySlotClick?: (slotIndex: number, refLabel: string) => void;
  onHubActivate?: () => void;
  className?: string;
  serviceTitle?: string;
  serviceSubtitle?: string;
  /** round-table = functional presence deck; keas = full assurance arc overlay */
  sceneMode?: "round-table" | "keas";
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const orbitPhaseRef = useRef(0);
  const uid = useId();
  const sid = uid.replace(/:/g, "");
  const arcGradId = `keas-arc-${sid}`;
  const arcGlowId = `keas-glow-${sid}`;
  const [activePill, setActivePill] = useState<ValuePill | null>(null);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onMainUserPhotoUpload(f);
      e.target.value = "";
    },
    [onMainUserPhotoUpload],
  );

  const activePhase = useMemo((): PhaseIdx | null => {
    const m = ASSURANCE_ARC.find((x) => x.tab === activeTab);
    return m ? m.phase : null;
  }, [activeTab]);

  const modulePositions = useMemo(
    () => ASSURANCE_ARC.map((mod) => ({ mod, ...arcPoint(mod.arcT) })),
    [],
  );

  const isRoundTable = sceneMode === "round-table";
  const textTitle = darkMode ? "text-white" : "text-slate-900";

  return (
    <section
      className={`relative flex h-full min-h-0 flex-1 flex-col bg-transparent ${className}`}
      aria-label="Key Event Assurance Service"
    >
      <input
        ref={fileRef}
        type="file"
        accept={COMMS_AVATAR_FILE_ACCEPT}
        className="sr-only"
        onChange={onFileChange}
      />

      {/* Top header */}
      <div className="relative z-[6] mb-1 flex shrink-0 flex-wrap items-start justify-between gap-2 px-1 sm:px-2">
        <div className="min-w-0 max-w-[min(100%,42rem)]">
          <h2
            className={`text-lg font-extrabold leading-tight sm:text-2xl md:text-[1.65rem] ${textTitle}`}
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              textShadow: darkMode ? "0 0 32px rgba(0,229,255,0.3)" : undefined,
            }}
          >
            {isRoundTable ? "Presence round table" : serviceTitle}
          </h2>
          <p className={`mt-1 text-[10px] font-light sm:text-xs ${darkMode ? "text-white/80" : "text-slate-600"}`}>
            {isRoundTable
              ? "You are always seated. When a user comes online, their avatar pops into an open seat — tap for voice, video, or chat."
              : serviceSubtitle}
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
            isConnected
              ? "border-emerald-400/40 bg-emerald-950/45 text-emerald-200"
              : "border-white/15 text-white/45"
          }`}
        >
          {isConnected ? "Linked" : "Sync"}
        </span>
      </div>

      {/* Unified KEAS canvas — arc overlay + globe scene */}
      <div
        className="relative mx-auto min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-cyan-500/15"
        style={{ minHeight: "min(52dvh, 580px)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-multiply sm:opacity-[0.08]"
          style={{ backgroundImage: "url(/comms/round-table-reference.png)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isRoundTable
              ? "linear-gradient(180deg, rgba(244,246,248,0.15) 0%, rgba(232,236,240,0.55) 100%)"
              : darkMode
                ? `radial-gradient(ellipse 80% 50% at 50% 42%, rgba(0,229,255,0.12), transparent 55%),
                   linear-gradient(180deg, rgba(2,8,22,0.5) 0%, rgba(0,6,14,0.92) 100%)`
                : "linear-gradient(180deg, #e0f2fe 0%, #f8fafc 100%)",
          }}
          aria-hidden
        />

        {!isRoundTable ? (
        <>
        {/* Assurance arc + modules (SVG) */}
        <svg
          className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
          viewBox="0 0 1000 520"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden={false}
        >
          <defs>
            <linearGradient id={arcGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={CYAN} stopOpacity="0.2" />
              <stop offset="50%" stopColor={CYAN} stopOpacity="1" />
              <stop offset="100%" stopColor={CYAN} stopOpacity="0.2" />
            </linearGradient>
            <filter id={arcGlowId}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M 40 430 Q 500 55 960 430"
            fill="none"
            stroke={`url(#${arcGradId})`}
            strokeWidth="2.5"
            filter={`url(#${arcGlowId})`}
          />

          {/* Phase markers on arc */}
          {[
            { t: 0.28, label: "Before Event", phase: 0 as PhaseIdx },
            { t: 0.58, label: "In Event", phase: 1 as PhaseIdx },
            { t: 0.82, label: "After Event", phase: 2 as PhaseIdx },
          ].map(({ t, label, phase }) => {
            const p = arcPoint(t);
            const live = activePhase === phase;
            return (
              <g key={label}>
                <circle cx={p.x} cy={p.y} r={live ? 5 : 3} fill={live ? CYAN : `${CYAN}88`} />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  fill={live ? CYAN : "rgba(255,255,255,0.55)"}
                  fontSize="14"
                  fontFamily="'Space Grotesk', system-ui, sans-serif"
                  fontWeight={live ? 700 : 500}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Module buttons positioned on arc */}
        <div className="pointer-events-none absolute inset-0 z-[5]">
          {modulePositions.map(({ mod, x, y }) => {
            const active = activeTab === mod.tab;
            const phaseHot = activePhase === mod.phase;
            const leftPct = (x / 1000) * 100;
            const topPct = (y / 520) * 100;
            return (
              <button
                key={mod.id}
                type="button"
                title={mod.label}
                onClick={() => onSelectTab(mod.tab)}
                className={`pointer-events-auto absolute flex w-[min(11vw,88px)] min-w-[48px] max-w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1 backdrop-blur-md transition-all duration-200 sm:w-[92px] sm:rounded-xl sm:py-1.5 ${
                  active
                    ? "z-[3] scale-105 border-cyan-300/75 bg-cyan-500/20 shadow-[0_0_28px_rgba(0,229,255,0.55)] ring-1 ring-cyan-300/50"
                    : "z-[2] border-cyan-500/25 bg-[#021018]/75 hover:scale-[1.03] hover:border-cyan-400/45 hover:bg-cyan-950/50"
                }`}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <span
                  className={`rounded-md p-1 ${phaseHot && active ? "bg-cyan-400/20 shadow-[0_0_12px_rgba(0,229,255,0.5)]" : "bg-black/25"}`}
                >
                  <mod.Icon
                    className={`mx-auto h-4 w-4 sm:h-[18px] sm:w-[18px] ${active ? "text-white" : "text-cyan-100/85"}`}
                    strokeWidth={active ? 2 : 1.65}
                    style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.6))" }}
                    aria-hidden
                  />
                </span>
                <span className="line-clamp-3 w-full px-0.5 text-center text-[5px] leading-[1.1] text-white/90 sm:text-[6px] md:text-[7px]">
                  {mod.label}
                </span>
              </button>
            );
          })}
        </div>
        </>
        ) : null}

        {/* 3D round table */}
        <div className={`absolute inset-0 z-[2] ${isRoundTable ? "pt-[4%]" : "pt-[18%] sm:pt-[16%]"}`}>
          <CommsOrbitalScene3D
            orbitPhaseRef={orbitPhaseRef}
            darkMode={darkMode}
            forwardSlots={forwardSlots}
            mainUserPhotoUrl={mainUserPhotoUrl}
            displayName={displayName}
            photoUploading={photoUploading}
            selectedPeerId={selectedPeerId}
            openHubPeerId={openHubPeerId}
            onHubPeerChange={onHubPeerChange}
            onPhotoClick={() => fileRef.current?.click()}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
            onPeerGroupCall={onPeerGroupCall}
            onPeerVideoInvite={onPeerVideoInvite}
            onEmptySlotClick={onEmptySlotClick}
            onHubActivate={onHubActivate}
            environment={isRoundTable ? "studio" : "nexus"}
          />
        </div>

        {!isRoundTable ? (
        <>
        {/* Perspective grid echo (CSS) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[38%] opacity-[0.12]"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,229,255,0.35) 1px, transparent 1px),
              linear-gradient(180deg, rgba(0,229,255,0.12) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            transform: "perspective(420px) rotateX(58deg)",
            transformOrigin: "50% 100%",
            maskImage: "linear-gradient(to top, black 20%, transparent 85%)",
          }}
          aria-hidden
        />
        </>
        ) : null}
      </div>

      {/* Bottom actions */}
      <div className="relative z-[6] mt-2 shrink-0 space-y-2 px-1 sm:px-2">
        <p className="rounded-lg border border-cyan-500/20 bg-[#021018]/55 px-2.5 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-300/65 backdrop-blur-sm sm:text-[9px]">
          {isRoundTable
            ? "Walk-in when online · stand up & exit when offline · laptop screens show live status · tap seat label for contact hub"
            : "Tap any online portrait for voice · video · text · group · assurance modules on the arc switch sectors"}
        </p>
        {!isRoundTable ? (
        <div className="flex flex-wrap items-center gap-2">
        {VALUE_PILLS.map(({ id, label, tab }) => {
          const active = activePill === id || activeTab === tab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActivePill(id);
                onSelectTab(tab);
              }}
              className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] backdrop-blur-md transition sm:px-4 sm:text-[10px] ${
                active
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-50 shadow-[0_0_20px_rgba(0,229,255,0.35)]"
                  : "border-cyan-500/20 bg-[#021018]/50 text-cyan-200/60 hover:border-cyan-400/40 hover:text-cyan-100"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-auto hidden truncate font-mono text-[8px] uppercase tracking-wider text-cyan-400/45 lg:inline">
          Round table · {displayName} · GSLC · TAC · GTAC · RSPC · GSPC
        </span>
        </div>
        ) : null}
      </div>
    </section>
  );
}
