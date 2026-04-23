import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, MapPinned, Mic, Play, Power, RefreshCw, Square, UserRound, Waypoints } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

type EmbodiedControlProps = {
  operatorRole: string;
};

function asBool(value: unknown) {
  return value === true;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function EmbodiedControl({ operatorRole }: EmbodiedControlProps) {
  const isAdmin = operatorRole === "admin";
  const queryClient = useQueryClient();

  const [tickHz, setTickHz] = useState(2);
  const [goalType, setGoalType] = useState("observe");
  const [goalPriority, setGoalPriority] = useState("normal");
  const [goalSteps, setGoalSteps] = useState("observe_area\ntrack_person");
  const [missionStopReason, setMissionStopReason] = useState("manual_stop");

  const [identityId, setIdentityId] = useState("operator-primary");
  const [identityStyle, setIdentityStyle] = useState("balanced");
  const [voiceText, setVoiceText] = useState("Status check and mission intent confirmation.");

  const [takeoffAltitude, setTakeoffAltitude] = useState(10);
  const [gotoLat, setGotoLat] = useState(37.7749);
  const [gotoLon, setGotoLon] = useState(-122.4194);
  const [gotoAlt, setGotoAlt] = useState(15);

  const [swarmDroneId, setSwarmDroneId] = useState("drone-2");
  const [swarmPattern, setSwarmPattern] = useState("line");
  const [swarmAnchorLat, setSwarmAnchorLat] = useState(37.7749);
  const [swarmAnchorLon, setSwarmAnchorLon] = useState(-122.4194);
  const [swarmSpacing, setSwarmSpacing] = useState(20);
  const [swarmPursuers, setSwarmPursuers] = useState(2);

  const embodimentQuery = useQuery({
    queryKey: ["embodiment-status"],
    queryFn: cyrusApi.getEmbodimentStatus,
  });

  const swarmQuery = useQuery({
    queryKey: ["swarm-status"],
    queryFn: cyrusApi.getSwarmStatus,
  });

  const swarmMapQuery = useQuery({
    queryKey: ["swarm-map"],
    queryFn: cyrusApi.getSwarmMap,
  });

  const loopMutation = useMutation({
    mutationFn: (mode: "start" | "stop") => (mode === "start" ? cyrusApi.startEmbodiment(tickHz) : cyrusApi.stopEmbodiment()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["embodiment-status"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });

  const missionMutation = useMutation({
    mutationFn: (mode: "start" | "stop") => {
      if (mode === "stop") {
        return cyrusApi.stopEmbodiedMission(missionStopReason);
      }

      const steps = goalSteps
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean)
        .map((action, index) => ({ action, order: index + 1 }));

      return cyrusApi.startEmbodiedMission({
        type: goalType,
        priority: goalPriority,
        constraints: { source: "command_center" },
        steps,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["embodiment-status"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });

  const humanMutation = useMutation({
    mutationFn: (mode: "register" | "process") => {
      if (mode === "register") {
        return cyrusApi.registerEmbodiedIdentity(identityId, {
          response_style: identityStyle,
          preferences: {
            interaction_channel: "voice",
            source: "command_center",
          },
        });
      }
      return cyrusApi.processEmbodiedVoice(identityId, voiceText);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["embodiment-status"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });

  const droneMutation = useMutation({
    mutationFn: (action: "arm" | "disarm" | "takeoff" | "goto" | "land") => {
      if (action === "arm") return cyrusApi.armEmbodiedDrone();
      if (action === "disarm") return cyrusApi.disarmEmbodiedDrone();
      if (action === "takeoff") return cyrusApi.takeoffEmbodiedDrone(takeoffAltitude);
      if (action === "goto") return cyrusApi.gotoEmbodiedDrone(gotoLat, gotoLon, gotoAlt);
      return cyrusApi.landEmbodiedDrone();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["embodiment-status"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });

  const swarmMutation = useMutation({
    mutationFn: (action: "register" | "formation" | "pursuit") => {
      if (action === "register") return cyrusApi.registerSwarmDrone(swarmDroneId);
      if (action === "formation") return cyrusApi.setSwarmFormation(swarmPattern, swarmAnchorLat, swarmAnchorLon, swarmSpacing);
      return cyrusApi.triggerSwarmPursuit(swarmPursuers);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["swarm-status"] }),
        queryClient.invalidateQueries({ queryKey: ["swarm-map"] }),
        queryClient.invalidateQueries({ queryKey: ["embodiment-status"] }),
      ]);
    },
  });

  const snapshot = embodimentQuery.data?.snapshot as Record<string, unknown> | undefined;
  const drone = embodimentQuery.data?.drone as Record<string, unknown> | undefined;
  const mission = embodimentQuery.data?.mission as Record<string, unknown> | undefined;
  const running = asBool(embodimentQuery.data?.running);
  const missionActive = asBool(mission?.active);
  const iteration = asNumber(snapshot?.iteration, 0);
  const swarm = swarmQuery.data?.swarm as Record<string, unknown> | undefined;
  const tracking = swarmQuery.data?.tracking as Record<string, unknown> | undefined;
  const mapVersion = Number((swarmMapQuery.data?.version as number | undefined) || 0);

  const controlsDisabled = useMemo(
    () => !isAdmin || loopMutation.isPending || missionMutation.isPending || humanMutation.isPending || droneMutation.isPending || swarmMutation.isPending,
    [isAdmin, loopMutation.isPending, missionMutation.isPending, humanMutation.isPending, droneMutation.isPending, swarmMutation.isPending],
  );

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.12),_transparent_38%),linear-gradient(180deg,rgba(4,16,14,0.96),rgba(6,10,12,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Embodied Control</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Runtime loop, human interface, and drone operations</h2>
        </div>
        <button
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["embodiment-status"] });
            void queryClient.invalidateQueries({ queryKey: ["swarm-status"] });
            void queryClient.invalidateQueries({ queryKey: ["swarm-map"] });
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${(embodimentQuery.isFetching || swarmQuery.isFetching || swarmMapQuery.isFetching) ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Core Loop</p>
          <p className={`mt-2 text-lg font-semibold ${running ? "text-emerald-200" : "text-slate-200"}`}>{running ? "Running" : "Stopped"}</p>
          <p className="mt-1 text-xs text-slate-400">Iteration {iteration}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mission</p>
          <p className={`mt-2 text-lg font-semibold ${missionActive ? "text-cyan-200" : "text-slate-200"}`}>{missionActive ? "Active" : "Idle"}</p>
          <p className="mt-1 text-xs text-slate-400">Step {String(mission?.step_index || 0)} / {String(mission?.total_steps || 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Drone</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{String(drone?.mode || "standby")}</p>
          <p className="mt-1 text-xs text-slate-400">Alt {String(drone?.alt || 0)}m · Arm {asBool(drone?.armed) ? "on" : "off"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Swarm Members</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{String(swarm?.online || 0)} / {String(swarm?.registered || 0)}</p>
          <p className="mt-1 text-xs text-slate-400">Busy {String(swarm?.busy || 0)} · Queue {String(swarm?.queued_tasks || 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tracking</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{String(tracking?.active_targets || 0)} targets</p>
          <p className="mt-1 text-xs text-slate-400">Primary {String(tracking?.primary_target_id || "none")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">NXI Global Map</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">v{mapVersion}</p>
          <p className="mt-1 text-xs text-slate-400">Live world model revision</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-slate-200"><Power className="h-4 w-4 text-emerald-300" />Core Loop</div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={0.1}
              max={20}
              step={0.1}
              value={tickHz}
              onChange={(event) => setTickHz(Number(event.target.value) || 2)}
              className="w-28 rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/40"
            />
            <button
              onClick={() => loopMutation.mutate("start")}
              disabled={controlsDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
            <button
              onClick={() => loopMutation.mutate("stop")}
              disabled={controlsDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-4 py-2 text-sm text-rose-50 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-slate-200"><Waypoints className="h-4 w-4 text-cyan-300" />Embodied Mission</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={goalType}
              onChange={(event) => setGoalType(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              placeholder="goal type"
            />
            <input
              value={goalPriority}
              onChange={(event) => setGoalPriority(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              placeholder="priority"
            />
          </div>
          <textarea
            rows={3}
            value={goalSteps}
            onChange={(event) => setGoalSteps(event.target.value)}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            placeholder="one mission action per line"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => missionMutation.mutate("start")}
              disabled={controlsDisabled || !goalSteps.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
            <input
              value={missionStopReason}
              onChange={(event) => setMissionStopReason(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-rose-300/40"
              placeholder="stop reason"
            />
            <button
              onClick={() => missionMutation.mutate("stop")}
              disabled={controlsDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-4 py-2 text-sm text-rose-50 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-slate-200"><Mic className="h-4 w-4 text-violet-300" />Human Interface</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={identityId}
              onChange={(event) => setIdentityId(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"
              placeholder="identity id"
            />
            <input
              value={identityStyle}
              onChange={(event) => setIdentityStyle(event.target.value)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"
              placeholder="response style"
            />
          </div>
          <textarea
            rows={3}
            value={voiceText}
            onChange={(event) => setVoiceText(event.target.value)}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/40"
            placeholder="voice text"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => humanMutation.mutate("register")}
              disabled={controlsDisabled || !identityId.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <UserRound className="h-4 w-4" />
              Register
            </button>
            <button
              onClick={() => humanMutation.mutate("process")}
              disabled={controlsDisabled || !identityId.trim() || !voiceText.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-2 text-sm text-indigo-50 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Bot className="h-4 w-4" />
              Process
            </button>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-slate-200"><MapPinned className="h-4 w-4 text-orange-300" />Drone Control</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => droneMutation.mutate("arm")}
              disabled={controlsDisabled}
              className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Arm
            </button>
            <button
              onClick={() => droneMutation.mutate("disarm")}
              disabled={controlsDisabled}
              className="rounded-full bg-slate-500/25 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-500/35 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Disarm
            </button>
            <input
              type="number"
              min={1}
              value={takeoffAltitude}
              onChange={(event) => setTakeoffAltitude(Number(event.target.value) || 10)}
              className="w-24 rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-sm text-white outline-none focus:border-orange-300/40"
            />
            <button
              onClick={() => droneMutation.mutate("takeoff")}
              disabled={controlsDisabled}
              className="rounded-full bg-orange-500/20 px-4 py-2 text-sm text-orange-50 transition hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Takeoff
            </button>
            <button
              onClick={() => droneMutation.mutate("land")}
              disabled={controlsDisabled}
              className="rounded-full bg-rose-500/20 px-4 py-2 text-sm text-rose-50 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Land
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <input
              type="number"
              value={gotoLat}
              onChange={(event) => setGotoLat(Number(event.target.value) || 0)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
              placeholder="lat"
            />
            <input
              type="number"
              value={gotoLon}
              onChange={(event) => setGotoLon(Number(event.target.value) || 0)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
              placeholder="lon"
            />
            <input
              type="number"
              min={0}
              value={gotoAlt}
              onChange={(event) => setGotoAlt(Number(event.target.value) || 0)}
              className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-orange-300/40"
              placeholder="alt"
            />
            <button
              onClick={() => droneMutation.mutate("goto")}
              disabled={controlsDisabled}
              className="rounded-full bg-orange-500/20 px-4 py-2 text-xs text-orange-50 transition hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Go To
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/25 p-4">
        <div className="flex items-center gap-2 text-slate-200"><Waypoints className="h-4 w-4 text-teal-300" />Swarm Coordination</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={swarmDroneId}
            onChange={(event) => setSwarmDroneId(event.target.value)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="drone id"
          />
          <input
            value={swarmPattern}
            onChange={(event) => setSwarmPattern(event.target.value)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="formation pattern"
          />
          <input
            type="number"
            value={swarmAnchorLat}
            onChange={(event) => setSwarmAnchorLat(Number(event.target.value) || 0)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="anchor lat"
          />
          <input
            type="number"
            value={swarmAnchorLon}
            onChange={(event) => setSwarmAnchorLon(Number(event.target.value) || 0)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="anchor lon"
          />
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input
            type="number"
            min={1}
            value={swarmSpacing}
            onChange={(event) => setSwarmSpacing(Number(event.target.value) || 20)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="spacing m"
          />
          <input
            type="number"
            min={1}
            max={8}
            value={swarmPursuers}
            onChange={(event) => setSwarmPursuers(Number(event.target.value) || 2)}
            className="rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-xs text-white outline-none focus:border-teal-300/40"
            placeholder="pursuers"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => swarmMutation.mutate("register")}
              disabled={controlsDisabled || !swarmDroneId.trim()}
              className="rounded-full bg-teal-500/20 px-4 py-2 text-xs text-teal-50 transition hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Register
            </button>
            <button
              onClick={() => swarmMutation.mutate("formation")}
              disabled={controlsDisabled}
              className="rounded-full bg-cyan-500/20 px-4 py-2 text-xs text-cyan-50 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Formation
            </button>
            <button
              onClick={() => swarmMutation.mutate("pursuit")}
              disabled={controlsDisabled}
              className="rounded-full bg-indigo-500/20 px-4 py-2 text-xs text-indigo-50 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Pursuit
            </button>
          </div>
        </div>
      </div>

      {!isAdmin && <p className="mt-4 text-sm text-amber-100">Embodied controls require admin clearance.</p>}

      {(embodimentQuery.error || swarmQuery.error || swarmMapQuery.error || loopMutation.error || missionMutation.error || humanMutation.error || droneMutation.error || swarmMutation.error) && (
        <p className="mt-4 text-sm text-rose-300">
          {embodimentQuery.error?.message || swarmQuery.error?.message || swarmMapQuery.error?.message || loopMutation.error?.message || missionMutation.error?.message || humanMutation.error?.message || droneMutation.error?.message || swarmMutation.error?.message}
        </p>
      )}
    </section>
  );
}
