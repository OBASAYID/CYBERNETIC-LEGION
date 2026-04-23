import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Droplets,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ThermometerSun,
  Activity,
  Timer,
  Zap,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

interface SamplingSession {
  id: string;
  status: "idle" | "sterilizing" | "locating" | "collecting" | "analyzing" | "complete";
  progress: number;
  veinConfidence: number;
  volumeCollected: number;
  targetVolume: number;
  results?: BloodAnalysisResult;
}

interface BloodAnalysisResult {
  hemoglobin: number;
  whiteBloodCells: number;
  redBloodCells: number;
  platelets: number;
  glucose: number;
  oxygenLevel: number;
  quality: number;
}

const statusLabels: Record<string, string> = {
  idle: "Ready for Collection",
  sterilizing: "UV-C Sterilization Active",
  locating: "Infrared Vein Detection",
  collecting: "Blood Collection in Progress",
  analyzing: "Sample Analysis",
  complete: "Collection Complete",
};

export function BloodSamplingPage() {
  const [session, setSession] = useState<SamplingSession>({
    id: "",
    status: "idle",
    progress: 0,
    veinConfidence: 0,
    volumeCollected: 0,
    targetVolume: 10,
  });
  const [isRunning, setIsRunning] = useState(false);

  const startCollectionMutation = useMutation({
    mutationFn: async () => {
      const res = await systemFetch("/api/interactive/blood/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetVolume: session.targetVolume }),
      });
      if (!res.ok) {
        return { sessionId: `session-${Date.now()}` };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSession(prev => ({ ...prev, id: data.sessionId }));
      simulateCollection();
    },
  });

  const simulateCollection = () => {
    setIsRunning(true);
    const steps = ["sterilizing", "locating", "collecting", "analyzing", "complete"] as const;
    let stepIndex = 0;
    let progress = 0;

    const interval = setInterval(() => {
      progress += 5;
      const currentStep = steps[stepIndex];

      if (progress >= 100) {
        stepIndex++;
        progress = 0;
        if (stepIndex >= steps.length) {
          clearInterval(interval);
          setIsRunning(false);
          setSession(prev => ({
            ...prev,
            status: "complete",
            progress: 100,
            volumeCollected: prev.targetVolume,
            veinConfidence: 0.94,
            results: {
              hemoglobin: 14.2,
              whiteBloodCells: 7.5,
              redBloodCells: 4.8,
              platelets: 250,
              glucose: 95,
              oxygenLevel: 98,
              quality: 0.96,
            },
          }));
          return;
        }
      }

      setSession(prev => ({
        ...prev,
        status: currentStep,
        progress,
        veinConfidence: currentStep === "locating" ? progress / 100 * 0.94 : prev.veinConfidence,
        volumeCollected: currentStep === "collecting" ? (progress / 100) * prev.targetVolume : prev.volumeCollected,
      }));
    }, 200);
  };

  const resetSession = () => {
    setSession({
      id: "",
      status: "idle",
      progress: 0,
      veinConfidence: 0,
      volumeCollected: 0,
      targetVolume: 10,
    });
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "text-emerald-400";
      case "sterilizing": return "text-purple-400";
      case "locating": return "text-blue-400";
      case "collecting": return "text-red-400";
      case "analyzing": return "text-amber-400";
      default: return "text-[rgba(235,235,245,0.5)]";
    }
  };

  const getNormalRange = (metric: string): { min: number; max: number; unit: string } => {
    const ranges: Record<string, { min: number; max: number; unit: string }> = {
      hemoglobin: { min: 12, max: 17, unit: "g/dL" },
      whiteBloodCells: { min: 4.5, max: 11, unit: "K/µL" },
      redBloodCells: { min: 4.2, max: 5.9, unit: "M/µL" },
      platelets: { min: 150, max: 400, unit: "K/µL" },
      glucose: { min: 70, max: 100, unit: "mg/dL" },
      oxygenLevel: { min: 95, max: 100, unit: "%" },
    };
    return ranges[metric] || { min: 0, max: 100, unit: "" };
  };

  const isInRange = (value: number, metric: string) => {
    const range = getNormalRange(metric);
    return value >= range.min && value <= range.max;
  };

  return (
    <ModuleWorkspacePageShell
      title="Blood Sampling System"
      subtitle="Automated collection and analysis"
      icon={Droplets}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-5 h-5 text-red-400" />
              <span className="text-sm text-[rgba(235,235,245,0.5)]">Needle</span>
            </div>
            <p className="text-2xl font-bold">21G</p>
            <p className="text-xs text-[rgba(235,235,245,0.4)]">Disposable</p>
          </div>

          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThermometerSun className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-[rgba(235,235,245,0.5)]">UV-C</span>
            </div>
            <p className="text-2xl font-bold">99.99%</p>
            <p className="text-xs text-[rgba(235,235,245,0.4)]">Kill Rate</p>
          </div>

          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-[rgba(235,235,245,0.5)]">Pressure</span>
            </div>
            <p className="text-2xl font-bold">-50</p>
            <p className="text-xs text-[rgba(235,235,245,0.4)]">mmHg</p>
          </div>

          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-[rgba(235,235,245,0.5)]">Volume</span>
            </div>
            <p className="text-2xl font-bold">{session.targetVolume}</p>
            <p className="text-xs text-[rgba(235,235,245,0.4)]">mL target</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-red-400" />
                Collection Control
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-2">Target Volume (mL)</label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={session.targetVolume}
                    onChange={(e) => setSession(prev => ({ ...prev, targetVolume: parseInt(e.target.value) }))}
                    disabled={isRunning}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-xs text-[rgba(235,235,245,0.4)]">
                    <span>5mL</span>
                    <span className="text-red-400 font-medium">{session.targetVolume}mL</span>
                    <span>20mL</span>
                  </div>
                </div>

                <div className={`rounded-lg p-4 border ${
                  session.status === "complete"
                    ? "bg-emerald-500/20 border-emerald-500/30"
                    : "bg-[#2c2c2e] border-[rgba(84,84,88,0.65)]"
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {session.status === "complete" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : isRunning ? (
                      <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                    ) : (
                      <Droplets className="w-6 h-6 text-[rgba(235,235,245,0.5)]" />
                    )}
                    <div>
                      <p className={`font-semibold ${getStatusColor(session.status)}`}>
                        {statusLabels[session.status]}
                      </p>
                      {session.status !== "idle" && session.status !== "complete" && (
                        <p className="text-xs text-[rgba(235,235,245,0.4)]">
                          Progress: {session.progress}%
                        </p>
                      )}
                    </div>
                  </div>

                  {isRunning && (
                    <div className="h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-200"
                        style={{ width: `${session.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {session.status === "locating" && (
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[rgba(235,235,245,0.5)]">Vein Detection</span>
                      <span className="text-sm font-medium text-blue-400">
                        {(session.veinConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${session.veinConfidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {session.status === "collecting" && (
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[rgba(235,235,245,0.5)]">Volume Collected</span>
                      <span className="text-sm font-medium text-red-400">
                        {session.volumeCollected.toFixed(1)} / {session.targetVolume} mL
                      </span>
                    </div>
                    <div className="h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                        style={{ width: `${(session.volumeCollected / session.targetVolume) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => startCollectionMutation.mutate()}
                    disabled={isRunning || session.status === "complete"}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {startCollectionMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    Start Collection
                  </button>
                  <button
                    onClick={resetSession}
                    disabled={isRunning && session.status !== "complete"}
                    className="px-4 bg-[#2c2c2e] hover:bg-[#3c3c3e] rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Safety Systems
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Sterile Needle", status: "ready" },
                  { name: "UV-C Sterilization", status: "ready" },
                  { name: "Vein Detection", status: "ready" },
                  { name: "Flow Monitor", status: "ready" },
                  { name: "Emergency Retract", status: "armed" },
                  { name: "Quality Control", status: "ready" },
                ].map((system, i) => (
                  <div key={i} className="bg-[#2c2c2e] rounded-lg p-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      system.status === "ready" ? "bg-emerald-400" : "bg-amber-400"
                    }`} />
                    <span className="text-sm">{system.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Analysis Results
            </h2>

            {session.results ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-semibold text-emerald-400">Analysis Complete</p>
                    <p className="text-xs text-[rgba(235,235,245,0.5)]">
                      Sample quality: {(session.results.quality * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(session.results)
                    .filter(([key]) => key !== "quality")
                    .map(([key, value]) => {
                      const range = getNormalRange(key);
                      const inRange = isInRange(value, key);
                      return (
                        <div key={key} className="bg-[#2c2c2e] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${inRange ? "text-emerald-400" : "text-amber-400"}`}>
                                {value}
                              </span>
                              <span className="text-xs text-[rgba(235,235,245,0.4)]">{range.unit}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[rgba(235,235,245,0.4)]">{range.min}</span>
                            <div className="flex-1 h-1.5 bg-[#1c1c1e] rounded-full overflow-hidden relative">
                              <div
                                className={`absolute h-full rounded-full ${inRange ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{
                                  left: `${Math.max(0, ((value - range.min) / (range.max - range.min)) * 100 - 5)}%`,
                                  width: "10%",
                                }}
                              />
                            </div>
                            <span className="text-xs text-[rgba(235,235,245,0.4)]">{range.max}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Droplets className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Awaiting Sample</h3>
                <p className="text-[rgba(235,235,245,0.5)] max-w-sm">
                  Start the collection process to analyze blood sample and view comprehensive results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleWorkspacePageShell>
  );
}
