import { Router } from "express";
import { gwaEngine, getGwaAlgorithmVersion } from "./gwa-engine.js";
import { generateGwaHtmlReport } from "./gwa-report.js";
import { GWA_PHASES, GWA_PHASE_LABELS, type GwaPhase } from "../../shared/gwa-types.js";
import { gwaReports, gwaSessions } from "../../shared/models/comms.js";
import { loadGwaModel, GWA_MODEL_PATH } from "./gwa-model.js";
import { trainGwaModel } from "./gwa-trainer.js";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    (typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : null) ||
    (typeof req.headers["X-Device-Id"] === "string" ? req.headers["X-Device-Id"] : null) ||
    null
  );
}

/** Catalog of phases and default timings for UI setup. */
router.get("/api/comms/gwa/catalog", (_req, res) => {
  const model = loadGwaModel();
  res.json({
    phases: GWA_PHASES.map((p) => ({ id: p, label: GWA_PHASE_LABELS[p] })),
    minParticipants: 3,
    maxRecommendedParticipants: 8,
    algorithmVersion: getGwaAlgorithmVersion(),
    calibratedModel: model
      ? {
          trainedAt: model.trainedAt,
          simulations: model.simulations,
          metrics: model.metrics,
        }
      : null,
  });
});

router.get("/api/comms/gwa/model", (_req, res) => {
  const model = loadGwaModel();
  res.json({
    loaded: !!model,
    path: GWA_MODEL_PATH,
    algorithmVersion: getGwaAlgorithmVersion(),
    model: model
      ? {
          version: model.version,
          trainedAt: model.trainedAt,
          simulations: model.simulations,
          samples: model.samples,
          metrics: model.metrics,
          blend: model.blend,
        }
      : null,
  });
});

let trainInProgress = false;
let lastTrainResult: Awaited<ReturnType<typeof trainGwaModel>> | null = null;

router.post("/api/comms/gwa/train", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (trainInProgress) {
    return res.status(409).json({ error: "Training already in progress" });
  }

  const simulations = Math.min(
    2_000_000,
    Math.max(1000, parseInt(String(req.body?.simulations || "100000"), 10) || 100_000),
  );

  trainInProgress = true;
  res.json({
    success: true,
    message: `Training started with ${simulations.toLocaleString()} simulations`,
    simulations,
  });

  try {
    lastTrainResult = await trainGwaModel({
      simulations,
      ridgeLambda: req.body?.lambda ? Number(req.body.lambda) : 2.5,
      blend: req.body?.blend ? Number(req.body.blend) : 0.72,
    });
    console.log("[GWA Train] API run complete:", lastTrainResult.metrics);
  } catch (e) {
    console.error("[GWA Train] API run failed:", e);
  } finally {
    trainInProgress = false;
  }
});

router.get("/api/comms/gwa/train/status", (_req, res) => {
  res.json({
    inProgress: trainInProgress,
    lastResult: lastTrainResult
      ? {
          trainedAt: lastTrainResult.trainedAt,
          simulations: lastTrainResult.simulations,
          metrics: lastTrainResult.metrics,
          algorithmVersion: lastTrainResult.algorithmVersion,
        }
      : null,
  });
});

router.get("/api/comms/gwa/groups/:groupId/active", async (req: any, res) => {
  try {
    const session = await gwaEngine.getActiveForGroup(req.params.groupId);
    if (!session) return res.json({ active: false, session: null });
    const metrics = gwaEngine.computeLiveMetrics(session.id);
    res.json({ active: true, session, metrics, phaseLabels: GWA_PHASE_LABELS });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load active session" });
  }
});

router.post("/api/comms/gwa/sessions", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { groupId, title, scenarioBrief, participantIds, assessorIds, totalDurationMinutes, phaseDurations } =
    req.body || {};

  if (!groupId || !title) {
    return res.status(400).json({ error: "groupId and title are required" });
  }

  const participants = Array.isArray(participantIds) ? participantIds : [];
  if (participants.length < 3) {
    return res.status(400).json({ error: "Teams require 3–8+ participants for Group Work Assessment" });
  }

  try {
    const session = await gwaEngine.createSession({
      groupId: String(groupId),
      title: String(title).trim(),
      scenarioBrief: scenarioBrief ? String(scenarioBrief) : undefined,
      createdBy: userId,
      participantIds: participants.map(String),
      assessorIds: Array.isArray(assessorIds) ? assessorIds.map(String) : [userId],
      totalDurationMinutes: totalDurationMinutes ? Number(totalDurationMinutes) : undefined,
      phaseDurations: phaseDurations as Partial<Record<GwaPhase, number>> | undefined,
    });
    const metrics = gwaEngine.computeLiveMetrics(session.id);
    res.json({ success: true, session, metrics, phaseLabels: GWA_PHASE_LABELS });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to start assessment" });
  }
});

router.get("/api/comms/gwa/sessions/:sessionId", async (req: any, res) => {
  try {
    const [session] = await db
      .select()
      .from(gwaSessions)
      .where(eq(gwaSessions.id, req.params.sessionId))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const metrics =
      session.status === "active" ? gwaEngine.computeLiveMetrics(session.id) : null;
    res.json({ session, metrics, phaseLabels: GWA_PHASE_LABELS });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load session" });
  }
});

router.get("/api/comms/gwa/sessions/:sessionId/live-metrics", async (req: any, res) => {
  try {
    const metrics = gwaEngine.computeLiveMetrics(req.params.sessionId);
    if (!metrics) return res.status(404).json({ error: "No active metrics for session" });
    res.json({ metrics, phaseLabels: GWA_PHASE_LABELS });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Metrics unavailable" });
  }
});

router.post("/api/comms/gwa/sessions/:sessionId/advance-phase", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const updated = await gwaEngine.advancePhase(req.params.sessionId, userId);
    if (!updated) {
      return res.status(400).json({ error: "Cannot advance phase (session inactive or final phase)" });
    }
    const metrics = gwaEngine.computeLiveMetrics(updated.id);
    res.json({ success: true, session: updated, metrics, phaseLabels: GWA_PHASE_LABELS });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Phase advance failed" });
  }
});

router.post("/api/comms/gwa/sessions/:sessionId/complete", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const report = await gwaEngine.finalizeSession(req.params.sessionId);
    const htmlReport = generateGwaHtmlReport(report);
    await gwaEngine.saveReport(report, htmlReport);
    await gwaEngine.syncToIntelligence(report);

    res.json({
      success: true,
      report,
      htmlReportAvailable: true,
      syncedToIntelligence: true,
    });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to complete assessment" });
  }
});

router.get("/api/comms/gwa/sessions/:sessionId/report", async (req: any, res) => {
  try {
    const row = await gwaEngine.getReport(req.params.sessionId);
    if (!row) return res.status(404).json({ error: "Report not found" });
    res.json({
      report: row.reportJson,
      teamScore: row.teamScore,
      generatedAt: row.generatedAt,
      syncedToIntelligence: row.syncedToIntelligence,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load report" });
  }
});

router.get("/api/comms/gwa/sessions/:sessionId/report/html", async (req: any, res) => {
  try {
    const row = await gwaEngine.getReport(req.params.sessionId);
    if (!row?.htmlReport) return res.status(404).json({ error: "HTML report not found" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(row.htmlReport);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load HTML report" });
  }
});

router.get("/api/comms/gwa/groups/:groupId/reports", async (req: any, res) => {
  try {
    const rows = await db
      .select()
      .from(gwaReports)
      .where(eq(gwaReports.groupId, req.params.groupId))
      .orderBy(desc(gwaReports.generatedAt))
      .limit(20);
    res.json({
      reports: rows.map((r) => ({
        sessionId: r.sessionId,
        teamScore: r.teamScore,
        generatedAt: r.generatedAt,
        title: (r.reportJson as { title?: string })?.title,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to list reports" });
  }
});

export const gwaRouter = router;
