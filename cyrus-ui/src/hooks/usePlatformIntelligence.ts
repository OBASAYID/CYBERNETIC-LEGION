import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { systemFetch } from "@/lib/system-api";

export type MissionDomain = "education" | "health" | "military" | "communication" | "general";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await systemFetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function usePlatformSnapshot() {
  return useQuery({
    queryKey: ["/api/intelligence/platform"],
    queryFn: () => jsonFetch<Record<string, unknown>>("/api/intelligence/platform"),
    refetchInterval: 30_000,
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: ["/api/assets/stats"],
    queryFn: () => jsonFetch<Record<string, unknown>>("/api/assets/stats"),
    refetchInterval: 15_000,
  });
}

export function useGrowthStatus() {
  return useQuery({
    queryKey: ["/api/intelligence/growth/status"],
    queryFn: () => jsonFetch<Record<string, unknown>>("/api/intelligence/growth/status"),
    refetchInterval: 10_000,
  });
}

export function useAutomationStatus() {
  return useQuery({
    queryKey: ["/api/intelligence/automation/status"],
    queryFn: () => jsonFetch<Record<string, unknown>>("/api/intelligence/automation/status"),
    refetchInterval: 10_000,
  });
}

export function useMcpHealth() {
  return useQuery({
    queryKey: ["/api/mcp/health"],
    queryFn: () => jsonFetch<Record<string, unknown>>("/api/mcp/health"),
    refetchInterval: 60_000,
  });
}

export function useAssetSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["/api/assets/search", query],
    enabled: enabled && query.trim().length > 1,
    queryFn: () =>
      jsonFetch<{ query: string; count: number; results: Array<Record<string, unknown>> }>(
        `/api/assets/search?q=${encodeURIComponent(query)}&limit=12`,
      ),
  });
}

export function useAssetCatalog() {
  return useQuery({
    queryKey: ["/api/assets/catalog"],
    queryFn: () =>
      jsonFetch<{ assets: Array<Record<string, unknown>>; stats: Record<string, unknown> }>(
        "/api/assets/catalog?limit=24",
      ),
  });
}

export function usePlatformIntelligenceActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["/api/assets/stats"] });
    void qc.invalidateQueries({ queryKey: ["/api/intelligence/growth/status"] });
    void qc.invalidateQueries({ queryKey: ["/api/intelligence/automation/status"] });
    void qc.invalidateQueries({ queryKey: ["/api/intelligence/platform"] });
    void qc.invalidateQueries({ queryKey: ["/api/assets/catalog"] });
    void qc.invalidateQueries({ queryKey: ["/api/mcp/health"] });
  };

  const mineAssets = useMutation({
    mutationFn: (target: number) =>
      jsonFetch<Record<string, unknown>>("/api/assets/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, ml: true }),
      }),
    onSuccess: invalidate,
  });

  const resumeAssets = useMutation({
    mutationFn: () =>
      jsonFetch<Record<string, unknown>>("/api/assets/resume", { method: "POST" }),
    onSuccess: invalidate,
  });

  const trainAssets = useMutation({
    mutationFn: () =>
      jsonFetch<Record<string, unknown>>("/api/assets/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulations: 5000 }),
      }),
    onSuccess: invalidate,
  });

  const ingestUrl = useMutation({
    mutationFn: (url: string) =>
      jsonFetch<Record<string, unknown>>("/api/assets/ingest/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),
    onSuccess: invalidate,
  });

  const runGrowth = useMutation({
    mutationFn: (assetTarget?: number) =>
      jsonFetch<Record<string, unknown>>("/api/intelligence/growth/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetTarget, wait: false }),
      }),
    onSuccess: invalidate,
  });

  const runAutomation = useMutation({
    mutationFn: () =>
      jsonFetch<Record<string, unknown>>("/api/intelligence/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: invalidate,
  });

  const executeMission = useMutation({
    mutationFn: (input: { domain: MissionDomain; objective: string }) =>
      jsonFetch<Record<string, unknown>>("/api/mission/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, autoCorrect: true }),
      }),
  });

  const selfCorrect = useMutation({
    mutationFn: () =>
      jsonFetch<Record<string, unknown>>("/api/mission/self-correct", { method: "POST" }),
    onSuccess: invalidate,
  });

  return {
    mineAssets,
    resumeAssets,
    trainAssets,
    ingestUrl,
    runGrowth,
    runAutomation,
    executeMission,
    selfCorrect,
  };
}
