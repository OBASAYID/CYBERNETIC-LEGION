import { useState } from "react";
import { LayoutGrid, TerminalSquare, Zap } from "lucide-react";
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
  MetricsSection,
  ModuleWorkspaceSection,
} from "@/components/dashboard-fresh/sections";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";

type AdminTab = "modules" | "console";

export default function DashboardFresh() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const [moduleFilter, setModuleFilter] = useState<"all" | "core">("all");
  const [adminTab, setAdminTab] = useState<AdminTab>("modules");
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
    enableStackSummary: isAdmin,
    enableOrchestratorData: adminConsole,
  });

  const headerOperator = !isAdmin || adminTab === "modules";

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white" style={{ background: "transparent" }}>

      {/* ── Sticky gaming header ───────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "rgba(8,8,16,0.92)",
          borderColor: "rgba(225,29,72,0.15)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 py-2 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.8)" }} />
            <span className="text-[10px] font-mono tracking-[0.3em] text-[#22c55e]/80 uppercase">System Active</span>
          </div>
          <FieldDateTimeHud />
        </div>

        {/* Main header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Admin tabs */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { id: "modules" as AdminTab, label: "Modules", icon: LayoutGrid, color: "#e11d48" },
                  { id: "console" as AdminTab, label: "Console", icon: TerminalSquare, color: "#06b6d4" },
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdminTab(id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200"
                    style={{
                      background: adminTab === id ? `${color}18` : "transparent",
                      border: adminTab === id ? `1px solid ${color}35` : "1px solid transparent",
                      color: adminTab === id ? "#fff" : "rgba(255,255,255,0.4)",
                      boxShadow: adminTab === id ? `0 0 12px ${color}20` : "none",
                      fontFamily: "'Orbitron', system-ui",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: adminTab === id ? color : undefined }} strokeWidth={1.85} />
                    {label}
                  </button>
                ))}
              </div>
            )}
            <HeaderTitle variant={headerOperator ? "operator" : "default"} />
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && <HeaderBadge livePort={stackSummary?.stack?.fused?.livePort} />}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1600px] px-5 py-6 pb-[30rem] space-y-6 lg:px-8">

        {/* Banner hero for non-admins or module view */}
        {(headerOperator || !isAdmin) && (
          <section
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(225,29,72,0.08) 0%, rgba(8,8,16,0.98) 40%, rgba(6,182,212,0.06) 100%)",
              border: "1px solid rgba(225,29,72,0.15)",
              boxShadow: "0 0 80px rgba(225,29,72,0.05)",
            }}
          >
            {/* BG glows */}
            <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(50px)" }} />
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(40px)" }} />
            {/* Top line */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.5) 40%, rgba(6,182,212,0.3) 60%, transparent)" }} />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Icon */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.3)", boxShadow: "0 0 30px rgba(225,29,72,0.2)" }}>
                <Zap className="h-7 w-7 text-[#e11d48]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono tracking-[0.4em] text-[#e11d48]/70 uppercase mb-1">OMEGA-TIER QUANTUM AI</p>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide" style={{ fontFamily: "'Orbitron', system-ui" }}>
                  CYRUS <span style={{ color: "#e11d48" }}>v3.0</span>
                </h1>
                <p className="text-sm text-white/40 mt-1">
                  {isAdmin ? "Full system access — select a module to engage." : "Select a module to open. Admin diagnostics available to administrators only."}
                </p>
              </div>
              {/* Live status indicators */}
              <div className="flex flex-wrap gap-3 shrink-0">
                {[
                  { label: "Engines", value: `${onlineEngines}/${totalEngines}`, color: "#22c55e" },
                  { label: "Health", value: `${healthPercent}%`, color: healthPercent >= 80 ? "#22c55e" : healthPercent >= 50 ? "#f59e0b" : "#e11d48" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center rounded-xl px-4 py-2.5 min-w-[72px]" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                    <p className="text-xl font-black" style={{ color }}>{value}</p>
                    <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Module grid */}
        {(headerOperator || !isAdmin) && (
          <ModuleWorkspaceSection
            modules={visibleModules}
            moduleFilter={moduleFilter}
            setModuleFilter={setModuleFilter}
          />
        )}

        {/* Admin console */}
        {adminConsole && (
          <div className="space-y-5">
            {/* Console header */}
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

            <BottomPanels hints={stackSummary?.stack?.hints ?? ["Waiting for stack hints…"]} />
          </div>
        )}
      </main>

      <ModuleCommandConsoleDock>
        <ModuleCommandConsole pageContext="Command Center — home / module workspace" />
      </ModuleCommandConsoleDock>
    </div>
  );
}
