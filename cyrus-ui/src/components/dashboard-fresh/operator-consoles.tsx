import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BOTSWANA_BEEF_EXPORTS_HERO_URL,
  BOTSWANA_TECHNOLOGY_HERO_URL,
  BOTSWANA_TOURISM_WILDLIFE_URL,
  CYRUS_MINING_DIAMOND_URL,
  TSODILO_DANCE_HERO_URL,
} from "@/lib/dashboard-backdrop";
import type { StackSummaryResponse } from "./types";
import { cn } from "@/lib/utils";

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

type SpotlightPillar = {
  title: string;
  sub: string;
  image: string;
  variant?: "default" | "mining" | "beef" | "technology";
};

const PILLAR_RENDER: Record<
  Exclude<SpotlightPillar["variant"], "default" | undefined>,
  {
    frame: string;
    img: string;
    filter?: string;
    sub: string;
    badge?: string;
  }
> = {
  mining: {
    frame:
      "border-white/20 bg-[#0a0c10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(186,230,253,0.12)]",
    img: "object-cover object-[center_42%] brightness-[1.08] contrast-[1.18] saturate-[0.92]",
    filter: "drop-shadow(0 0 18px rgba(186,230,253,0.28)) drop-shadow(0 8px 16px rgba(0,0,0,0.55))",
    sub: "text-cyan-100/70",
    badge: "Refined",
  },
  beef: {
    frame:
      "border-amber-200/25 bg-[#1a1208] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(251,191,36,0.14)]",
    img: "object-cover object-[center_38%] brightness-[1.04] contrast-[1.14] saturate-[1.08]",
    filter: "drop-shadow(0 0 14px rgba(251,191,36,0.22)) drop-shadow(0 8px 18px rgba(0,0,0,0.5))",
    sub: "text-amber-100/75",
    badge: "Exports",
  },
  technology: {
    frame:
      "border-sky-200/20 bg-[#0a1018] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_22px_rgba(56,189,248,0.12)]",
    img: "object-cover object-[center_40%] brightness-[1.05] contrast-[1.16] saturate-[1.06]",
    filter: "drop-shadow(0 0 16px rgba(56,189,248,0.2)) drop-shadow(0 8px 18px rgba(0,0,0,0.52))",
    sub: "text-sky-100/75",
    badge: "Industry",
  },
};

function SpotlightPillarCard({ pillar }: { pillar: SpotlightPillar }) {
  const variant = pillar.variant ?? "default";
  const refined = variant !== "default" ? PILLAR_RENDER[variant] : null;

  return (
    <article
      className={`group relative overflow-hidden p-2 shadow-[0_10px_22px_rgba(0,0,0,0.45)] ${DASHBOARD_DARK_CONSOLE_INNER}`}
    >
      <div
        className={cn(
          "relative h-20 w-full overflow-hidden rounded-lg border",
          refined ? refined.frame : "border-transparent",
        )}
      >
        <img
          src={pillar.image}
          alt={pillar.title}
          className={cn(
            "h-full w-full transition duration-500 group-hover:scale-[1.04]",
            refined ? refined.img : "object-cover brightness-[0.9] contrast-[1.08] saturate-[1.05] group-hover:scale-[1.03]",
          )}
          style={refined?.filter ? { filter: refined.filter } : undefined}
          loading="lazy"
        />
        {variant === "mining" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_38%,rgba(255,255,255,0.22),transparent_42%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cyan-200/10 via-transparent to-violet-200/10 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {variant === "beef" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(251,191,36,0.18),transparent_48%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky-300/10 via-transparent to-amber-300/12 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {variant === "technology" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(125,211,252,0.16),transparent_46%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky-400/12 via-transparent to-amber-300/10 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {refined ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent"
              aria-hidden
            />
            {refined.badge ? (
              <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
                {refined.badge}
              </div>
            ) : null}
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/25 to-transparent" />
        )}
      </div>
      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/92">{pillar.title}</p>
        <p className={cn("text-[10px]", refined?.sub ?? "text-slate-300/80")}>{pillar.sub}</p>
      </div>
    </article>
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
  const pillars: SpotlightPillar[] = [
    { title: "Tourism", sub: "Wildlife safari", image: BOTSWANA_TOURISM_WILDLIFE_URL },
    { title: "Culture", sub: "Tsodilo heritage", image: TSODILO_DANCE_HERO_URL },
    {
      title: "Mining",
      sub: "Diamond strength",
      image: CYRUS_MINING_DIAMOND_URL,
      variant: "mining",
    },
    {
      title: "Beef exports",
      sub: "Cattle economy",
      image: BOTSWANA_BEEF_EXPORTS_HERO_URL,
      variant: "beef",
    },
    {
      title: "Technology",
      sub: "Digital growth",
      image: BOTSWANA_TECHNOLOGY_HERO_URL,
      variant: "technology",
    },
  ];

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
          src={CYRUS_MINING_DIAMOND_URL}
          alt="Brilliant-cut diamonds on dark leather"
          className="h-36 w-24 shrink-0 rounded-xl border border-white/18 object-cover object-[center_42%] shadow-[0_10px_20px_rgba(0,0,0,0.36)] brightness-[1.06] contrast-[1.14]"
        />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pillars.map((pillar) => (
          <SpotlightPillarCard key={pillar.title} pillar={pillar} />
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
