import { useState } from "react";
import {
  LayoutGrid,
  TerminalSquare,
  Grid3x3,
  Camera,
  FileText,
  Video,
  Phone,
  MessageSquare,
  Mic,
  Film,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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

/* ══════════════════════════════════════════════════════════════════════
   QUICK ACTION STRIP — 7 instant-access features
══════════════════════════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  { label: "Vision Scan", icon: Camera,       href: "/scan",             color: "#06b6d4" },
  { label: "Build Docs",  icon: FileText,      href: "/document-builder", color: "#7c3aed" },
  { label: "Video Call",  icon: Video,         href: "/comms?tab=video",  color: "#e11d48" },
  { label: "Voice Call",  icon: Phone,         href: "/comms?tab=voice",  color: "#22c55e" },
  { label: "Text",        icon: MessageSquare, href: "/comms?tab=text",   color: "#f97316" },
  { label: "Voice Note",  icon: Mic,           href: "/comms?tab=vnote",  color: "#eab308" },
  { label: "Video Note",  icon: Film,          href: "/comms?tab=vidnote",color: "#f43f5e" },
];

function QuickActionStrip() {
  return (
    <div
      className="flex items-center gap-2 px-4 shrink-0"
      style={{
        height: 46,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(35,35,42,0.9)",
      }}
    >
      <span
        className="text-[7px] font-bold tracking-[0.35em] text-white/30 uppercase shrink-0 mr-1"
      >
        QUICK
      </span>
      {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
        <Link key={label} href={href}>
          <div
            className="group flex items-center gap-1.5 rounded-xl px-3 h-[30px] cursor-pointer transition-all duration-150 hover:scale-[1.04] shrink-0"
            style={{
              background: `rgba(255,255,255,0.06)`,
              border: `1px solid rgba(255,255,255,0.1)`,
            }}
          >
            <Icon
              className="h-3 w-3 shrink-0"
              style={{ color }}
              strokeWidth={1.8}
            />
            <span className="text-[8px] font-semibold text-white/60 group-hover:text-white/90 transition-colors whitespace-nowrap">
              {label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODULES BOX — all modules in one compact auto-grid
══════════════════════════════════════════════════════════════════════ */
function AllModulesBox({
  modules,
}: {
  modules: Array<{ href: string; icon?: any; label?: string; color?: string }>;
}) {
  if (modules.length === 0) return null;
  return (
    <div
      className="mx-3 mb-2 rounded-xl overflow-hidden shrink-0"
      style={{
        background: "rgba(38,38,46,0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex h-5 w-5 items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <Grid3x3 className="h-3 w-3 text-white/60" strokeWidth={1.8} />
        </div>
        <p className="text-[9px] font-semibold text-white/50 tracking-widest uppercase">
          MODULES
        </p>
        <span
          className="text-[7px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {modules.length}
        </span>
      </div>
      {/* Grid */}
      <div
        className="p-2 grid gap-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(62px, 1fr))" }}
      >
        {modules.map((m) => {
          const IconComp = m.icon;
          const accent = m.color ?? "#7c3aed";
          return (
            <Link key={m.href} href={m.href}>
              <div
                className="group flex flex-col items-center gap-1 rounded-lg py-2 px-1 cursor-pointer transition-all duration-200 hover:scale-[1.05]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {IconComp && (
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-all group-hover:scale-110"
                    style={{ background: `${accent}25`, border: `1px solid ${accent}35` }}
                  >
                    <IconComp className="h-3 w-3" style={{ color: accent }} strokeWidth={1.7} />
                  </div>
                )}
                <p className="text-[7px] font-semibold text-white/45 group-hover:text-white/75 transition-colors text-center leading-tight truncate w-full px-0.5">
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

/* ══════════════════════════════════════════════════════════════════════
   INLINE NETWORK FEED PANEL — fills remaining center space
══════════════════════════════════════════════════════════════════════ */
function NetworkFeedPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex flex-col mx-3 mb-2 rounded-xl overflow-hidden"
      style={{
        flex: collapsed ? "0 0 36px" : "1 1 0",
        minHeight: 0,
        background: "rgba(38,38,46,0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -2px 16px rgba(0,0,0,0.3)",
        transition: "flex 0.25s ease",
      }}
    >
      {/* Title bar */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-3 px-4 shrink-0 w-full transition-colors hover:bg-white/[0.03]"
        style={{
          height: 36,
          borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="h-[2px] w-4 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.3)" }} />
        <p className="text-[8px] font-semibold text-white/50 tracking-widest uppercase">
          NETWORK FEED
        </p>
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5 ml-1"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <span className="h-[3px] w-[3px] rounded-full bg-green-400 animate-pulse" />
          <span className="text-[6px] font-mono text-green-400/80">LIVE</span>
        </div>
        <div className="ml-auto">
          {collapsed
            ? <ChevronUp   className="h-3 w-3 text-white/25" strokeWidth={2} />
            : <ChevronDown className="h-3 w-3 text-white/25" strokeWidth={2} />
          }
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <NewsTrendFeed compact />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PAGE — h-screen, no scroll, everything flex-fitted
══════════════════════════════════════════════════════════════════════ */
export default function DashboardFresh() {
  const role        = useUserRole();
  const isAdmin     = role === "admin";
  const displayName =
    (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "OPERATOR";

  const [adminTab, setAdminTab]   = useState<AdminTab>("modules");
  const adminConsole              = isAdmin && adminTab === "console";

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
    enableStackSummary:    true,
    enableOrchestratorData: true,
  });

  const { data: conversations = [] } = useConversations(undefined, 100);
  const showHub = !adminConsole;
  const sharedPanelProps = { healthPercent, onlineEngines, totalEngines, degradedEngines, offlineEngines };

  return (
    /* Root: fills the whole viewport, NO page scroll */
    <div className="flex flex-col text-white overflow-hidden" style={{ height: "100vh", background: "#1c1c21" }}>

      {/* ══ HEADER — 52px fixed row ════════════════════════════════════ */}
      <header
        className="shrink-0 z-30"
        style={{
          height: 52,
          background: "rgba(28,28,34,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-full">
          {/* Left */}
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
                      background:  adminTab === id ? `${color}18` : "transparent",
                      border:      adminTab === id ? `1px solid ${color}35` : "1px solid transparent",
                      color:       adminTab === id ? "#fff" : "rgba(255,255,255,0.35)",
                      boxShadow:   adminTab === id ? `0 0 12px ${color}20` : "none",
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

          {/* Centre status pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "SYSTEM",  value: "ACTIVE",                           color: "#22c55e", pulse: true  },
              { label: "ENGINES", value: `${onlineEngines}/${totalEngines}`,  color: "#06b6d4", pulse: false },
              { label: "COMMS",   value: "READY",                            color: "#7c3aed", pulse: false },
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

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && <HeaderBadge livePort={(stackSummary as any)?.stack?.fused?.livePort} />}
            <FieldDateTimeHud />
          </div>
        </div>
      </header>

      {/* ══ BODY — fills remaining height, no overflow ═════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT sidebar ─────────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col shrink-0 overflow-y-auto"
          style={{
            width: 215,
            borderRight: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(30,30,36,0.97)",
            scrollbarWidth: "none",
          }}
        >
          <SocialLeftPanel displayName={displayName} />
        </aside>

        {/* ── CENTER — hub or admin console ────────────────────────────── */}
        {showHub ? (
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Quick-action strip */}
            <QuickActionStrip />

            {/* Comms bento + research (compact, scrollable internally if needed) */}
            <div
              className="shrink-0 overflow-y-auto"
              style={{ maxHeight: "calc(100% - 46px - 36px - 140px)", scrollbarWidth: "none" }}
            >
              <CommsBentoGrid displayName={displayName} />
              <ResearchSnapshot conversations={conversations} />
              <AllModulesBox modules={visibleModules} />
            </div>

            {/* Network feed — takes ALL remaining vertical space */}
            <NetworkFeedPanel />
          </main>
        ) : (
          /* Admin console — own internal scroll */
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-5 py-6 space-y-5 lg:px-8">
              <section
                className="relative overflow-hidden rounded-2xl p-5"
                style={{ background: "rgba(42,42,52,0.88)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)" }}
                  >
                    <TerminalSquare className="h-5 w-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-widest text-white/35 uppercase mb-1">Command & Diagnostics</p>
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
          </main>
        )}

        {/* ── RIGHT sidebar ────────────────────────────────────────────── */}
        <aside
          className="hidden xl:flex flex-col shrink-0 overflow-y-auto"
          style={{
            width: 260,
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(30,30,36,0.97)",
            scrollbarWidth: "none",
          }}
        >
          <ActivityFeedPanel stackSummary={stackSummary} />
        </aside>
      </div>
    </div>
  );
}
