import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi";

export function AuditPanel() {
  const auditQuery = useQuery({ queryKey: ["audit-logs"], queryFn: () => cyrusApi.getAuditLogs(30) });
  const logs = auditQuery.data || [];

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,10,18,0.96),rgba(8,6,12,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Audit</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white"><ScrollText className="h-5 w-5 text-cyan-300" />Immutable Event Trail</h2>
        </div>
        <div className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">{logs.length} entries</div>
      </div>

      <div className="mt-4 space-y-3">
        {logs.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No audit records available.</p>}
        {logs.map((entry, index) => (
          <article key={`${entry.entry_hash || entry.timestamp || index}`} className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{String(entry.event_type || "decision")}</h3>
                <p className="mt-1 text-xs text-slate-400">{entry.operator_id ? `${entry.operator_id} · ` : ""}{entry.timestamp ? new Date(entry.timestamp * 1000).toLocaleString() : "unknown time"}</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                {String(entry.operator_role || "system")}
              </span>
            </div>
            <pre className="console-scroll mt-3 max-h-32 rounded-2xl bg-slate-950/75 p-3 text-[11px] leading-5 text-slate-300 scrollbar-thin">
              {JSON.stringify({ input: entry.input, output: entry.output, evaluation: entry.evaluation }, null, 2)}
            </pre>
          </article>
        ))}
      </div>

      {auditQuery.error && <p className="mt-4 text-sm text-rose-300">{auditQuery.error.message}</p>}
    </section>
  );
}