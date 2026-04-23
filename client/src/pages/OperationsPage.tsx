import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

import { ApprovalPanel } from "../components/ApprovalPanel";
import { AuditPanel } from "../components/AuditPanel";
import { EmbodiedControl } from "../components/EmbodiedControl";
import { FusionPanel } from "../components/FusionPanel";
import { IntelligenceFeed } from "../components/IntelligenceFeed";
import { MetricsPanel } from "../components/MetricsPanel";
import { MissionControl } from "../components/MissionControl";
import { SystemStatus } from "../components/SystemStatus";
import { useCommandCenterStream } from "../hooks/useCommandCenterStream";

const operationsQueryClient = new QueryClient();

function currentOperatorRole(): string {
  const role = localStorage.getItem("cyrus-user-role");
  return role === "admin" ? "admin" : "user";
}

function currentOperatorName(): string {
  return localStorage.getItem("cyrus-display-name") || "OPERATOR";
}

function OperationsPageContent() {
  const operatorRole = useMemo(() => currentOperatorRole(), []);
  const operatorName = useMemo(() => currentOperatorName(), []);
  const stream = useCommandCenterStream(true);

  return (
    <ModuleWorkspacePageShell
      kicker="Operations Nexus"
      title="Modules + Engines Integration Console"
      subtitle="Imported control surfaces and fused into this workspace."
      icon={LayoutGrid}
      headerEnd={
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 ${
              stream.connected ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"
            }`}
          >
            Stream: {stream.connected ? "connected" : "disconnected"}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Operator: {operatorName}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Role: {operatorRole}</span>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <SystemStatus />
        <IntelligenceFeed />
        <FusionPanel />
        <MetricsPanel />
        <MissionControl operatorRole={operatorRole} />
        <ApprovalPanel operatorName={operatorName} isAdmin={operatorRole === "admin"} />
        <EmbodiedControl operatorRole={operatorRole} />
        <AuditPanel />
      </div>
    </ModuleWorkspacePageShell>
  );
}

export function OperationsPage() {
  return (
    <QueryClientProvider client={operationsQueryClient}>
      <OperationsPageContent />
    </QueryClientProvider>
  );
}
