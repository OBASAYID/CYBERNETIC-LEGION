import { Link } from "wouter";
import { Network } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type DashboardModuleStatus = {
  id: string;
  name: string;
  category: "core" | "advanced" | "interactive";
  status: "operational" | "degraded" | "offline";
};

type DashboardModulesResponse = {
  modules: DashboardModuleStatus[];
  totalModules: number;
};

type StackSummaryResponse = {
  success: boolean;
  stack: {
    fused?: {
      name: string;
      description: string;
      livePort: number;
      liveOrigin: string;
      envSyncedWithPort: boolean;
    };
    web: { port: number; bindHost: string; displayUrls: string[] };
    cyrusAi: { baseUrl: string; host: string; port: number; urlSource: string };
    viteStandalone: { port: number; note: string };
    hints: string[];
  };
  cyrusAiReachable: boolean | null;
  orchestrator: { totalModules: number; initialized: boolean; error?: string };
  ts: number;
};

export function FusedStackSection({ stackSummary }: { stackSummary?: StackSummaryResponse }) {
  return (
    <section className="px-4 pt-4">
      <div className="max-w-6xl mx-auto rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Network className="w-5 h-5 text-violet-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm md:text-base font-semibold text-white">Fused system &amp; stack</h2>
              <p className="text-xs text-white/50">
                One public port (<span className="text-white/70">CYRUS_LIVE_PORT</span>) for UI + API + realtime.
                Python CYRUS AI uses <span className="text-white/70">CYRUS_AI_PORT</span> internally; Node proxies.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
            <span
              className={`text-[10px] px-2 py-1 rounded-full border ${
                stackSummary?.cyrusAiReachable === true
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                  : stackSummary?.cyrusAiReachable === false
                    ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
                    : "border-white/15 bg-black/30 text-white/50"
              }`}
            >
              AI {stackSummary?.cyrusAiReachable === true ? "live" : stackSummary?.cyrusAiReachable === false ? "down" : "…"}
            </span>
            <span className="text-[10px] px-2 py-1 rounded-full border border-white/15 bg-black/30 text-white/70">
              engines {stackSummary?.orchestrator?.totalModules ?? "—"}
            </span>
          </div>
        </div>
        {stackSummary?.stack ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-white/80">
            {stackSummary.stack.fused ? (
              <div className="md:col-span-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] p-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-emerald-200/80">
                  {stackSummary.stack.fused.name} — fused origin
                </p>
                <p className="text-sm text-white font-medium break-all font-mono">{stackSummary.stack.fused.liveOrigin}</p>
                <p className="text-[11px] text-white/55">{stackSummary.stack.fused.description}</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Web (UI + /api)</p>
              <p>
                Port <span className="text-cyan-200 font-mono">{stackSummary.stack.web.port}</span> · bind{" "}
                <span className="font-mono text-white/90">{stackSummary.stack.web.bindHost}</span>
              </p>
              <p className="text-white/55 break-all">{stackSummary.stack.web.displayUrls.join(" · ")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Python CYRUS AI</p>
              <p className="break-all font-mono text-violet-200/95">{stackSummary.stack.cyrusAi.baseUrl}</p>
              <p className="text-white/55">
                source: <span className="text-white/75">{stackSummary.stack.cyrusAi.urlSource}</span> · host{" "}
                <span className="font-mono">{stackSummary.stack.cyrusAi.host}</span> · port{" "}
                <span className="font-mono">{stackSummary.stack.cyrusAi.port}</span>
              </p>
            </div>
            <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Hints</p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                {stackSummary.stack.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              {stackSummary.orchestrator?.error ? (
                <p className="mt-2 text-amber-200/90 text-[11px]">Orchestrator: {stackSummary.orchestrator.error}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/45">Loading stack configuration…</p>
        )}
      </div>
    </section>
  );
}

export function ModuleGridSection({ navItems }: { navItems: NavItem[] }) {
  return (
    <section className="px-4 pt-4">
      <div className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-white">Dashboard Module Grid</h2>
            <p className="text-xs text-white/50">Unified access to all fused modules, engines, and surfaces.</p>
          </div>
          <span className="text-xs text-cyan-300/90 bg-cyan-500/10 border border-cyan-400/20 px-2 py-1 rounded-full">
            {navItems.length} modules
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
          {navItems.map((item) => (
            <Link key={`dashboard-grid-${item.href}`} href={item.href}>
              <button
                className="w-full h-full text-left px-3 py-3 rounded-xl border border-white/10 bg-black/30 hover:bg-white/10 hover:border-cyan-300/30 transition-all"
                data-testid={`dashboard-module-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <item.Icon className="w-4 h-4 text-cyan-200" />
                  <p className="text-sm font-medium text-white truncate">{item.label}</p>
                </div>
                {item.description && (
                  <p className="text-[11px] text-white/50 leading-snug line-clamp-2">{item.description}</p>
                )}
                {item.href === "/ops" && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                    {["Mission", "Approval", "Audit", "Embodied", "Fusion", "Metrics"].map((panel) => (
                      <span
                        key={panel}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      >
                        {panel}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EngineModulesSection({
  orchestratorModules,
  navLabelByRoute,
  getDesignatedModuleRouteForEngine,
}: {
  orchestratorModules?: DashboardModulesResponse;
  navLabelByRoute: Map<string, string>;
  getDesignatedModuleRouteForEngine: (engineId: string) => string | null;
}) {
  return (
    <section className="px-4 pt-4">
      <div className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-white">Engine Modules (Orchestrator)</h2>
            <p className="text-xs text-white/50">Live backend modules, algorithms, and engines exposed by CYRUS orchestrator.</p>
          </div>
          <span className="text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 px-2 py-1 rounded-full">
            {orchestratorModules?.totalModules ?? 0} engines
          </span>
        </div>

        {!orchestratorModules ? (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-xs text-white/50">
            Loading orchestrator modules…
          </div>
        ) : !orchestratorModules.modules?.length ? (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-xs text-white/50 space-y-2">
            <p>
              No orchestrator engines reported. Check <span className="text-white/70">Ports &amp; modules</span> — run{" "}
              <span className="font-mono text-cyan-200/90">npm run dev:live</span> after{" "}
              <span className="font-mono text-cyan-200/90">pip install -r cyrus-ai/requirements.txt</span>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {orchestratorModules.modules.map((module) => {
              const statusColor =
                module.status === "operational"
                  ? "text-emerald-300 border-emerald-400/20 bg-emerald-500/10"
                  : module.status === "degraded"
                    ? "text-amber-300 border-amber-400/20 bg-amber-500/10"
                    : "text-red-300 border-red-400/20 bg-red-500/10";
              const designatedRoute = getDesignatedModuleRouteForEngine(module.id);
              const designatedLabel = designatedRoute ? navLabelByRoute.get(designatedRoute) ?? designatedRoute : null;
              return (
                <div
                  key={module.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                  data-testid={`dashboard-engine-${module.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{module.name}</p>
                      <p className="text-[11px] text-white/45 uppercase tracking-wide mt-0.5">{module.category}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {module.status}
                    </span>
                  </div>
                  {designatedRoute ? (
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-white/55 truncate">
                        Module: <span className="text-white/80">{designatedLabel}</span>
                      </p>
                      <Link href={designatedRoute}>
                        <button
                          className="text-[10px] px-2 py-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                          data-testid={`engine-open-module-${module.id}`}
                        >
                          Open
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[11px] text-white/45">No designated module route yet</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

