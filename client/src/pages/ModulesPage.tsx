import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import {
  getModuleOrchestratorSurfaces,
  MODULE_ORCHESTRATOR_HEADER_ICON,
} from "../../../cyrus-ui/src/config/command-center-nav";
import {
  Brain,
  Zap,
  Globe,
  Shield,
  TrendingUp,
  Atom,
  Play,
  Boxes,
  Microscope,
  Eye,
  Activity,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Droplets,
  LayoutGrid,
  Satellite,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { systemFetch } from "@shared/cyrus-api-client";

const SURFACE_CONSOLE = getModuleOrchestratorSurfaces();

const PANEL: React.CSSProperties = {
  background: "rgba(13,13,30,0.75)",
  backdropFilter: "blur(12px)",
};

const INNER: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
};

interface ModuleStatus {
  id: string;
  name: string;
  category: "core" | "advanced" | "interactive";
  status: "operational" | "degraded" | "offline";
  metrics: Record<string, number | string>;
  lastUpdate: number;
}

interface SystemHealth {
  operational: number;
  degraded: number;
  offline: number;
  overallHealth: number;
}

interface ModulesResponse {
  success: boolean;
  modules: ModuleStatus[];
  health: SystemHealth;
  totalModules: number;
  coreModules: number;
  advancedModules: number;
  interactiveModules?: number;
}

const moduleIcons: Record<string, any> = {
  "vector-knowledge": Brain,
  "emotional-cognition": Activity,
  "universal-language": Globe,
  "decentralized-intelligence": Boxes,
  "iot-ntn-connectivity": Satellite,
  "ethical-governance": Shield,
  "self-evolution": TrendingUp,
  "quantum-neural": Atom,
  "ai-simulations": Play,
  "cross-dimensional": Boxes,
  "nanotechnology": Microscope,
  "hyperlinked-reality": Eye,
  "bio-neural": Activity,
  "adaptive-hardware": Settings,
  "biology": Microscope,
  "environmental": Globe,
  "medical": Activity,
  "robotic": Settings,
  "teaching": Brain,
  "security": Shield,
  "blood-sampling": Droplets,
};

const moduleBorderColors: Record<string, string> = {
  "vector-knowledge": "border-purple-500/30",
  "emotional-cognition": "border-pink-500/30",
  "universal-language": "border-cyan-500/30",
  "decentralized-intelligence": "border-emerald-500/30",
  "ethical-governance": "border-amber-500/30",
  "self-evolution": "border-teal-500/30",
  "quantum-neural": "border-violet-500/30",
  "ai-simulations": "border-[#e11d48]/30",
  "biology": "border-emerald-500/30",
  "medical": "border-[#e11d48]/30",
  "security": "border-white/[0.08]",
};

const moduleIconColors: Record<string, string> = {
  "vector-knowledge": "text-purple-400",
  "emotional-cognition": "text-pink-400",
  "universal-language": "text-[#06b6d4]",
  "decentralized-intelligence": "text-emerald-400",
  "ethical-governance": "text-amber-400",
  "self-evolution": "text-teal-400",
  "quantum-neural": "text-violet-400",
  "ai-simulations": "text-[#e11d48]",
  "biology": "text-emerald-400",
  "medical": "text-[#e11d48]",
  "security": "text-white/60",
};

export function ModulesPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "core" | "advanced" | "interactive">("all");

  const { data, isLoading, refetch, isFetching } = useQuery<ModulesResponse>({
    queryKey: ["/api/orchestrator/modules"],
    queryFn: async () => {
      const res = await systemFetch("/api/orchestrator/modules");
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const filteredModules = data?.modules.filter(m =>
    selectedCategory === "all" || m.category === selectedCategory
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "degraded": return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default: return <XCircle className="w-4 h-4 text-[#e11d48]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "degraded": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-[#e11d48]/20 text-[#e11d48] border-[#e11d48]/30";
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "core": return "bg-violet-500/20 text-violet-300 border-violet-500/20";
      case "advanced": return "bg-[#06b6d4]/20 text-cyan-300 border-cyan-500/20";
      default: return "bg-emerald-500/20 text-emerald-300 border-emerald-500/20";
    }
  };

  return (
    <ModuleWorkspacePageShell
      title="Module Orchestrator"
      subtitle={`${data?.totalModules ?? 19} AI modules working in unified harmony`}
      icon={MODULE_ORCHESTRATOR_HEADER_ICON}
      headerEnd={
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.1] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-[#e11d48]" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="mx-auto max-w-cyrus-page space-y-6">
        <section
          className="rounded-xl border border-[rgba(84,84,88,0.65)] bg-[#1c1c1e] overflow-hidden"
          aria-label="Module console"
        >
          <div className="px-4 py-3.5 border-b border-[rgba(84,84,88,0.45)]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Module console */}
        <section className="rounded-xl border border-white/[0.08] overflow-hidden" style={PANEL} aria-label="Module console">
          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e11d48]/15 border border-[#e11d48]/20">
                <LayoutGrid className="h-4 w-4 text-[#e11d48]" aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight" style={{ fontFamily: "'Orbitron', system-ui" }}>Module Console</h2>
                <p className="text-xs text-white/40 mt-0.5">All Command Center screens — same as the sidebar, arranged for quick access.</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {SURFACE_CONSOLE.map(({ path, label, sublabel, Icon }) => (
              <Link
                key={path}
                href={path}
                className="block rounded-lg border border-white/[0.06] p-3.5 outline-none transition-all hover:border-[#e11d48]/30 hover:bg-[#e11d48]/[0.04] focus-visible:ring-1 focus-visible:ring-[#e11d48]/40"
                style={INNER}
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e11d48]/10 border border-[#e11d48]/20">
                    <Icon className="h-5 w-5 text-[#e11d48]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white leading-snug">{label}</p>
                    <p className="text-xs text-white/40 mt-0.5 leading-snug line-clamp-2">{sublabel}</p>
                    <p className="mt-2 font-mono text-[10px] text-[#e11d48]/70 tabular-nums">{path === "/" ? "/" : path}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Health stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { Icon: MODULE_ORCHESTRATOR_HEADER_ICON, label: "Total", value: data.totalModules, color: "text-[#e11d48]", border: "border-[#e11d48]/20", glow: "rgba(225,29,72,0.12)" },
              { Icon: CheckCircle2, label: "Operational", value: data.health.operational, color: "text-emerald-400", border: "border-emerald-500/20", glow: "rgba(34,197,94,0.1)" },
              { Icon: Zap, label: "Core", value: data.coreModules, color: "text-violet-400", border: "border-violet-500/20", glow: "rgba(139,92,246,0.1)" },
              { Icon: Atom, label: "Advanced", value: data.advancedModules, color: "text-[#06b6d4]", border: "border-cyan-500/20", glow: "rgba(6,182,212,0.1)" },
            ].map(({ Icon, label, value, color, border, glow }) => (
              <div key={label} className={`rounded-xl border ${border} p-4`} style={{ ...PANEL, boxShadow: `0 0 16px ${glow}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: glow.replace("0.1", "0.15").replace("0.12", "0.15") }}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-white/50 text-sm">{label}</span>
                </div>
                <p className={`text-3xl font-bold ${color}`} style={{ fontFamily: "'Orbitron', system-ui" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Health bar */}
        {data && (
          <div className="rounded-xl border border-white/[0.08] p-4" style={PANEL}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50 font-mono uppercase tracking-wider">System Health</span>
              <span className="text-sm font-semibold text-emerald-400" style={{ fontFamily: "'Orbitron', system-ui" }}>{data.health.overallHealth}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full bg-gradient-to-r from-[#e11d48] via-amber-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${data.health.overallHealth}%` }}
              />
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "core", "advanced", "interactive"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedCategory === cat
                  ? "bg-[#e11d48] border-[#e11d48] text-white shadow-[0_0_16px_rgba(225,29,72,0.4)]"
                  : "border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.15]"
              }`}
              style={selectedCategory !== cat ? INNER : {}}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Module grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#e11d48]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((module) => {
              const Icon = moduleIcons[module.id] || MODULE_ORCHESTRATOR_HEADER_ICON;
              const iconColor = moduleIconColors[module.id] || "text-[#e11d48]";
              const borderColor = moduleBorderColors[module.id] || "border-white/[0.08]";

              return (
                <div
                  key={module.id}
                  className={`rounded-xl border ${borderColor} p-5 transition-all hover:border-[#e11d48]/30`}
                  style={PANEL}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#e11d48]/10 border border-[#e11d48]/20 rounded-xl flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{module.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryBadge(module.category)}`}>
                          {module.category}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${getStatusBadge(module.status)}`}>
                      {getStatusIcon(module.status)}
                      <span className="text-xs font-medium capitalize">{module.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(module.metrics).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="rounded-lg p-2 border border-white/[0.04]" style={INNER}>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{key}</p>
                        <p className="text-lg font-semibold text-white">
                          {typeof value === "number"
                            ? value >= 1 ? value.toLocaleString() : value.toFixed(2)
                            : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Architecture summary */}
        <div className="rounded-xl border border-white/[0.08] p-6" style={PANEL}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', system-ui" }}>
            <Zap className="w-5 h-5 text-[#e11d48]" />
            Unified Processing Architecture
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            All modules are orchestrated as a unified cognitive system. Every interaction benefits from:
            emotional intelligence analysis, multi-language support, ethical governance checks,
            quantum-enhanced processing, simulation capabilities, and hardware integration.
            The Module Orchestrator ensures seamless coordination with zero conflicts.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "229", label: "Languages", color: "text-[#06b6d4]" },
              { value: "86", label: "Cognitive Branches", color: "text-violet-400" },
              { value: "3.6K", label: "Neural Pathways", color: "text-emerald-400" },
              { value: "99.9%", label: "Coherence", color: "text-[#e11d48]" },
            ].map(({ value, label, color }) => (
              <div key={label} className="text-center p-3 rounded-lg border border-white/[0.06]" style={INNER}>
                <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'Orbitron', system-ui" }}>{value}</p>
                <p className="text-xs text-white/40 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleWorkspacePageShell>
  );
}
