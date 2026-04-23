import axios from "axios";

import { createOperatorAssertion } from "./operatorAssertion.js";
import { getCyrusAiBaseUrl } from "./cyrusAiUrl.js";

const MEMORY_URL = getCyrusAiBaseUrl();

const client = axios.create({
  baseURL: MEMORY_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

type OperatorContext = { operatorId: string; role: string; source?: string };

function withOperatorHeaders(
  operator: OperatorContext | undefined,
  target?: { method: string; path: string }
) {
  if (!operator) {
    return undefined;
  }

  const assertion = createOperatorAssertion({
    operatorId: operator.operatorId,
    role: operator.role,
    source: operator.source,
    method: target?.method,
    path: target?.path,
  });

  if (assertion) {
    return { "x-operator-assertion": assertion };
  }

  return {
    "x-operator-id": operator.operatorId,
    "x-operator-role": operator.role,
  };
}

export async function storeMemory(text: string, metadata: Record<string, unknown> = {}) {
  if (!text || typeof text !== "string") {
    throw new Error("text is required to store memory");
  }

  const response = await client.post("/memory/store", { text, metadata });
  return response.data;
}

export async function queryMemory(query: string, nResults = 5) {
  if (!query || typeof query !== "string") {
    throw new Error("query is required to search memory");
  }

  const response = await client.post("/memory/query", { query, n_results: nResults });
  return response.data;
}

export async function processBrain(input: string, operator?: { operatorId: string; role: string; source?: string }) {
  if (!input || typeof input !== "string") {
    throw new Error("input is required for brain processing");
  }

  const response = await client.post("/brain/process", { input }, {
    headers: withOperatorHeaders(operator, { method: "POST", path: "/brain/process" }),
  });
  return response.data;
}

export async function platformIngest(event: Record<string, unknown>) {
  if (!event || typeof event !== "object") {
    throw new Error("event payload is required");
  }

  const response = await client.post("/platform/ingest", { event }, {
    headers: process.env.CYRUS_PLATFORM_API_KEY
      ? { "x-platform-key": process.env.CYRUS_PLATFORM_API_KEY }
      : undefined,
  });
  return response.data;
}

export async function platformIntelligence(query?: string, operator?: { operatorId: string; role: string; source?: string }) {
  try {
    const response = await client.get("/platform/intelligence", {
      params: query ? { query } : undefined,
      headers: {
        ...(process.env.CYRUS_PLATFORM_API_KEY
          ? { "x-platform-key": process.env.CYRUS_PLATFORM_API_KEY }
          : {}),
        ...(withOperatorHeaders(operator, { method: "GET", path: "/platform/intelligence" }) || {}),
      },
    });
    return response.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const hint = `CYRUS AI service unreachable (${MEMORY_URL}). Run: npm run dev:live — or set CYRUS_AI_URL / CYRUS_AI_PORT.`;
    console.warn(`[memoryService] platformIntelligence fallback (${MEMORY_URL}):`, msg);
    return {
      type: "multi-agent",
      degraded: true,
      explanation: {
        summary: `${hint} (${msg})`,
      },
      result: {
        fusion: { confidence: 0 },
        action: { status: "degraded", action: "standby" },
        mission_state: { mission_id: "local-degraded" },
        degraded: true,
        reason: msg,
        upstream: MEMORY_URL,
      },
    };
  }
}

export async function platformAction(
  action: string,
  payload: Record<string, unknown> = {},
  actionId?: string,
  operator?: { operatorId: string; role: string; source?: string }
) {
  if (!action || typeof action !== "string") {
    throw new Error("action is required");
  }

  const response = await client.post(
    "/platform/action",
    {
      action,
      payload,
      action_id: actionId,
    },
    {
      headers: {
        ...(process.env.CYRUS_PLATFORM_API_KEY
          ? { "x-platform-key": process.env.CYRUS_PLATFORM_API_KEY }
          : {}),
        ...(withOperatorHeaders(operator, { method: "POST", path: "/platform/action" }) || {}),
      },
    }
  );
  return response.data;
}

export async function triggerSystemTraining(operator?: { operatorId: string; role: string; source?: string }) {
  const response = await client.post("/system/train", undefined, {
    headers: withOperatorHeaders(operator, { method: "POST", path: "/system/train" }),
  });
  return response.data;
}

export async function learnFeedback(input: string, responseText: string, rating: number) {
  const response = await client.post("/feedback/learn", {
    input,
    response: responseText,
    rating,
  });
  return response.data;
}

async function getWithOperator<T>(path: string, operator?: OperatorContext, target?: { method: string; path: string }) {
  const response = await client.get<T>(path, {
    headers: withOperatorHeaders(operator, target),
  });
  return response.data;
}

async function postWithOperator<T>(
  path: string,
  body: Record<string, unknown> | undefined,
  operator?: OperatorContext,
  target?: { method: string; path: string }
) {
  const response = await client.post<T>(path, body, {
    headers: withOperatorHeaders(operator, target),
  });
  return response.data;
}

export async function getSystemHealth() {
  return getWithOperator("/system/health");
}

export async function getNodeInfo() {
  return getWithOperator("/system/node");
}

export async function getSystemPerformance() {
  return getWithOperator("/system/performance");
}

export async function getSystemState() {
  return getWithOperator("/system/state");
}

export async function getAuditLogs(limit = 100) {
  const response = await client.get("/control/audit", { params: { limit } });
  return response.data;
}

export async function getPendingActions() {
  return getWithOperator("/control/pending-actions");
}

export async function approvePendingAction(actionId: string, approver: string, operator?: OperatorContext, reason = "manual_approval") {
  return postWithOperator(
    `/control/pending-actions/${encodeURIComponent(actionId)}/approve`,
    { approver, reason },
    operator,
    { method: "POST", path: "/control/pending-actions/approve" }
  );
}

export async function rejectPendingAction(actionId: string, approver: string, operator?: OperatorContext, reason = "manual_rejection") {
  return postWithOperator(
    `/control/pending-actions/${encodeURIComponent(actionId)}/reject`,
    { approver, reason },
    operator,
    { method: "POST", path: "/control/pending-actions/reject" }
  );
}

export async function getActiveMissions() {
  return getWithOperator("/control/missions");
}

export async function startControlMission(
  objective: string,
  metadata: Record<string, unknown> = {},
  missionId: string | undefined,
  operator?: OperatorContext
) {
  return postWithOperator(
    "/control/missions/start",
    { objective, metadata, mission_id: missionId },
    operator,
    { method: "POST", path: "/control/missions/start" }
  );
}

export async function stopControlMission(missionId: string, operator?: OperatorContext) {
  return postWithOperator(
    `/control/missions/${encodeURIComponent(missionId)}/stop`,
    undefined,
    operator,
    { method: "POST", path: "/control/missions/stop" }
  );
}

export async function getLockdownState() {
  return getWithOperator("/control/lockdown/state");
}

export async function getEmbodimentStatus() {
  return getWithOperator("/embodiment/status");
}

export async function startEmbodiment(tickHz: number, operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/start",
    { tick_hz: tickHz },
    operator,
    { method: "POST", path: "/embodiment/start" }
  );
}

export async function stopEmbodiment(operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/stop",
    undefined,
    operator,
    { method: "POST", path: "/embodiment/stop" }
  );
}

export async function startEmbodiedMission(goal: Record<string, unknown>, operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/mission/start",
    { goal },
    operator,
    { method: "POST", path: "/embodiment/mission/start" }
  );
}

export async function stopEmbodiedMission(reason: string, operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/mission/stop",
    { reason },
    operator,
    { method: "POST", path: "/embodiment/mission/stop" }
  );
}

export async function registerEmbodiedHumanIdentity(
  userId: string,
  profile: Record<string, unknown>,
  operator?: OperatorContext
) {
  return postWithOperator(
    "/embodiment/human/register",
    { user_id: userId, profile },
    operator,
    { method: "POST", path: "/embodiment/human/register" }
  );
}

export async function processEmbodiedHumanVoice(
  userId: string,
  text: string,
  operator?: OperatorContext
) {
  return postWithOperator(
    "/embodiment/human/process",
    { user_id: userId, text },
    operator,
    { method: "POST", path: "/embodiment/human/process" }
  );
}

export async function armEmbodiedDrone(operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/drone/arm",
    undefined,
    operator,
    { method: "POST", path: "/embodiment/drone/arm" }
  );
}

export async function disarmEmbodiedDrone(operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/drone/disarm",
    undefined,
    operator,
    { method: "POST", path: "/embodiment/drone/disarm" }
  );
}

export async function takeoffEmbodiedDrone(altitude: number, operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/drone/takeoff",
    { altitude },
    operator,
    { method: "POST", path: "/embodiment/drone/takeoff" }
  );
}

export async function gotoEmbodiedDrone(
  lat: number,
  lon: number,
  alt: number,
  operator?: OperatorContext
) {
  return postWithOperator(
    "/embodiment/drone/goto",
    { lat, lon, alt },
    operator,
    { method: "POST", path: "/embodiment/drone/goto" }
  );
}

export async function landEmbodiedDrone(operator?: OperatorContext) {
  return postWithOperator(
    "/embodiment/drone/land",
    undefined,
    operator,
    { method: "POST", path: "/embodiment/drone/land" }
  );
}

export async function getSwarmStatus() {
  return getWithOperator("/swarm/status");
}

export async function getSwarmMap() {
  return getWithOperator("/swarm/map");
}

export async function registerSwarmDrone(droneId: string, operator?: OperatorContext) {
  return postWithOperator(
    "/swarm/drones/register",
    { drone_id: droneId },
    operator,
    { method: "POST", path: "/swarm/drones/register" }
  );
}

export async function updateSwarmDronePosition(droneId: string, lat: number, lon: number, operator?: OperatorContext) {
  return postWithOperator(
    "/swarm/drones/position",
    { drone_id: droneId, lat, lon },
    operator,
    { method: "POST", path: "/swarm/drones/position" }
  );
}

export async function assignSwarmTask(task: Record<string, unknown>, operator?: OperatorContext) {
  return postWithOperator(
    "/swarm/tasks/assign",
    { task },
    operator,
    { method: "POST", path: "/swarm/tasks/assign" }
  );
}

export async function setSwarmFormation(
  pattern: string,
  anchorLat: number,
  anchorLon: number,
  spacingM: number,
  operator?: OperatorContext
) {
  return postWithOperator(
    "/swarm/formation",
    {
      pattern,
      anchor_lat: anchorLat,
      anchor_lon: anchorLon,
      spacing_m: spacingM,
    },
    operator,
    { method: "POST", path: "/swarm/formation" }
  );
}

export async function triggerSwarmPursuit(maxPursuers: number, operator?: OperatorContext) {
  return postWithOperator(
    "/swarm/pursuit",
    { max_pursuers: maxPursuers },
    operator,
    { method: "POST", path: "/swarm/pursuit" }
  );
}

export async function trackSwarmTarget(targetId: string, position: [number, number], operator?: OperatorContext) {
  return postWithOperator(
    "/swarm/track",
    { target_id: targetId, position: [position[0], position[1]] },
    operator,
    { method: "POST", path: "/swarm/track" }
  );
}

export async function getOrchestratorStatus() {
  return getWithOperator("/system/orchestrator/status");
}

export async function startOrchestrator(reason: string, operator?: OperatorContext) {
  return postWithOperator(
    "/system/orchestrator/start",
    { reason },
    operator,
    { method: "POST", path: "/system/orchestrator/start" }
  );
}

export async function stopOrchestrator(reason: string, operator?: OperatorContext) {
  return postWithOperator(
    "/system/orchestrator/stop",
    { reason },
    operator,
    { method: "POST", path: "/system/orchestrator/stop" }
  );
}

export async function restartOrchestrator(reason: string, operator?: OperatorContext) {
  return postWithOperator(
    "/system/orchestrator/restart",
    { reason },
    operator,
    { method: "POST", path: "/system/orchestrator/restart" }
  );
}
