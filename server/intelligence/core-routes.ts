import { Router } from "express";
import { z } from "zod";
import { executeDecision, processBrain } from "../services/brainService.js";
import {
  approvePendingAction,
  armEmbodiedDrone,
  disarmEmbodiedDrone,
  getEmbodimentStatus,
  getOrchestratorStatus,
  gotoEmbodiedDrone,
  getActiveMissions,
  getAuditLogs,
  getSwarmMap,
  getSwarmStatus,
  getLockdownState,
  getNodeInfo,
  getPendingActions,
  getSystemHealth,
  getSystemPerformance,
  getSystemState,
  landEmbodiedDrone,
  learnFeedback,
  platformAction,
  platformIngest,
  platformIntelligence,
  queryMemory,
  registerEmbodiedHumanIdentity,
  rejectPendingAction,
  startEmbodiedMission,
  startEmbodiment,
  startControlMission,
  stopEmbodiedMission,
  stopEmbodiment,
  stopControlMission,
  storeMemory,
  takeoffEmbodiedDrone,
  triggerSystemTraining,
  processEmbodiedHumanVoice,
  registerSwarmDrone,
  restartOrchestrator,
  setSwarmFormation,
  startOrchestrator,
  stopOrchestrator,
  trackSwarmTarget,
  triggerSwarmPursuit,
  updateSwarmDronePosition,
  assignSwarmTask,
} from "../services/memoryService.js";
import { requireRole } from "../security/middleware.js";
import { storeSession } from "../services/sessionMemory.js";
import { tools } from "../services/toolRegistry.js";

const router = Router();

const storeSchema = z.object({
  text: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const querySchema = z.object({
  query: z.string().min(1),
  nResults: z.number().int().min(1).max(20).optional(),
});

const feedbackSchema = z.object({
  input: z.string().min(1),
  response: z.string().min(1),
  rating: z.number().min(0).max(5),
});

const executeSchema = z.object({
  input: z.string().min(1),
});

const ingestSchema = z.object({
  event: z.record(z.string(), z.unknown()),
});

const actionSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  actionId: z.string().optional(),
});

const approvalDecisionSchema = z.object({
  approver: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

const missionStartSchema = z.object({
  objective: z.string().min(1),
  missionId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const embodimentStartSchema = z.object({
  tickHz: z.number().min(0.1).max(20).optional(),
});

const embodiedMissionStartSchema = z.object({
  goal: z.record(z.string(), z.unknown()),
});

const embodiedMissionStopSchema = z.object({
  reason: z.string().min(1).optional(),
});

const embodiedHumanRegisterSchema = z.object({
  userId: z.string().min(1),
  profile: z.record(z.string(), z.unknown()).optional(),
});

const embodiedHumanVoiceSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1),
});

const droneTakeoffSchema = z.object({
  altitude: z.number().positive(),
});

const droneGotoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  alt: z.number().min(0),
});

const swarmRegisterSchema = z.object({
  droneId: z.string().min(1),
});

const swarmPositionSchema = z.object({
  droneId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const swarmTaskSchema = z.object({
  task: z.record(z.string(), z.unknown()),
});

const swarmFormationSchema = z.object({
  pattern: z.string().min(1),
  anchorLat: z.number().min(-90).max(90),
  anchorLon: z.number().min(-180).max(180),
  spacingM: z.number().positive().optional(),
});

const swarmPursuitSchema = z.object({
  maxPursuers: z.number().int().min(1).max(8).optional(),
});

const swarmTrackSchema = z.object({
  targetId: z.string().min(1),
  position: z.tuple([z.number(), z.number()]),
});

const orchestratorControlSchema = z.object({
  reason: z.string().min(1).optional(),
});

type CommandCenterSnapshot = {
  ts: number;
  health: Record<string, unknown>;
  node: Record<string, unknown>;
  state: Record<string, unknown>;
  lockdown: Record<string, unknown>;
  embodiment: Record<string, unknown>;
  performance: Record<string, unknown>;
  approvals: Record<string, Record<string, unknown>>;
  missions: Record<string, Record<string, unknown>>;
  audit: { logs?: unknown[] };
};

async function buildCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const results = await Promise.allSettled([
    getSystemHealth(),
    getNodeInfo(),
    getSystemState(),
    getLockdownState(),
    getEmbodimentStatus(),
    getSystemPerformance(),
    getPendingActions(),
    getActiveMissions(),
    getAuditLogs(30),
  ]);

  const getValueOrDefault = (result: PromiseSettledResult<any>, idx: number) => {
    if (result.status === 'fulfilled') return result.value;
    console.warn(`[Command Center] Data fetch ${idx} failed:`, result.reason);
    // Return safe defaults
    const defaults = [
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { logs: [] }
    ];
    return defaults[idx];
  };

  const [health, node, state, lockdown, embodiment, performance, approvals, missions, audit] = results.map(getValueOrDefault);

  return {
    ts: Date.now(),
    health: health as Record<string, unknown>,
    node: node as Record<string, unknown>,
    state: state as Record<string, unknown>,
    lockdown: lockdown as Record<string, unknown>,
    embodiment: embodiment as Record<string, unknown>,
    performance: performance as Record<string, unknown>,
    approvals: approvals as Record<string, Record<string, unknown>>,
    missions: missions as Record<string, Record<string, unknown>>,
    audit: audit as { logs?: unknown[] },
  };
}

function validatePlatformKey(req: any): { ok: boolean; status: number; error?: string } {
  const expected = process.env.CYRUS_PLATFORM_API_KEY;
  if (!expected) {
    return { ok: true, status: 200 };
  }

  const provided = req.headers?.["x-platform-key"];
  if (provided !== expected) {
    return { ok: false, status: 401, error: "Invalid platform API key" };
  }

  return { ok: true, status: 200 };
}

function getOperator(req: any, fallbackRole = "user") {
  return {
    operatorId: String(req.session?.user?.id ?? req.user?.claims?.sub ?? "anonymous"),
    role: String(req.session?.user?.role ?? req.user?.role ?? fallbackRole),
    source: "node-gateway",
  };
}

router.get("/memory/health", async (_req, res) => {
  res.json({
    status: "ok",
    tools: Object.keys(tools),
  });
});

router.post("/memory/store", async (req, res) => {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const result = await storeMemory(parsed.data.text, parsed.data.metadata ?? {});
    return res.status(201).json({ status: "ok", result });
  } catch (error) {
    return res.status(502).json({ error: "Memory store failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/memory/query", async (req, res) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const results = await queryMemory(parsed.data.query, parsed.data.nResults ?? 5);
    return res.json(results);
  } catch (error) {
    return res.status(502).json({ error: "Memory query failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/feedback", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid feedback payload", details: parsed.error.flatten() });
  }

  try {
    await storeMemory(
      `INPUT: ${parsed.data.input}\nRESPONSE: ${parsed.data.response}\nRATING: ${parsed.data.rating}`,
      { type: "feedback", rating: parsed.data.rating },
    );

    const learned = await learnFeedback(parsed.data.input, parsed.data.response, parsed.data.rating);
    return res.json({ status: "logged", learning: learned });
  } catch (error) {
    return res.status(502).json({ error: "Feedback logging failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/execute", async (req: any, res) => {
  const parsed = executeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid execute payload", details: parsed.error.flatten() });
  }

  try {
    const execution = await executeDecision(parsed.data.input, getOperator(req));
    const sessionUserId = req.session?.user?.id ?? req.user?.claims?.sub ?? "anonymous";

    await storeSession(String(sessionUserId), {
      input: parsed.data.input,
      decision: execution.decision,
      action: execution.action,
      timestamp: Date.now(),
    });

    return res.json(execution);
  } catch (error) {
    return res.status(502).json({ error: "Execution planning failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/cognitive/process", async (req: any, res) => {
  const parsed = executeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid cognitive payload", details: parsed.error.flatten() });
  }

  try {
    const result = await processBrain(parsed.data.input, getOperator(req));
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: "Cognitive processing failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/system/health", async (_req, res) => {
  try {
    return res.json(await getSystemHealth());
  } catch (error) {
    return res.status(502).json({ error: "System health unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/system/node", async (_req, res) => {
  try {
    return res.json(await getNodeInfo());
  } catch (error) {
    return res.status(502).json({ error: "Node information unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/system/performance", async (_req, res) => {
  try {
    return res.json(await getSystemPerformance());
  } catch (error) {
    return res.status(502).json({ error: "System performance unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/system/state", async (_req, res) => {
  try {
    return res.json(await getSystemState());
  } catch (error) {
    return res.status(502).json({ error: "System state unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/platform/ingest", async (req, res) => {
  const keyCheck = validatePlatformKey(req);
  if (!keyCheck.ok) {
    return res.status(keyCheck.status).json({ error: keyCheck.error });
  }

  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ingest payload", details: parsed.error.flatten() });
  }

  try {
    const result = await platformIngest(parsed.data.event);
    return res.status(202).json(result);
  } catch (error) {
    return res.status(502).json({ error: "Platform ingest failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/platform/intelligence", async (req, res) => {
  const keyCheck = validatePlatformKey(req);
  if (!keyCheck.ok) {
    return res.status(keyCheck.status).json({ error: keyCheck.error });
  }

  try {
    const query = typeof req.query?.query === "string" ? req.query.query : undefined;
    const result = await platformIntelligence(query, getOperator(req, "system"));
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: "Platform intelligence failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/platform/action", requireRole("admin"), async (req, res) => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid action payload", details: parsed.error.flatten() });
  }

  try {
    const result = await platformAction(parsed.data.action, parsed.data.payload ?? {}, parsed.data.actionId, getOperator(req, "admin"));
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: "Platform action failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/training/trigger", requireRole("admin"), async (_req, res) => {
  try {
    const result = await triggerSystemTraining(getOperator(_req, "admin"));
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: "Training trigger failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/control/audit", async (req, res) => {
  const requestedLimit = Number(req.query?.limit);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;

  try {
    return res.json(await getAuditLogs(limit));
  } catch (error) {
    return res.status(502).json({ error: "Audit log retrieval failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/control/pending-actions", async (_req, res) => {
  try {
    return res.json(await getPendingActions());
  } catch (error) {
    return res.status(502).json({ error: "Pending action retrieval failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/control/pending-actions/:actionId/approve", requireRole("admin"), async (req: any, res) => {
  const parsed = approvalDecisionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid approval payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await approvePendingAction(
        req.params.actionId,
        parsed.data.approver ?? String(req.session?.user?.username ?? "admin"),
        getOperator(req, "admin"),
        parsed.data.reason ?? "manual_approval"
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Approval failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/control/pending-actions/:actionId/reject", requireRole("admin"), async (req: any, res) => {
  const parsed = approvalDecisionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid rejection payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await rejectPendingAction(
        req.params.actionId,
        parsed.data.approver ?? String(req.session?.user?.username ?? "admin"),
        getOperator(req, "admin"),
        parsed.data.reason ?? "manual_rejection"
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Rejection failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/control/missions", async (_req, res) => {
  try {
    return res.json(await getActiveMissions());
  } catch (error) {
    return res.status(502).json({ error: "Mission retrieval failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/control/missions/start", requireRole("admin"), async (req: any, res) => {
  const parsed = missionStartSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid mission payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await startControlMission(
        parsed.data.objective,
        parsed.data.metadata ?? {},
        parsed.data.missionId,
        getOperator(req, "admin")
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Mission start failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/control/missions/:missionId/stop", requireRole("admin"), async (req: any, res) => {
  try {
    return res.json(await stopControlMission(req.params.missionId, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Mission stop failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/control/lockdown/state", async (_req, res) => {
  try {
    return res.json(await getLockdownState());
  } catch (error) {
    return res.status(502).json({ error: "Lockdown state unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/control/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const send = (event: string, payload: Record<string, unknown>) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const publishSnapshot = async () => {
    const snapshot = await buildCommandCenterSnapshot();
    send("snapshot", snapshot);
  };

  send("connected", { status: "ok", ts: Date.now() });
  await publishSnapshot();

  const snapshotInterval = setInterval(() => {
    publishSnapshot().catch((error) => {
      send("error", {
        message: error instanceof Error ? error.message : String(error),
        ts: Date.now(),
      });
    });
  }, 4000);

  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(snapshotInterval);
    clearInterval(heartbeatInterval);
    res.end();
  });
});

router.get("/embodiment/status", async (_req, res) => {
  try {
    return res.json(await getEmbodimentStatus());
  } catch (error) {
    return res.status(502).json({ error: "Embodiment status unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/start", requireRole("admin"), async (req: any, res) => {
  const parsed = embodimentStartSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid embodiment start payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await startEmbodiment(parsed.data.tickHz ?? 2.0, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Embodiment start failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/stop", requireRole("admin"), async (req: any, res) => {
  try {
    return res.json(await stopEmbodiment(getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Embodiment stop failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/mission/start", requireRole("admin"), async (req: any, res) => {
  const parsed = embodiedMissionStartSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid embodied mission payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await startEmbodiedMission(parsed.data.goal, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Embodied mission start failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/mission/stop", requireRole("admin"), async (req: any, res) => {
  const parsed = embodiedMissionStopSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid embodied mission stop payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await stopEmbodiedMission(parsed.data.reason ?? "manual_stop", getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Embodied mission stop failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/human/register", requireRole("admin"), async (req: any, res) => {
  const parsed = embodiedHumanRegisterSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid human register payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await registerEmbodiedHumanIdentity(
        parsed.data.userId,
        parsed.data.profile ?? {},
        getOperator(req, "admin")
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Human register failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/human/process", async (req: any, res) => {
  const parsed = embodiedHumanVoiceSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid human process payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await processEmbodiedHumanVoice(parsed.data.userId, parsed.data.text, getOperator(req, "user")));
  } catch (error) {
    return res.status(502).json({ error: "Human process failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/drone/arm", requireRole("admin"), async (req: any, res) => {
  try {
    return res.json(await armEmbodiedDrone(getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Drone arm failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/drone/disarm", requireRole("admin"), async (req: any, res) => {
  try {
    return res.json(await disarmEmbodiedDrone(getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Drone disarm failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/drone/takeoff", requireRole("admin"), async (req: any, res) => {
  const parsed = droneTakeoffSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid drone takeoff payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await takeoffEmbodiedDrone(parsed.data.altitude, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Drone takeoff failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/drone/goto", requireRole("admin"), async (req: any, res) => {
  const parsed = droneGotoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid drone goto payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await gotoEmbodiedDrone(parsed.data.lat, parsed.data.lon, parsed.data.alt, getOperator(req, "admin"))
    );
  } catch (error) {
    return res.status(502).json({ error: "Drone goto failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/embodiment/drone/land", requireRole("admin"), async (req: any, res) => {
  try {
    return res.json(await landEmbodiedDrone(getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Drone land failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/swarm/status", async (_req, res) => {
  try {
    return res.json(await getSwarmStatus());
  } catch (error) {
    return res.status(502).json({ error: "Swarm status unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/swarm/map", async (_req, res) => {
  try {
    return res.json(await getSwarmMap());
  } catch (error) {
    return res.status(502).json({ error: "Swarm map unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/drones/register", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmRegisterSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm register payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await registerSwarmDrone(parsed.data.droneId, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Swarm register failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/drones/position", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmPositionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm position payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await updateSwarmDronePosition(
        parsed.data.droneId,
        parsed.data.lat,
        parsed.data.lon,
        getOperator(req, "admin")
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Swarm position update failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/tasks/assign", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm task payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await assignSwarmTask(parsed.data.task, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Swarm task assign failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/formation", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmFormationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm formation payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await setSwarmFormation(
        parsed.data.pattern,
        parsed.data.anchorLat,
        parsed.data.anchorLon,
        parsed.data.spacingM ?? 20,
        getOperator(req, "admin")
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Swarm formation failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/pursuit", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmPursuitSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm pursuit payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(await triggerSwarmPursuit(parsed.data.maxPursuers ?? 2, getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Swarm pursuit failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/swarm/track", requireRole("admin"), async (req: any, res) => {
  const parsed = swarmTrackSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid swarm track payload", details: parsed.error.flatten() });
  }

  try {
    return res.json(
      await trackSwarmTarget(
        parsed.data.targetId,
        [parsed.data.position[0], parsed.data.position[1]],
        getOperator(req, "admin")
      )
    );
  } catch (error) {
    return res.status(502).json({ error: "Swarm track failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/system/orchestrator/status", requireRole("admin"), async (_req, res) => {
  try {
    return res.json(await getOrchestratorStatus());
  } catch (error) {
    return res.status(502).json({ error: "Orchestrator status unavailable", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/system/orchestrator/start", requireRole("admin"), async (req: any, res) => {
  const parsed = orchestratorControlSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid orchestrator control payload", details: parsed.error.flatten() });
  }
  try {
    return res.json(await startOrchestrator(parsed.data.reason ?? "command_center", getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Orchestrator start failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/system/orchestrator/stop", requireRole("admin"), async (req: any, res) => {
  const parsed = orchestratorControlSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid orchestrator control payload", details: parsed.error.flatten() });
  }
  try {
    return res.json(await stopOrchestrator(parsed.data.reason ?? "command_center", getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Orchestrator stop failed", details: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/system/orchestrator/restart", requireRole("admin"), async (req: any, res) => {
  const parsed = orchestratorControlSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid orchestrator control payload", details: parsed.error.flatten() });
  }
  try {
    return res.json(await restartOrchestrator(parsed.data.reason ?? "command_center", getOperator(req, "admin")));
  } catch (error) {
    return res.status(502).json({ error: "Orchestrator restart failed", details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
