import type { ReactNode } from "react";
import { Activity, Radio, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import {
  TSODILO_CAVE_DANCE_URL,
  TSODILO_DANCE_HERO_URL,
  TSODILO_HUNT_SYMBOLS_URL,
  TSODILO_MARKINGS_CANVAS_URL,
} from "@/lib/dashboard-backdrop";
import type { StackSummaryResponse } from "./types";

function ConsoleShell({
  title,
  kicker,
  icon: Icon,
  accent = "cyan",
  children,
  className = "",
}: {
  title: string;
  kicker: string;
  icon: LucideIcon;
  accent?: "cyan" | "amber" | "violet" | "emerald";
  children: ReactNode;
  className?: string;
}) {
  const ring =
    accent === "amber"
      ? "border-amber-500/25"
      : accent === "violet"
        ? "border-violet-500/25"
        : accent === "emerald"
          ? "border-emerald-500/25"
          : "border-cyan-500/25";
  const iconTone =
    accent === "amber"
      ? "text-amber-300"
      : accent === "violet"
        ? "text-violet-300"
        : accent === "emerald"
          ? "text-emerald-300"
          : "text-cyan-300";
  const accentAura =
    accent === "amber"
      ? "cyrus-console-accent-amber"
      : accent === "violet"
        ? "cyrus-console-accent-violet"
        : accent === "emerald"
          ? "cyrus-console-accent-emerald"
          : "";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${ring} bg-gradient-to-br from-slate-700/60 via-slate-900/74 to-slate-950/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl cyrus-xs-console-shell ${className}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accentAura}`} aria-hidden />
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.16]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden />
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${ring} bg-white/[0.04]`}>
          <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/45">{kicker}</p>
          <h2
            className="text-sm font-semibold text-white/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SystemSpotlightConsole({
  stackSummary,
  healthPercent,
  onlineEngines,
  totalEngines,
}: {
  stackSummary?: StackSummaryResponse;
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
}) {
  const origin = stackSummary?.stack?.fused?.liveOrigin ?? "Single-origin fused stack";
  const ai = stackSummary?.cyrusAiReachable ? "AI online" : "AI check pending";

  return (
    <ConsoleShell title="System spotlight" kicker="Featured console" icon={Sparkles} accent="amber">
      <div className="mb-3 flex gap-3 rounded-2xl border border-white/10 bg-black/25 p-2.5 cyrus-xs-spotlight-hero">
        <img
          src={TSODILO_DANCE_HERO_URL}
          alt="Tsodilo spiritual dance"
          className="h-36 w-28 shrink-0 rounded-xl border border-white/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.28em] text-white/50">CYRUS Chronicle</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-white">Tsodilo Mission Ledger</h3>
          <p className="mt-1.5 text-[11px] text-white/65">Live command intelligence, activity stream, and deployment health in one dashboard surface.</p>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 cyrus-xs-spotlight-grid">
        <img
          src={TSODILO_HUNT_SYMBOLS_URL}
          alt="Tsodilo hunt symbols"
          className="h-16 w-full rounded-lg border border-white/10 object-cover opacity-85"
        />
        <img
          src={TSODILO_CAVE_DANCE_URL}
          alt="Tsodilo cave dance mural"
          className="h-16 w-full rounded-lg border border-white/10 object-cover opacity-85"
        />
        <img
          src={TSODILO_MARKINGS_CANVAS_URL}
          alt="Tsodilo symbolic markings"
          className="h-16 w-full rounded-lg border border-white/10 object-cover opacity-85"
        />
      </div>
      <div className="grid grid-cols-2 gap-2.5 cyrus-xs-spotlight-stats sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-300/35 bg-[#f6d669] px-3 py-2.5 text-slate-950 cyrus-xs-spotlight-stat-card">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-900/70">Progress</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none">{healthPercent}</p>
          <p className="mt-1 text-[10px] text-slate-900/65">Health index</p>
        </div>
        <div className="rounded-2xl border border-orange-200/35 bg-[#f6ad64] px-3 py-2.5 text-slate-950 cyrus-xs-spotlight-stat-card">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-900/70">Time</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none">{onlineEngines}</p>
          <p className="mt-1 text-[10px] text-slate-900/65">Online engines</p>
        </div>
        <div className="rounded-2xl border border-cyan-100/40 bg-[#9ee7f2] px-3 py-2.5 text-slate-950 cyrus-xs-spotlight-stat-card">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-900/70">Signal</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none">{origin}</p>
          <p className="mt-1 text-[10px] text-slate-900/65">Fused origin</p>
        </div>
        <div className="rounded-2xl border border-emerald-100/35 bg-[#b8eca7] px-3 py-2.5 text-slate-950 cyrus-xs-spotlight-stat-card">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-900/70">AI state</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none">{ai}</p>
          <p className="mt-1 text-[10px] text-slate-900/65">{totalEngines} total engines</p>
        </div>
      </div>
    </ConsoleShell>
  );
}

export function MissionStatusConsole({
  stackSummary,
  healthPercent,
  onlineEngines,
  totalEngines,
  degradedEngines,
  offlineEngines,
}: {
  stackSummary?: StackSummaryResponse;
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
  degradedEngines: number;
  offlineEngines: number;
}) {
  const aiState = stackSummary?.cyrusAiReachable ? "AI online" : "AI check pending";

  return (
    <ConsoleShell title="CYRUS AI console" kicker="Unified mission control" icon={Activity} accent="emerald">
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>Field readiness</span>
            <span className="font-mono text-emerald-200">{healthPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-400"
              style={{ width: `${Math.max(5, healthPercent)}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl border border-emerald-200/35 bg-[#b8eca7] p-2 font-mono text-slate-900">
            {onlineEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-900/65">Online</p>
          </div>
          <div className="rounded-xl border border-amber-200/35 bg-[#f6d669] p-2 font-mono text-slate-900">
            {degradedEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-900/65">Degraded</p>
          </div>
          <div className="rounded-xl border border-orange-200/35 bg-[#f6ad64] p-2 font-mono text-slate-900">
            {offlineEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-900/65">Offline</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/50">CYRUS AI state</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white/90" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>
              {aiState}
            </p>
            <span className="rounded-full border border-white/15 bg-white/[0.07] px-2 py-0.5 text-[10px] font-mono text-white/70">
              {totalEngines} engines
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 cyrus-xs-quick-grid">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <button
                type="button"
                className={`min-h-11 w-full rounded-xl border px-2 py-2 text-xs font-semibold transition hover:brightness-110 touch-manipulation cyrus-xs-quick-button ${link.tone} shadow-[0_8px_18px_rgba(0,0,0,0.24)]`}
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                {link.label}
              </button>
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-white/60">
          Mission status and quick actions are unified here for direct CYRUS AI operations.
        </p>
      </div>
    </ConsoleShell>
  );
}

const QUICK_LINKS = [
  { href: "/comms", label: "Comms", tone: "border-violet-400/35 bg-violet-500/15 text-violet-100" },
  { href: "/ops", label: "Ops", tone: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100" },
  { href: "/modules", label: "Modules", tone: "border-cyan-400/35 bg-cyan-500/15 text-cyan-100" },
  { href: "/intelligence", label: "Intel", tone: "border-amber-400/35 bg-amber-500/15 text-amber-100" },
] as const;

export function OperatorConsoleCluster({
  stackSummary,
  healthPercent,
  onlineEngines,
  totalEngines,
  degradedEngines,
  offlineEngines,
}: {
  stackSummary?: StackSummaryResponse;
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
  degradedEngines: number;
  offlineEngines: number;
}) {
  return (
    <div className="flex flex-col gap-2 lg:gap-2.5 cyrus-xs-console-cluster">
      <SystemSpotlightConsole
        stackSummary={stackSummary}
        healthPercent={healthPercent}
        onlineEngines={onlineEngines}
        totalEngines={totalEngines}
      />
      <MissionStatusConsole
        stackSummary={stackSummary}
        healthPercent={healthPercent}
        onlineEngines={onlineEngines}
        totalEngines={totalEngines}
        degradedEngines={degradedEngines}
        offlineEngines={offlineEngines}
      />
    </div>
  );
}

/** Bottom anchor label used by news feed header styling. */
export function LiveBroadcastBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-red-100">
      <Radio className="h-3 w-3 animate-pulse" aria-hidden />
      Live
    </span>
  );
}
