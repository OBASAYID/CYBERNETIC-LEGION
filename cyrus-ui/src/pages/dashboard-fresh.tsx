import { useState } from "react";
import { LogOut, TerminalSquare } from "lucide-react";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import {
  ModuleCommandConsole,
  ModuleCommandConsoleDock,
} from "@/components/command-center/module-command-console";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import {
  BottomPanels,
  EngineMatrixSection,
  HeaderBadge,
  HeaderTitle,
  HealthRail,
  HeroSection,
  LegacyBanner,
  MetricsSection,
  ModuleWorkspaceSection,
} from "@/components/dashboard-fresh/sections";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";
import {
  MODULE_FOLDER_ICON_FILTER,
  MODULE_FOLDER_TILE_URL,
  MODULE_RIBBON_LIGHT_URL,
} from "@/lib/dashboard-backdrop";
type AdminTab = "modules" | "console";

export default function DashboardFresh() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const [moduleFilter, setModuleFilter] = useState<"all" | "core">("all");
  const [adminTab, setAdminTab] = useState<AdminTab>("modules");
  const adminConsole = isAdmin && adminTab === "console";

  const loadStack = isAdmin;
  const loadOrchestrator = adminConsole;

  const {
    stackSummary,
    orchestratorModules,
    navLabelByRoute,
    visibleModules,
    onlineEngines,
    degradedEngines,
    offlineEngines,
    totalEngines,
    healthPercent,
  } = useDashboardFreshData(moduleFilter, {
    enableStackSummary: loadStack,
    enableOrchestratorData: loadOrchestrator,
  });

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  const headerOperator = !isAdmin || adminTab === "modules";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
      {/* Crack + smoke: global `AtmosphericSmokeBackground`; warm ribbon-style module lighting */}
      <div className="pointer-events-none fixed inset-0 bg-slate-950/28" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-amber-950/24 via-slate-900/22 to-black/26" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_78%_52%_at_50%_-8%,rgba(251,191,36,0.16),rgba(180,83,9,0.05)_44%,transparent_62%)]" />
      <div className="pointer-events-none fixed inset-0">
        <div
          className="cyrus-smoke-animated cyrus-ribbon-float absolute left-1/2 top-[44%] h-[70vh] w-[32vw] min-w-[250px] max-w-[520px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.18] mix-blend-screen"
          style={{ backgroundImage: `url(${MODULE_RIBBON_LIGHT_URL})`, filter: "blur(0.8px)" }}
        />
        <div
          className="cyrus-smoke-animated cyrus-ribbon-float-soft absolute left-1/2 top-[46%] h-[84vh] w-[40vw] min-w-[300px] max-w-[660px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.12] mix-blend-soft-light"
          style={{ backgroundImage: `url(${MODULE_RIBBON_LIGHT_URL})`, filter: "blur(3.2px) brightness(0.95)" }}
        />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-500/45 to-transparent" />
        <div className="absolute left-1/2 top-[8%] h-[min(92vw,540px)] w-[min(92vw,700px)] -translate-x-1/2 rounded-full bg-amber-300/[0.1] blur-3xl" />
        <div className="absolute left-[46%] top-[20%] h-[min(76vw,420px)] w-[min(42vw,230px)] -translate-x-1/2 rounded-[45%] bg-[radial-gradient(ellipse_at_50%_20%,rgba(251,191,36,0.22),rgba(120,53,15,0.08)_56%,transparent_78%)] blur-2xl" />
        <div className="absolute bottom-[16%] right-[18%] h-[min(74vw,390px)] w-[min(74vw,390px)] rounded-full bg-orange-300/[0.08] blur-3xl" />
        <div className="absolute bottom-[10%] left-[14%] h-[min(66vw,330px)] w-[min(66vw,330px)] rounded-full bg-amber-700/[0.08] blur-3xl" />
      </div>
      <div className="pointer-events-none fixed top-4 left-4 z-20 flex items-center gap-2 sm:top-5 sm:left-5">
        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
        <span className="text-[10px] font-mono tracking-wider text-green-500/90">SYSTEM ACTIVE</span>
      </div>
      <div className="pointer-events-none fixed right-4 top-4 z-20 sm:right-5 sm:top-5">
        <FieldDateTimeHud />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/55 px-4 py-4 shadow-[0_4px_40px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex w-full max-w-full items-center justify-between gap-2">
            <HeaderTitle variant={headerOperator ? "operator" : "default"} />
            <div className="flex shrink-0 items-center gap-2">
              {isAdmin && <HeaderBadge livePort={stackSummary?.stack?.fused?.livePort} />}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/[0.08] px-3 py-1.5 text-xs text-white/92 shadow-inner transition hover:border-orange-500/30 hover:bg-white/[0.12]"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-full flex-col gap-5 px-4 py-6 pb-[28rem] sm:px-5 sm:pb-[30rem] lg:px-8 xl:px-10">
        {isAdmin && (
          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-r from-amber-500/[0.1] via-slate-900/55 to-cyan-500/[0.1] p-1 shadow-lg shadow-black/35">
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.03)_50%,transparent_70%)]" />
            <div className="relative flex flex-col gap-2 p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAdminTab("modules")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition ${
                    adminTab === "modules"
                      ? "border-cyan-400/50 bg-gradient-to-b from-cyan-600/35 to-cyan-900/40 text-cyan-50 shadow-lg shadow-cyan-500/20"
                      : "border-white/12 bg-slate-950/40 text-white/70 hover:text-white/92"
                  }`}
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                    <img
                      src={MODULE_FOLDER_TILE_URL}
                      alt=""
                      className="cyrus-module-folder-trim h-7 w-7 object-contain mix-blend-darken"
                      style={{ filter: MODULE_FOLDER_ICON_FILTER }}
                      draggable={false}
                    />
                  </span>
                  Module workspace
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("console")}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition ${
                    adminTab === "console"
                      ? "border-amber-400/50 bg-gradient-to-b from-amber-600/30 to-amber-950/50 text-amber-50 shadow-lg shadow-amber-500/20"
                      : "border-white/12 bg-slate-950/40 text-white/70 hover:text-white/92"
                  }`}
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  Mission console
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-white/65">
                Operators use <span className="text-cyan-300/80">Module workspace</span>. Command surface,
                engine health, and orchestrator data live under{" "}
                <span className="text-amber-300/80">Mission console</span>.
              </p>
            </div>
          </div>
        )}

        {!isAdmin && (
          <p className="max-w-2xl rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.08] px-4 py-3 text-sm text-cyan-100/75 shadow-inner">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">Access </span>
            Choose a module to open. System diagnostics and command tooling are available to
            administrators only.
          </p>
        )}

        {(headerOperator || !isAdmin) && (
          <ModuleWorkspaceSection
            modules={visibleModules}
            moduleFilter={moduleFilter}
            setModuleFilter={setModuleFilter}
          />
        )}

        {adminConsole && (
          <div className="relative w-full">
            <div
              className="pointer-events-none absolute left-1/2 top-[52%] z-0 w-[min(76rem,108vw)] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <div className="mx-auto h-80 max-w-5xl rounded-[2.5rem] bg-emerald-400/9 blur-3xl" />
              <div className="absolute left-1/2 top-1/2 h-72 w-[min(58rem,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/7 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-56 w-[min(42rem,90vw)] -translate-x-1/2 translate-y-1/3 rounded-full bg-blue-600/6 blur-2xl" />
            </div>
          <section className="relative z-10 overflow-hidden rounded-3xl bg-slate-950/60 p-1 shadow-[0_0_48px_-22px_rgba(34,211,238,0.18),0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-slate-950" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 z-[1] opacity-[0.12]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/10" />

            <div className="relative z-10 space-y-5 rounded-[1.4rem] bg-slate-950/45 p-4 shadow-inner shadow-black/20 backdrop-blur-sm sm:p-5">
              <div className="mb-1 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <TerminalSquare className="h-5 w-5 text-amber-200" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/60">
                    Command & diagnostics
                  </p>
                  <h2
                    className="mt-0.5 bg-gradient-to-r from-amber-100 via-white to-cyan-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    Mission console
                  </h2>
                  <p className="mt-1 max-w-lg text-xs text-white/70">
                    Stack health, engine matrix, and operational hints—same glass language as module workspace.
                  </p>
                </div>
              </div>

              <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <HeroSection />
                <HealthRail
                  healthPercent={healthPercent}
                  onlineEngines={onlineEngines}
                  totalEngines={totalEngines}
                  degradedEngines={degradedEngines}
                  offlineEngines={offlineEngines}
                />
              </section>

              <MetricsSection
                stackSummary={stackSummary}
                onlineEngines={onlineEngines}
                totalEngines={totalEngines}
                degradedEngines={degradedEngines}
              />

              <EngineMatrixSection
                modules={orchestratorModules?.modules ?? []}
                navLabelByRoute={navLabelByRoute}
              />

              <BottomPanels hints={stackSummary?.stack?.hints ?? ["Waiting for stack hints..."]} />
              <LegacyBanner />
            </div>
          </section>
          </div>
        )}
      </main>

        <ModuleCommandConsoleDock>
          <ModuleCommandConsole pageContext="Command Center — home / module workspace" />
        </ModuleCommandConsoleDock>
      </div>
    </div>
  );
}
