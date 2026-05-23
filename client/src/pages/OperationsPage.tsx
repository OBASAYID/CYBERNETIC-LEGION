import { useMemo } from "react";
import { Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Brain, LayoutGrid } from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { PlatformIntelligencePanel } from "../components/PlatformIntelligencePanel";

const operationsQueryClient = new QueryClient();

function OperationsPageContent() {
  const operatorName = useMemo(
    () => localStorage.getItem("cyrus-display-name") || "OPERATOR",
    [],
  );

  return (
    <ModuleWorkspacePageShell
      kicker="Operations"
      title="Intelligence automation"
      subtitle="Local growth, mining, and automation — no external sidecar required."
      icon={LayoutGrid}
      headerEnd={
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Operator: {operatorName}</span>
          <Link href="/intelligence">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-100 hover:bg-cyan-500/20">
              <Brain className="h-3.5 w-3.5" />
              Full Intelligence Hub
            </span>
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <PlatformIntelligencePanel />
        <p className="text-sm text-white/50 text-center">
          For missions, asset search, and MCP status, open the{" "}
          <Link href="/intelligence" className="text-cyan-300 hover:underline">
            Intelligence Hub
          </Link>
          .
        </p>
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
