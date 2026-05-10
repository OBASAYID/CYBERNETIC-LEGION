/**
 * NEXUS holo-deck — full-viewport communications scene aligned to VR/HUD references:
 * deep space field, horizon glow, perspective grid floor, curved glass content carousel.
 * No sidebar + document split; one tailored spatial interface.
 */

import { Link } from "wouter";
import { ArrowLeft, Hexagon, Moon, Satellite, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { CommsMeshLinkHeaderBadge } from "./CommsP2PUnifiedUI";

const CYAN = "#00e5ff";
const NAVY = "#000b1a";

export function CommsNexusWorkspace({
  darkMode,
  onToggleDarkMode,
  displayName,
  isConnected,
  onlineUsersLength,
  handoff,
  commandDeck,
  moduleLabel,
  moduleSublabel,
  socialChannelTab,
  sceneTitle,
  sceneSubtitle,
  children,
}: {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  displayName: string;
  isConnected: boolean;
  onlineUsersLength: number;
  handoff: ReactNode;
  commandDeck: ReactNode;
  moduleLabel: string;
  moduleSublabel?: string;
  socialChannelTab: boolean;
  /** When set, replaces default NEXUS header (reference: Key Event Assurance). */
  sceneTitle?: string;
  sceneSubtitle?: string;
  children: ReactNode;
}) {
  const isDark = darkMode;

  return (
    <div
      className={`relative flex min-h-screen min-h-0 flex-1 flex-col overflow-hidden ${
        isDark ? "text-white" : "text-slate-900"
      }`}
      style={{
        background: isDark
          ? `radial-gradient(ellipse 85% 55% at 50% -15%, rgba(0,229,255,0.14), transparent 52%),
             radial-gradient(ellipse 70% 45% at 80% 110%, rgba(139,92,246,0.12), transparent 48%),
             linear-gradient(180deg, #020617 0%, ${NAVY} 38%, #020617 100%)`
          : "linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 45%, #f8fafc 100%)",
      }}
    >
      {/* Horizon arc — reference: glowing cyan band */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-[14%] z-0 h-px sm:top-[12%]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${CYAN}55 35%, ${CYAN} 50%, ${CYAN}55 65%, transparent 100%)`,
          boxShadow: isDark ? `0 0 40px 2px rgba(0,229,255,0.35)` : "0 0 24px 1px rgba(14,165,233,0.25)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[13%] z-0 h-[min(45vh,420px)] w-[min(140vw,1400px)] -translate-x-1/2 rounded-[50%] opacity-[0.11] sm:top-[11%]"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${CYAN} 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Perspective grid floor */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[28%] z-0 opacity-[0.14] sm:top-[26%]"
        style={{
          backgroundImage: isDark
            ? `linear-gradient(90deg, rgba(0,229,255,0.4) 1px, transparent 1px),
               linear-gradient(180deg, rgba(0,229,255,0.15) 1px, transparent 1px)`
            : `linear-gradient(90deg, rgba(14,165,233,0.35) 1px, transparent 1px),
               linear-gradient(180deg, rgba(14,165,233,0.12) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          transform: "perspective(500px) rotateX(58deg) scale(1.35)",
          transformOrigin: "50% 100%",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 70%, transparent 100%)",
        }}
        aria-hidden
      />

      {/* Scanline shimmer */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} 2px, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} 3px)`,
        }}
        aria-hidden
      />

      {/* Your uploaded reference images — environment echo (very low weight; procedural scene stays primary). */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.09] mix-blend-screen sm:opacity-[0.1]"
        style={{
          backgroundImage: "url(/comms/ref-global-service-center.png)",
          maskImage: "radial-gradient(ellipse 78% 68% at 50% 32%, black 0%, transparent 74%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-top bg-no-repeat opacity-[0.06] mix-blend-soft-light sm:opacity-[0.08]"
        style={{
          backgroundImage: "url(/comms/ref-vr-hud.png)",
          maskImage: "radial-gradient(ellipse 82% 62% at 50% 22%, black 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-contain bg-top bg-no-repeat opacity-[0.07] mix-blend-screen sm:opacity-[0.09]"
        style={{
          backgroundImage: "url(/comms/ref-key-event-assurance.png)",
          maskImage: "radial-gradient(ellipse 88% 70% at 50% 28%, black 0%, transparent 76%)",
        }}
        aria-hidden
      />

      <div className="relative z-[2] mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-2 pb-3 pt-2 sm:px-4 sm:pb-5 sm:pt-3">
        {handoff}

        {/* Micro HUD bar — minimal chrome */}
        <header
          className={`mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border px-2.5 py-2 backdrop-blur-xl sm:px-3 ${
            isDark
              ? "border-cyan-500/25 bg-black/35 shadow-[0_0_40px_-12px_rgba(0,229,255,0.25)]"
              : "border-sky-300/40 bg-white/75 shadow-md"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/">
              <button
                type="button"
                className={`rounded-xl border p-2 transition ${
                  isDark
                    ? "border-cyan-500/30 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/50"
                    : "border-sky-300 bg-white text-slate-800 hover:border-sky-500"
                }`}
                aria-label="Back to command center"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </Link>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-9 sm:w-9 ${
                isDark
                  ? "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_16px_rgba(0,229,255,0.25)]"
                  : "border-sky-400/50 bg-sky-100"
              }`}
            >
              <Hexagon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDark ? "text-cyan-300" : "text-sky-600"}`} />
            </div>
            <div className="min-w-0">
              <p
                className={`flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.32em] sm:text-[9px] ${
                  isDark ? "text-cyan-300/55" : "text-sky-700/75"
                }`}
              >
                <Satellite className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
                {sceneTitle ? "Assurance layer · NEXUS" : "Holo-link · NTN mesh"}
              </p>
              <h1
                className={`truncate text-sm font-bold tracking-tight sm:text-base ${
                  isDark
                    ? "bg-gradient-to-r from-cyan-200 via-white to-cyan-100/90 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-sky-800 to-slate-800 bg-clip-text text-transparent"
                }`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                {sceneTitle ?? "NEXUS · FIELD HUD"}
              </h1>
              {sceneSubtitle ? (
                <p className={`mt-0.5 line-clamp-2 text-[9px] leading-snug sm:text-[10px] ${isDark ? "text-white/50" : "text-slate-600"}`}>
                  {sceneSubtitle}
                </p>
              ) : null}
              <CommsMeshLinkHeaderBadge
                presenceLinePrefix={`${isConnected ? "Linked" : "Sync…"} · ${onlineUsersLength} nodes`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`rounded-xl border p-2 transition ${
                isDark
                  ? "border-white/10 bg-white/5 text-cyan-200/80 hover:border-cyan-400/40"
                  : "border-slate-300 bg-white text-slate-600 hover:border-sky-400"
              }`}
              title={isDark ? "Light field" : "Dark field"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div
              className={`hidden max-w-[9rem] items-center gap-2 rounded-xl border px-2 py-1.5 font-mono text-[9px] sm:flex sm:max-w-[11rem] sm:text-[10px] ${
                isDark
                  ? "border-emerald-500/35 bg-emerald-950/40 text-emerald-200/90"
                  : "border-emerald-600/30 bg-emerald-50 text-emerald-900"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isConnected ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-500"
                }`}
              />
              <span className="truncate">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Orbital constellation — full width, scene-integrated */}
        <div className="relative z-[3] shrink-0">{commandDeck}</div>

        {/* Curved glass carousel — primary content surface (reference panels) */}
        <div
          className="relative z-[3] mt-2 flex min-h-0 flex-1 flex-col sm:mt-3"
          style={{ perspective: "1400px" }}
        >
          <div
            className={`nexus-holo-carousel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[1.75rem] border-2 sm:rounded-t-[2.5rem] ${
              isDark
                ? "border-cyan-400/50 bg-gradient-to-b from-cyan-950/30 via-slate-950/75 to-[#000b1a]/95 shadow-[0_0_90px_-18px_rgba(0,229,255,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "border-sky-400/55 bg-gradient-to-b from-white/90 via-sky-50/80 to-slate-100/95 shadow-[0_0_50px_-12px_rgba(14,165,233,0.35)]"
            }`}
            style={{
              transform: "rotateX(4deg)",
              transformOrigin: "50% 0%",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Inner glass grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.11]"
              style={{
                backgroundImage: `linear-gradient(${CYAN}22 1px, transparent 1px), linear-gradient(90deg, ${CYAN}18 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
                borderRadius: "inherit",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: socialChannelTab
                  ? "linear-gradient(90deg, transparent, rgba(167,139,250,0.65), rgba(0,229,255,0.55), transparent)"
                  : `linear-gradient(90deg, transparent, ${CYAN}88, transparent)`,
              }}
              aria-hidden
            />

            {/* Sector telemetry strip */}
            <div
              className={`relative flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 sm:px-5 sm:py-2.5 ${
                isDark
                  ? "border-cyan-500/25 bg-black/25"
                  : "border-sky-200/60 bg-white/40"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`font-mono text-[8px] uppercase tracking-[0.42em] sm:text-[9px] ${
                    isDark ? "text-cyan-400/65" : "text-sky-600/80"
                  }`}
                >
                  {socialChannelTab ? "Social band" : "Operations band"} · active layer
                </p>
                <p
                  className={`truncate text-sm font-semibold sm:text-base ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {moduleLabel}
                </p>
                {moduleSublabel ? (
                  <p className={`truncate text-[10px] sm:text-[11px] ${isDark ? "text-white/45" : "text-slate-600"}`}>
                    {moduleSublabel}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className={`h-8 w-px bg-gradient-to-b from-transparent to-transparent ${
                    socialChannelTab ? "via-violet-400/55" : "via-cyan-400/50"
                  }`}
                  aria-hidden
                />
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-cyan-400/70">Signal</span>
                  <div className="flex h-1.5 gap-0.5">
                    {[0.9, 0.7, 0.5, 0.85, 0.6].map((a, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full ${socialChannelTab ? "bg-violet-400/85" : "bg-cyan-400/80"}`}
                        style={{ height: `${4 + a * 6}px`, opacity: a }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .nexus-holo-carousel {
            transform: rotateX(0deg) !important;
          }
        }
      `}</style>
    </div>
  );
}
