import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Gauge, TrendingUp } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function MetricsPanel() {
  const metricsQuery = useQuery({ queryKey: ["system-metrics"], queryFn: cyrusApi.getMetrics });

  const metrics = metricsQuery.data;
  const recent = useMemo(() => (metrics?.metrics || []).slice(-6).reverse(), [metrics?.metrics]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,22,0.96),rgba(8,11,16,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Metrics</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Performance Envelope</h2>
        </div>
        <div className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          {metrics?.summary.sampleCount || 0} samples
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300"><Gauge className="h-4 w-4 text-cyan-300" />Latency</div>
          <p className="mt-3 text-2xl font-semibold text-white">{Math.round(metrics?.summary.avgLatency || 0)} ms</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300"><Activity className="h-4 w-4 text-emerald-300" />Confidence</div>
          <p className="mt-3 text-2xl font-semibold text-white">{toPercent(metrics?.summary.avgConfidence || 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300"><TrendingUp className="h-4 w-4 text-violet-300" />Score</div>
          <p className="mt-3 text-2xl font-semibold text-white">{toPercent(metrics?.summary.avgScore || 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-slate-300"><Activity className="h-4 w-4 text-amber-300" />Success</div>
          <p className="mt-3 text-2xl font-semibold text-white">{toPercent(metrics?.summary.successRate || 0)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-slate-950/75 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-300">Recent Samples</h3>
        <div className="mt-3 space-y-2">
          {recent.length === 0 && <p className="text-sm text-slate-400">No metrics recorded yet.</p>}
          {recent.map((entry, index) => (
            <div key={`${entry.timestamp || index}`} className="grid grid-cols-[1.2fr,0.9fr,0.9fr,0.9fr] gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="truncate text-slate-200">{String(entry.input || "system-event")}</span>
              <span className="text-slate-300">{Math.round(Number(entry.latency || 0))} ms</span>
              <span className="text-slate-300">{toPercent(Number(entry.score || 0))}</span>
              <span className={`${entry.status === "ok" ? "text-emerald-300" : "text-amber-300"}`}>{String(entry.status || "unknown")}</span>
            </div>
          ))}
        </div>
      </div>

      {metricsQuery.error && <p className="mt-4 text-sm text-rose-300">{metricsQuery.error.message}</p>}
    </section>
  );
}