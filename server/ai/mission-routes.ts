import { Router } from "express";
import {
  executeMission,
  getPlatformSnapshot,
  runSelfCorrectionCycle,
  type MissionDomain,
} from "./mission-autonomy-core.js";

const router = Router();

const DOMAINS: MissionDomain[] = ["education", "health", "military", "communication", "general"];

router.get("/api/intelligence/platform", async (_req, res) => {
  try {
    const snapshot = await getPlatformSnapshot();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Platform snapshot failed" });
  }
});

router.get("/api/mission/status", async (_req, res) => {
  const snapshot = await getPlatformSnapshot();
  res.json({
    operational: true,
    domains: DOMAINS,
    platformScore: snapshot.domains.general.score,
    snapshot,
  });
});

router.post("/api/mission/execute", async (req, res) => {
  const domain = String(req.body?.domain || "general") as MissionDomain;
  const objective = String(req.body?.objective || "").trim();
  if (!objective) return res.status(400).json({ error: "objective is required" });
  if (!DOMAINS.includes(domain)) {
    return res.status(400).json({ error: `domain must be one of: ${DOMAINS.join(", ")}` });
  }

  const result = await executeMission({
    domain,
    objective,
    context: req.body?.context,
    autoCorrect: req.body?.autoCorrect !== false,
  });
  res.json(result);
});

router.post("/api/mission/self-correct", async (_req, res) => {
  const cycle = await runSelfCorrectionCycle();
  res.json({
    success: true,
    platform: cycle.snapshot,
    analysis: cycle.refinement,
    probe: cycle.missionProbe,
  });
});

router.post("/api/mission/refine", async (_req, res) => {
  try {
    const cycle = await runSelfCorrectionCycle();
    res.json({ success: true, ...cycle });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Refinement unavailable",
      hint: "Set OPENAI_API_KEY or USE_LOCAL_LLM=true for full LLM refinement.",
    });
  }
});

export { router as missionRouter };
