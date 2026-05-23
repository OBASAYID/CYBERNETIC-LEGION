/**
 * Vision / scan trainer — ridge calibration from synthetic scans.
 */

import { buildCalibratedModel, mae } from "../../shared/ml-calibration.js";
import {
  defaultVisionFeatureNames,
  defaultVisionTargetLabels,
  saveVisionModel,
  type VisionCalibratedModel,
} from "./vision-model.js";
import {
  extractVisionFeatures,
  heuristicVisionScores,
  vectorizeVisionScores,
} from "./vision-scoring-core.js";
import { generateSimulatedScan, groundTruthVector } from "./vision-simulator.js";

export type VisionTrainProgress = {
  completed: number;
  total: number;
  samples: number;
  maeBefore: number;
  maeAfter: number;
};

export async function trainVisionModel(options: {
  simulations: number;
  ridgeLambda?: number;
  blend?: number;
  batchLogEvery?: number;
  onProgress?: (p: VisionTrainProgress) => void;
}): Promise<VisionCalibratedModel> {
  const total = Math.max(1000, Math.floor(options.simulations));
  const lambda = options.ridgeLambda ?? 2.5;
  const blend = options.blend ?? 0.72;
  const logEvery = options.batchLogEvery ?? Math.max(10_000, Math.floor(total / 20));

  const X: number[][] = [];
  const Y: number[][] = [];
  const heuristicRows: number[][] = [];
  let errBeforeSum = 0;
  let errBeforeN = 0;

  for (let sim = 0; sim < total; sim++) {
    const { signals, archetype } = generateSimulatedScan();
    const features = extractVisionFeatures(signals);
    const truth = groundTruthVector(archetype);
    const heuristic = vectorizeVisionScores(heuristicVisionScores(signals));

    X.push(features);
    Y.push(truth);
    heuristicRows.push(heuristic);
    errBeforeSum += mae(heuristic, truth);
    errBeforeN += 1;

    if ((sim + 1) % logEvery === 0 || sim + 1 === total) {
      options.onProgress?.({
        completed: sim + 1,
        total,
        samples: X.length,
        maeBefore: errBeforeSum / Math.max(1, errBeforeN),
        maeAfter: 0,
      });
    }
  }

  const model = buildCalibratedModel({
    module: "vision",
    version: "cyrus-vision-calibrated-v1",
    algorithmVersion: "cyrus-vision-v1.1",
    simulations: total,
    featureNames: defaultVisionFeatureNames(),
    targetLabels: defaultVisionTargetLabels(),
    X,
    Y,
    heuristicRows,
    ridgeLambda: lambda,
    blend,
  }) as VisionCalibratedModel;

  saveVisionModel(model);
  options.onProgress?.({
    completed: total,
    total,
    samples: X.length,
    maeBefore: model.metrics.maeBefore,
    maeAfter: model.metrics.maeAfter,
  });

  return model;
}
