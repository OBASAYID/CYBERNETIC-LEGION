/**
 * Document intelligence trainer — ridge calibration from synthetic documents.
 */

import { buildCalibratedModel, mae, type CalibratedModel } from "../../shared/ml-calibration.js";
import { DOC_SCORE_DIMENSIONS } from "../../shared/doc-intelligence-types.js";
import {
  defaultDocFeatureNames,
  defaultDocTargetLabels,
  saveDocModel,
  type DocCalibratedModel,
} from "./doc-model.js";
import {
  extractDocFeatures,
  heuristicDocScores,
  vectorizeDocScores,
} from "./doc-scoring-core.js";
import { generateSimulatedDocument, groundTruthVector } from "./doc-simulator.js";

export type DocTrainProgress = {
  completed: number;
  total: number;
  samples: number;
  maeBefore: number;
  maeAfter: number;
};

export async function trainDocModel(options: {
  simulations: number;
  ridgeLambda?: number;
  blend?: number;
  batchLogEvery?: number;
  onProgress?: (p: DocTrainProgress) => void;
}): Promise<DocCalibratedModel> {
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
    const { signals, archetype } = generateSimulatedDocument();
    const features = extractDocFeatures(signals);
    const truth = groundTruthVector(archetype);
    const heuristic = vectorizeDocScores(heuristicDocScores(signals));

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
    module: "documents",
    version: "cyrus-doc-calibrated-v1",
    algorithmVersion: "cyrus-doc-v1.1",
    simulations: total,
    featureNames: defaultDocFeatureNames(),
    targetLabels: defaultDocTargetLabels(),
    X,
    Y,
    heuristicRows,
    ridgeLambda: lambda,
    blend,
  }) as DocCalibratedModel;

  saveDocModel(model);
  options.onProgress?.({
    completed: total,
    total,
    samples: X.length,
    maeBefore: model.metrics.maeBefore,
    maeAfter: model.metrics.maeAfter,
  });

  return model;
}

export type { CalibratedModel };
