export type DashboardModuleStatus = {
  id: string;
  name: string;
  category: "core" | "advanced" | "interactive";
  status: "operational" | "degraded" | "offline";
};

export type DashboardModulesResponse = {
  modules: DashboardModuleStatus[];
  totalModules: number;
};

export type StackSummaryResponse = {
  success: boolean;
  stack: {
    fused?: {
      livePort: number;
      liveOrigin: string;
    };
    cyrusAi: {
      baseUrl: string;
    };
    hints: string[];
  };
  cyrusAiReachable: boolean | null;
  orchestrator: { totalModules: number };
};

