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

/** Shared dark console surface — matches Live panel sidebar. */
export const DASHBOARD_DARK_CONSOLE_BG =
  "bg-gradient-to-b from-[#070b12]/98 via-[#05080d]/99 to-black/95";
export const DASHBOARD_DARK_CONSOLE_INNER =
  "rounded-xl border border-white/10 bg-gradient-to-b from-[#0c1018]/92 via-[#080b10]/96 to-black/90";
export const DASHBOARD_CONSOLE_SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_46px_rgba(0,0,0,0.52)]";

type ConsoleStack = "standalone" | "top" | "bottom";

function stackShellClass(stack: ConsoleStack) {
  if (stack === "top") {
    return "rounded-t-2xl rounded-b-none border-x border-t border-white/14 border-b border-b-white/10";
  }
  if (stack === "bottom") {
    return "rounded-b-2xl rounded-t-none border-x border-b border-white/14 border-t-0";
  }
  return "rounded-2xl border border-white/14";
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
      ? "text-amber-300"
      : accent === "violet"
        ? "text-violet-300"
        : accent === "emerald"
          ? "text-emerald-300"
          : "text-cyan-300";

  return (
    <section
      className={`relative overflow-hidden ${stackShellClass(stack)} ${DASHBOARD_DARK_CONSOLE_BG} p-4 ${DASHBOARD_CONSOLE_SHADOW} backdrop-blur-xl cyrus-xs-console-shell ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.08]" aria-hidden />
      <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 rounded-full bg-black/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
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
  const pillars = [
    { title: "Tourism", sub: "Wildlife safari", image: BOTSWANA_TOURISM_WILDLIFE_URL },
    { title: "Culture", sub: "Tsodilo heritage", image: TSODILO_DANCE_HERO_URL },
    { title: "Mining", sub: "Diamond strength", image: CYRUS_DIAMONDS_LEATHER_URL },
    { title: "Beef exports", sub: "Cattle economy", image: BOTSWANA_BEEF_EXPORTS_URL },
    { title: "Technology", sub: "Digital growth", image: BOTSWANA_TECHNOLOGY_URL },
  ] as const;

  return (
    <ConsoleShell title="System spotlight" kicker="Featured console" icon={Sparkles} accent="amber" stack="top">
      <div className={`mb-3 flex gap-3 p-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.45)] cyrus-xs-spotlight-hero ${DASHBOARD_DARK_CONSOLE_INNER}`}>
        <img
          src={TSODILO_DANCE_HERO_URL}
          alt="Tsodilo spiritual dance"
          className="h-36 w-28 shrink-0 rounded-xl border border-white/18 object-cover shadow-[0_10px_20px_rgba(0,0,0,0.36)]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-[0.28em] text-slate-200/70">CYRUS Chronicle</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-white">Tsodilo Mission Ledger</h3>
          <p className="mt-1.5 text-[11px] text-slate-200/78">Live command intelligence blending Tsodilo spiritual dance art with premium diamond texture in one spotlight surface.</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">Story mode</span>
            <span className="rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">Live graphics</span>
            <span className="rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">Diamond render</span>
          </div>
        </div>
        <img
          src={CYRUS_DIAMONDS_LEATHER_URL}
          alt="Diamonds on dark leather surface"
          className="h-36 w-24 shrink-0 rounded-xl border border-white/18 object-cover shadow-[0_10px_20px_rgba(0,0,0,0.36)]"
        />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className={`group relative overflow-hidden p-2 shadow-[0_10px_22px_rgba(0,0,0,0.45)] ${DASHBOARD_DARK_CONSOLE_INNER}`}
          >
            <img
              src={pillar.image}
              alt={pillar.title}
              className="h-20 w-full rounded-lg object-cover brightness-[0.9] contrast-[1.08] saturate-[1.05] transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-x-2 top-2 h-20 rounded-lg bg-gradient-to-t from-black/72 via-black/25 to-transparent" />
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/92">{pillar.title}</p>
              <p className="text-[10px] text-slate-300/80">{pillar.sub}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 cyrus-xs-spotlight-stats sm:grid-cols-4">
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-amber-400/25`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">Progress</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none text-white">{healthPercent}</p>
          <p className="mt-1 text-[10px] text-white/45">Health index</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-orange-300/25`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-orange-200/70">Time</p>
          <p className="mt-1 text-[1.75rem] font-black leading-none text-white">{onlineEngines}</p>
          <p className="mt-1 text-[10px] text-white/45">Online engines</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-cyan-300/25`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/70">Signal</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none text-white">{origin}</p>
          <p className="mt-1 text-[10px] text-white/45">Fused origin</p>
        </div>
        <div className={`px-3 py-2.5 cyrus-xs-spotlight-stat-card ${DASHBOARD_DARK_CONSOLE_INNER} border-emerald-300/25`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-200/70">AI state</p>
          <p className="mt-1 truncate text-[1.05rem] font-black leading-none text-white">{ai}</p>
          <p className="mt-1 text-[10px] text-white/45">{totalEngines} total engines</p>
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
