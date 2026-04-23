import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardNavItems } from "@/config/command-center-nav";
import { systemFetch } from "@/lib/system-api";

type DashboardModuleStatus = {
  id: string;
  name: string;
  category: "core" | "advanced" | "interactive";
  status: "operational" | "degraded" | "offline";
};

type DashboardModulesResponse = {
  modules: DashboardModuleStatus[];
  totalModules: number;
};

type StackSummaryResponse = {
  success: boolean;
  stack: {
    fused?: {
      name: string;
      description: string;
      livePort: number;
      liveOrigin: string;
      envSyncedWithPort: boolean;
    };
    web: { port: number; bindHost: string; displayUrls: string[] };
    cyrusAi: { baseUrl: string; host: string; port: number; urlSource: string };
    viteStandalone: { port: number; note: string };
    hints: string[];
  };
  cyrusAiReachable: boolean | null;
  orchestrator: { totalModules: number; initialized: boolean; error?: string };
  ts: number;
};

export function useLegacyDashboardData() {
  const navItems = useMemo(
    () => getDashboardNavItems().filter((item) => item.href !== "/"),
    [],
  );
  const navLabelByRoute = useMemo(
    () => new Map(navItems.map((item) => [item.href, item.label])),
    [navItems],
  );

  const { data: orchestratorModules } = useQuery<DashboardModulesResponse>({
    queryKey: ["/api/orchestrator/modules"],
    queryFn: async () => {
      const res = await systemFetch("/api/orchestrator/modules");
      if (!res.ok) throw new Error("Failed to load orchestrator modules");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: stackSummary } = useQuery<StackSummaryResponse>({
    queryKey: ["/api/stack/summary"],
    queryFn: async () => {
      const res = await systemFetch("/api/stack/summary");
      if (!res.ok) throw new Error("Failed to load stack summary");
      return res.json();
    },
    refetchInterval: 15000,
  });

  return { navItems, navLabelByRoute, orchestratorModules, stackSummary };
}

