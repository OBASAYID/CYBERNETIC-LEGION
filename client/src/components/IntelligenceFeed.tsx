import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Activity, Cpu, RefreshCw, Send, Sparkles } from "lucide-react";

import { cyrusApi, type CognitiveResponse } from "../api/cyrusApi.js";

type FeedEntry = {
  id: string;
  input: string;
  response: CognitiveResponse;
  createdAt: number;
};

function summarizeResponse(payload: CognitiveResponse | null) {
  if (!payload?.result || typeof payload.result !== "object") {
    return {
      action: "standby",
      confidence: undefined,
      summary: "No intelligence result yet.",
      missionId: undefined,
    };
  }

  const responseResult = payload.result as Record<string, unknown>;
  const fusion = responseResult.fusion as Record<string, unknown> | undefined;
  const action = responseResult.action as Record<string, unknown> | undefined;
  const explanation = (payload as unknown as { explanation?: Record<string, unknown> }).explanation;
  const missionState = responseResult.mission_state as Record<string, unknown> | undefined;

  return {
    action: String(action?.status || action?.action || "executed"),
    confidence: typeof fusion?.confidence === "number" ? fusion.confidence : undefined,
    summary: String(explanation?.summary || "Intelligence synthesis complete."),
    missionId: typeof missionState?.mission_id === "string" ? missionState.mission_id : undefined,
  };
}

export function IntelligenceFeed() {
  const [input, setInput] = useState("Assess current system posture and active safeguards.");
  const [history, setHistory] = useState<FeedEntry[]>([]);
  const [result, setResult] = useState<CognitiveResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (value: string) => cyrusApi.cognitiveProcess(value),
    onSuccess: (response, submittedInput) => {
      setResult(response);
      startTransition(() => {
        setHistory((current) => [
          {
            id: `${Date.now()}`,
            input: submittedInput,
            response,
            createdAt: Date.now(),
          },
          ...current,
        ].slice(0, 6));
      });
    },
  });

  const deferredResult = useDeferredValue(result);
  const summary = useMemo(() => summarizeResponse(deferredResult), [deferredResult]);

  const handleRun = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    await mutation.mutateAsync(trimmed);
  };

  return (
    <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_42%),linear-gradient(180deg,rgba(10,17,31,0.96),rgba(4,8,18,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/60">Intelligence Feed</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
            <Cpu className="h-6 w-6 text-cyan-300" />
            Cognitive Execution Loop
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Dispatch prompts into the live multi-agent core and inspect decision synthesis, mission state, and action output in one pane.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={mutation.isPending || !input.trim()}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Execute
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={5}
            className="min-h-36 w-full resize-none rounded-[1.25rem] border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
            placeholder="Issue a command, analytic task, or mission directive"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Action</p>
              <p className="mt-2 text-lg font-semibold text-white">{summary.action}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Confidence</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {typeof summary.confidence === "number" ? `${Math.round(summary.confidence * 100)}%` : "n/a"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Mission ID</p>
              <p className="mt-2 truncate text-sm font-semibold text-white">{summary.missionId || "auto-generated"}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.3em]">Execution Summary</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-100">{summary.summary}</p>
            {mutation.error && <p className="mt-3 text-sm text-rose-300">{mutation.error.message}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em]">Result Payload</h3>
            </div>
            <pre className="console-scroll mt-3 max-h-[22rem] rounded-2xl bg-black/50 p-4 text-[11px] leading-5 text-cyan-100/85 scrollbar-thin">
              {JSON.stringify(deferredResult, null, 2)}
            </pre>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-200">Recent Executions</h3>
            <div className="mt-3 space-y-3">
              {history.length === 0 && <p className="text-sm text-slate-400">No executions yet.</p>}
              {history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium text-white">{entry.input}</p>
                    <span className="text-[11px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{summarizeResponse(entry.response).summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IntelligenceFeed;