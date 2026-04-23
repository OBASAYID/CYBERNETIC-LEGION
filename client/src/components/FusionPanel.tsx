import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Brain, RefreshCw } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

export function FusionPanel() {
  const [query, setQuery] = useState("Assess current system posture and active safeguards");
  const fusionQuery = useQuery({
    queryKey: ["fusion-intelligence", query],
    queryFn: () => cyrusApi.getFusion(query),
    refetchInterval: 9000,
  });

  const refreshMutation = useMutation({ mutationFn: () => cyrusApi.getFusion(query) });
  const payload = refreshMutation.data || fusionQuery.data;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,12,24,0.96),rgba(6,8,18,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Fusion</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white"><Brain className="h-5 w-5 text-violet-300" />Platform Intelligence Snapshot</h2>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-4 w-full rounded-full border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-white outline-none focus:border-violet-300/40"
        placeholder="Query current platform intelligence"
      />

      <pre className="console-scroll mt-4 max-h-[24rem] rounded-[1.25rem] border border-white/10 bg-black/35 p-4 text-[11px] leading-5 text-slate-200 scrollbar-thin">
        {JSON.stringify(payload, null, 2)}
      </pre>

      {(fusionQuery.error || refreshMutation.error) && <p className="mt-4 text-sm text-rose-300">{fusionQuery.error?.message || refreshMutation.error?.message}</p>}
    </section>
  );
}