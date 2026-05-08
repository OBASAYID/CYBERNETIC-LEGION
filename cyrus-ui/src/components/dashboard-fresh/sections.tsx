import { Activity, Cpu, Gauge, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { Link } from "wouter";
import { getDesignatedModuleRouteForEngine } from "@/config/command-center-nav";
import { MODULE_FOLDER_TILE_URL } from "@/lib/dashboard-backdrop";
import { cn } from "@/lib/utils";
import { StatusIcon, StatCard, metricIcons, statusTone } from "./ui";
import type { DashboardModuleStatus, StackSummaryResponse } from "./types";

/** Shared folder artwork for CTAs — green tint, `mix-blend-multiply` removes light PNG matte. */
function ModulesFolderGlyph({ className = "" }: { className?: string }) {
  return (
    <span className="relative isolate inline-flex items-center justify-center overflow-hidden rounded-md bg-slate-950 align-middle">
      <img
        src={MODULE_FOLDER_TILE_URL}
        alt=""
        className={cn("relative mix-blend-multiply", className)}
        style={{
          filter:
            "hue-rotate(78deg) saturate(1.26) brightness(1.02) contrast(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.4)) drop-shadow(0 0 10px rgba(16,185,129,0.2))",
        }}
        draggable={false}
      />
    </span>
  );
}

export function HeroSection() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.12] via-slate-950/85 to-cyan-950/35 p-5 shadow-[0_0_40px_-12px_rgba(245,158,11,0.35)] lg:col-span-2">
      <div className="pointer-events-none absolute -left-8 top-0 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-6 right-0 h-32 w-32 rounded-full bg-cyan-500/18 blur-3xl" />
      <div className="absolute right-3 top-3 h-16 w-px bg-gradient-to-b from-amber-500/0 via-amber-400/40 to-amber-500/0 opacity-70" />
      <p className="relative text-xs font-mono uppercase tracking-[0.28em] text-amber-200/80">Command Surface</p>
      <h2
        className="relative mt-2 bg-gradient-to-r from-amber-100 via-white to-cyan-200/90 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
        style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
      >
        Unified control for modules, engines, and stack health
      </h2>
      <p className="relative mt-2 max-w-3xl text-sm leading-relaxed text-white/75">
        Mission console: launch orchestration, monitor engine state, and verify fused stack readiness.
      </p>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <Link href="/modules">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/45 bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-50 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-500/30"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
              <span className="pointer-events-none absolute inset-[-35%] rounded-full bg-cyan-400/25 blur-md mix-blend-screen" />
              <ModulesFolderGlyph className="relative h-7 w-7 object-contain" />
            </span>
            Open Orchestrator
          </button>
        </Link>
        <Link href="/ops">
          <button
            type="button"
            className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Open Ops Console
          </button>
        </Link>
        <Link href="/dashboard-legacy">
          <button
            type="button"
            className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/88 transition hover:bg-white/14"
          >
            Legacy Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}

export function HealthRail({
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
    <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-b from-slate-900/90 to-black/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent" />
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <Gauge className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <h3
            className="text-sm font-semibold text-white/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Engine Health
          </h3>
          <p className="text-[10px] font-mono uppercase tracking-widest text-orange-200/50">Tactical</p>
        </div>
      </div>
      <p className="bg-gradient-to-br from-white to-cyan-200/80 bg-clip-text text-3xl font-bold text-transparent">
        {healthPercent}%
      </p>
      <p className="mt-1 text-xs text-white/70">
        {onlineEngines} online / {totalEngines} total
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-400"
          style={{ width: `${Math.max(5, healthPercent)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 p-2 font-mono text-emerald-100 shadow-inner">
          {onlineEngines}
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/15 p-2 font-mono text-amber-100 shadow-inner">
          {degradedEngines}
        </div>
        <div className="rounded-lg border border-red-400/30 bg-red-500/15 p-2 font-mono text-red-100 shadow-inner">
          {offlineEngines}
        </div>
      </div>
    </div>
  );
}

export function MetricsSection({
  stackSummary,
  onlineEngines,
  totalEngines,
  degradedEngines,
}: {
  stackSummary?: StackSummaryResponse;
  onlineEngines: number;
  totalEngines: number;
  degradedEngines: number;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <StatCard
        icon={metricIcons.fused}
        label="Fused Origin"
        value={stackSummary?.stack?.fused?.liveOrigin ?? "loading..."}
        helper="Single public app endpoint"
        accent="cyan"
      />
      <StatCard
        icon={metricIcons.ai}
        label="AI Service"
        value={stackSummary?.cyrusAiReachable ? "Online" : "Degraded"}
        helper={stackSummary?.stack?.cyrusAi?.baseUrl ?? "No URL reported"}
        accent="violet"
      />
      <StatCard
        icon={metricIcons.engine}
        label="Engine Health"
        value={`${onlineEngines}/${totalEngines}`}
        helper={`${degradedEngines} degraded modules`}
        accent="emerald"
      />
      <StatCard
        icon={metricIcons.status}
        label="Quick Status"
        value={stackSummary?.success ? "Stable" : "Checking"}
        helper="Live summary from /api/stack/summary"
        accent="amber"
      />
    </section>
  );
}

export function ModuleWorkspaceSection({
  modules,
  moduleFilter,
  setModuleFilter,
}: {
  modules: { href: string; label: string; description?: string; Icon: React.ComponentType<{ className?: string }> }[];
  moduleFilter: "all" | "core";
  setModuleFilter: (next: "all" | "core") => void;
}) {
  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute left-1/2 top-[55%] z-0 w-[min(76rem,108vw)] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <div className="mx-auto h-80 max-w-5xl rounded-[2.5rem] bg-emerald-400/9 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-[min(58rem,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/7 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[min(42rem,90vw)] -translate-x-1/2 translate-y-1/3 rounded-full bg-blue-600/6 blur-2xl" />
      </div>
    <section className="relative z-10 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/14 via-slate-950/18 to-orange-950/12 p-1 shadow-[0_0_48px_-22px_rgba(34,211,238,0.18),0_0_50px_-30px_rgba(251,191,36,0.07),0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-slate-950/10" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.38) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-amber-200/4 via-yellow-400/3 to-orange-500/8" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(253,230,138,0.06),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 rounded-[1.4rem] bg-gradient-to-b from-amber-950/10 via-slate-950/14 to-orange-950/8 p-3 shadow-inner shadow-black/10 backdrop-blur-[1px] sm:p-3.5">
        <div className="mb-2.5 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <div className="pointer-events-none absolute inset-[-45%] rounded-full bg-gradient-to-br from-emerald-500/40 via-emerald-600/22 to-teal-500/28 opacity-90 blur-lg mix-blend-screen" />
              <div className="pointer-events-none absolute inset-[-18%] rounded-[1.35rem] bg-emerald-400/16 blur-md" />
              <span className="relative isolate flex h-11 w-11 items-center justify-center overflow-hidden rounded-[22%] bg-slate-950">
                <img
                  src={MODULE_FOLDER_TILE_URL}
                  alt="Modules"
                  className="relative h-full w-full object-contain mix-blend-multiply"
                  style={{
                    filter:
                      "hue-rotate(78deg) saturate(1.26) brightness(1.02) contrast(1.1) drop-shadow(0 4px 14px rgba(0,0,0,0.48)) drop-shadow(0 0 16px rgba(16,185,129,0.22))",
                  }}
                  draggable={false}
                />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/65">Field access</p>
              <h2
                className="mt-0.5 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Module workspace
              </h2>
              <p className="mt-1 max-w-md text-xs text-white/70">
                Each module is a folder console—open one to jump into that mission channel.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setModuleFilter("all")}
              className={`rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                moduleFilter === "all"
                  ? "border-cyan-400/50 bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 text-cyan-50 shadow-lg shadow-cyan-500/15"
                  : "border-white/12 bg-slate-950/50 text-white/70 hover:border-white/30 hover:text-white/92"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setModuleFilter("core")}
              className={`rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                moduleFilter === "core"
                  ? "border-orange-400/50 bg-gradient-to-r from-orange-600/30 to-amber-500/20 text-amber-50 shadow-lg shadow-orange-500/15"
                  : "border-white/12 bg-slate-950/50 text-white/70 hover:border-white/30 hover:text-white/92"
              }`}
            >
              Core
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6">
          {modules.map((item, i) => {
            const folderTintFilterId = `cyrusFolderGreenTint-${item.href.replace(/[^a-zA-Z0-9_-]/g, "_")}_${i}`;
            return (
            <Link key={item.href} href={item.href} className="block">
              <div
                className="group relative flex min-h-0 cursor-pointer flex-col items-center pb-0.5 text-center transition duration-200 ease-out hover:-translate-y-px active:translate-y-0"
                data-testid={`fresh-module-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="cyrus-folder-realism-host relative flex h-[4.35rem] w-full max-w-[6.25rem] items-end justify-center sm:h-[4.65rem] sm:max-w-[6.5rem]">
                  {/* Penumbra + umbra contact shadow */}
                  <div
                    className="pointer-events-none absolute bottom-[1px] left-1/2 h-[10px] w-[84%] -translate-x-1/2 rounded-[100%] bg-black/55 blur-[7px]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute bottom-[2px] left-1/2 h-[5px] w-[48%] -translate-x-1/2 rounded-[100%] bg-black/[0.72] blur-[3px]"
                    aria-hidden
                  />
                  {/* Subtle bounce light (green floor reflection) */}
                  <div
                    className="pointer-events-none absolute bottom-0 left-1/2 h-[52%] w-[92%] -translate-x-1/2 bg-[radial-gradient(ellipse_80%_58%_at_50%_100%,rgba(16,185,129,0.28),transparent_62%)] opacity-75 mix-blend-plus-lighter"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 top-[48%] h-11 w-[90%] -translate-x-1/2 rounded-full bg-emerald-400/14 blur-xl transition duration-300 group-hover:bg-emerald-300/22"
                    aria-hidden
                  />
                  {/* Slight occlusion behind folder body */}
                  <div
                    className="pointer-events-none absolute bottom-[6px] left-1/2 z-[1] h-[68%] w-[72%] -translate-x-1/2 rounded-md bg-black/28 blur-xl opacity-75"
                    aria-hidden
                  />
                  <div
                    className="relative z-10 transition duration-300 ease-out will-change-transform [transform-style:preserve-3d] group-hover:[transform:translateY(-2px)_rotateX(4deg)_scale(1.02)]"
                  >
                    {/* Opaque slate behind folder: multiply blend removes baked-in light/white PNG backdrop */}
                    <div
                      className="pointer-events-none absolute inset-x-[4%] bottom-0 top-[6%] z-0 rounded-[28%] bg-slate-950"
                      aria-hidden
                    />
                    {/* Edge definition + depth (PNG-friendly) */}
                    <img
                      src={MODULE_FOLDER_TILE_URL}
                      alt=""
                      width={256}
                      height={256}
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 top-0 z-[1] h-[3.68rem] w-auto max-w-[min(5.52rem,88%)] -translate-x-1/2 select-none object-contain object-bottom opacity-[0.35] blur-[0.65px] mix-blend-multiply sm:h-[3.95rem] sm:max-w-[5.78rem]"
                      style={{
                        filter: "brightness(0)",
                        transform: "translateZ(-2px)",
                      }}
                      draggable={false}
                    />
                    <img
                      src={MODULE_FOLDER_TILE_URL}
                      alt=""
                      width={256}
                      height={256}
                      className="cyrus-module-folder-art relative z-[2] mx-auto block h-[3.65rem] w-auto max-w-[min(5.5rem,88%)] select-none object-contain object-bottom mix-blend-multiply sm:h-[3.9rem] sm:max-w-[5.75rem]"
                      style={{
                        animationDelay: `${(i % 7) * -1.4}s`,
                        transform: "translateZ(0)",
                        filter: [
                          `url(#${folderTintFilterId})`,
                          "hue-rotate(12deg)",
                          "saturate(1.22)",
                          "brightness(1.04)",
                          "contrast(1.06)",
                          "drop-shadow(0 1px 0 rgba(0,0,0,0.72))",
                          "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
                          "drop-shadow(0 7px 10px rgba(0,0,0,0.3))",
                          "drop-shadow(0 0 0.5px rgba(4,120,87,0.65))",
                          "drop-shadow(0 16px 22px rgba(0,0,0,0.22))",
                          "drop-shadow(0 0 14px rgba(16,185,129,0.22))",
                        ].join(" "),
                      }}
                      draggable={false}
                    />
                    {/* Primary specular — green-tinted, not white */}
                    <div
                      className="pointer-events-none absolute left-[10%] right-[28%] top-[14%] z-20 h-[26%] rounded-tl-lg rounded-br-[40%] bg-gradient-to-br from-emerald-200/35 via-emerald-400/12 to-transparent opacity-[0.42] mix-blend-soft-light transition duration-300 group-hover:opacity-[0.52]"
                      aria-hidden
                    />
                    {/* Paper edge — cool green sheen */}
                    <div
                      className="pointer-events-none absolute inset-x-[18%] top-[22%] z-[19] h-[8%] rounded-sm bg-emerald-100/22 opacity-40 blur-[1px] mix-blend-overlay"
                      aria-hidden
                    />
                    {/* Rim / fresnel darken */}
                    <div
                      className="pointer-events-none absolute inset-[-6%] z-[21] rounded-lg bg-[radial-gradient(ellipse_72%_88%_at_50%_55%,transparent_52%,rgba(0,0,0,0.22)_92%,rgba(0,0,0,0.35)_100%)] mix-blend-multiply opacity-70"
                      aria-hidden
                    />
                  </div>
                  {/* Inline SVG filter: natural green tint while preserving shading */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="0"
                    height="0"
                    className="pointer-events-none absolute"
                    aria-hidden
                  >
                    <defs>
                      <filter
                        id={folderTintFilterId}
                        colorInterpolationFilters="sRGB"
                        x="-8%"
                        y="-8%"
                        width="116%"
                        height="116%"
                      >
                        <feColorMatrix
                          type="matrix"
                          values="
                            0.55  0.35  0.12  0  0.02
                            0.12  1.18  0.10  0  0.10
                            0.08  0.22  0.78  0  0.08
                            0     0     0     1  0"
                        />
                      </filter>
                    </defs>
                  </svg>
                </div>
                <p
                  className="mt-1 line-clamp-2 max-w-[7.25rem] text-[11px] font-semibold leading-tight tracking-wide text-white sm:text-xs"
                  style={{
                    fontFamily: "'Orbitron', system-ui, sans-serif",
                    textShadow:
                      "0 0 10px rgba(0,0,0,1), 0 1px 0 rgba(0,0,0,1), 0 2px 8px rgba(0,0,0,0.95), 0 0 1px rgba(16,185,129,0.9)",
                  }}
                >
                  {item.label}
                </p>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
    </div>
  );
}

export function EngineMatrixSection({
  modules,
  navLabelByRoute,
}: {
  modules: DashboardModuleStatus[];
  navLabelByRoute: Map<string, string>;
}) {
  const leftAccent = [
    "border-l-amber-500/60 from-amber-500/[0.08]",
    "border-l-emerald-500/60 from-emerald-500/[0.08]",
    "border-l-cyan-500/60 from-cyan-500/[0.08]",
    "border-l-orange-500/60 from-orange-500/[0.08]",
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-b from-slate-950/90 to-black/80 p-4 shadow-[0_0_50px_-18px_rgba(245,158,11,0.25)]">
      <div className="pointer-events-none absolute left-3 top-2 h-12 w-px bg-gradient-to-b from-amber-400/50 via-amber-400/20 to-transparent" />
      <div className="mb-3 flex items-center gap-2 pl-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
          <Cpu className="h-4 w-4 text-amber-300" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-200/50">Command</p>
          <h2
            className="text-sm font-semibold text-amber-50/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Engine Orchestrator Matrix
          </h2>
        </div>
      </div>
      <div className="space-y-2">
        {modules.slice(0, 12).map((module, i) => {
          const route = getDesignatedModuleRouteForEngine(module.id);
          const la = leftAccent[i % leftAccent.length];
          return (
            <div
              key={module.id}
              className={`flex items-center justify-between rounded-xl border border-white/12 border-l-4 bg-gradient-to-r ${la} to-slate-950/50 px-3 py-2.5 backdrop-blur-sm transition hover:brightness-110`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white/95">{module.name}</p>
                <p className="text-[10px] font-mono uppercase tracking-wide text-white/65">{module.category}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusTone(module.status)}`}>
                  {module.status}
                </span>
                <StatusIcon status={module.status} />
                {route ? (
                  <Link href={route}>
                    <span className="inline-block rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-100 transition hover:bg-cyan-500/30">
                      {navLabelByRoute.get(route) ?? "Open"}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BottomPanels({ hints }: { hints: string[] }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.1] to-slate-950/85 p-4 shadow-[0_0_32px_-12px_rgba(34,211,238,0.3)]">
        <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-cyan-500/18 blur-2xl" />
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          <h3
            className="text-sm font-semibold text-cyan-50/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Operational Notes
          </h3>
        </div>
        <ul className="relative space-y-1.5 text-xs text-cyan-100/70">
          {hints.slice(0, 6).map((hint, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-cyan-400/85">›</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.1] to-slate-950/85 p-4 shadow-[0_0_32px_-12px_rgba(249,115,22,0.22)]">
        <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-orange-500/15 blur-2xl" />
        <div className="mb-2 flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-orange-200" />
          <h3
            className="text-sm font-semibold text-orange-50/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Operator Workflow
          </h3>
        </div>
        <ul className="relative space-y-1.5 text-xs text-orange-100/70">
          <li className="flex gap-2">
            <span className="font-mono text-orange-300/90">›</span>
            Start in Module Workspace and launch mission context.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-orange-300/90">›</span>
            Validate health rail before high-risk operations.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-orange-300/90">›</span>
            Track degraded modules in orchestrator matrix.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-orange-300/90">›</span>
            Use legacy route only for parity or fallback checks.
          </li>
        </ul>
      </div>
    </section>
  );
}

export function LegacyBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-amber-950/30 to-orange-950/40 p-4 text-xs text-amber-100/90 shadow-[0_0_30px_-10px_rgba(251,191,36,0.4)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.04)_50%,transparent_60%)]" />
      <div className="relative mb-1 flex items-center gap-2 font-medium" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>
        <Activity className="h-3.5 w-3.5 text-amber-300" />
        Legacy access
      </div>
      <p className="relative text-amber-100/75">
        Open the previous dashboard at{" "}
        <Link href="/dashboard-legacy">
          <span className="cursor-pointer font-mono text-cyan-200 underline decoration-cyan-500/50 underline-offset-2">
            /dashboard-legacy
          </span>
        </Link>{" "}
        while iterating on this structure.
      </p>
    </section>
  );
}

export function HeaderBadge({ livePort }: { livePort?: number }) {
  return (
    <span
      className="rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-600/25 via-cyan-500/20 to-cyan-600/25 px-3 py-1.5 text-xs font-mono text-cyan-100 shadow-lg shadow-cyan-500/15"
      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
    >
      Fused {livePort ?? "—"}
    </span>
  );
}

export function HeaderTitle({ variant = "default" }: { variant?: "default" | "operator" }) {
  const isOperator = variant === "operator";
  return (
    <div className="flex items-center gap-3">
      <div className="relative hidden h-12 w-12 shrink-0 sm:block">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-orange-500/20 blur-md" />
        <div className="relative h-12 w-12 overflow-hidden rounded-full border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
          <img
            src="/images/cyrus-logo.png"
            alt=""
            className="h-full w-full object-cover"
            style={{ clipPath: "circle(42% at center)" }}
          />
        </div>
      </div>
      <div>
        <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-200/80">
          {isOperator ? "CYRUS" : "CYRUS Command"}
        </p>
        <h1
          className="mt-0.5 text-xl font-bold tracking-wide"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          {isOperator ? (
            <span className="bg-gradient-to-r from-cyan-200 via-white to-orange-300/90 bg-clip-text text-transparent">
              Module workspace
            </span>
          ) : (
            <span className="bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent">
              Mission console
            </span>
          )}
        </h1>
      </div>
    </div>
  );
}

