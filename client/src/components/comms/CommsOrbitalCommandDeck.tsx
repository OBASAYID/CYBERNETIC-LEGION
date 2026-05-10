/**
 * NEXUS orbital command deck — spatial comms layout: central operator sphere,
 * wired peer nodes, rear module arc + AI command console.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
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
  Video,
} from "lucide-react";
import { CommsOrbitalPeerFocusPanel } from "./CommsOrbitalPeerFocusPanel";
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

const REAR_MODULES: Array<{
  id: string;
  tab: OrbitalMainTab;
  label: string;
  short: string;
  Icon: typeof MessageSquare;
  /** Rear-arc position as % of width (0–100), left to right */
  anchorX: number;
  ai?: boolean;
}> = [
  { id: "chat", tab: "chat", label: "Secure channel", short: "CHAT", Icon: MessageSquare, anchorX: 8 },
  { id: "pshare", tab: "pshare", label: "Global timeline", short: "FEED", Icon: Share2, anchorX: 22 },
  { id: "calls", tab: "calls", label: "Voice & video mesh", short: "CALL", Icon: Phone, anchorX: 36 },
  { id: "people", tab: "people", label: "Discovery & roster", short: "NET", Icon: Users, anchorX: 50 },
  { id: "streams", tab: "streams", label: "Live streams", short: "LIVE", Icon: Radio, anchorX: 64 },
  { id: "ai", tab: "monitor", label: "AI command console · intelligence", short: "AI", Icon: Brain, anchorX: 78, ai: true },
  { id: "monitor", tab: "monitor", label: "Full intelligence & admin surface", short: "INTEL", Icon: Activity, anchorX: 92 },
];

/** Reference layout: temporal arc (before / in / after event). */
const PHASE_BANDS: Array<{ label: string; hint: string; moduleIds: string[] }> = [
  { label: "Before event", hint: "Plan · align · async", moduleIds: ["chat", "pshare"] },
  { label: "In event", hint: "Live mesh · streams", moduleIds: ["calls", "streams"] },
  { label: "After event", hint: "Roster · AI command · intel", moduleIds: ["people", "ai", "monitor"] },
];

const MODULE_BY_ID = Object.fromEntries(REAR_MODULES.map((m) => [m.id, m])) as Record<
  string,
  (typeof REAR_MODULES)[number]
>;

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
  onPeerHubSendText,
  onPeerHubSendMedia,
  onPeerHubSendVoice,
  onPeerOpenGroupHub,
  /** Secondary systems (e.g. unified mesh strip) wired below the constellation */
  footerSlot,
  /** Reference-style story rail — quick jumps fused to main tabs. */
  storyRail,
  className = "",
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
  /** Video-session invite (e.g. chat ping); falls back to video call if omitted */
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
  onPeerHubSendText?: (userId: string, text: string) => void;
  onPeerHubSendMedia?: (userId: string, file: File, caption: string) => void;
  onPeerHubSendVoice?: (userId: string, blob: Blob, duration: number) => void;
  onPeerOpenGroupHub?: () => void;
  footerSlot?: ReactNode;
  storyRail?: Array<{ id: string; label: string; tab: OrbitalMainTab }>;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [focusedPeerId, setFocusedPeerId] = useState<string | null>(null);
  const uid = useId();
  const gradId = `orbital-wire-${uid}`;
  const glowId = `orbital-glow-${uid}`;

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onMainUserPhotoUpload(f);
      e.target.value = "";
    },
    [onMainUserPhotoUpload]
  );

  const visiblePeers = peers.slice(0, 8);
  const overflow = peers.length - visiblePeers.length;

  const activePhaseIdx = useMemo(() => {
    const idx = PHASE_BANDS.findIndex((b) =>
      b.moduleIds.some((mid) => MODULE_BY_ID[mid]?.tab === activeTab),
    );
    return idx;
  }, [activeTab]);

  const focusedPeer = useMemo(
    () => (focusedPeerId ? peers.find((p) => p.id === focusedPeerId) ?? null : null),
    [peers, focusedPeerId]
  );

  useEffect(() => {
    if (focusedPeerId && !peers.some((p) => p.id === focusedPeerId)) {
      setFocusedPeerId(null);
    }
  }, [peers, focusedPeerId]);

  useEffect(() => {
    setFocusedPeerId(null);
  }, [activeTab]);

  /* Scene-integrated: floats in the holo field, not a separate “app card”. */
  const shell = darkMode
    ? "border-cyan-400/35 bg-black/30 shadow-[0_0_70px_-28px_rgba(0,229,255,0.38),inset_0_1px_0_rgba(0,229,255,0.12)]"
    : "border-sky-400/40 bg-white/45 shadow-[0_0_36px_-14px_rgba(14,165,233,0.28)]";

  const textMuted = darkMode ? "text-white/45" : "text-slate-600";
  const textBright = darkMode ? "text-cyan-100/90" : "text-sky-900";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${shell} backdrop-blur-2xl ${className}`}
      aria-label="Nexus orbital command deck"
    >
      {/* Local depth cue — lighter than full scene grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, ${CYAN}22 1px, transparent 1px),
            linear-gradient(${DEEP_NAVY} 0%, transparent 80%),
            linear-gradient(180deg, transparent 0%, ${CYAN}06 100%)
          `,
          backgroundSize: "40px 40px, 100% 100%, 100% 100%",
          transform: "perspective(420px) rotateX(52deg) scale(1.08)",
          transformOrigin: "50% 100%",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 40%, black 88%, transparent 100%)",
        }}
      />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.55]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.05" />
            <stop offset="40%" stopColor={CYAN} stopOpacity="0.65" />
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
        {/* Horizon */}
        <ellipse cx="50" cy="28" rx="48" ry="6" fill="none" stroke={`${CYAN}18`} strokeWidth="0.15" />
        {/* Trunk lines — one wire per reference phase band */}
        {[17, 50, 83].map((x) => (
          <line
            key={x}
            x1="50"
            y1="56"
            x2={x}
            y2="22"
            stroke={`url(#${gradId})`}
            strokeWidth="0.12"
            filter={`url(#${glowId})`}
          />
        ))}
        {/* Fan to peer shelf */}
        <path
          d="M 50 56 L 22 78 M 50 56 L 36 80 M 50 56 L 50 82 M 50 56 L 64 80 M 50 56 L 78 78"
          fill="none"
          stroke={`${CYAN}33`}
          strokeWidth="0.1"
        />
      </svg>

      <div className="relative z-[1] flex flex-col items-center px-2 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4">
        <div className="mb-1 flex w-full items-center justify-between gap-2">
          <p
            className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.35em] sm:text-[10px] ${textMuted}`}
          >
            <Sparkles className="h-3 w-3 text-cyan-400" aria-hidden />
            Orbital link plane
          </p>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
              isConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300/90"
                : "border-violet-400/40 bg-violet-500/12 text-violet-200/90 shadow-[0_0_12px_-2px_rgba(167,139,250,0.35)]"
            }`}
          >
            {isConnected ? "Mesh sync" : "Handshaking"}
          </span>
        </div>

        {/* Rear arc — reference: Before / In / After event bands with glass tiles */}
        <div className="relative z-0 mb-2 w-full max-w-4xl px-1 sm:mb-3 sm:px-2">
          <div
            className="grid w-full grid-cols-3 gap-1.5 sm:gap-2"
            style={{ transform: "scale(0.96)", transformOrigin: "50% 100%" }}
          >
            {PHASE_BANDS.map((band, bandIdx) => {
              const phaseLive = activePhaseIdx === bandIdx;
              return (
              <div
                key={band.label}
                className={`flex min-w-0 flex-col gap-1 rounded-t-xl border px-1 pb-1.5 pt-1.5 sm:px-1.5 sm:pt-2 ${
                  darkMode
                    ? "border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 to-black/20"
                    : "border-sky-400/40 bg-white/50"
                } ${
                  phaseLive
                    ? darkMode
                      ? "ring-1 ring-cyan-400/50 shadow-[0_0_32px_-10px_rgba(0,229,255,0.35)]"
                      : "ring-2 ring-sky-400/55 shadow-md"
                    : ""
                }`}
              >
                <div className="border-b border-cyan-400/25 pb-1 text-center">
                  <p className="font-mono text-[7px] font-semibold uppercase tracking-[0.18em] text-cyan-300/95 sm:text-[8px]">
                    {band.label}
                  </p>
                  <p className={`text-[6px] sm:text-[7px] ${textMuted}`}>{band.hint}</p>
                </div>
                <div className="flex min-h-[3.25rem] flex-wrap items-stretch justify-center gap-1 sm:min-h-[3.5rem]">
                  {band.moduleIds.map((mid) => {
                    const mod = MODULE_BY_ID[mid];
                    if (!mod) return null;
                    const active = activeTab === mod.tab;
                    const isAi = mod.ai === true;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        title={mod.label}
                        onClick={() => onSelectTab(mod.tab)}
                        className={`group relative flex min-w-0 flex-1 basis-[40%] flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1 transition-all sm:px-1 sm:py-1.5 ${
                          isAi
                            ? active
                              ? "border-violet-400/75 bg-violet-500/30 shadow-[0_0_18px_-3px_rgba(167,139,250,0.65)]"
                              : "border-violet-500/40 bg-violet-950/35 hover:border-violet-400/55"
                            : active
                              ? "border-cyan-400/65 bg-cyan-500/20 shadow-[0_0_16px_-4px_rgba(0,229,255,0.45)]"
                              : "border-white/10 bg-slate-950/35 hover:border-cyan-400/40"
                        } ${!darkMode && !isAi ? "bg-white/75 hover:bg-white/90" : ""} ${!darkMode && isAi ? "bg-violet-100/85" : ""}`}
                      >
                        <mod.Icon
                          className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${
                            isAi ? "text-violet-200" : active ? "text-cyan-200" : "text-cyan-400/75"
                          }`}
                          aria-hidden
                        />
                        <span
                          className={`max-w-[3rem] truncate font-mono text-[6px] font-bold uppercase leading-none tracking-tight sm:max-w-[4rem] sm:text-[7px] ${
                            isAi ? "text-violet-100/95" : textBright
                          }`}
                        >
                          {mod.short}
                        </span>
                        {isAi ? (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600/95 px-0.5 py-px font-mono text-[5px] uppercase tracking-wider text-white shadow-md sm:text-[6px]">
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

        {/* Central operator sphere + peer constellation */}
        <div className="relative z-[2] flex w-full flex-col items-center">
          <div className="relative flex flex-col items-center">
            {/* Outer rings */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ width: 200, height: 200, marginTop: -20 }}
            >
              <div
                className="h-[118%] w-[118%] rounded-full border border-cyan-400/20"
                style={{ animation: "orbital-spin 28s linear infinite" }}
              />
              <div
                className="absolute h-[132%] w-[132%] rounded-full border border-dashed border-cyan-300/15"
                style={{ animation: "orbital-spin-reverse 42s linear infinite" }}
              />
            </div>

            <div className="relative mt-2 flex flex-col items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onFileChange}
              />

              <div className="relative flex items-center justify-center">
                {/* Geodesic lattice (reference hologram cage) */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
                  <CommsGeodesicSphere size={172} className="opacity-[0.92]" />
                </div>
                {/* Glow core */}
                <div
                  className="absolute left-1/2 top-1/2 z-[1] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400/25 via-violet-500/15 to-transparent blur-2xl sm:h-44 sm:w-44"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoUploading}
                  className="group relative z-[2] flex h-28 w-28 cursor-pointer items-center justify-center rounded-full border-2 border-cyan-400/55 bg-gradient-to-b from-slate-900/90 to-[#000b1a] shadow-[0_0_40px_-8px_rgba(0,229,255,0.55),inset_0_0_20px_rgba(0,229,255,0.12)] transition hover:border-cyan-300/90 hover:shadow-[0_0_52px_-6px_rgba(0,229,255,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:opacity-60 sm:h-36 sm:w-36"
                  aria-label="Upload your photo for the command sphere"
                >
                  <div className="absolute inset-[5px] z-[1] overflow-hidden rounded-full border border-white/15 bg-slate-950/80">
                    {mainUserPhotoUrl ? (
                      <img
                        src={mainUserPhotoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-cyan-950/80 to-slate-950">
                        <span className="text-2xl font-bold text-cyan-200/90 sm:text-3xl">
                          {displayName.charAt(0).toUpperCase() || "?"}
                        </span>
                        <Camera className="h-4 w-4 text-cyan-400/60" aria-hidden />
                      </div>
                    )}
                  </div>
                  <span
                    className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-500/40 bg-slate-950/90 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-cyan-100/90 opacity-0 transition group-hover:opacity-100 sm:text-[9px]"
                  >
                    {photoUploading ? "Uploading…" : "Set photo"}
                  </span>
                </button>
              </div>

              <p
                className={`mt-2 max-w-[16rem] text-center font-mono text-[10px] uppercase tracking-[0.28em] sm:max-w-none sm:text-[11px] ${textBright}`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                {displayName}
              </p>
              <p className={`mt-0.5 text-center text-[9px] sm:text-[10px] ${textMuted}`}>Primary operator · global service node</p>
            </div>
          </div>

          {/* Peer nodes — forward arc */}
          <div className="relative mt-5 w-full max-w-xl px-2">
            <p className={`mb-2 text-center font-mono text-[9px] uppercase tracking-[0.25em] ${textMuted}`}>
              Linked presence {visiblePeers.length > 0 ? `· ${visiblePeers.length} in view` : ""}
              {overflow > 0 ? ` · +${overflow} more in People` : ""}
              {visiblePeers.length > 0 ? (
                <span className={`mt-1 block text-[8px] normal-case tracking-normal ${textMuted}`}>
                  Tap an avatar to open the link HUD · voice · video · text · invite
                </span>
              ) : null}
            </p>
            {focusedPeer ? (
              <CommsOrbitalPeerFocusPanel
                peer={focusedPeer}
                darkMode={darkMode}
                textDisabled={!onPeerHubSendText && !onPeerMessage}
                onClose={() => setFocusedPeerId(null)}
                onVoice={() => onPeerCall(focusedPeer.id, focusedPeer.displayName, "audio")}
                onVideo={() => onPeerCall(focusedPeer.id, focusedPeer.displayName, "video")}
                onOpenFullChat={() => onPeerMessage?.(focusedPeer.id, focusedPeer.displayName)}
                onInvite={() => {
                  if (onPeerVideoInvite) {
                    onPeerVideoInvite(focusedPeer.id, focusedPeer.displayName);
                  } else {
                    onPeerCall(focusedPeer.id, focusedPeer.displayName, "video");
                  }
                }}
                onSendText={onPeerHubSendText}
                onSendMedia={onPeerHubSendMedia}
                onSendVoice={onPeerHubSendVoice}
                onOpenGroupHub={onPeerOpenGroupHub}
              />
            ) : null}
            {visiblePeers.length === 0 ? (
              <div
                className={`rounded-xl border border-dashed py-6 text-center text-[11px] ${
                  darkMode ? "border-white/15 bg-slate-950/35" : "border-sky-300/40 bg-white/60"
                } ${textMuted}`}
              >
                No other nodes online — open <strong className={darkMode ? "text-cyan-300/80" : "text-sky-700"}>NET</strong>{" "}
                to discover contacts.
              </div>
            ) : (
              <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
                {visiblePeers.map((p) => (
                  <div key={p.id} className="group relative flex flex-col items-center">
                    <div className="absolute -top-7 left-1/2 hidden h-px w-12 -translate-x-1/2 rotate-[-52deg] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent sm:block" />
                    <button
                      type="button"
                      title={`Link HUD · ${p.displayName}`}
                      onClick={() => setFocusedPeerId((cur) => (cur === p.id ? null : p.id))}
                      className={`relative h-12 w-12 overflow-hidden rounded-full border shadow-[0_0_18px_-4px_rgba(0,229,255,0.35)] outline-none transition hover:border-cyan-300/70 hover:shadow-[0_0_26px_-2px_rgba(0,229,255,0.5)] focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:h-14 sm:w-14 ${
                        focusedPeerId === p.id
                          ? darkMode
                            ? "ring-2 ring-cyan-300/90 ring-offset-2 ring-offset-[#000b1a]/90"
                            : "ring-2 ring-sky-500/85 ring-offset-2 ring-offset-white"
                          : ""
                      } ${
                        darkMode
                          ? "border-cyan-400/45 bg-slate-900/90 ring-1 ring-cyan-400/20"
                          : "border-sky-400/55 bg-white ring-1 ring-sky-200/60"
                      }`}
                      aria-pressed={focusedPeerId === p.id}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-800/50 to-slate-900 text-sm font-semibold text-white">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {p.inCall ? (
                        <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.85)]" />
                      ) : (
                        <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      )}
                    </button>
                    <span
                      className={`mt-1 max-w-[4.5rem] truncate text-center font-mono text-[8px] uppercase tracking-wide sm:max-w-[6rem] sm:text-[9px] ${
                        darkMode ? "text-cyan-100/80" : "text-sky-900/90"
                      }`}
                    >
                      {p.displayName}
                    </span>
                    <div className="mt-1 flex gap-1 opacity-90 transition group-hover:opacity-100">
                      <button
                        type="button"
                        title="Voice"
                        disabled={p.inCall}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPeerCall(p.id, p.displayName, "audio");
                        }}
                        className="rounded-md border border-emerald-500/35 bg-emerald-950/50 p-1 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40"
                      >
                        <Phone className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Video"
                        disabled={p.inCall}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPeerCall(p.id, p.displayName, "video");
                        }}
                        className="rounded-md border border-sky-500/35 bg-sky-950/50 p-1 text-sky-300 hover:bg-sky-900/60 disabled:opacity-40"
                      >
                        <Video className="h-3 w-3" />
                      </button>
                      {onPeerMessage ? (
                        <button
                          type="button"
                          title="Message"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPeerMessage(p.id, p.displayName);
                          }}
                          className="rounded-md border border-violet-500/35 bg-violet-950/50 p-1 text-violet-200 hover:bg-violet-900/50"
                        >
                          <MessageSquare className="h-3 w-3" />
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
            className="relative z-[1] mt-4 flex w-full max-w-[42rem] flex-wrap justify-center gap-2 px-2 sm:gap-2.5"
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
            className={`relative z-[1] mt-3 w-full border-t px-2 pb-3 pt-3 sm:px-4 ${
              darkMode ? "border-cyan-500/20 bg-black/20" : "border-sky-300/30 bg-white/40"
            }`}
          >
            {footerSlot}
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes orbital-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbital-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </section>
  );
}
