import { Router } from "express";
import { DOC_MODEL_PATH, loadDocModel } from "./doc-model.js";
import { getDocAlgorithmVersion } from "./doc-scoring-core.js";
import { trainDocModel } from "./doc-trainer.js";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

router.get("/api/documents/model", (_req, res) => {
  const model = loadDocModel();
  res.json({
    loaded: !!model,
    path: DOC_MODEL_PATH,
    algorithmVersion: getDocAlgorithmVersion(),
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
let lastTrainResult: Awaited<ReturnType<typeof trainDocModel>> | null = null;

router.post("/api/documents/train", async (req: any, res) => {
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
    message: `Document training started with ${simulations.toLocaleString()} simulations`,
    simulations,
  });

  trainDocModel({ simulations })
    .then((model) => {
      lastTrainResult = model;
    })
    .catch((err) => {
      console.error("[Doc Train API]", err);
    })
    .finally(() => {
      trainInProgress = false;
    });
});

router.get("/api/documents/train/status", (_req, res) => {
  res.json({
    inProgress: trainInProgress,
    algorithmVersion: getDocAlgorithmVersion(),
    lastResult: lastTrainResult
      ? {
          trainedAt: lastTrainResult.trainedAt,
          simulations: lastTrainResult.simulations,
          metrics: lastTrainResult.metrics,
        }
      : null,
  });
});

export { router as docRouter };
