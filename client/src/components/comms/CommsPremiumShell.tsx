/**
 * Premium communications shell — sidebar navigation, capability rail, vector backdrop.
 * Replaces the deck-first NEXUS carousel layout with a clear, product-grade interface.
 */

import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { CommsMeshLinkHeaderBadge } from "./CommsP2PUnifiedUI";
import { CommsPremiumBackdrop } from "./CommsPremiumBackdrop";
import { CommsCapabilityRail, type CommsModuleId } from "./CommsCapabilityRail";

export type CommsTabConfig = {
  id: CommsModuleId;
  icon: LucideIcon;
  label: string;
  subtitle: string;
};

export function CommsPremiumShell({
  darkMode,
  onToggleDarkMode,
  displayName,
  isConnected,
  onlineUsersLength,
  activeTab,
  onSelectTab,
  tabs,
  handoff,
  children,
  className = "",
}: {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  displayName: string;
  isConnected: boolean;
  onlineUsersLength: number;
  activeTab: CommsModuleId;
  onSelectTab: (tab: CommsModuleId) => void;
  tabs: CommsTabConfig[];
  handoff?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div
      className={`comms-premium-shell relative flex h-full min-h-0 w-full flex-1 overflow-hidden ${
        darkMode ? "comms-premium-shell--dark text-white" : "comms-premium-shell--light text-slate-900"
      } ${className}`.trim()}
    >
      <CommsPremiumBackdrop darkMode={darkMode} />

      {/* Sidebar navigation */}
      <nav
        className={`comms-premium-nav relative z-10 flex shrink-0 flex-col border-r ${
          darkMode
            ? "border-cyan-500/20 bg-black/40 backdrop-blur-2xl"
            : "border-sky-200/80 bg-white/75 backdrop-blur-xl"
        }`}
        aria-label="Communications modules"
      >
        <div className="flex shrink-0 items-center justify-center border-b border-inherit px-2 py-3 sm:px-3">
          <Link href="/">
            <button
              type="button"
              className={`rounded-xl border p-2 transition ${
                darkMode
                  ? "border-cyan-500/30 bg-cyan-950/50 text-cyan-100 hover:bg-cyan-900/60"
                  : "border-sky-300 bg-white text-slate-700 hover:border-sky-400"
              }`}
              aria-label="Back to command center"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          {tabs.map(({ id, icon: Icon, label }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={selected ? "page" : undefined}
                title={label}
                className={`comms-premium-nav__item group flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition sm:flex-row sm:justify-start sm:gap-3 sm:px-3 ${
                  selected
                    ? darkMode
                      ? "bg-cyan-500/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(0,229,255,0.35),0_0_24px_-8px_rgba(0,229,255,0.4)]"
                      : "bg-sky-100 text-sky-900 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.35)]"
                    : darkMode
                      ? "text-white/55 hover:bg-white/5 hover:text-white/90"
                      : "text-slate-500 hover:bg-sky-50 hover:text-slate-800"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                    selected
                      ? darkMode
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-sky-200/80 text-sky-700"
                      : darkMode
                        ? "bg-white/5 group-hover:bg-white/10"
                        : "bg-slate-100 group-hover:bg-slate-200/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="hidden text-left text-xs font-medium leading-tight sm:block">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-inherit p-2">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs transition sm:justify-start sm:px-3 ${
              darkMode
                ? "border-white/10 bg-white/5 text-cyan-200/80 hover:border-cyan-400/35"
                : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
            }`}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span className="hidden sm:inline">{darkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </nav>

      {/* Main workspace */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        {handoff ? <div className="shrink-0 px-3 pt-2 sm:px-4">{handoff}</div> : null}

        <header
          className={`comms-premium-header shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4 ${
            darkMode
              ? "border-cyan-500/20 bg-black/30 backdrop-blur-xl"
              : "border-sky-200/70 bg-white/60 backdrop-blur-xl"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`font-mono text-[9px] uppercase tracking-[0.38em] sm:text-[10px] ${
                  darkMode ? "text-cyan-400/60" : "text-sky-600/75"
                }`}
              >
                CYRUS · Communications
              </p>
              <h1
                className={`truncate text-lg font-bold tracking-tight sm:text-xl ${
                  darkMode
                    ? "bg-gradient-to-r from-cyan-200 via-white to-cyan-100 bg-clip-text text-transparent"
                    : "text-slate-900"
                }`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                {active.label}
              </h1>
              <p className={`mt-0.5 truncate text-xs sm:text-sm ${darkMode ? "text-white/50" : "text-slate-600"}`}>
                {active.subtitle}
              </p>
              <div className="mt-2">
                <CommsMeshLinkHeaderBadge
                  presenceLinePrefix={`${isConnected ? "Linked" : "Syncing…"} · ${onlineUsersLength} online`}
                />
              </div>
            </div>

            <div
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[10px] sm:text-xs ${
                darkMode
                  ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200/90"
                  : "border-emerald-600/25 bg-emerald-50 text-emerald-900"
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isConnected
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-red-500"
                }`}
              />
              <span className="max-w-[10rem] truncate">{displayName || "Operator"}</span>
            </div>
          </div>
        </header>

        <CommsCapabilityRail moduleId={activeTab} darkMode={darkMode} />

        <main
          className={`comms-premium-main relative min-h-0 flex-1 overflow-hidden ${
            darkMode ? "bg-black/15" : "bg-white/30"
          }`}
        >
          <div className="comms-premium-main__panel h-full min-h-0 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
