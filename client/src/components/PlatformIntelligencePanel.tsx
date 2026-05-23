import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, ExternalLink, Loader2, Play, RefreshCw } from "lucide-react";
import { systemFetch } from "@shared/cyrus-api-client";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await systemFetch(path, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

/** Compact intelligence controls for the Ops console — full UI at /intelligence */
export function PlatformIntelligencePanel() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["platform-intel"] });
  };

  const assets = useQuery({
    queryKey: ["platform-intel", "assets"],
    queryFn: () => fetchJson<Record<string, unknown>>("/api/assets/stats"),
    refetchInterval: 15_000,
  });
  const growth = useQuery({
    queryKey: ["platform-intel", "growth"],
    queryFn: () => fetchJson<Record<string, unknown>>("/api/intelligence/growth/status"),
    refetchInterval: 10_000,
  });
  const automation = useQuery({
    queryKey: ["platform-intel", "automation"],
    queryFn: () => fetchJson<Record<string, unknown>>("/api/intelligence/automation/status"),
    refetchInterval: 10_000,
  });
  const snapshot = useQuery({
    queryKey: ["platform-intel", "snapshot"],
    queryFn: () => fetchJson<Record<string, unknown>>("/api/intelligence/platform"),
    refetchInterval: 30_000,
  });

  const runGrowth = useMutation({
    mutationFn: (target: number) =>
      fetchJson("/api/intelligence/growth/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetTarget: target, wait: false }),
      }),
    onSuccess: invalidate,
  });
  const runAutomation = useMutation({
    mutationFn: () =>
      fetchJson("/api/intelligence/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: invalidate,
  });
  const resumeAssets = useMutation({
    mutationFn: () => fetchJson("/api/assets/resume", { method: "POST" }),
    onSuccess: invalidate,
  });

  const total = Number((assets.data as any)?.total ?? 0);
  const models = (snapshot.data as any)?.calibratedModels ?? {};
  const modelCount = Object.values(models).filter(Boolean).length;
  const growing = Boolean((growth.data as any)?.growthRunning);
  const cycling = Boolean((automation.data as any)?.cycleRunning);

  return (
    <section className="rounded-[1.75rem] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(9,12,24,0.96),rgba(6,8,18,0.92))] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Intelligence</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Growth & automation</h2>
            <p className="text-xs text-slate-400 mt-1">
              {total.toLocaleString()} assets · {modelCount}/4 models
              {growing ? " · growing" : ""}
              {cycling ? " · cycle running" : ""}
            </p>
          </div>
        </div>
        <Link href="/intelligence">
          <span className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
            Intelligence Hub <ExternalLink className="h-3 w-3" />
          </span>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={runGrowth.isPending || growing}
          onClick={() => void runGrowth.mutateAsync(total + 500)}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-50"
        >
          {runGrowth.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Grow knowledge
        </button>
        <button
          type="button"
          disabled={runAutomation.isPending || cycling}
          onClick={() => void runAutomation.mutateAsync()}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100 disabled:opacity-50"
        >
          {runAutomation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run automation
        </button>
        <button
          type="button"
          disabled={resumeAssets.isPending}
          onClick={() => void resumeAssets.mutateAsync()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/90 disabled:opacity-50"
        >
          {resumeAssets.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Resume downloads
        </button>
      </div>
    </section>
  );
}
