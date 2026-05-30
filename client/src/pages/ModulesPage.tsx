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

const moduleColors: Record<string, string> = {
  "vector-knowledge": "from-purple-500 to-indigo-600",
  "emotional-cognition": "from-pink-500 to-rose-600",
  "universal-language": "from-blue-500 to-cyan-600",
  "decentralized-intelligence": "from-green-500 to-emerald-600",
  "iot-ntn-connectivity": "from-sky-500 to-indigo-600",
  "ethical-governance": "from-amber-500 to-orange-600",
  "self-evolution": "from-teal-500 to-cyan-600",
  "quantum-neural": "from-violet-500 to-purple-600",
  "ai-simulations": "from-red-500 to-orange-600",
  "cross-dimensional": "from-indigo-500 to-blue-600",
  "nanotechnology": "from-lime-500 to-green-600",
  "hyperlinked-reality": "from-fuchsia-500 to-pink-600",
  "bio-neural": "from-cyan-500 to-blue-600",
  "adaptive-hardware": "from-gray-500 to-slate-600",
  "biology": "from-green-500 to-emerald-600",
  "environmental": "from-sky-500 to-blue-600",
  "medical": "from-red-500 to-rose-600",
  "robotic": "from-zinc-500 to-gray-600",
  "teaching": "from-yellow-500 to-amber-600",
  "security": "from-slate-500 to-zinc-600",
  "blood-sampling": "from-red-600 to-rose-700",
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
      case "operational":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "degraded":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
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
          className="flex items-center gap-2 rounded-lg bg-[#2c2c2e] px-4 py-2 transition-colors hover:bg-[#3c3c3e] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
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
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15">
                <LayoutGrid className="h-4 w-4 text-cyan-400" aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Module console</h2>
                <p className="text-xs text-[rgba(235,235,245,0.45)] mt-0.5">
                  All Command Center screens — same as the sidebar, arranged for quick access.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {SURFACE_CONSOLE.map(({ path, label, sublabel, Icon }) => (
              <Link
                key={path}
                href={path}
                className="block rounded-lg border border-[rgba(84,84,88,0.5)] bg-[#2c2c2e]/50 p-3.5 outline-none transition-colors hover:border-cyan-500/40 hover:bg-[#2c2c2e] focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1c1e]"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(10,132,255,0.12)]">
                    <Icon className="h-5 w-5 text-[#0a84ff]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white leading-snug">{label}</p>
                    <p className="text-xs text-[rgba(235,235,245,0.5)] mt-0.5 leading-snug line-clamp-2">
                      {sublabel}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-[rgba(245,158,11,0.85)] tabular-nums">
                      {path === "/" ? "/" : path}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <MODULE_ORCHESTRATOR_HEADER_ICON className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-[rgba(235,235,245,0.5)] text-sm">Total</span>
              </div>
              <p className="text-3xl font-bold">{data.totalModules}</p>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[rgba(235,235,245,0.5)] text-sm">Operational</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{data.health.operational}</p>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-[rgba(235,235,245,0.5)] text-sm">Core</span>
              </div>
              <p className="text-3xl font-bold text-purple-400">{data.coreModules}</p>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Atom className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[rgba(235,235,245,0.5)] text-sm">Advanced</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{data.advancedModules}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[rgba(235,235,245,0.5)]">System Health</span>
              <span className="text-sm font-semibold text-emerald-400">{data.health.overallHealth}%</span>
            </div>
            <div className="h-3 bg-[#2c2c2e] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${data.health.overallHealth}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(["all", "core", "advanced", "interactive"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-[#0a84ff] text-white"
                  : "bg-[#2c2c2e] text-[rgba(235,235,245,0.6)] hover:bg-[#3c3c3e]"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((module) => {
              const Icon = moduleIcons[module.id] || MODULE_ORCHESTRATOR_HEADER_ICON;
              const gradient = moduleColors[module.id] || "from-gray-500 to-slate-600";
              
              return (
                <div
                  key={module.id}
                  className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5 hover:border-[rgba(84,84,88,0.9)] transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{module.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          module.category === "core" 
                            ? "bg-purple-500/20 text-purple-400" 
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {module.category}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${getStatusColor(module.status)}`}>
                      {getStatusIcon(module.status)}
                      <span className="text-xs font-medium capitalize">{module.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(module.metrics).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="bg-[#2c2c2e] rounded-lg p-2">
                        <p className="text-[10px] text-[rgba(235,235,245,0.4)] uppercase tracking-wider">{key}</p>
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

        <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Unified Processing Architecture
          </h2>
          <p className="text-[rgba(235,235,245,0.6)] text-sm leading-relaxed">
            All 13 modules are orchestrated as a unified cognitive system. Every interaction benefits from:
            emotional intelligence analysis, multi-language support, ethical governance checks,
            quantum-enhanced processing, simulation capabilities, and hardware integration.
            The Module Orchestrator ensures seamless coordination with zero conflicts.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-[#2c2c2e] rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">229</p>
              <p className="text-xs text-[rgba(235,235,245,0.4)]">Languages</p>
            </div>
            <div className="text-center p-3 bg-[#2c2c2e] rounded-lg">
              <p className="text-2xl font-bold text-purple-400">86</p>
              <p className="text-xs text-[rgba(235,235,245,0.4)]">Cognitive Branches</p>
            </div>
            <div className="text-center p-3 bg-[#2c2c2e] rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">3.6K</p>
              <p className="text-xs text-[rgba(235,235,245,0.4)]">Neural Pathways</p>
            </div>
            <div className="text-center p-3 bg-[#2c2c2e] rounded-lg">
              <p className="text-2xl font-bold text-amber-400">99.9%</p>
              <p className="text-xs text-[rgba(235,235,245,0.4)]">Coherence</p>
            </div>
          </div>
        </div>
      </div>
    </ModuleWorkspacePageShell>
  );
}
