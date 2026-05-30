import { Router } from "express";
import {
  getAutomationStatus,
  runIntelligenceAutomationCycle,
  stopIntelligenceAutomationScheduler,
  startIntelligenceAutomationScheduler,
  type AutomationConfig,
} from "./intelligence-automation-core.js";

const router = Router();

router.get("/api/intelligence/automation/status", (_req, res) => {
  res.json(getAutomationStatus());
});

router.post("/api/intelligence/automation/run", async (req, res) => {
  try {
    const body = req.body ?? {};
    const overrides: Partial<AutomationConfig> = {};
    if (typeof body.assetTarget === "number") overrides.assetTarget = body.assetTarget;
    if (typeof body.trainSimulations === "number") overrides.trainSimulations = body.trainSimulations;
    if (typeof body.quickMineBatch === "number") overrides.quickMineBatch = body.quickMineBatch;
    if (typeof body.mineAssets === "boolean") overrides.mineAssets = body.mineAssets;
    if (typeof body.trainModels === "boolean") overrides.trainModels = body.trainModels;
    if (typeof body.resumeDownloads === "boolean") overrides.resumeDownloads = body.resumeDownloads;
    if (typeof body.mcpHealth === "boolean") overrides.mcpHealth = body.mcpHealth;
    if (typeof body.selfCorrect === "boolean") overrides.selfCorrect = body.selfCorrect;

    const result = await runIntelligenceAutomationCycle(overrides);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Automation cycle failed";
    const status = message.includes("already running") ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/api/intelligence/automation/scheduler/start", (_req, res) => {
  startIntelligenceAutomationScheduler();
  res.json({ success: true, status: getAutomationStatus() });
});

router.post("/api/intelligence/automation/scheduler/stop", (_req, res) => {
  stopIntelligenceAutomationScheduler();
  res.json({ success: true, status: getAutomationStatus() });
});

export { router as intelligenceAutomationRouter };
