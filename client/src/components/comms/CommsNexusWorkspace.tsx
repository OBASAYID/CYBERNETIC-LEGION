/**
 * NEXUS — single shell for the communications module (orbital navigation + workspace).
 * Presentation only; business logic stays in CommsPage.
 */

import { Link } from "wouter";
import { ArrowLeft, Hexagon, Moon, Satellite, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { CommsMeshLinkHeaderBadge } from "./CommsP2PUnifiedUI";

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
  children: ReactNode;
}) {
  const bg = darkMode
    ? "bg-[#000b1a] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(0,229,255,0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(99,102,241,0.08),transparent_45%)]"
    : "bg-slate-100 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(14,165,233,0.12),transparent_55%)]";

  const frameBorder = socialChannelTab
    ? "border-amber-500/35 shadow-[0_0_50px_-16px_rgba(251,146,60,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]"
    : "border-cyan-500/25 shadow-[0_0_48px_-18px_rgba(0,229,255,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]";

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col ${bg}`}>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07] sm:opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,229,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black, transparent)",
        }}
        aria-hidden
      />

      <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        {handoff}

        <header
          className={`flex shrink-0 flex-col gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
            darkMode
              ? "border-cyan-500/20 bg-slate-950/55"
              : "border-sky-300/35 bg-white/80"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link href="/">
              <button
                type="button"
                className={`rounded-xl border p-2 transition ${
                  darkMode
                    ? "border-white/12 bg-slate-950/55 text-white/85 hover:border-cyan-500/35"
                    : "border-slate-300/80 bg-white text-slate-800 hover:border-sky-400/60"
                }`}
                aria-label="Back to command center"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${
                darkMode
                  ? "border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,229,255,0.2)]"
                  : "border-sky-400/40 bg-sky-100 shadow-sm"
              }`}
            >
              <Hexagon className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? "text-cyan-300" : "text-sky-600"}`} />
            </div>
            <div className="min-w-0">
              <p
                className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.28em] sm:text-[10px] ${
                  darkMode ? "text-cyan-200/55" : "text-sky-700/80"
                }`}
              >
                <Satellite className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                3GPP NTN · orbital workspace
              </p>
              <h1
                className={`bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg ${
                  darkMode
                    ? "bg-gradient-to-r from-cyan-100 via-white to-orange-200/85"
                    : "bg-gradient-to-r from-sky-800 via-slate-800 to-orange-700/90"
                }`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                NEXUS ORBITAL
              </h1>
              <CommsMeshLinkHeaderBadge
                presenceLinePrefix={`${isConnected ? "Connected" : "Connecting…"} · ${onlineUsersLength} online`}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`rounded-lg border p-2 transition ${
                darkMode
                  ? "border-white/10 bg-slate-950/40 text-white/60 hover:border-cyan-500/30 hover:text-cyan-200"
                  : "border-slate-300/80 bg-white text-slate-600 hover:border-sky-400/50"
              }`}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div
              className={`flex max-w-[12rem] items-center gap-2 rounded-lg border px-2.5 py-1.5 sm:max-w-xs ${
                darkMode
                  ? "border-emerald-500/25 bg-emerald-500/10"
                  : "border-emerald-600/25 bg-emerald-50/90"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isConnected
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    : "bg-red-500"
                }`}
              />
              <span
                className={`truncate font-mono text-[10px] sm:text-xs ${
                  darkMode ? "text-emerald-100/90" : "text-emerald-900/90"
                }`}
              >
                {displayName}
              </span>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,400px)_1fr] lg:items-stretch lg:gap-4">
          <aside className="min-h-0 shrink-0 lg:max-h-none lg:overflow-visible">
            <div className="lg:sticky lg:top-2">{commandDeck}</div>
          </aside>

          <div className={`relative flex min-h-0 min-h-[320px] flex-1 flex-col overflow-hidden rounded-2xl border ${frameBorder} ${darkMode ? "bg-slate-950/50" : "bg-white/75"}`}>
            <div
              className={`pointer-events-none absolute inset-0 opacity-[0.08] ${
                socialChannelTab ? "bg-amber-500/15" : ""
              }`}
              style={{
                backgroundImage: socialChannelTab
                  ? "radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.35) 1px, transparent 0)"
                  : "radial-gradient(circle at 1px 1px, rgba(0, 229, 255, 0.35) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />
            <div
              className={`relative z-[1] flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 ${
                darkMode
                  ? "border-white/10 bg-slate-950/40"
                  : "border-slate-200/80 bg-white/60"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`font-mono text-[9px] uppercase tracking-[0.35em] sm:text-[10px] ${
                    darkMode ? "text-cyan-200/50" : "text-sky-700/70"
                  }`}
                >
                  Active sector
                </p>
                <p
                  className={`truncate text-sm font-semibold sm:text-base ${
                    darkMode ? "text-white/95" : "text-slate-900"
                  }`}
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {moduleLabel}
                </p>
                {moduleSublabel ? (
                  <p className={`truncate text-[10px] sm:text-[11px] ${darkMode ? "text-white/45" : "text-slate-600"}`}>
                    {moduleSublabel}
                  </p>
                ) : null}
              </div>
              <div
                className={`hidden h-10 w-10 shrink-0 rounded-lg border sm:flex sm:items-center sm:justify-center ${
                  darkMode ? "border-cyan-500/25 bg-cyan-500/5" : "border-sky-300/50 bg-sky-50"
                }`}
                aria-hidden
              >
                <div className={`h-2 w-2 rounded-full ${socialChannelTab ? "bg-amber-400" : "bg-cyan-400"} shadow-[0_0_10px_currentColor]`} />
              </div>
            </div>
            <div className="relative z-[1] min-h-0 flex-1 overflow-hidden">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
