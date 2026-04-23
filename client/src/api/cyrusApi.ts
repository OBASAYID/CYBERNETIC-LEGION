import { systemFetch } from "@shared/cyrus-api-client";

const API = "/api";
export const COMMAND_CENTER_STREAM_PATH = `${API}/control/stream`;

export type CognitiveResponse = {
  type?: string;
  result?: Record<string, unknown>;
};

export type AuditLogEntry = {
  timestamp?: number;
  event_type?: string;
  operator_role?: string;
  operator_id?: string;
  input?: unknown;
  output?: unknown;
  evaluation?: Record<string, unknown>;
  explanation?: Record<string, unknown>;
  entry_hash?: string;
  node_id?: string;
};

export type ApprovalItem = {
  id: string;
  action: string;
  status: string;
  requestedBy: string;
  requestedAt?: number;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type MissionRecord = {
  missionId: string;
  objective: string;
  status: string;
  initiatedBy?: string;
  stoppedBy?: string;
  updatedAt?: number;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type MetricsEntry = Record<string, unknown> & {
  latency?: number;
  confidence?: number;
  score?: number;
  status?: string;
  timestamp?: number;
};

export type MetricsSummary = {
  sampleCount: number;
  avgLatency: number;
  avgConfidence: number;
  avgScore: number;
  successRate: number;
  latestStatus: string;
  lastUpdated?: number;
};

export type PerformancePayload = {
  metrics: MetricsEntry[];
  optimization?: Record<string, unknown>;
  agent_stats?: Record<string, unknown>;
  benchmark_history?: unknown[];
  summary: MetricsSummary;
};

export type EmbodimentStatus = {
  running?: boolean;
  snapshot?: Record<string, unknown>;
  mission?: Record<string, unknown>;
  drone?: Record<string, unknown>;
  vision?: Record<string, unknown>;
  human?: Record<string, unknown>;
  swarm?: Record<string, unknown>;
};

export type SwarmStatus = {
  last_tick?: Record<string, unknown>;
  swarm?: Record<string, unknown>;
  tracking?: Record<string, unknown>;
  nxi_map?: Record<string, unknown>;
};

export type ApiEnvelope<T> = {
  status: "success" | "error" | string;
  data: T;
  error: string | null;
};

type RequestOptions = {
  timeoutMs?: number;
};

async function request<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = init?.signal;
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    externalSignal.addEventListener("abort", onAbort, { once: true });
  }

  const response = await systemFetch(`${API}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  }).finally(() => {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onAbort);
    }
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && (payload as Record<string, unknown>).error) ||
      (payload && typeof payload === "object" && (payload as Record<string, unknown>).detail) ||
      response.statusText ||
      "Request failed";
    throw new Error(String(message));
  }

  return payload as T;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function toApprovalsMap(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, Record<string, unknown>>;
}

function toMissionsMap(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, Record<string, unknown>>;
}

export function normalizeApprovals(payload: unknown): ApprovalItem[] {
  return Object.entries(toApprovalsMap(payload))
    .map(([id, raw]) => ({
      id,
      action: String(raw.action || raw.action_id || "unknown_action"),
      status: String(raw.status || "pending"),
      requestedBy: String(raw.requested_by || "system"),
      requestedAt: typeof raw.requested_at === "number" ? raw.requested_at : undefined,
      metadata: raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {},
      raw,
    }))
    .sort((left, right) => (right.requestedAt || 0) - (left.requestedAt || 0));
}

export function normalizeMissions(payload: unknown): MissionRecord[] {
  return Object.entries(toMissionsMap(payload))
    .map(([missionId, raw]) => ({
      missionId,
      objective: String(raw.objective || "Unspecified objective"),
      status: String(raw.status || "unknown"),
      initiatedBy: typeof raw.initiated_by === "string" ? raw.initiated_by : undefined,
      stoppedBy: typeof raw.stopped_by === "string" ? raw.stopped_by : undefined,
      updatedAt: typeof raw.updated_at === "number" ? raw.updated_at : undefined,
      metadata: raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {},
      raw,
    }))
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
}

export function normalizePerformance(payload: Record<string, unknown>): PerformancePayload {
  const metrics = Array.isArray(payload.metrics) ? (payload.metrics as MetricsEntry[]) : [];
  const successValues = metrics.filter((item) => item.status === "ok").length;
  const latencies = metrics.map((item) => Number(item.latency || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const confidences = metrics.map((item) => Number(item.confidence || 0)).filter((value) => Number.isFinite(value) && value >= 0);
  const scores = metrics.map((item) => Number(item.score || 0)).filter((value) => Number.isFinite(value) && value >= 0);
  const latest = metrics[metrics.length - 1];

  return {
    metrics,
    optimization: payload.optimization as Record<string, unknown> | undefined,
    agent_stats: payload.agent_stats as Record<string, unknown> | undefined,
    benchmark_history: Array.isArray(payload.benchmark_history) ? payload.benchmark_history : [],
    summary: {
      sampleCount: metrics.length,
      avgLatency: average(latencies),
      avgConfidence: average(confidences),
      avgScore: average(scores),
      successRate: metrics.length ? successValues / metrics.length : 0,
      latestStatus: String(latest?.status || "idle"),
      lastUpdated: typeof latest?.timestamp === "number" ? latest.timestamp : undefined,
    },
  };
}

export const cyrusApi = {
  cognitiveProcess: (input: string) =>
    request<CognitiveResponse>("/cognitive/process", {
      method: "POST",
      body: JSON.stringify({ input }),
    }),

  getSystemHealth: () => request<Record<string, unknown>>("/system/health"),

  getSystemState: () => request<Record<string, unknown>>("/system/state"),

  getNodeInfo: () => request<Record<string, unknown>>("/system/node"),

  getMetrics: async () => normalizePerformance(await request<Record<string, unknown>>("/system/performance")),

  getFusion: (query = "Assess current system posture and active safeguards") =>
    request<CognitiveResponse>(`/platform/intelligence?query=${encodeURIComponent(query)}`),

  getAuditLogs: async (limit = 40) => {
    const response = await request<{ logs?: AuditLogEntry[] }>(`/control/audit?limit=${limit}`);
    return normalizeAuditLogs(response);
  },

  getApprovals: async () => normalizeApprovals(await request<Record<string, Record<string, unknown>>>("/control/pending-actions")),

  approveAction: (id: string, approver: string, reason = "manual_approval") =>
    request<Record<string, unknown>>(`/control/pending-actions/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify({ approver, reason }),
    }),

  rejectAction: (id: string, approver: string, reason = "manual_rejection") =>
    request<Record<string, unknown>>(`/control/pending-actions/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({ approver, reason }),
    }),

  getMissions: async () => normalizeMissions(await request<Record<string, Record<string, unknown>>>("/control/missions")),

  startMission: (payload: { objective: string; missionId?: string; metadata?: Record<string, unknown> }) =>
    request<Record<string, unknown>>("/control/missions/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  stopMission: (missionId: string) =>
    request<Record<string, unknown>>(`/control/missions/${encodeURIComponent(missionId)}/stop`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getLockdownState: () => request<Record<string, unknown>>("/control/lockdown/state"),

  triggerTraining: () =>
    request<Record<string, unknown>>("/training/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getEmbodimentStatus: () => request<EmbodimentStatus>("/embodiment/status"),

  startEmbodiment: (tickHz = 2) =>
    request<Record<string, unknown>>("/embodiment/start", {
      method: "POST",
      body: JSON.stringify({ tickHz }),
    }),

  stopEmbodiment: () =>
    request<Record<string, unknown>>("/embodiment/stop", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  startEmbodiedMission: (goal: Record<string, unknown>) =>
    request<Record<string, unknown>>("/embodiment/mission/start", {
      method: "POST",
      body: JSON.stringify({ goal }),
    }),

  stopEmbodiedMission: (reason = "manual_stop") =>
    request<Record<string, unknown>>("/embodiment/mission/stop", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  registerEmbodiedIdentity: (userId: string, profile: Record<string, unknown>) =>
    request<Record<string, unknown>>("/embodiment/human/register", {
      method: "POST",
      body: JSON.stringify({ userId, profile }),
    }),

  processEmbodiedVoice: (userId: string, text: string) =>
    request<Record<string, unknown>>("/embodiment/human/process", {
      method: "POST",
      body: JSON.stringify({ userId, text }),
    }),

  armEmbodiedDrone: () =>
    request<Record<string, unknown>>("/embodiment/drone/arm", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  disarmEmbodiedDrone: () =>
    request<Record<string, unknown>>("/embodiment/drone/disarm", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  takeoffEmbodiedDrone: (altitude: number) =>
    request<Record<string, unknown>>("/embodiment/drone/takeoff", {
      method: "POST",
      body: JSON.stringify({ altitude }),
    }),

  gotoEmbodiedDrone: (lat: number, lon: number, alt: number) =>
    request<Record<string, unknown>>("/embodiment/drone/goto", {
      method: "POST",
      body: JSON.stringify({ lat, lon, alt }),
    }),

  landEmbodiedDrone: () =>
    request<Record<string, unknown>>("/embodiment/drone/land", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getSwarmStatus: () => request<SwarmStatus>("/swarm/status"),

  getSwarmMap: () => request<Record<string, unknown>>("/swarm/map"),

  registerSwarmDrone: (droneId: string) =>
    request<Record<string, unknown>>("/swarm/drones/register", {
      method: "POST",
      body: JSON.stringify({ droneId }),
    }),

  updateSwarmDronePosition: (droneId: string, lat: number, lon: number) =>
    request<Record<string, unknown>>("/swarm/drones/position", {
      method: "POST",
      body: JSON.stringify({ droneId, lat, lon }),
    }),

  assignSwarmTask: (task: Record<string, unknown>) =>
    request<Record<string, unknown>>("/swarm/tasks/assign", {
      method: "POST",
      body: JSON.stringify({ task }),
    }),

  setSwarmFormation: (pattern: string, anchorLat: number, anchorLon: number, spacingM = 20) =>
    request<Record<string, unknown>>("/swarm/formation", {
      method: "POST",
      body: JSON.stringify({ pattern, anchorLat, anchorLon, spacingM }),
    }),

  triggerSwarmPursuit: (maxPursuers = 2) =>
    request<Record<string, unknown>>("/swarm/pursuit", {
      method: "POST",
      body: JSON.stringify({ maxPursuers }),
    }),

  trackSwarmTarget: (targetId: string, position: [number, number]) =>
    request<Record<string, unknown>>("/swarm/track", {
      method: "POST",
      body: JSON.stringify({ targetId, position }),
    }),

  getOrchestratorStatus: () => request<ApiEnvelope<Record<string, unknown>>>("/system/orchestrator/status"),

  startOrchestrator: (reason = "command_center") =>
    request<ApiEnvelope<Record<string, unknown>>>("/system/orchestrator/start", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  stopOrchestrator: (reason = "command_center") =>
    request<ApiEnvelope<Record<string, unknown>>>("/system/orchestrator/stop", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  restartOrchestrator: (reason = "command_center") =>
    request<ApiEnvelope<Record<string, unknown>>>("/system/orchestrator/restart", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export function normalizeAuditLogs(payload: { logs?: AuditLogEntry[] } | Record<string, unknown> | undefined | null) {
  const logs = payload && typeof payload === "object" && Array.isArray((payload as { logs?: AuditLogEntry[] }).logs)
    ? (payload as { logs?: AuditLogEntry[] }).logs || []
    : [];
  return logs.slice().reverse();
}