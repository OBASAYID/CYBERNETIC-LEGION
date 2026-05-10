/**
 * NEXUS communications module — spatial layout matched to Key Event Assurance reference:
 * background orbital deck (Before / In / After) → central geodesic hub → foreground user arc with tethers.
 */

import { useCallback, useId, useMemo, useRef, type ReactNode } from "react";
import {
  Activity,
  Brain,
  Camera,
  MessageSquare,
  Phone,
  Radio,
  Share2,
  Sparkles,
  Users,
  UsersRound,
  Video,
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

type ArcTile = {
  id: string;
  tab: OrbitalMainTab;
  label: string;
  short: string;
  Icon: typeof MessageSquare;
  ai?: boolean;
};

/** Background arc — module functions (reference: icon grid on elevated deck). */
const BEFORE_TILES: ArcTile[] = [
  { id: "chat", tab: "chat", label: "Secure text · media channel", short: "CHAT", Icon: MessageSquare },
  { id: "pshare", tab: "pshare", label: "Global timeline · feed", short: "FEED", Icon: Share2 },
  { id: "video", tab: "calls", label: "Video mesh", short: "VIDEO", Icon: Video },
  { id: "voice", tab: "calls", label: "Voice mesh", short: "VOICE", Icon: Phone },
  { id: "group", tab: "calls", label: "Group · conference", short: "GROUP", Icon: UsersRound },
  { id: "people", tab: "people", label: "Discovery · roster", short: "NET", Icon: Users },
  { id: "netcheck", tab: "monitor", label: "Readiness · telemetry", short: "CHECK", Icon: Activity },
];

const IN_TILES: ArcTile[] = [
  { id: "streams", tab: "streams", label: "Live streams", short: "LIVE", Icon: Radio },
  { id: "mesh", tab: "calls", label: "Active call mesh", short: "MESH", Icon: Video },
];

const AFTER_TILES: ArcTile[] = [
  { id: "ai", tab: "monitor", label: "AI command console", short: "AI", Icon: Brain, ai: true },
  { id: "intel", tab: "monitor", label: "Intelligence surface", short: "INTEL", Icon: Activity },
];

const PHASE_BANDS: Array<{ label: string; hint: string; tiles: ArcTile[] }> = [
  { label: "Before event", hint: "Plan · align · async", tiles: BEFORE_TILES },
  { label: "In event", hint: "Live mesh · streams", tiles: IN_TILES },
  { label: "After event", hint: "Roster · AI · intel", tiles: AFTER_TILES },
];

function glyphLabel(displayName: string): string {
  const t = displayName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (t.length <= 4) return t || "NODE";
  return t.slice(0, 4);
}

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
  footerSlot,
  storyRail,
  className = "",
  serviceTitle = "Key event assurance service",
  serviceSubtitle = "Mission-grade communications orchestration · NEXUS mesh",
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
  footerSlot?: ReactNode;
  storyRail?: Array<{ id: string; label: string; tab: OrbitalMainTab }>;
  className?: string;
  /** Reference header (top of deck). */
  serviceTitle?: string;
  serviceSubtitle?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const gradId = `orbital-wire-${uid}`;
  const glowId = `orbital-glow-${uid}`;
  const tetherGrad = `tether-${uid}`;

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onMainUserPhotoUpload(f);
      e.target.value = "";
    },
    [onMainUserPhotoUpload]
  );

  const frontPeers = peers.slice(0, 5);
  const overflow = peers.length - frontPeers.length;

  const activePhaseIdx = useMemo(() => {
    const idx = PHASE_BANDS.findIndex((b) => b.tiles.some((t) => t.tab === activeTab));
    return idx >= 0 ? idx : 0;
  }, [activeTab]);

  const shell = darkMode
    ? "border-cyan-400/35 bg-black/30 shadow-[0_0_70px_-28px_rgba(0,229,255,0.38),inset_0_1px_0_rgba(0,229,255,0.12)]"
    : "border-sky-400/40 bg-white/45 shadow-[0_0_36px_-14px_rgba(14,165,233,0.28)]";

  const textMuted = darkMode ? "text-white/45" : "text-slate-600";
  const textBright = darkMode ? "text-cyan-100/90" : "text-sky-900";

  const peerXs = useMemo(() => {
    const n = Math.max(frontPeers.length, 1);
    if (n === 1) return [250];
    const start = 70;
    const end = 430;
    return Array.from({ length: n }, (_, i) => start + (i * (end - start)) / (n - 1));
  }, [frontPeers.length]);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${shell} backdrop-blur-2xl ${className}`}
      aria-label="Key event assurance · NEXUS communications module"
    >
      {/* Perspective floor — reference grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${CYAN}33 1px, transparent 1px),
            linear-gradient(180deg, transparent 0%, ${DEEP_NAVY} 55%, transparent 100%)
          `,
          backgroundSize: "48px 48px, 100% 100%",
          transform: "perspective(520px) rotateX(56deg) scale(1.15)",
          transformOrigin: "50% 100%",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 35%, black 82%, transparent 100%)",
        }}
      />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.06" />
            <stop offset="45%" stopColor={CYAN} stopOpacity="0.55" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={tetherGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.55" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.08" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="50" cy="30" rx="46" ry="7" fill="none" stroke={`${CYAN}20`} strokeWidth="0.12" />
        {[16, 50, 84].map((x) => (
          <line
            key={x}
            x1="50"
            y1="58"
            x2={x}
            y2="26"
            stroke={`url(#${gradId})`}
            strokeWidth="0.11"
            filter={`url(#${glowId})`}
          />
        ))}
      </svg>

      <div
        className="relative z-[1] flex flex-col items-center px-2 pb-3 pt-3 sm:px-4 sm:pb-5 sm:pt-4"
        style={{ perspective: "1400px" }}
      >
        {/* Reference-style service header */}
        <div className="mb-2 w-full max-w-4xl text-center">
          <p
            className={`font-mono text-[8px] font-semibold uppercase tracking-[0.42em] sm:text-[9px] ${textBright}`}
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {serviceTitle}
          </p>
          <p className={`mx-auto mt-0.5 max-w-lg text-[8px] leading-snug sm:text-[9px] ${textMuted}`}>{serviceSubtitle}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                isConnected
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300/90"
                  : "border-violet-400/40 bg-violet-500/12 text-violet-200/90"
              }`}
            >
              {isConnected ? "Mesh linked" : "Handshaking"}
            </span>
            <span className={`font-mono text-[8px] uppercase tracking-widest ${textMuted}`}>
              <Sparkles className="mr-1 inline h-2.5 w-2.5 text-cyan-400" aria-hidden />
              Orbital deck
            </span>
          </div>
        </div>

        {/* BACKGROUND — elevated module arc (Before / In / After) */}
        <div
          className="relative z-[1] w-full max-w-5xl origin-bottom px-0.5 sm:px-1"
          style={{
            transform: "rotateX(38deg)",
            transformOrigin: "50% 100%",
          }}
        >
          <div
            className={`rounded-t-[1.25rem] border-x border-t px-1 pb-2 pt-2 sm:rounded-t-[1.5rem] sm:px-2 sm:pt-3 ${
              darkMode ? "border-cyan-500/35 bg-gradient-to-b from-cyan-950/55 to-black/25" : "border-sky-400/45 bg-white/55"
            }`}
            style={{
              boxShadow: darkMode
                ? "0 -12px 48px -12px rgba(0,229,255,0.12), inset 0 1px 0 rgba(0,229,255,0.15)"
                : "0 -8px 32px -8px rgba(14,165,233,0.12)",
            }}
          >
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {PHASE_BANDS.map((band, bandIdx) => {
                const phaseLive = activePhaseIdx === bandIdx;
                return (
                  <div
                    key={band.label}
                    className={`flex min-w-0 flex-col gap-1 rounded-lg border px-1 py-1.5 sm:px-1.5 sm:py-2 ${
                      darkMode ? "border-cyan-500/25 bg-black/30" : "border-sky-300/50 bg-white/65"
                    } ${
                      phaseLive
                        ? darkMode
                          ? "ring-1 ring-cyan-400/55 shadow-[0_0_28px_-8px_rgba(0,229,255,0.4)]"
                          : "ring-2 ring-sky-400/55 shadow-md"
                        : ""
                    }`}
                  >
                    <div className="border-b border-cyan-400/20 pb-1 text-center">
                      <p className="font-mono text-[6px] font-bold uppercase tracking-[0.2em] text-cyan-300/95 sm:text-[7px]">
                        {band.label}
                      </p>
                      <p className={`text-[5px] sm:text-[6px] ${textMuted}`}>{band.hint}</p>
                    </div>
                    <div
                      className={`flex flex-wrap items-stretch justify-center gap-0.5 sm:gap-1 ${
                        band.tiles.length > 4 ? "" : "min-h-[3rem] sm:min-h-[3.25rem]"
                      }`}
                    >
                      {band.tiles.map((mod) => {
                        const active = activeTab === mod.tab;
                        const isAi = mod.ai === true;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            title={mod.label}
                            onClick={() => onSelectTab(mod.tab)}
                            className={`group relative flex min-w-0 flex-1 basis-[28%] flex-col items-center gap-0.5 rounded-md border px-0.5 py-1 transition-all sm:basis-[26%] sm:px-1 sm:py-1.5 ${
                              isAi
                                ? active
                                  ? "border-violet-400/75 bg-violet-500/30 shadow-[0_0_16px_-3px_rgba(167,139,250,0.55)]"
                                  : darkMode
                                    ? "border-violet-500/35 bg-violet-950/30 hover:border-violet-400/50"
                                    : "border-violet-300/60 bg-violet-50/90 hover:border-violet-400/70"
                                : active
                                  ? "border-cyan-400/65 bg-cyan-500/20 shadow-[0_0_14px_-4px_rgba(0,229,255,0.45)]"
                                  : darkMode
                                    ? "border-white/10 bg-slate-950/40 hover:border-cyan-400/40"
                                    : "border-slate-300/70 bg-white/85 hover:border-sky-400/60"
                            }`}
                          >
                            <mod.Icon
                              className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${
                                isAi ? "text-violet-200" : active ? "text-cyan-200" : "text-cyan-400/80"
                              }`}
                              aria-hidden
                              strokeWidth={1.75}
                            />
                            <span
                              className={`max-w-[3.25rem] truncate text-center font-mono text-[5px] font-bold uppercase leading-none tracking-tight sm:max-w-[4rem] sm:text-[6px] ${
                                isAi ? "text-violet-100/95" : textBright
                              }`}
                            >
                              {mod.short}
                            </span>
                            {isAi ? (
                              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600/95 px-0.5 py-px font-mono text-[4px] uppercase text-white shadow sm:text-[5px]">
                                AI
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MIDDLE — geodesic hub + operator (Global Service Center) */}
        <div className="relative z-[4] -mt-6 flex w-full flex-col items-center sm:-mt-10">
          <div className="relative flex flex-col items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onFileChange}
            />

            <div className="relative flex items-center justify-center pt-1">
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                <CommsGeodesicSphere size={268} className="opacity-[0.92]" />
              </div>
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 sm:hidden">
                <CommsGeodesicSphere size={220} className="opacity-[0.92]" />
              </div>

              <div
                className="absolute left-1/2 top-1/2 z-[1] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400/28 via-violet-500/12 to-transparent blur-2xl sm:h-48 sm:w-48"
                aria-hidden
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                className="group relative z-[2] flex h-[5.5rem] w-[5.5rem] cursor-pointer items-center justify-center rounded-full border-2 border-cyan-400/55 bg-gradient-to-b from-slate-900/92 to-[#000b1a] shadow-[0_0_44px_-6px_rgba(0,229,255,0.55),inset_0_0_22px_rgba(0,229,255,0.12)] transition hover:border-cyan-300/90 hover:shadow-[0_0_56px_-4px_rgba(0,229,255,0.72)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:opacity-60 sm:h-32 sm:w-32"
                aria-label="Upload your photo for the command sphere"
              >
                <div className="absolute inset-[5px] z-[1] overflow-hidden rounded-full border border-white/15 bg-slate-950/80">
                  {mainUserPhotoUrl ? (
                    <img src={mainUserPhotoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-cyan-950/80 to-slate-950">
                      <span className="text-xl font-bold text-cyan-200/90 sm:text-2xl">
                        {displayName.charAt(0).toUpperCase() || "?"}
                      </span>
                      <Camera className="h-3.5 w-3.5 text-cyan-400/60 sm:h-4 sm:w-4" aria-hidden />
                    </div>
                  )}
                </div>
                <span
                  className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-500/40 bg-slate-950/90 px-2 py-0.5 font-mono text-[7px] uppercase tracking-wider text-cyan-100/90 opacity-0 transition group-hover:opacity-100 sm:text-[8px]"
                >
                  {photoUploading ? "Uploading…" : "Set photo"}
                </span>
              </button>
            </div>

            <p
              className={`relative z-[3] mt-3 max-w-[18rem] text-center font-mono text-[9px] uppercase tracking-[0.32em] sm:max-w-none sm:text-[10px] ${textBright}`}
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Global Service Center
            </p>
            <p className={`relative z-[3] mt-0.5 text-center text-[8px] sm:text-[9px] ${textMuted}`}>
              Primary operator · {displayName}
            </p>
          </div>
        </div>

        {/* FOREGROUND — user nodes (reference: front arc) + tethers */}
        <div className="relative z-[5] mt-2 w-full max-w-xl px-1 sm:mt-3">
          <p className={`mb-1 text-center font-mono text-[8px] uppercase tracking-[0.28em] ${textMuted}`}>
            Linked presence {frontPeers.length > 0 ? `· ${frontPeers.length} forward nodes` : ""}
            {overflow > 0 ? ` · +${overflow} in NET` : ""}
          </p>

          <div className="relative min-h-[128px] w-full sm:min-h-[140px]">
            {frontPeers.length > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox="0 0 500 150"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                <defs>
                  <linearGradient id={`${tetherGrad}-line`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CYAN} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={CYAN} stopOpacity="0.06" />
                  </linearGradient>
                </defs>
                {peerXs.map((x) => (
                  <line
                    key={x}
                    x1={250}
                    y1={18}
                    x2={x}
                    y2={118}
                    stroke={`url(#${tetherGrad}-line)`}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            ) : null}

            {frontPeers.length === 0 ? (
              <div
                className={`rounded-xl border border-dashed py-8 text-center text-[10px] ${
                  darkMode ? "border-white/15 bg-slate-950/35" : "border-sky-300/40 bg-white/60"
                } ${textMuted}`}
              >
                No peer nodes in forward arc — open <strong className={darkMode ? "text-cyan-300/80" : "text-sky-700"}>NET</strong>{" "}
                to discover contacts.
              </div>
            ) : (
              <div className="relative flex items-end justify-center gap-2 pt-6 sm:gap-4 sm:pt-8">
                {frontPeers.map((p) => (
                  <div key={p.id} className="group relative flex flex-col items-center">
                    <div
                      title={p.displayName}
                      className={`relative h-11 w-11 overflow-hidden rounded-full border shadow-[0_0_20px_-4px_rgba(0,229,255,0.45)] sm:h-[3.25rem] sm:w-[3.25rem] ${
                        darkMode
                          ? "border-cyan-400/55 bg-slate-900/90 ring-2 ring-cyan-400/25"
                          : "border-sky-400/60 bg-white ring-2 ring-sky-200/50"
                      }`}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-800/50 to-slate-900 text-xs font-semibold text-white sm:text-sm">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {p.inCall ? (
                        <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.85)]" />
                      ) : (
                        <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      )}
                    </div>
                    <span
                      className={`mt-1 max-w-[3.5rem] truncate text-center font-mono text-[7px] font-bold uppercase tracking-wide text-cyan-200/95 sm:max-w-[4.5rem] sm:text-[8px] ${
                        darkMode ? "" : "text-sky-900"
                      }`}
                    >
                      {glyphLabel(p.displayName)}
                    </span>
                    <span
                      className={`max-w-[4rem] truncate text-center font-mono text-[6px] uppercase tracking-tight opacity-80 sm:max-w-[5rem] sm:text-[7px] ${
                        darkMode ? "text-cyan-100/70" : "text-sky-800"
                      }`}
                    >
                      {p.displayName}
                    </span>
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5 opacity-95 sm:gap-1">
                      <button
                        type="button"
                        title="Voice"
                        disabled={p.inCall}
                        onClick={() => onPeerCall(p.id, p.displayName, "audio")}
                        className="rounded border border-emerald-500/35 bg-emerald-950/50 p-0.5 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 sm:p-1"
                      >
                        <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                      <button
                        type="button"
                        title="Video"
                        disabled={p.inCall}
                        onClick={() => onPeerCall(p.id, p.displayName, "video")}
                        className="rounded border border-sky-500/35 bg-sky-950/50 p-0.5 text-sky-300 hover:bg-sky-900/60 disabled:opacity-40 sm:p-1"
                      >
                        <Video className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                      {onPeerMessage ? (
                        <button
                          type="button"
                          title="Message"
                          onClick={() => onPeerMessage(p.id, p.displayName)}
                          className="rounded border border-violet-500/35 bg-violet-950/50 p-0.5 text-violet-200 hover:bg-violet-900/50 sm:p-1"
                        >
                          <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                      ) : null}
                      {onPeerVideoInvite ? (
                        <button
                          type="button"
                          title="Invite to video (via chat)"
                          onClick={() => onPeerVideoInvite(p.id, p.displayName)}
                          className="rounded border border-amber-500/35 bg-amber-950/40 p-0.5 text-amber-200 hover:bg-amber-900/45 sm:p-1"
                        >
                          <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {storyRail && storyRail.length > 0 ? (
          <div
            className="relative z-[6] mt-3 flex w-full max-w-[42rem] flex-wrap justify-center gap-2 px-2 sm:mt-4 sm:gap-2.5"
            role="navigation"
            aria-label="Nexus story rail"
          >
            {storyRail.map((s) => {
              const on = activeTab === s.tab;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectTab(s.tab)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.22em] transition sm:text-[9px] ${
                    on
                      ? darkMode
                        ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-50 shadow-[0_0_20px_-6px_rgba(0,229,255,0.45)]"
                        : "border-sky-500/60 bg-sky-100 text-sky-950 shadow-sm"
                      : darkMode
                        ? "border-white/12 bg-black/30 text-cyan-200/65 hover:border-cyan-400/45 hover:text-cyan-50"
                        : "border-slate-300/90 bg-white/80 text-slate-700 hover:border-sky-400"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {footerSlot ? (
          <div
            className={`relative z-[6] mt-2 w-full border-t px-2 pb-2 pt-2 sm:mt-3 sm:px-4 sm:pb-3 sm:pt-3 ${
              darkMode ? "border-cyan-500/20 bg-black/20" : "border-sky-300/30 bg-white/40"
            }`}
          >
            {footerSlot}
          </div>
        ) : null}
      </div>
    </section>
  );
}
