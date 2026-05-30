import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardNavItems } from "@/config/command-center-nav";
import { systemFetch } from "@/lib/system-api";
import type { DashboardModulesResponse, StackSummaryResponse } from "@/components/dashboard-fresh/types";

const CORE_MODULE_ROUTES = ["/modules", "/ops", "/quantum", "/medical", "/comms"] as const;

export type UseDashboardFreshDataOptions = {
  /** Stack ports / fused origin (e.g. admin header badge). */
  enableStackSummary?: boolean;
  /** Orchestrator engines + health rail + matrix. */
  enableOrchestratorData?: boolean;
};

export function useDashboardFreshData(
  moduleFilter: "all" | "core",
  options: UseDashboardFreshDataOptions = {},
) {
  const { enableStackSummary = true, enableOrchestratorData = true } = options;
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
    refetchInterval: 12000,
    enabled: enableOrchestratorData,
  });

  const { data: stackSummary } = useQuery<StackSummaryResponse>({
    queryKey: ["/api/stack/summary"],
    queryFn: async () => {
      const res = await systemFetch("/api/stack/summary");
      if (!res.ok) throw new Error("Failed to load stack summary");
      return res.json();
    },
    refetchInterval: 15000,
    enabled: enableStackSummary,
  });

  const onlineEngines =
    orchestratorModules?.modules?.filter((m) => m.status === "operational").length ?? 0;
  const degradedEngines =
    orchestratorModules?.modules?.filter((m) => m.status === "degraded").length ?? 0;
  const offlineEngines =
    orchestratorModules?.modules?.filter((m) => m.status === "offline").length ?? 0;
  const totalEngines = orchestratorModules?.totalModules ?? 0;
  const healthPercent = totalEngines > 0 ? Math.round((onlineEngines / totalEngines) * 100) : 0;

  const visibleModules =
    moduleFilter === "all"
      ? navItems
      : navItems.filter((item) => CORE_MODULE_ROUTES.includes(item.href as (typeof CORE_MODULE_ROUTES)[number]));

  return {
    stackSummary,
    orchestratorModules,
    navLabelByRoute,
    visibleModules,
    onlineEngines,
    degradedEngines,
    offlineEngines,
    totalEngines,
    healthPercent,
  };
}

