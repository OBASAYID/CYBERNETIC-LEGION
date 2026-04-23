import { useQuery } from "@tanstack/react-query";
import { Activity, Shield, ShieldAlert, Workflow } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

function ratioToPercent(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

export function SystemStatus() {
  const healthQuery = useQuery({ queryKey: ["system-health"], queryFn: cyrusApi.getSystemHealth });
  const nodeQuery = useQuery({ queryKey: ["system-node"], queryFn: cyrusApi.getNodeInfo });
  const stateQuery = useQuery({ queryKey: ["system-state"], queryFn: cyrusApi.getSystemState });
  const lockdownQuery = useQuery({ queryKey: ["lockdown-state"], queryFn: cyrusApi.getLockdownState });

  const health = healthQuery.data || {};
  const node = nodeQuery.data || {};
  const state = stateQuery.data || {};
  const lockdown = lockdownQuery.data || {};
  const locked = lockdown.locked === true;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,18,0.96),rgba(5,8,14,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">System Status</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Node and Safeguard Telemetry</h2>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${locked ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/15 text-emerald-200"}`}>
          {locked ? "LOCKDOWN" : "ONLINE"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="h-4 w-4 text-cyan-300" />
            <span className="text-xs uppercase tracking-[0.26em]">Health</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{String(health.status || "unknown")}</p>
          <p className="mt-2 text-sm text-slate-400">Node {String(health.node || node.node_id || "unassigned")}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300">
            {locked ? <ShieldAlert className="h-4 w-4 text-rose-300" /> : <Shield className="h-4 w-4 text-emerald-300" />}
            <span className="text-xs uppercase tracking-[0.26em]">Safeguards</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{locked ? String(lockdown.reason || "Manual override") : "Safety override clear"}</p>
          <p className="mt-2 text-sm text-slate-400">Updated {lockdown.updated_at ? new Date(Number(lockdown.updated_at) * 1000).toLocaleTimeString() : "n/a"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-slate-950/80 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Workflow className="h-4 w-4 text-cyan-300" />
          <span className="text-xs uppercase tracking-[0.26em]">Runtime State</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Queue</p>
            <p className="mt-1 text-lg font-semibold text-white">{String(state.events_queue || 0)} / {String(state.events_capacity || 0)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Utilization</p>
            <p className="mt-1 text-lg font-semibold text-white">{ratioToPercent(state.queue_utilization)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dead Letter</p>
            <p className="mt-1 text-lg font-semibold text-white">{String(state.dead_letter_count || 0)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Active Model</p>
            <p className="mt-1 text-sm font-semibold text-white">{String(state.active_model || "n/a")}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Latest Model</p>
            <p className="mt-1 text-sm font-semibold text-white">{String(state.latest_model || "n/a")}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Pending Approvals</p>
            <p className="mt-1 text-lg font-semibold text-white">{String(state.pending_action_count || 0)}</p>
          </div>
        </div>
      </div>

      {(healthQuery.error || stateQuery.error || lockdownQuery.error) && (
        <p className="mt-4 text-sm text-rose-300">
          {healthQuery.error?.message || stateQuery.error?.message || lockdownQuery.error?.message}
        </p>
      )}
    </section>
  );
}