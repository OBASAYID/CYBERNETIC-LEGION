import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BOTSWANA_BEEF_EXPORTS_URL,
  BOTSWANA_TECHNOLOGY_URL,
  BOTSWANA_TOURISM_WILDLIFE_URL,
  CYRUS_DIAMONDS_LEATHER_URL,
  TSODILO_DANCE_HERO_URL,
} from "@/lib/dashboard-backdrop";
import type { StackSummaryResponse } from "./types";

/** Shared dashboard console surface — plain white stack. */
export const DASHBOARD_DARK_CONSOLE_BG = "bg-white";
export const DASHBOARD_DARK_CONSOLE_INNER = "rounded-xl border border-slate-200 bg-white";
export const DASHBOARD_CONSOLE_SHADOW = "shadow-[0_8px_24px_rgba(15,23,42,0.08)]";

type ConsoleStack = "standalone" | "top" | "bottom";

function stackShellClass(stack: ConsoleStack) {
  if (stack === "top") {
    return "rounded-t-2xl rounded-b-none border-x border-t border-slate-200 border-b border-b-slate-200";
  }
  if (stack === "bottom") {
    return "rounded-b-2xl rounded-t-none border-x border-b border-slate-200 border-t-0";
  }
  return "rounded-2xl border border-slate-200";
}

function ConsoleShell({
  title,
  kicker,
  icon: Icon,
  accent = "cyan",
  children,
  className = "",
  stack = "standalone",
}: {
  title: string;
  kicker: string;
  icon: LucideIcon;
  accent?: "cyan" | "amber" | "violet" | "emerald";
  children: ReactNode;
  className?: string;
  stack?: ConsoleStack;
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
      ? "text-amber-600"
      : accent === "violet"
        ? "text-violet-600"
        : accent === "emerald"
          ? "text-emerald-600"
          : "text-cyan-600";

  return (
    <section
      className={`relative overflow-hidden ${stackShellClass(stack)} ${DASHBOARD_DARK_CONSOLE_BG} p-4 ${DASHBOARD_CONSOLE_SHADOW} cyrus-xs-console-shell ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${ring} bg-slate-50`}>
          <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-slate-500">{kicker}</p>
          <h2
            className="text-sm font-semibold text-slate-900"
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
  const pillars = [
    { title: "Tourism", sub: "Wildlife safari", image: BOTSWANA_TOURISM_WILDLIFE_URL },
    { title: "Culture", sub: "Tsodilo heritage", image: TSODILO_DANCE_HERO_URL },
    { title: "Mining", sub: "Diamond strength", image: CYRUS_DIAMONDS_LEATHER_URL },
    { title: "Beef exports", sub: "Cattle economy", image: BOTSWANA_BEEF_EXPORTS_URL },
    { title: "Technology", sub: "Digital growth", image: BOTSWANA_TECHNOLOGY_URL },
  ] as const;

  return (
    <ConsoleShell title="System spotlight" kicker="Featured console" icon={Sparkles} accent="amber" stack="top">
      <div className={`mb-3 flex gap-3 p-2.5 cyrus-xs-spotlight-hero ${DASHBOARD_DARK_CONSOLE_INNER}`}>
        <img
          src={TSODILO_DANCE_HERO_URL}
          alt="Tsodilo spiritual dance"
          className="h-36 w-28 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.28em] text-slate-500">CYRUS Chronicle</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-slate-900">Tsodilo Mission Ledger</h3>
          <p className="mt-1.5 text-[11px] text-slate-600">Live command intelligence blending Tsodilo spiritual dance art with premium diamond texture in one spotlight surface.</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-600">Story mode</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-600">Live graphics</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-600">Diamond render</span>
          </div>
        </div>
        <img
          src={CYRUS_DIAMONDS_LEATHER_URL}
          alt="Diamonds on dark leather surface"
          className="h-36 w-24 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm"
        />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className={`group relative overflow-hidden p-2 ${DASHBOARD_DARK_CONSOLE_INNER}`}
          >
            <img
              src={pillar.image}
              alt={pillar.title}
              className="h-20 w-full rounded-lg object-cover brightness-[0.9] contrast-[1.08] saturate-[1.05] transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-x-2 top-2 h-20 rounded-lg bg-gradient-to-t from-black/72 via-black/25 to-transparent" />
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-900">{pillar.title}</p>
              <p className="text-[10px] text-slate-600">{pillar.sub}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 cyrus-xs-spotlight-stats sm:grid-cols-4">
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-amber-300`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-700">Progress</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none text-slate-900">{healthPercent}</p>
          <p className="mt-1 text-[10px] text-slate-500">Health index</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-orange-300`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-orange-700">Time</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none text-slate-900">{onlineEngines}</p>
          <p className="mt-1 text-[10px] text-slate-500">Online engines</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-cyan-300`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-700">Signal</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none text-slate-900">{origin}</p>
          <p className="mt-1 text-[10px] text-slate-500">Fused origin</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-emerald-300`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">AI state</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none text-slate-900">{ai}</p>
          <p className="mt-1 text-[10px] text-slate-500">{totalEngines} total engines</p>
        </div>
      </div>
    </ConsoleShell>
  );
}

export function OperatorConsoleCluster({
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
  return (
    <div className="flex flex-col gap-2 lg:gap-2.5 cyrus-xs-console-cluster">
      <SystemSpotlightConsole
        stackSummary={stackSummary}
        healthPercent={healthPercent}
        onlineEngines={onlineEngines}
        totalEngines={totalEngines}
      />
    </div>
  );
}
