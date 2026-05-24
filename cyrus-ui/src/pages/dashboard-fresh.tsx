import { useState } from "react";
import { LayoutGrid, TerminalSquare } from "lucide-react";
import {
  ModuleCommandConsole,
  ModuleCommandConsoleDock,
} from "@/components/command-center/module-command-console";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import {
  BottomPanels,
  CategoryRail,
  EngineMatrixSection,
  FeaturedSpotlight,
  HeaderBadge,
  HeaderTitle,
  HealthRail,
  HeroSection,
  LeftSystemPanel,
  MetricsSection,
  RightTelemetryPanel,
} from "@/components/dashboard-fresh/sections";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";

/* ── Category hrefs ─────────────────────────────────────────────────── */
const INTELLIGENCE_HREFS  = ["/intelligence", "/biology", "/medical", "/algorithms"];
const OPERATIONS_HREFS    = ["/modules", "/ops", "/quantum", "/device"];
const COMMS_HREFS         = ["/comms", "/nav", "/scan"];
const COMMAND_HREFS       = ["/files", "/document-builder", "/security", "/settings"];

type AdminTab = "modules" | "console";

export default function DashboardFresh() {
  const role    = useUserRole();
  const isAdmin = role === "admin";
  const [moduleFilter, setModuleFilter] = useState<"all" | "core">("all");
  const [adminTab, setAdminTab]         = useState<AdminTab>("modules");
  const adminConsole = isAdmin && adminTab === "console";

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
    enableStackSummary: true,
    enableOrchestratorData: true,
  });

  const showMissionControl = !adminConsole;

  /* ── Filter modules into category rails ──────────────────────────── */
  const intelligenceModules  = visibleModules.filter((m) => INTELLIGENCE_HREFS.includes(m.href));
  const operationsModules    = visibleModules.filter((m) => OPERATIONS_HREFS.includes(m.href));
  const communicationsModules = visibleModules.filter((m) => COMMS_HREFS.includes(m.href));
  const commandModules       = visibleModules.filter((m) => COMMAND_HREFS.includes(m.href));

  const sharedPanelProps = { healthPercent, onlineEngines, totalEngines, degradedEngines, offlineEngines };

  return (
    <div className="relative min-h-screen text-white" style={{ background: "transparent" }}>

      {/* ══ Compact sticky header ═══════════════════════════════════════ */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: "rgba(8,8,16,0.95)",
          borderBottom: "1px solid rgba(225,29,72,0.1)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 4px 40px rgba(0,0,0,0.7)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-[52px]">
          {/* Left: logo + optional tabs */}
          <div className="flex items-center gap-3 min-w-0">
            <HeaderTitle variant={showMissionControl ? "operator" : "default"} />

            {isAdmin && (
              <div
                className="flex items-center gap-1 rounded-xl p-1 ml-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {([
                  { id: "modules" as AdminTab, label: "Modules", icon: LayoutGrid,    color: "#e11d48" },
                  { id: "console" as AdminTab, label: "Console", icon: TerminalSquare, color: "#06b6d4" },
                ] as const).map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdminTab(id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-semibold tracking-wide transition-all duration-200"
                    style={{
                      background: adminTab === id ? `${color}18` : "transparent",
                      border: adminTab === id ? `1px solid ${color}35` : "1px solid transparent",
                      color: adminTab === id ? "#fff" : "rgba(255,255,255,0.35)",
                      boxShadow: adminTab === id ? `0 0 12px ${color}20` : "none",
                      fontFamily: "'Orbitron', system-ui",
                    }}
                  >
                    <Icon className="h-3 w-3" style={{ color: adminTab === id ? color : undefined }} strokeWidth={2} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: live status pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "SYSTEM", value: "ACTIVE",          color: "#22c55e", pulse: true },
              { label: "ENGINES", value: `${onlineEngines}/${totalEngines}`, color: "#06b6d4", pulse: false },
              { label: "HEALTH",  value: `${totalEngines > 0 ? healthPercent : "—"}%`, color: healthPercent >= 80 ? "#22c55e" : healthPercent >= 50 ? "#f59e0b" : "#e11d48", pulse: false },
            ].map(({ label, value, color, pulse }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: `${color}10`, border: `1px solid ${color}22` }}
              >
                <span
                  className={`h-[5px] w-[5px] rounded-full ${pulse ? "animate-pulse" : ""}`}
                  style={{ background: color, boxShadow: `0 0 5px ${color}` }}
                />
                <span className="text-[9px] font-mono tracking-[0.25em] text-white/40 uppercase">{label}</span>
                <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right: badge + datetime */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && <HeaderBadge livePort={(stackSummary as any)?.stack?.fused?.livePort} />}
            <FieldDateTimeHud />
          </div>
        </div>
      </header>

      {/* ══ 3-column mission control layout ════════════════════════════ */}
      {showMissionControl && (
        <div className="flex relative">

          {/* ── LEFT: sticky system vitals panel ──────────────────────── */}
          <aside
            className="sticky top-[52px] hidden lg:block shrink-0 overflow-y-auto"
            style={{
              width: "200px",
              height: "calc(100vh - 52px)",
              borderRight: "1px solid rgba(225,29,72,0.08)",
              background: "rgba(8,8,18,0.6)",
              scrollbarWidth: "none",
            }}
          >
            <LeftSystemPanel {...sharedPanelProps} />
          </aside>

          {/* ── CENTER: scrolling main content ────────────────────────── */}
          <main className="flex-1 min-w-0 pb-[30rem]">

            {/* Featured spotlight */}
            <FeaturedSpotlight modules={visibleModules} />

            {/* Module category rails */}
            <div className="px-5 py-6 space-y-10">

              {/* Intelligence category */}
              {intelligenceModules.length > 0 && (
                <CategoryRail
                  title="INTELLIGENCE SYSTEMS"
                  accent="#7c3aed"
                  modules={intelligenceModules}
                />
              )}

              {/* Operations category */}
              {operationsModules.length > 0 && (
                <CategoryRail
                  title="OPERATIONS CORE"
                  accent="#ea580c"
                  modules={operationsModules}
                />
              )}

              {/* Communications category */}
              {communicationsModules.length > 0 && (
                <CategoryRail
                  title="COMMUNICATIONS"
                  accent="#0d9488"
                  modules={communicationsModules}
                />
              )}

              {/* Command & config */}
              {commandModules.length > 0 && (
                <CategoryRail
                  title="COMMAND & CONFIG"
                  accent="#e11d48"
                  modules={commandModules}
                />
              )}

              {/* Fallback: any uncategorised modules */}
              {(() => {
                const allCategorised = [
                  ...INTELLIGENCE_HREFS,
                  ...OPERATIONS_HREFS,
                  ...COMMS_HREFS,
                  ...COMMAND_HREFS,
                ];
                const extra = visibleModules.filter((m) => !allCategorised.includes(m.href));
                if (extra.length === 0) return null;
                return (
                  <CategoryRail
                    title="OTHER MODULES"
                    accent="#06b6d4"
                    modules={extra}
                  />
                );
              })()}
            </div>
          </main>

          {/* ── RIGHT: sticky telemetry panel ─────────────────────────── */}
          <aside
            className="sticky top-[52px] hidden xl:block shrink-0 overflow-y-auto"
            style={{
              width: "240px",
              height: "calc(100vh - 52px)",
              borderLeft: "1px solid rgba(6,182,212,0.08)",
              background: "rgba(8,8,18,0.6)",
              scrollbarWidth: "none",
            }}
          >
            <RightTelemetryPanel
              {...sharedPanelProps}
              stackSummary={stackSummary}
            />
          </aside>
        </div>
      )}

      {/* ══ Admin console view ══════════════════════════════════════════ */}
      {adminConsole && (
        <div className="mx-auto w-full max-w-[1400px] px-5 py-6 pb-[30rem] space-y-5 lg:px-8">
          <section
            className="relative overflow-hidden rounded-2xl p-5"
            style={{ background: "rgba(13,13,30,0.95)", border: "1px solid rgba(6,182,212,0.15)" }}
          >
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)" }} />
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}>
                <TerminalSquare className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[9px] font-mono tracking-[0.4em] text-cyan-400/50 uppercase mb-1">Command & Diagnostics</p>
                <h2 className="text-lg font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Mission Console</h2>
                <p className="text-xs text-white/40 mt-1">Stack health, engine matrix, and operational hints.</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <HeroSection />
            <HealthRail {...sharedPanelProps} />
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

          <BottomPanels hints={(stackSummary as any)?.stack?.hints ?? ["Waiting for stack hints…"]} />
        </div>
      )}

      {/* ══ Command console dock ════════════════════════════════════════ */}
      <ModuleCommandConsoleDock>
        <ModuleCommandConsole pageContext="Command Center — home / module workspace" />
      </ModuleCommandConsoleDock>
    </div>
  );
}
