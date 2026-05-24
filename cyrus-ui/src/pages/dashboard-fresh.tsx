import { useState } from "react";
import { LayoutGrid, TerminalSquare, ChevronUp, ChevronDown, Grid3x3 } from "lucide-react";
import { Link } from "wouter";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import {
  BottomPanels,
  EngineMatrixSection,
  HeaderBadge,
  HeaderTitle,
  HealthRail,
  HeroSection,
  MetricsSection,
} from "@/components/dashboard-fresh/sections";
import {
  ActivityFeedPanel,
  CommsBentoGrid,
  ResearchSnapshot,
  SocialLeftPanel,
} from "@/components/dashboard-fresh/comms-hub";
import { NewsTrendFeed } from "@/components/dashboard-fresh/news-trend-feed";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";
import { useConversations } from "@/hooks/use-conversations";

type AdminTab = "modules" | "console";

/* ── MODULES BOX — single compact grid of all modules ───────────────── */
function AllModulesBox({ modules }: { modules: Array<{ href: string; icon?: any; label?: string; color?: string }> }) {
  if (modules.length === 0) return null;
  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(12,12,26,0.95)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.28)" }}
        >
          <Grid3x3 className="h-3.5 w-3.5 text-rose-400" strokeWidth={1.8} />
        </div>
        <p
          className="text-[10px] font-black text-white/70 tracking-[0.3em] uppercase"
          style={{ fontFamily: "'Orbitron', system-ui" }}
        >
          MODULES
        </p>
        <span
          className="text-[8px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: "rgba(225,29,72,0.1)", color: "#e11d48", border: "1px solid rgba(225,29,72,0.2)" }}
        >
          {modules.length}
        </span>
      </div>

      {/* Grid */}
      <div className="p-3 grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
        {modules.map((m) => {
          const IconComp = m.icon;
          const accent = m.color ?? "#7c3aed";
          return (
            <Link key={m.href} href={m.href}>
              <div
                className="group flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-1 cursor-pointer transition-all duration-200 hover:scale-[1.05] hover:-translate-y-0.5"
                style={{ background: `${accent}0e`, border: `1px solid ${accent}18` }}
              >
                {IconComp && (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-all group-hover:scale-110"
                    style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}
                  >
                    <IconComp className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={1.7} />
                  </div>
                )}
                <p
                  className="text-[8px] font-mono text-white/45 group-hover:text-white/70 transition-colors text-center leading-tight truncate w-full px-0.5"
                  style={{ maxWidth: "100%" }}
                >
                  {m.label ?? m.href.replace("/", "")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── NEWS DOCK — fixed bottom, same position as the old command console */
const NEWS_DOCK_HEIGHT_OPEN   = 340;
const NEWS_DOCK_HEIGHT_CLOSED = 44;

function NewsDock() {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="fixed bottom-0 right-0 z-40 transition-all duration-300"
      style={{
        /* left offset = game sidebar (240px) */
        left: 240,
        height: open ? NEWS_DOCK_HEIGHT_OPEN : NEWS_DOCK_HEIGHT_CLOSED,
        background: "rgba(8,8,18,0.97)",
        borderTop: "1px solid rgba(225,29,72,0.18)",
        boxShadow: "0 -8px 48px rgba(0,0,0,0.7)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Drag handle / title bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full px-5 h-[44px] transition-colors hover:bg-white/[0.03]"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.05)" : "none" }}
      >
        {/* Left: label */}
        <div className="h-[2px] w-4 rounded-full" style={{ background: "#e11d48" }} />
        <p
          className="text-[9px] font-black text-white/60 tracking-[0.4em] uppercase"
          style={{ fontFamily: "'Orbitron', system-ui" }}
        >
          NETWORK FEED
        </p>
        <div
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 ml-1"
          style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          <span className="h-[4px] w-[4px] rounded-full bg-orange-400 animate-pulse" />
          <span className="text-[7px] font-mono text-orange-400/80">LIVE</span>
        </div>

        {/* Right: chevron */}
        <div className="ml-auto flex items-center gap-2">
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-white/30" strokeWidth={2} />
            : <ChevronUp   className="h-3.5 w-3.5 text-white/30" strokeWidth={2} />
          }
        </div>
      </button>

      {/* Content — scrollable */}
      {open && (
        <div
          className="overflow-y-auto"
          style={{ height: NEWS_DOCK_HEIGHT_OPEN - 44, scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          <NewsTrendFeed compact />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════ */
export default function DashboardFresh() {
  const role      = useUserRole();
  const isAdmin   = role === "admin";
  const displayName = (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "OPERATOR";

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
  } = useDashboardFreshData("all", {
    enableStackSummary: true,
    enableOrchestratorData: true,
  });

  const { data: conversations = [] } = useConversations(undefined, 100);

  const showHub = !adminConsole;
  const sharedPanelProps = { healthPercent, onlineEngines, totalEngines, degradedEngines, offlineEngines };

  return (
    <div
      className="relative text-white"
      /* bottom padding = dock height so content never sits under the dock */
      style={{ minHeight: "100vh", paddingBottom: NEWS_DOCK_HEIGHT_OPEN }}
    >

      {/* ══ Sticky header ══════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: "rgba(8,8,16,0.96)",
          borderBottom: "1px solid rgba(225,29,72,0.1)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.7)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-[52px]">
          <div className="flex items-center gap-3 min-w-0">
            <HeaderTitle variant={showHub ? "operator" : "default"} />
            {isAdmin && (
              <div
                className="flex items-center gap-1 rounded-xl p-1 ml-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {([
                  { id: "modules" as AdminTab, label: "Hub",     icon: LayoutGrid,    color: "#e11d48" },
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

          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "SYSTEM",  value: "ACTIVE",                          color: "#22c55e", pulse: true  },
              { label: "ENGINES", value: `${onlineEngines}/${totalEngines}`, color: "#06b6d4", pulse: false },
              { label: "COMMS",   value: "READY",                           color: "#7c3aed", pulse: false },
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

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && <HeaderBadge livePort={(stackSummary as any)?.stack?.fused?.livePort} />}
            <FieldDateTimeHud />
          </div>
        </div>
      </header>

      {/* ══ Hub layout ═════════════════════════════════════════════════ */}
      {showHub && (
        <div className="flex">

          {/* LEFT: social panel */}
          <aside
            className="sticky top-[52px] hidden lg:block shrink-0 overflow-y-auto"
            style={{
              width: "210px",
              height: "calc(100vh - 52px)",
              borderRight: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(8,8,18,0.7)",
              scrollbarWidth: "none",
            }}
          >
            <SocialLeftPanel displayName={displayName} />
          </aside>

          {/* CENTER */}
          <main className="flex-1 min-w-0">
            <CommsBentoGrid displayName={displayName} />
            <ResearchSnapshot conversations={conversations} />
            <AllModulesBox modules={visibleModules} />
          </main>

          {/* RIGHT: activity feed */}
          <aside
            className="sticky top-[52px] hidden xl:block shrink-0 overflow-y-auto"
            style={{
              width: "248px",
              height: "calc(100vh - 52px)",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(8,8,18,0.7)",
              scrollbarWidth: "none",
            }}
          >
            <ActivityFeedPanel stackSummary={stackSummary} />
          </aside>
        </div>
      )}

      {/* ══ Admin console ══════════════════════════════════════════════ */}
      {adminConsole && (
        <div className="mx-auto w-full max-w-[1400px] px-5 py-6 space-y-5 lg:px-8">
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

      {/* ══ Fixed bottom news dock ══════════════════════════════════════ */}
      <NewsDock />
    </div>
  );
}
