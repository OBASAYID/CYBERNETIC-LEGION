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

/** Dashboard news / trend feed (`news-trend-feed.tsx`, `/api/comms/news`). */
export type NewsItem = {
  id: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  url?: string | null;
  category?: string | null;
  publishedAt?: string | null;
  /** Optional UI accent; derived from category when absent. */
  color?: string;
};

const NEWS_CATEGORY_COLORS: Record<string, string> = {
  technology: "#22d3ee",
  business: "#fbbf24",
  science: "#a78bfa",
  health: "#34d399",
  sports: "#fb7185",
  entertainment: "#c084fc",
  general: "#94a3b8",
};

export function newsItemAccent(item: Pick<NewsItem, "category" | "color">): string {
  if (item.color) return item.color;
  const key = (item.category || "general").toLowerCase();
  return NEWS_CATEGORY_COLORS[key] ?? NEWS_CATEGORY_COLORS.general;
}

