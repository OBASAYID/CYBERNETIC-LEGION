/**
 * Asset intelligence trainer — ridge calibration from synthetic mining scenarios.
 */

import {
  accumulateRidgeSample,
  buildCalibratedModel,
  createRidgeAccumulator,
  mae,
  solveRidgeAccumulator,
  type CalibratedModel,
} from "../../shared/ml-calibration.js";
import {
  defaultAssetFeatureNames,
  defaultAssetTargetLabels,
  saveAssetModel,
  type AssetCalibratedModel,
} from "./asset-model.js";
import {
  extractAssetFeatures,
  heuristicAssetScores,
  vectorizeAssetScores,
} from "./asset-scoring-core.js";
import { generateSimulatedAsset, groundTruthVector } from "./asset-simulator.js";

export type AssetTrainProgress = {
  completed: number;
  total: number;
  samples: number;
  maeBefore: number;
  maeAfter: number;
};

export async function trainAssetModel(options: {
  simulations: number;
  ridgeLambda?: number;
  blend?: number;
  batchLogEvery?: number;
  onProgress?: (p: AssetTrainProgress) => void;
}): Promise<AssetCalibratedModel> {
  const total = Math.max(1000, Math.floor(options.simulations));
  const lambda = options.ridgeLambda ?? 2.0;
  const blend = options.blend ?? 0.74;
  const logEvery = options.batchLogEvery ?? Math.max(5000, Math.floor(total / 20));
  const featureNames = defaultAssetFeatureNames();
  const targetLabels = defaultAssetTargetLabels();

  const acc = createRidgeAccumulator(featureNames.length, targetLabels.length);
  let errBeforeSum = 0;
  let errBeforeN = 0;

  for (let sim = 0; sim < total; sim++) {
    const { signals, archetype } = generateSimulatedAsset();
    const features = extractAssetFeatures(signals);
    const truth = groundTruthVector(archetype);
    const heuristic = vectorizeAssetScores(heuristicAssetScores(signals));

    accumulateRidgeSample(acc, features, truth);
    errBeforeSum += mae(heuristic, truth);
    errBeforeN += 1;

    if ((sim + 1) % logEvery === 0 || sim + 1 === total) {
      options.onProgress?.({
        completed: sim + 1,
        total,
        samples: acc.sampleCount,
        maeBefore: errBeforeSum / Math.max(1, errBeforeN),
        maeAfter: 0,
      });
    }
  }

  const { weights, biases } = solveRidgeAccumulator(acc, lambda);
  const X: number[][] = [];
  const Y: number[][] = [];
  const heuristicRows: number[][] = [];

  for (let i = 0; i < Math.min(5000, total); i++) {
    const { signals, archetype } = generateSimulatedAsset();
    X.push(extractAssetFeatures(signals));
    Y.push(groundTruthVector(archetype));
    heuristicRows.push(vectorizeAssetScores(heuristicAssetScores(signals)));
  }

  const model = buildCalibratedModel({
    module: "assets",
    version: "cyrus-asset-calibrated-v1",
    algorithmVersion: "cyrus-asset-v1.1",
    simulations: total,
    featureNames,
    targetLabels,
    X,
    Y,
    heuristicRows,
    ridgeLambda: lambda,
    blend,
  }) as AssetCalibratedModel;

  model.weights = weights;
  model.biases = biases;

  saveAssetModel(model);
  options.onProgress?.({
    completed: total,
    total,
    samples: acc.sampleCount,
    maeBefore: model.metrics.maeBefore,
    maeAfter: model.metrics.maeAfter,
  });

  return model;
}

export type { CalibratedModel };
