import { useState, useEffect, useRef } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  ChevronRight,
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
export const MODULE_ACCENTS: Record<string, { from: string; via: string; icon: string; glow: string; border: string }> = {
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

export const PATH_ICONS: Record<string, LucideIcon> = {
  "/": MessageSquare, "/intelligence": Brain, "/files": FileText,
  "/scan": Scan, "/comms": Phone, "/nav": MapPin, "/modules": LayoutGrid,
  "/algorithms": CircuitBoard, "/document-builder": FileText, "/device": Monitor,
  "/medical": Activity, "/security": Shield, "/biology": Microscope,
  "/quantum": Zap, "/ops": Cpu, "/settings": Settings,
};

/* ── Featured module set ────────────────────────────────────────────── */
export const FEATURED_HREFS = ["/intelligence", "/comms", "/security", "/quantum", "/medical", "/ops"];

/* ── Health color helper ────────────────────────────────────────────── */
function getHealthColor(h: number) {
  return h >= 80 ? "#22c55e" : h >= 50 ? "#f59e0b" : "#e11d48";
}

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

/* ── Game tile (internal) ───────────────────────────────────────────── */
function GameTile({ href, label }: { href: string; label: string }) {
  const accent = MODULE_ACCENTS[href] ?? MODULE_ACCENTS["/settings"]!;
  const Icon = PATH_ICONS[href] ?? Settings;

  return (
    <Link href={href} className="shrink-0 block">
      <div
        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.06] hover:-translate-y-1.5"
        style={{
          width: "172px",
          height: "148px",
          background: `linear-gradient(145deg, ${accent.from}38 0%, rgba(10,10,22,0.97) 60%)`,
          border: `1px solid ${accent.border}`,
          borderRadius: "14px",
          boxShadow: `0 6px 28px rgba(0,0,0,0.55), 0 0 0 1px ${accent.from}18`,
          flexShrink: 0,
        }}
      >
        {/* Hover glow ring */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: `inset 0 0 0 1px ${accent.from}55, 0 0 40px ${accent.glow}` }}
        />
        {/* Scanline texture */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[14px] opacity-[0.025]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)" }}
        />
        {/* Top shimmer on hover */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${accent.from}cc, transparent)` }}
        />
        {/* Corner glow */}
        <div
          className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-25 group-hover:opacity-60 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle, ${accent.from}, transparent 70%)`, filter: "blur(16px)" }}
        />

        {/* Icon area */}
        <div className="flex items-center justify-center pt-7 pb-3 relative z-10">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110"
            style={{
              background: `${accent.from}1a`,
              border: `1px solid ${accent.border}`,
              boxShadow: `0 0 18px ${accent.glow}`,
            }}
          >
            <Icon
              className="h-[28px] w-[28px]"
              style={{ color: accent.icon, filter: `drop-shadow(0 0 8px ${accent.glow})` }}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Bottom name strip */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 relative z-10"
          style={{ background: "linear-gradient(to top, rgba(8,8,20,0.95) 55%, transparent)" }}
        >
          <p
            className="text-[11px] font-bold text-white truncate leading-tight"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {label}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: accent.from, boxShadow: `0 0 5px ${accent.glow}` }}
            />
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase"
              style={{ color: `${accent.from}80` }}
            >
              launch
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Featured spotlight ─────────────────────────────────────────────── */
export function FeaturedSpotlight({
  modules,
}: {
  modules: { href: string; label: string; description?: string; Icon: LucideIcon }[];
}) {
  const featured = FEATURED_HREFS
    .map((h) => modules.find((m) => m.href === h))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const switchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setOpacity(0);
      switchRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % featured.length);
        setOpacity(1);
      }, 380);
    }, 7000);
    return () => {
      clearInterval(timer);
      clearTimeout(switchRef.current);
    };
  }, [featured.length]);

  const current = featured[idx];
  if (!current) return null;

  const accent = MODULE_ACCENTS[current.href] ?? MODULE_ACCENTS["/settings"]!;
  const Icon = PATH_ICONS[current.href] ?? Settings;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        minHeight: "272px",
        background: `linear-gradient(115deg, ${accent.from}18 0%, rgba(8,8,16,0.98) 50%, ${accent.via}0c 100%)`,
        borderBottom: `1px solid ${accent.border}`,
      }}
    >
      {/* BG radial bleed */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 65% 90% at 85% 50%, ${accent.from}14, transparent)` }}
      />
      {/* Bottom fade to content below */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
        style={{ background: "linear-gradient(to top, rgba(8,8,16,0.7), transparent)" }}
      />
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 4px)" }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent.from}cc 30%, ${accent.via}90 70%, transparent)` }}
      />

      {/* Content */}
      <div
        className="relative h-full flex items-center px-8 py-8 gap-10"
        style={{ opacity, transition: "opacity 0.38s ease" }}
      >
        {/* Left: text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-mono tracking-[0.35em] uppercase"
              style={{ background: `${accent.from}18`, border: `1px solid ${accent.border}`, color: accent.icon }}
            >
              <span className="h-[5px] w-[5px] rounded-full animate-pulse" style={{ background: accent.from }} />
              FEATURED MODULE
            </span>
          </div>

          <h2
            className="text-4xl font-black tracking-tight text-white mb-3 leading-none"
            style={{
              fontFamily: "'Orbitron', system-ui, sans-serif",
              textShadow: `0 0 60px ${accent.glow}`,
            }}
          >
            {current.label}
          </h2>

          {current.description && (
            <p className="text-sm text-white/50 mb-6 max-w-lg leading-relaxed line-clamp-2">
              {current.description}
            </p>
          )}

          <Link href={current.href}>
            <button
              type="button"
              className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-bold tracking-wide text-white transition-all hover:scale-105 hover:brightness-110 active:scale-95"
              style={{
                background: `${accent.from}`,
                boxShadow: `0 0 40px ${accent.glow}, 0 4px 20px rgba(0,0,0,0.4)`,
                fontFamily: "'Orbitron', system-ui, sans-serif",
              }}
            >
              LAUNCH MODULE
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Right: icon */}
        <div className="shrink-0 hidden md:flex items-center justify-center">
          <div className="relative">
            {/* Outer pulse ring */}
            <div
              className="absolute inset-0 rounded-[28px] animate-pulse"
              style={{
                margin: "-12px",
                background: `radial-gradient(circle, ${accent.from}22, transparent 70%)`,
                filter: "blur(12px)",
              }}
            />
            <div
              className="relative flex h-[148px] w-[148px] items-center justify-center rounded-[28px]"
              style={{
                background: `linear-gradient(135deg, ${accent.from}18, rgba(8,8,16,0.9))`,
                border: `1px solid ${accent.border}`,
                boxShadow: `0 0 80px ${accent.glow}, inset 0 0 30px ${accent.from}10`,
              }}
            >
              <Icon
                className="h-[72px] w-[72px]"
                style={{
                  color: accent.icon,
                  filter: `drop-shadow(0 0 24px ${accent.glow})`,
                }}
                strokeWidth={1.2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-4 left-8 flex items-center gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setOpacity(0); setTimeout(() => { setIdx(i); setOpacity(1); }, 300); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? "22px" : "6px",
              height: "6px",
              background: i === idx ? accent.from : "rgba(255,255,255,0.2)",
              boxShadow: i === idx ? `0 0 8px ${accent.glow}` : "none",
            }}
          />
        ))}
      </div>

      {/* Featured index label */}
      <div className="absolute bottom-4 right-8 text-[9px] font-mono text-white/20">
        {String(idx + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}
      </div>
    </div>
  );
}

/* ── Category horizontal rail ───────────────────────────────────────── */
export function CategoryRail({
  title,
  accent = "#e11d48",
  modules,
}: {
  title: string;
  accent?: string;
  modules: { href: string; label: string; description?: string; Icon: LucideIcon }[];
}) {
  if (modules.length === 0) return null;

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="h-px w-6 rounded-full" style={{ background: accent }} />
          <p
            className="text-[9px] font-mono tracking-[0.45em] uppercase"
            style={{ color: `${accent}90` }}
          >
            {title}
          </p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-white/15" />
      </div>

      {/* Horizontal tile rail */}
      <div
        className="flex gap-3 pb-3"
        style={{ overflowX: "auto", overflowY: "visible", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
      >
        {modules.map((item) => (
          <GameTile key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
    </div>
  );
}

/* ── Left system panel ──────────────────────────────────────────────── */
export function LeftSystemPanel({
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
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const healthColor = getHealthColor(healthPercent);

  const quickLinks = [
    { href: "/intelligence", label: "Intelligence", color: "#7c3aed" },
    { href: "/ops",          label: "Operations",   color: "#ea580c" },
    { href: "/comms",        label: "Comms",        color: "#0d9488" },
    { href: "/security",     label: "Security",     color: "#dc2626" },
    { href: "/settings",     label: "Settings",     color: "#4b5563" },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Section label */}
      <div>
        <p
          className="text-[8px] font-mono tracking-[0.45em] uppercase mb-2"
          style={{ color: "rgba(225,29,72,0.5)" }}
        >
          SYS VITALS
        </p>
        <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(225,29,72,0.4), transparent)" }} />
      </div>

      {/* Health gauge */}
      <div
        className="rounded-xl p-3"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest">HEALTH</p>
          <p className="text-sm font-black tabular-nums" style={{ color: healthColor, fontFamily: "'Orbitron', system-ui" }}>
            {totalEngines > 0 ? `${healthPercent}%` : "—"}
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(4, healthPercent)}%`,
              background: `linear-gradient(90deg, ${healthColor}, ${healthColor}70)`,
              boxShadow: `0 0 8px ${healthColor}60`,
            }}
          />
        </div>
      </div>

      {/* Engine breakdown */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-2">ENGINES</p>
        {[
          { val: onlineEngines,  label: "Online",   color: "#22c55e" },
          { val: degradedEngines, label: "Degraded", color: "#f59e0b" },
          { val: offlineEngines, label: "Offline",   color: "#e11d48" },
        ].map(({ val, label, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}70` }} />
              <p className="text-[10px] text-white/45">{label}</p>
            </div>
            <p className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{val}</p>
          </div>
        ))}
        <div
          className="flex items-center justify-between pt-1.5 mt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[9px] font-mono text-white/25">TOTAL</p>
          <p className="text-[10px] font-mono text-white/50 tabular-nums">{totalEngines}</p>
        </div>
      </div>

      {/* Session clock */}
      <div
        className="rounded-xl p-3"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(6,182,212,0.12)" }}
      >
        <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-1.5">SESSION</p>
        <p
          className="text-[22px] font-black text-[#06b6d4] font-mono tracking-widest tabular-nums"
          style={{ fontFamily: "'Orbitron', system-ui" }}
        >
          {hh}:{mm}:{ss}
        </p>
      </div>

      {/* Divider */}
      <div>
        <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2">QUICK ACCESS</p>
        <div className="h-px mb-3" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
      </div>

      {/* Quick links */}
      <div className="space-y-1.5">
        {quickLinks.map(({ href, label, color }) => (
          <Link key={href} href={href}>
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all hover:brightness-125 group"
              style={{ background: `${color}0e`, border: `1px solid ${color}1a` }}
            >
              <div className="h-1.5 w-1.5 rounded-full transition-all group-hover:scale-125" style={{ background: color, boxShadow: `0 0 4px ${color}80` }} />
              <p className="text-[11px] font-medium text-white/60 group-hover:text-white/90 transition-colors">{label}</p>
              <ChevronRight className="h-3 w-3 text-white/15 ml-auto group-hover:text-white/40 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Right telemetry panel ──────────────────────────────────────────── */
export function RightTelemetryPanel({
  healthPercent,
  onlineEngines,
  totalEngines,
  degradedEngines,
  offlineEngines,
  stackSummary,
}: {
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
  degradedEngines: number;
  offlineEngines: number;
  stackSummary?: StackSummaryResponse;
}) {
  const healthColor = getHealthColor(healthPercent);
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, healthPercent)) / 100);

  const mcpActive = (stackSummary as any)?.mcp?.health?.activeCount ?? 0;
  const mcpTotal  = (stackSummary as any)?.mcp?.health?.totalServers ?? 3;
  const aiReachable = (stackSummary as any)?.cyrusAiReachable ?? false;
  const livePort = (stackSummary as any)?.stack?.fused?.livePort;
  const hints: string[] = (stackSummary as any)?.stack?.hints ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Section label */}
      <div>
        <p
          className="text-[8px] font-mono tracking-[0.45em] uppercase mb-2"
          style={{ color: "rgba(6,182,212,0.5)" }}
        >
          TELEMETRY
        </p>
        <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.4), transparent)" }} />
      </div>

      {/* Circular health gauge */}
      <div
        className="rounded-xl p-4 flex flex-col items-center"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(6,182,212,0.1)" }}
      >
        <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-3">SYS HEALTH</p>
        <div className="relative flex items-center justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48" cy="48" r={r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            <circle
              cx="48" cy="48" r={r}
              fill="none"
              stroke={healthColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              style={{
                filter: `drop-shadow(0 0 6px ${healthColor})`,
                transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </svg>
          <div className="absolute text-center">
            <p
              className="text-xl font-black tabular-nums"
              style={{ color: healthColor, fontFamily: "'Orbitron', system-ui" }}
            >
              {totalEngines > 0 ? `${healthPercent}` : "—"}
            </p>
            <p className="text-[8px] font-mono text-white/30">%</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: healthColor }} />
          <p className="text-[9px] font-mono text-white/40">
            {onlineEngines}/{totalEngines} engines
          </p>
        </div>
      </div>

      {/* Stack status */}
      <div
        className="rounded-xl p-3 space-y-2.5"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-2">STACK STATUS</p>
        {[
          {
            label: "Fused Port",
            value: livePort ? `:${livePort}` : "—",
            color: "#06b6d4",
            online: Boolean(livePort),
          },
          {
            label: "AI Service",
            value: aiReachable ? "Online" : "Degraded",
            color: aiReachable ? "#22c55e" : "#e11d48",
            online: aiReachable,
          },
          {
            label: "MCP Servers",
            value: `${mcpActive}/${mcpTotal}`,
            color: mcpActive > 0 ? "#7c3aed" : "#4b5563",
            online: mcpActive > 0,
          },
        ].map(({ label, value, color, online }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: online ? color : "#374151",
                  boxShadow: online ? `0 0 5px ${color}70` : "none",
                }}
              />
              <p className="text-[10px] text-white/40">{label}</p>
            </div>
            <p className="text-[10px] font-mono tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Mini engine bars */}
      <div
        className="rounded-xl p-3"
        style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-3">ENGINE SPLIT</p>
        <div className="space-y-2">
          {[
            { label: "Online",   val: onlineEngines,   color: "#22c55e", total: totalEngines },
            { label: "Degraded", val: degradedEngines,  color: "#f59e0b", total: totalEngines },
            { label: "Offline",  val: offlineEngines,   color: "#e11d48", total: totalEngines },
          ].map(({ label, val, color, total }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-mono text-white/35">{label}</p>
                <p className="text-[9px] font-mono tabular-nums" style={{ color }}>{val}</p>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: total > 0 ? `${(val / total) * 100}%` : "0%",
                    background: color,
                    boxShadow: `0 0 6px ${color}50`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System notes */}
      {hints.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[8px] font-mono text-white/35 uppercase tracking-widest mb-2">SYS NOTES</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {hints.slice(0, 4).map((hint, i) => (
              <p key={i} className="text-[9px] text-white/30 leading-relaxed">
                <span className="text-[#06b6d4]/50 font-mono">› </span>
                {hint}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Legacy / admin components (kept for admin console tab) ─────────── */

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
      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4)` }}
    >
      {/* Colored header band */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)" }}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/85">{label}</p>
      </div>
      {/* Dark body */}
      <div className="p-4" style={{ background: "rgba(13,13,30,0.95)", border: `1px solid ${color}25`, borderTop: "none" }}>
        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-25 group-hover:opacity-50 transition-opacity"
          style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, filter: "blur(20px)" }} />
        <p className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "'Orbitron', system-ui" }}>{value}</p>
        <p className="mt-1 text-[11px] text-white/40">{helper}</p>
      </div>
    </div>
  );
}

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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-mono tracking-[0.4em] text-[#e11d48]/70 uppercase mb-1">COMMAND CENTER</p>
          <h2 className="text-xl font-black tracking-wide text-white" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>Mission Modules</h2>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "core"] as const).map((f) => (
            <button
              key={f} type="button" onClick={() => setModuleFilter(f)}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {modules.map((item) => {
          const acc = MODULE_ACCENTS[item.href] ?? MODULE_ACCENTS["/settings"]!;
          return (
            <Link key={item.href} href={item.href} className="block">
              <div
                className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 active:scale-[0.99]"
                style={{ boxShadow: `0 6px 24px rgba(0,0,0,0.45)` }}
              >
                {/* Colored top strip */}
                <div
                  className="flex items-center gap-2.5 px-4 py-3"
                  style={{ background: `linear-gradient(135deg, ${acc.from} 0%, ${acc.via} 100%)` }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}>
                    <item.Icon className="h-4 w-4 text-white" strokeWidth={1.75} />
                  </div>
                  <p className="text-[10px] font-bold tracking-wide text-white leading-tight truncate" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>{item.label}</p>
                </div>
                {/* Dark body */}
                <div className="flex-1 px-4 py-3" style={{ background: `linear-gradient(135deg, ${acc.from}12 0%, rgba(10,10,22,0.97) 70%)`, border: `1px solid ${acc.border}`, borderTop: "none" }}>
                  {item.description && <p className="text-[10px] leading-snug text-white/45 line-clamp-2 mb-2">{item.description}</p>}
                  <div className="flex items-center gap-1.5">
                    <span className="h-[5px] w-[5px] rounded-full animate-pulse" style={{ background: acc.from, boxShadow: `0 0 5px ${acc.glow}` }} />
                    <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: `${acc.from}90` }}>Launch</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HeroSection() {
  return (
    <div className="relative col-span-2 overflow-hidden rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(225,29,72,0.12) 0%, rgba(13,13,30,0.97) 50%, rgba(6,182,212,0.08) 100%)", border: "1px solid rgba(225,29,72,0.2)" }}>
      <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(40px)" }} />
      <p className="text-[10px] font-mono tracking-[0.4em] text-[#e11d48]/70 uppercase mb-2">Command Surface</p>
      <h2 className="text-xl font-black tracking-wide text-white mb-2" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>Unified Control for Modules, Engines & Stack Health</h2>
      <p className="text-sm text-white/50 mb-4 max-w-xl">Mission console — launch orchestration, monitor engine state, and verify fused stack readiness.</p>
      <div className="flex flex-wrap gap-2">
        {[{ href: "/modules", label: "Open Orchestrator", color: "#7c3aed" }, { href: "/ops", label: "Ops Console", color: "#ea580c" }, { href: "/intelligence", label: "Intelligence Hub", color: "#06b6d4" }].map(({ href, label, color }) => (
          <Link key={href} href={href}>
            <button type="button" className="rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:scale-105" style={{ background: `${color}20`, border: `1px solid ${color}40`, fontFamily: "'Orbitron', system-ui" }}>{label}</button>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HealthRail({ healthPercent, onlineEngines, totalEngines, degradedEngines, offlineEngines }: { healthPercent: number; onlineEngines: number; totalEngines: number; degradedEngines: number; offlineEngines: number }) {
  const health = healthPercent;
  const color = health >= 80 ? "#22c55e" : health >= 50 ? "#f59e0b" : "#e11d48";
  return (
    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
        {[{ val: onlineEngines, label: "Online", color: "#22c55e" }, { val: degradedEngines, label: "Degraded", color: "#f59e0b" }, { val: offlineEngines, label: "Offline", color: "#e11d48" }].map(({ val, label, color: c }) => (
          <div key={label} className="rounded-xl py-2" style={{ background: `${c}10`, border: `1px solid ${c}25` }}>
            <p className="text-lg font-black" style={{ color: c }}>{val}</p>
            <p className="text-[9px] text-white/35 font-mono uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const metricIcons = { fused: Monitor, ai: ShieldCheck, engine: Cpu, status: Zap };

export function MetricsSection({ stackSummary, onlineEngines, totalEngines, degradedEngines }: { stackSummary?: StackSummaryResponse; onlineEngines: number; totalEngines: number; degradedEngines: number }) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={metricIcons.fused} label="Fused Origin" value={(stackSummary as any)?.stack?.fused?.liveOrigin?.replace(/https?:\/\//, "") ?? "Loading…"} helper="Single public endpoint" color="#06b6d4" />
      <StatCard icon={metricIcons.ai} label="AI Service" value={(stackSummary as any)?.cyrusAiReachable ? "Online" : "Degraded"} helper={(stackSummary as any)?.stack?.cyrusAi?.baseUrl ?? "No URL reported"} color="#7c3aed" />
      <StatCard icon={metricIcons.engine} label="Engine Health" value={`${onlineEngines}/${totalEngines}`} helper={`${degradedEngines} degraded`} color="#22c55e" />
      <StatCard icon={metricIcons.status} label="Stack Status" value={(stackSummary as any)?.success ? "Stable" : "Checking"} helper="Live from /api/stack/summary" color="#e11d48" />
    </section>
  );
}

export function EngineMatrixSection({ modules, navLabelByRoute }: { modules: DashboardModuleStatus[]; navLabelByRoute: Map<string, string> }) {
  return (
    <section className="relative overflow-hidden rounded-2xl p-5" style={{ background: "rgba(13,13,30,0.9)", border: "1px solid rgba(225,29,72,0.12)" }}>
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
          const accent = MODULE_ACCENTS[route ?? "/settings"] ?? MODULE_ACCENTS["/settings"]!;
          return (
            <div key={module.id} className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 hover:brightness-110" style={{ background: `${accent.from}08`, border: `1px solid ${accent.border}35`, borderLeft: `3px solid ${accent.from}60` }}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/90">{module.name}</p>
                <p className="text-[10px] font-mono uppercase tracking-wide text-white/40">{module.category}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", statusTone(module.status))}>{module.status}</span>
                <StatusIcon status={module.status} />
                {route && (
                  <Link href={route}>
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] transition-all hover:brightness-125" style={{ background: `${accent.from}20`, border: `1px solid ${accent.border}`, color: accent.icon }}>{navLabelByRoute.get(route) ?? "Open"}</span>
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

export function HeaderBadge({ livePort }: { livePort?: number }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-mono" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#67e8f9" }}>
      PORT {livePort ?? "—"}
    </span>
  );
}
