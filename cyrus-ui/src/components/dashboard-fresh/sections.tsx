import {
  Activity,
  Brain,
  CircuitBoard,
  Cpu,
  FileText,
  Gauge,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Microscope,
  Monitor,
  Phone,
  Scan,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Zap,
  CheckCircle2,
  CircleDot,
  XCircle,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { getDesignatedModuleRouteForEngine } from "@/config/command-center-nav";
import type { DashboardModuleStatus, StackSummaryResponse } from "./types";
import { cn } from "@/lib/utils";

/* ── Module card accent palette ─────────────────────────────────────── */
const MODULE_ACCENTS: Record<string, { from: string; via: string; icon: string; glow: string; border: string }> = {
  "/":                 { from: "#e11d48", via: "#be123c", icon: "#fda4af", glow: "rgba(225,29,72,0.4)",   border: "rgba(225,29,72,0.35)" },
  "/intelligence":     { from: "#7c3aed", via: "#5b21b6", icon: "#c4b5fd", glow: "rgba(124,58,237,0.4)",  border: "rgba(124,58,237,0.35)" },
  "/files":            { from: "#2563eb", via: "#1d4ed8", icon: "#93c5fd", glow: "rgba(37,99,235,0.4)",   border: "rgba(37,99,235,0.35)" },
  "/scan":             { from: "#0891b2", via: "#0e7490", icon: "#67e8f9", glow: "rgba(8,145,178,0.4)",   border: "rgba(8,145,178,0.35)" },
  "/comms":            { from: "#0d9488", via: "#0f766e", icon: "#5eead4", glow: "rgba(13,148,136,0.4)",  border: "rgba(13,148,136,0.35)" },
  "/nav":              { from: "#4f46e5", via: "#4338ca", icon: "#a5b4fc", glow: "rgba(79,70,229,0.4)",   border: "rgba(79,70,229,0.35)" },
  "/modules":          { from: "#7c3aed", via: "#9333ea", icon: "#d8b4fe", glow: "rgba(124,58,237,0.35)", border: "rgba(147,51,234,0.35)" },
  "/algorithms":       { from: "#be185d", via: "#9d174d", icon: "#f9a8d4", glow: "rgba(190,24,93,0.4)",   border: "rgba(190,24,93,0.35)" },
  "/document-builder": { from: "#0284c7", via: "#0369a1", icon: "#7dd3fc", glow: "rgba(2,132,199,0.4)",   border: "rgba(2,132,199,0.35)" },
  "/device":           { from: "#475569", via: "#334155", icon: "#cbd5e1", glow: "rgba(71,85,105,0.4)",   border: "rgba(71,85,105,0.35)" },
  "/medical":          { from: "#15803d", via: "#166534", icon: "#86efac", glow: "rgba(21,128,61,0.4)",   border: "rgba(21,128,61,0.35)" },
  "/security":         { from: "#dc2626", via: "#b91c1c", icon: "#fca5a5", glow: "rgba(220,38,38,0.4)",   border: "rgba(220,38,38,0.35)" },
  "/biology":          { from: "#059669", via: "#047857", icon: "#6ee7b7", glow: "rgba(5,150,105,0.4)",   border: "rgba(5,150,105,0.35)" },
  "/quantum":          { from: "#d97706", via: "#b45309", icon: "#fcd34d", glow: "rgba(217,119,6,0.4)",   border: "rgba(217,119,6,0.35)" },
  "/ops":              { from: "#ea580c", via: "#c2410c", icon: "#fdba74", glow: "rgba(234,88,12,0.4)",   border: "rgba(234,88,12,0.35)" },
  "/settings":         { from: "#4b5563", via: "#374151", icon: "#d1d5db", glow: "rgba(75,85,99,0.4)",    border: "rgba(75,85,99,0.35)" },
};

const PATH_ICONS: Record<string, LucideIcon> = {
  "/": MessageSquare, "/intelligence": Brain, "/files": FileText,
  "/scan": Scan, "/comms": Phone, "/nav": MapPin, "/modules": LayoutGrid,
  "/algorithms": CircuitBoard, "/document-builder": FileText, "/device": Monitor,
  "/medical": Activity, "/security": Shield, "/biology": Microscope,
  "/quantum": Zap, "/ops": Cpu, "/settings": Settings,
};

/* ── Status helpers ─────────────────────────────────────────────────── */
export function StatusIcon({ status }: { status: DashboardModuleStatus["status"] }) {
  if (status === "operational") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "degraded")    return <CircleDot className="h-3.5 w-3.5 text-yellow-400" />;
  return <XCircle className="h-3.5 w-3.5 text-red-400" />;
}

export function statusTone(status: DashboardModuleStatus["status"]): string {
  if (status === "operational") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (status === "degraded")    return "text-yellow-300 border-yellow-500/30 bg-yellow-500/8";
  return "text-red-300 border-red-500/30 bg-red-500/10";
}

/* ── Stat card ──────────────────────────────────────────────────────── */
export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  color = "#06b6d4",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  color?: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "rgba(13,13,30,0.85)",
        border: `1px solid ${color}28`,
        boxShadow: `0 0 30px ${color}10`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, filter: "blur(20px)" }}
      />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{label}</p>
        </div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="mt-1 text-[11px] text-white/40">{helper}</p>
      </div>
    </div>
  );
}

/* ── Module card ────────────────────────────────────────────────────── */
function ModuleCard({ href, label, description }: { href: string; label: string; description?: string }) {
  const accent = MODULE_ACCENTS[href] ?? MODULE_ACCENTS["/settings"];
  const IconComp = PATH_ICONS[href] ?? Settings;

  return (
    <Link href={href} className="block">
      <div
        className="group relative flex h-full cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.99]"
        style={{
          background: `linear-gradient(135deg, ${accent.from}14 0%, rgba(13,13,30,0.95) 60%)`,
          border: `1px solid ${accent.border}`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
        }}
        data-testid={`fresh-module-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {/* Corner glow */}
        <div
          className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle, ${accent.from}, transparent 70%)`, filter: "blur(20px)" }}
        />
        {/* Top border shimmer on hover */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${accent.from}80, transparent)` }}
        />

        {/* Icon */}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent.from}18`, border: `1px solid ${accent.border}` }}>
          <IconComp className="h-6 w-6" style={{ color: accent.icon, filter: `drop-shadow(0 0 8px ${accent.glow})` }} strokeWidth={1.75} />
        </div>

        {/* Text */}
        <div className="relative">
          <p
            className="text-sm font-bold tracking-wide text-white leading-tight"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {label}
          </p>
          {description && (
            <p className="mt-1 text-[11px] leading-snug text-white/45 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Active indicator dot */}
        <div className="mt-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.from, boxShadow: `0 0 4px ${accent.glow}` }} />
          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: accent.from + "80" }}>
            Launch
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Module workspace section ────────────────────────────────────────── */
export function ModuleWorkspaceSection({
  modules,
  moduleFilter,
  setModuleFilter,
}: {
  modules: { href: string; label: string; description?: string; Icon: LucideIcon }[];
  moduleFilter: "all" | "core";
  setModuleFilter: (next: "all" | "core") => void;
}) {
  return (
    <section className="w-full">
      {/* Section header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-mono tracking-[0.4em] text-[#e11d48]/70 uppercase mb-1">COMMAND CENTER</p>
          <h2
            className="text-xl font-black tracking-wide text-white"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Mission Modules
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "core"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setModuleFilter(f)}
              className="rounded-full px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-all duration-200"
              style={{
                border: moduleFilter === f ? "1px solid rgba(225,29,72,0.5)" : "1px solid rgba(255,255,255,0.1)",
                background: moduleFilter === f ? "rgba(225,29,72,0.15)" : "rgba(255,255,255,0.04)",
                color: moduleFilter === f ? "#fff" : "rgba(255,255,255,0.45)",
                boxShadow: moduleFilter === f ? "0 0 16px rgba(225,29,72,0.2)" : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Gaming module grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {modules.map((item) => (
          <ModuleCard key={item.href} href={item.href} label={item.label} description={item.description} />
        ))}
      </div>
    </section>
  );
}

/* ── Hero section ───────────────────────────────────────────────────── */
export function HeroSection() {
  return (
    <div
      className="relative col-span-2 overflow-hidden rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, rgba(225,29,72,0.12) 0%, rgba(13,13,30,0.97) 50%, rgba(6,182,212,0.08) 100%)",
        border: "1px solid rgba(225,29,72,0.2)",
        boxShadow: "0 0 60px rgba(225,29,72,0.06)",
      }}
    >
      <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(40px)" }} />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(40px)" }} />
      <p className="text-[10px] font-mono tracking-[0.4em] text-[#e11d48]/70 uppercase mb-2">Command Surface</p>
      <h2 className="text-xl font-black tracking-wide text-white mb-2" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>
        Unified Control for Modules, Engines & Stack Health
      </h2>
      <p className="text-sm text-white/50 mb-4 max-w-xl">
        Mission console — launch orchestration, monitor engine state, and verify fused stack readiness.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/modules", label: "Open Orchestrator", color: "#7c3aed" },
          { href: "/ops", label: "Ops Console", color: "#ea580c" },
          { href: "/intelligence", label: "Intelligence Hub", color: "#06b6d4" },
        ].map(({ href, label, color }) => (
          <Link key={href} href={href}>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, fontFamily: "'Orbitron', system-ui" }}
            >
              {label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Health rail ─────────────────────────────────────────────────────── */
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
  const health = healthPercent;
  const color = health >= 80 ? "#22c55e" : health >= 50 ? "#f59e0b" : "#e11d48";
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Gauge className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Engine Health</h3>
          <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase">Tactical</p>
        </div>
      </div>
      <p className="text-4xl font-black" style={{ color }}>{health}%</p>
      <p className="text-xs text-white/40 mt-1">{onlineEngines} online / {totalEngines} total</p>
      <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(4, health)}%`, background: `linear-gradient(90deg, ${color}, ${color}80)`, boxShadow: `0 0 10px ${color}60` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { val: onlineEngines, label: "Online", color: "#22c55e" },
          { val: degradedEngines, label: "Degraded", color: "#f59e0b" },
          { val: offlineEngines, label: "Offline", color: "#e11d48" },
        ].map(({ val, label, color: c }) => (
          <div key={label} className="rounded-xl py-2" style={{ background: `${c}10`, border: `1px solid ${c}25` }}>
            <p className="text-lg font-black" style={{ color: c }}>{val}</p>
            <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Metrics section ────────────────────────────────────────────────── */
export const metricIcons = {
  fused: Monitor,
  ai: ShieldCheck,
  engine: Cpu,
  status: Zap,
};

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
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={metricIcons.fused} label="Fused Origin" value={stackSummary?.stack?.fused?.liveOrigin?.replace(/https?:\/\//, "") ?? "Loading…"} helper="Single public endpoint" color="#06b6d4" />
      <StatCard icon={metricIcons.ai} label="AI Service" value={stackSummary?.cyrusAiReachable ? "Online" : "Degraded"} helper={stackSummary?.stack?.cyrusAi?.baseUrl ?? "No URL reported"} color="#7c3aed" />
      <StatCard icon={metricIcons.engine} label="Engine Health" value={`${onlineEngines}/${totalEngines}`} helper={`${degradedEngines} degraded`} color="#22c55e" />
      <StatCard icon={metricIcons.status} label="Stack Status" value={stackSummary?.success ? "Stable" : "Checking"} helper="Live from /api/stack/summary" color="#e11d48" />
    </section>
  );
}

/* ── Engine matrix ──────────────────────────────────────────────────── */
export function EngineMatrixSection({
  modules,
  navLabelByRoute,
}: {
  modules: DashboardModuleStatus[];
  navLabelByRoute: Map<string, string>;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(225,29,72,0.12)" }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)" }}>
          <Cpu className="h-4 w-4 text-[#e11d48]" />
        </div>
        <div>
          <p className="text-[9px] font-mono tracking-[0.3em] text-[#e11d48]/50 uppercase">Command</p>
          <h2 className="text-sm font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Engine Orchestrator Matrix</h2>
        </div>
      </div>
      <div className="space-y-2">
        {modules.slice(0, 12).map((module) => {
          const route = getDesignatedModuleRouteForEngine(module.id);
          const accent = MODULE_ACCENTS[route ?? "/settings"] ?? MODULE_ACCENTS["/settings"];
          return (
            <div
              key={module.id}
              className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 hover:brightness-110"
              style={{ background: `${accent.from}08`, border: `1px solid ${accent.border}35`, borderLeft: `3px solid ${accent.from}60` }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/90">{module.name}</p>
                <p className="text-[10px] font-mono uppercase tracking-wide text-white/40">{module.category}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", statusTone(module.status))}>{module.status}</span>
                <StatusIcon status={module.status} />
                {route && (
                  <Link href={route}>
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] transition-all hover:brightness-125" style={{ background: `${accent.from}20`, border: `1px solid ${accent.border}`, color: accent.icon }}>
                      {navLabelByRoute.get(route) ?? "Open"}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Bottom panels ──────────────────────────────────────────────────── */
export function BottomPanels({ hints }: { hints: string[] }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(6,182,212,0.15)" }}>
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(20px)" }} />
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Operational Notes</h3>
        </div>
        <ul className="space-y-2">
          {hints.slice(0, 6).map((hint, i) => (
            <li key={i} className="flex gap-2 text-xs text-white/50">
              <span className="text-cyan-500 font-mono shrink-0">›</span>
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(225,29,72,0.15)" }}>
        <div className="pointer-events-none absolute -left-4 -bottom-4 h-20 w-20 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(20px)" }} />
        <div className="flex items-center gap-2 mb-3">
          <TerminalSquare className="h-4 w-4 text-[#e11d48]" />
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Operator Workflow</h3>
        </div>
        <ul className="space-y-2 text-xs text-white/50">
          {["Start in Module Workspace and launch mission context.", "Validate health rail before high-risk operations.", "Track degraded modules in orchestrator matrix.", "Use legacy route only for parity or fallback checks."].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#e11d48]/80 font-mono shrink-0">›</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Header title ───────────────────────────────────────────────────── */
export function HeaderTitle({ variant = "default" }: { variant?: "default" | "operator" }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative hidden h-10 w-10 shrink-0 sm:flex items-center justify-center rounded-xl" style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.3)", boxShadow: "0 0 20px rgba(225,29,72,0.2)" }}>
        <img src="/images/cyrus-logo.png" alt="" className="h-8 w-8 object-cover rounded-lg" style={{ clipPath: "circle(44% at center)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-mono tracking-[0.35em] text-[#e11d48]/70 uppercase">CYRUS v3.0</p>
        <h1 className="text-base font-black tracking-wide text-white sm:text-lg" style={{ fontFamily: "'Orbitron', system-ui" }}>
          {variant === "operator" ? "Module Workspace" : "Mission Console"}
        </h1>
      </div>
    </div>
  );
}

/* ── Header badge ───────────────────────────────────────────────────── */
export function HeaderBadge({ livePort }: { livePort?: number }) {
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-mono"
      style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}
    >
      PORT {livePort ?? "—"}
    </span>
  );
}
