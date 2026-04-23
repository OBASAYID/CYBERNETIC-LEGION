import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";

import { cyrusApi } from "../api/cyrusApi.js";

type ApprovalPanelProps = {
  operatorName: string;
  isAdmin: boolean;
};

export function ApprovalPanel({ operatorName, isAdmin }: ApprovalPanelProps) {
  const queryClient = useQueryClient();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const approvalsQuery = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: cyrusApi.getApprovals,
  });

  const approvalMutation = useMutation({
    mutationFn: (actionId: string) => cyrusApi.approveAction(actionId, operatorName),
    onMutate: (actionId) => setPendingActionId(actionId),
    onSettled: async () => {
      setPendingActionId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
      ]);
    },
  });

  const rejectionMutation = useMutation({
    mutationFn: (actionId: string) => cyrusApi.rejectAction(actionId, operatorName),
    onMutate: (actionId) => setPendingActionId(actionId),
    onSettled: async () => {
      setPendingActionId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["system-state"] }),
      ]);
    },
  });

  const approvals = approvalsQuery.data || [];
  const summaryText = useMemo(() => {
    if (!approvals.length) return "No actions are waiting on human approval.";
    return `${approvals.length} queued action${approvals.length === 1 ? "" : "s"} awaiting operator review.`;
  }, [approvals]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,10,10,0.95),rgba(10,7,12,0.92))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Approvals</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Human-in-the-Loop Queue</h2>
          <p className="mt-2 text-sm text-slate-300">{summaryText}</p>
        </div>
        <div className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
          {approvals.length} pending
        </div>
      </div>

      {!isAdmin && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">
          View-only mode. Sign in with an admin operator profile to approve or reject control actions.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {approvals.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Queue clear.</p>}

        {approvals.map((approval) => {
          const busy = pendingActionId === approval.id && (approvalMutation.isPending || rejectionMutation.isPending);
          return (
            <article key={approval.id} className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <ShieldCheck className="h-4 w-4 text-cyan-300" />
                    <h3 className="font-semibold">{approval.action}</h3>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Requested by {approval.requestedBy} {approval.requestedAt ? `at ${new Date(approval.requestedAt * 1000).toLocaleTimeString()}` : ""}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
                  {approval.status}
                </div>
              </div>

              <pre className="console-scroll mt-3 max-h-32 rounded-2xl bg-slate-950/75 p-3 text-[11px] leading-5 text-slate-300 scrollbar-thin">
                {JSON.stringify(approval.metadata, null, 2)}
              </pre>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => approvalMutation.mutate(approval.id)}
                  disabled={!isAdmin || busy}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {busy && approvalMutation.isPending ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => rejectionMutation.mutate(approval.id)}
                  disabled={!isAdmin || busy}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <XCircle className="h-4 w-4" />
                  {busy && rejectionMutation.isPending ? "Rejecting..." : "Reject"}
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  {approval.id}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {(approvalsQuery.error || approvalMutation.error || rejectionMutation.error) && (
        <p className="mt-4 text-sm text-rose-300">
          {approvalsQuery.error?.message || approvalMutation.error?.message || rejectionMutation.error?.message}
        </p>
      )}
    </section>
  );
}