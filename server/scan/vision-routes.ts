import { Router } from "express";
import { VISION_MODEL_PATH, loadVisionModel } from "./vision-model.js";
import { getVisionAlgorithmVersion } from "./vision-scoring-core.js";
import { trainVisionModel } from "./vision-trainer.js";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

router.get("/api/scan/model", (_req, res) => {
  const model = loadVisionModel();
  res.json({
    loaded: !!model,
    path: VISION_MODEL_PATH,
    algorithmVersion: getVisionAlgorithmVersion(),
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
let lastTrainResult: Awaited<ReturnType<typeof trainVisionModel>> | null = null;

router.post("/api/scan/train", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (trainInProgress) return res.status(409).json({ error: "Training already in progress" });

  const simulations = Math.min(
    2_000_000,
    Math.max(1000, parseInt(String(req.body?.simulations || "100000"), 10) || 100_000),
  );

  trainInProgress = true;
  res.json({
    success: true,
    message: `Vision training started with ${simulations.toLocaleString()} simulations`,
    simulations,
  });

  trainVisionModel({ simulations })
    .then((model) => {
      lastTrainResult = model;
    })
    .catch((err) => {
      console.error("[Vision Train API]", err);
    })
    .finally(() => {
      trainInProgress = false;
    });
});

router.get("/api/scan/train/status", (_req, res) => {
  res.json({
    inProgress: trainInProgress,
    algorithmVersion: getVisionAlgorithmVersion(),
    lastResult: lastTrainResult
      ? {
          trainedAt: lastTrainResult.trainedAt,
          simulations: lastTrainResult.simulations,
          metrics: lastTrainResult.metrics,
        }
      : null,
  });
});

export { router as visionRouter };
