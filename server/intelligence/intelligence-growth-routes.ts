import { Router } from "express";
import {
  getGrowthStatus,
  runIntelligenceGrowth,
  startIntelligenceGrowth,
} from "./intelligence-growth-miner.js";

const router = Router();

router.get("/api/intelligence/growth/status", (_req, res) => {
  res.json(getGrowthStatus());
});

router.post("/api/intelligence/growth/run", async (req, res) => {
  try {
    const body = req.body ?? {};
    const wait = body.wait === true;
    const input = {
      assetTarget: typeof body.assetTarget === "number" ? body.assetTarget : undefined,
      fullAssetMining: body.fullAssetMining === true,
      wikipediaBatch: typeof body.wikipediaBatch === "number" ? body.wikipediaBatch : undefined,
      webBatch: typeof body.webBatch === "number" ? body.webBatch : undefined,
    };

    if (wait) {
      const result = await runIntelligenceGrowth(input);
      return res.json(result);
    }

    const started = await startIntelligenceGrowth({
      assetTarget: input.assetTarget,
      fullAssetMining: input.fullAssetMining,
    });
    return res.json(started);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Growth run failed";
    res.status(message.includes("already") ? 409 : 500).json({ error: message });
  }
});

export { router as intelligenceGrowthRouter };
