import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RefreshCw, Rocket, Square, Zap } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

type MissionControlProps = {
  operatorRole: string;
};

export function MissionControl({ operatorRole }: MissionControlProps) {
  const isAdmin = operatorRole === "admin";
  const queryClient = useQueryClient();
  const [objective, setObjective] = useState("Stabilize current intelligence posture and keep mission safeguards synchronized.");
  const [missionId, setMissionId] = useState("");

  const missionsQuery = useQuery({ queryKey: ["missions"], queryFn: cyrusApi.getMissions });

  const startMutation = useMutation({
    mutationFn: () => cyrusApi.startMission({ objective: objective.trim(), missionId: missionId.trim() || undefined, metadata: { launched_from: "command_center" } }),
    onSuccess: async () => {
      setMissionId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["missions"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
      ]);
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => cyrusApi.stopMission(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["missions"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
      ]);
    },
  });

  const trainingMutation = useMutation({
    mutationFn: cyrusApi.triggerTraining,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });

  const activeCount = useMemo(() => (missionsQuery.data || []).filter((mission) => mission.status === "running").length, [missionsQuery.data]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.18),_transparent_35%),linear-gradient(180deg,rgba(20,9,4,0.96),rgba(10,8,8,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Mission Control</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Launch, track, and stop active directives</h2>
        </div>
        <div className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-100">{activeCount} active</div>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
        <textarea
          rows={4}
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          className="w-full resize-none rounded-[1rem] border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-white outline-none focus:border-orange-300/40"
          placeholder="Describe the mission objective"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={missionId}
            onChange={(event) => setMissionId(event.target.value)}
            className="flex-1 rounded-full border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-white outline-none focus:border-orange-300/40"
            placeholder="Optional mission ID"
          />
          <button
            onClick={() => startMutation.mutate()}
            disabled={!isAdmin || !objective.trim() || startMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500/20 px-5 py-3 text-sm font-medium text-orange-50 transition hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {startMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Mission
          </button>
          <button
            onClick={() => trainingMutation.mutate()}
            disabled={!isAdmin || trainingMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500/15 px-5 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {trainingMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Trigger Training
          </button>
        </div>
        {!isAdmin && <p className="mt-3 text-sm text-amber-100">Mission launch and training controls require admin clearance.</p>}
      </div>

      <div className="mt-4 space-y-3">
        {(missionsQuery.data || []).length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No active missions recorded.</p>}
        {(missionsQuery.data || []).map((mission) => (
          <article key={mission.missionId} className="rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <Rocket className="h-4 w-4 text-orange-300" />
                  <h3 className="font-semibold">{mission.missionId}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-300">{mission.objective}</p>
                <p className="mt-2 text-xs text-slate-500">Updated {mission.updatedAt ? new Date(mission.updatedAt * 1000).toLocaleString() : "n/a"}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mission.status === "running" ? "bg-emerald-500/15 text-emerald-100" : "bg-slate-700/60 text-slate-200"}`}>
                  {mission.status}
                </span>
                <button
                  onClick={() => stopMutation.mutate(mission.missionId)}
                  disabled={!isAdmin || stopMutation.isPending || mission.status !== "running"}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {(missionsQuery.error || startMutation.error || stopMutation.error || trainingMutation.error) && (
        <p className="mt-4 text-sm text-rose-300">
          {missionsQuery.error?.message || startMutation.error?.message || stopMutation.error?.message || trainingMutation.error?.message}
        </p>
      )}
    </section>
  );
}