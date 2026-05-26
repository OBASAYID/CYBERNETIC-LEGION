import { useState } from "react";
import { LayoutGrid, LogOut, TerminalSquare } from "lucide-react";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import { DashboardCommandSideRail } from "@/components/command-center/command-console-popup";
import {
  BottomPanels,
  EngineMatrixSection,
  HeaderBadge,
  HeaderTitle,
  HealthRail,
  HeroSection,
  MetricsSection,
} from "@/components/dashboard-fresh/sections";
import { NewsTrendFeed } from "@/components/dashboard-fresh/news-trend-feed";
import { OperatorConsoleCluster } from "@/components/dashboard-fresh/operator-consoles";
import { OnlineUsersSidebar } from "@/components/dashboard-fresh/online-users-sidebar";
import { PshareFeedConsole } from "@/components/dashboard-fresh/pshare-feed-console";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";
import {
  MODULE_RIBBON_LIGHT_URL,
  TSODILO_CAVE_DANCE_URL,
  TSODILO_HILLS_SIGNS_URL,
  TSODILO_MARKINGS_CANVAS_URL,
  TSODILO_ROCK_ART_WALL_URL,
  TSODILO_SYMBOLS_STELE_URL,
} from "@/lib/dashboard-backdrop";
type AdminTab = "modules" | "console";

export default function DashboardFresh() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const [adminTab, setAdminTab] = useState<AdminTab>("modules");
  const adminConsole = isAdmin && adminTab === "console";
  const headerOperator = !isAdmin || adminTab === "modules";

  const loadStack = headerOperator || isAdmin;
  const loadOrchestrator = headerOperator || adminConsole;

  const {
    stackSummary,
    orchestratorModules,
    navLabelByRoute,
    onlineEngines,
    degradedEngines,
    offlineEngines,
    totalEngines,
    healthPercent,
  } = useDashboardFreshData("all", {
    enableStackSummary: loadStack,
    enableOrchestratorData: loadOrchestrator,
  });

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden bg-transparent text-white">
      {/* Crack + smoke: global `AtmosphericSmokeBackground`; warm ribbon-style module lighting */}
      <div className="pointer-events-none fixed inset-0 bg-slate-950/46" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-800/28 via-slate-950/38 to-black/44" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_78%_52%_at_50%_-8%,rgba(148,163,184,0.17),rgba(30,41,59,0.14)_44%,transparent_62%)]" />
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.12] mix-blend-soft-light"
        style={{ backgroundImage: `url(${TSODILO_ROCK_ART_WALL_URL})` }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.14] mix-blend-screen"
        style={{ backgroundImage: `url(${TSODILO_HILLS_SIGNS_URL})` }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.11] mix-blend-overlay"
        style={{ backgroundImage: `url(${TSODILO_CAVE_DANCE_URL})` }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.1] mix-blend-soft-light"
        style={{ backgroundImage: `url(${TSODILO_MARKINGS_CANVAS_URL})` }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.08] mix-blend-multiply"
        style={{ backgroundImage: `url(${TSODILO_SYMBOLS_STELE_URL})` }}
      />
      <div className="pointer-events-none fixed inset-0 cyrus-ceremonial-sweep mix-blend-screen opacity-60" />
      <div className="pointer-events-none fixed inset-0 cyrus-ceremonial-sweep-soft mix-blend-overlay opacity-55" />
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
      <div className="relative z-10">
        <header className="relative sticky top-0 z-30 overflow-hidden border-b border-white/12 bg-slate-950/62 shadow-[0_8px_44px_-12px_rgba(0,0,0,0.58)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.22]" />
          <div
            className="pointer-events-none absolute right-[6%] top-1/2 hidden h-24 w-24 -translate-y-1/2 rounded-full border border-amber-300/25 bg-cover bg-center opacity-[0.26] mix-blend-screen sm:block cyrus-symbol-watermark"
            style={{ backgroundImage: `url(${TSODILO_SYMBOLS_STELE_URL})` }}
            aria-hidden
          />
          <div className="mx-auto w-full max-w-full px-4 pb-3 pt-3 sm:px-6 sm:pb-3.5 sm:pt-3.5 cyrus-xs-header-wrap">
            {/* Status + field clock — own row so nothing stacks under fixed HUD */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-white/14 bg-white/[0.05] px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] cyrus-xs-status-row">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.95)] animate-pulse" />
                <span className="text-[10px] font-mono tracking-wider text-emerald-100/90">SYSTEM ACTIVE</span>
              </div>
              <FieldDateTimeHud className="shrink-0 rounded-xl border border-white/10 bg-slate-900/45 px-2.5 py-1.5" />
            </div>

            {/* Title row: admin toggles + branding | fused + logout */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.2)] cyrus-xs-title-row">
              <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-2.5 sm:min-w-[12rem] sm:gap-3">
                {isAdmin ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2 cyrus-xs-admin-tabs">
                    <button
                      type="button"
                      onClick={() => setAdminTab("modules")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition sm:text-xs cyrus-xs-admin-button ${
                        adminTab === "modules"
                          ? "border-slate-200/45 bg-slate-100/20 text-white shadow-md shadow-slate-500/20"
                          : "border-white/12 bg-slate-950/55 text-white/78 hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                      }`}
                      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                    >
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.85} aria-hidden />
                      <span className="hidden sm:inline">Module workspace</span>
                      <span className="sm:hidden">Modules</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab("console")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition sm:text-xs cyrus-xs-admin-button ${
                        adminTab === "console"
                          ? "border-sky-200/42 bg-sky-100/18 text-sky-50 shadow-md shadow-sky-500/20"
                          : "border-white/12 bg-slate-950/55 text-white/78 hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                      }`}
                      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                    >
                      <TerminalSquare className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.85} aria-hidden />
                      <span className="hidden sm:inline">Mission console</span>
                      <span className="sm:hidden">Console</span>
                    </button>
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 basis-[min(100%,16rem)] sm:basis-auto">
                  <HeaderTitle variant={headerOperator ? "operator" : "default"} />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 sm:gap-3">
                {isAdmin && (
                  <HeaderBadge livePort={stackSummary?.stack?.fused?.livePort} />
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.09] px-3 py-1.5 text-xs text-white/92 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition hover:border-white/30 hover:bg-white/[0.14] cyrus-xs-logout-button"
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-full flex-col gap-4 px-4 py-6 pb-10 sm:px-5 lg:px-8 xl:px-10 cyrus-xs-main">
        {(headerOperator || !isAdmin) && (
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_17.25rem]">
            <div className="space-y-3">
              <OperatorConsoleCluster
                stackSummary={stackSummary}
                healthPercent={healthPercent}
                onlineEngines={onlineEngines}
                totalEngines={totalEngines}
                degradedEngines={degradedEngines}
                offlineEngines={offlineEngines}
              />
              <PshareFeedConsole />
              <NewsTrendFeed />
            </div>
            <div className="xl:sticky xl:top-[5.5rem] xl:h-[calc(100vh-7rem)]">
              <OnlineUsersSidebar />
            </div>
          </section>
        )}

        {adminConsole && (
          <div className="relative w-full">
            <div
              className="pointer-events-none absolute left-1/2 top-[52%] z-0 w-[min(76rem,108vw)] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <div className="mx-auto h-80 max-w-cyrus-module rounded-[2.5rem] bg-emerald-400/9 blur-3xl" />
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
            </div>
          </section>
          </div>
        )}
      </main>

        <DashboardCommandSideRail pageContext="Command Center — home / module workspace" />
      </div>
    </div>
  );
}
