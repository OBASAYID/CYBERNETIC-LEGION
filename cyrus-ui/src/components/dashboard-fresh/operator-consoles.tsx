import type { ReactNode } from "react";
import { Activity, Radio, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { TSODILO_SPIRITUAL_DANCE_URL } from "@/lib/dashboard-backdrop";
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

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${ring} bg-gradient-to-br from-slate-950/75 via-slate-950/55 to-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm ${className}`}
    >
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
    <ConsoleShell title="System spotlight" kicker="Priority surface" icon={Sparkles} accent="amber">
      <div className="mb-3 overflow-hidden rounded-xl border border-amber-400/20 bg-black/30">
        <img
          src={TSODILO_SPIRITUAL_DANCE_URL}
          alt="Tsodilo spiritual dance"
          className="h-36 w-full object-cover"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-200/55">Stack health</p>
          <p className="mt-1 text-2xl font-bold text-amber-50">{healthPercent}%</p>
          <p className="mt-1 text-xs text-white/65">
            {onlineEngines}/{totalEngines} engines online
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-200/55">Fused origin</p>
          <p className="mt-1 truncate text-sm font-semibold text-cyan-50">{origin}</p>
          <p className="mt-1 text-xs text-white/65">Public app endpoint</p>
        </div>
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.08] p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-violet-200/55">CYRUS AI</p>
          <p className="mt-1 text-sm font-semibold text-violet-50">{ai}</p>
          <p className="mt-1 truncate text-xs text-white/65">
            {stackSummary?.stack?.cyrusAi?.baseUrl ?? "Awaiting stack summary"}
          </p>
        </div>
      </div>
    </ConsoleShell>
  );
}

export function MissionStatusConsole({
  healthPercent,
  onlineEngines,
  totalEngines,
  degradedEngines,
  offlineEngines,
}: {
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
  degradedEngines: number;
  offlineEngines: number;
}) {
  return (
    <ConsoleShell title="Mission status" kicker="Operational rail" icon={Activity} accent="emerald">
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
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 p-2 font-mono text-emerald-100">
            {onlineEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-emerald-200/70">Online</p>
          </div>
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/15 p-2 font-mono text-amber-100">
            {degradedEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-amber-200/70">Degraded</p>
          </div>
          <div className="rounded-lg border border-red-400/30 bg-red-500/15 p-2 font-mono text-red-100">
            {offlineEngines}
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-red-200/70">Offline</p>
          </div>
        </div>
        <p className="text-[11px] text-white/60">
          {totalEngines} orchestrated modules tracked · validate health before high-risk ops.
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

export function QuickActionsConsole() {
  return (
    <ConsoleShell title="Quick actions" kicker="Launch pad" icon={Zap} accent="violet">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <button
              type="button"
              className={`min-h-11 w-full rounded-xl border px-2 py-2 text-xs font-semibold transition hover:brightness-110 touch-manipulation ${link.tone}`}
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              {link.label}
            </button>
          </Link>
        ))}
      </div>
    </ConsoleShell>
  );
}

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
    <div className="flex flex-col gap-2 lg:gap-2.5">
      <SystemSpotlightConsole
        stackSummary={stackSummary}
        healthPercent={healthPercent}
        onlineEngines={onlineEngines}
        totalEngines={totalEngines}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:gap-2.5">
        <MissionStatusConsole
          healthPercent={healthPercent}
          onlineEngines={onlineEngines}
          totalEngines={totalEngines}
          degradedEngines={degradedEngines}
          offlineEngines={offlineEngines}
        />
        <QuickActionsConsole />
      </div>
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
