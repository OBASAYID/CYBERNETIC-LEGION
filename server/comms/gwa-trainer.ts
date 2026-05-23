/**
 * GWA trainer — runs N synthetic simulations and fits ridge-regression calibration weights.
 * Uses incremental X'X accumulation so 1M+ simulations stay within heap limits.
 */

import {
  extractParticipantFeatures,
  GWA_TARGET_LABELS,
  scoreParticipantFromRuntime,
  vectorizeScores,
  type GwaSessionRuntime,
} from "./gwa-scoring-core.js";
import { generateSimulatedSession, groundTruthVector } from "./gwa-simulator.js";
import {
  accumulateRidgeSample,
  createRidgeAccumulator,
  mae,
  mean,
  predictRow,
  solveRidgeAccumulator,
} from "../../shared/ml-calibration.js";
import {
  defaultFeatureNames,
  saveGwaModel,
  type GwaCalibratedModel,
} from "./gwa-model.js";

export type GwaTrainProgress = {
  completed: number;
  total: number;
  samples: number;
  maeBefore: number;
  maeAfter: number;
};

export type GwaTrainResult = GwaCalibratedModel;

function scoreRuntimeParticipants(rt: GwaSessionRuntime) {
  const msgCounts = rt.participantIds.map((id) => rt.telemetry.get(id)?.messages.length || 0);
  return rt.participantIds.map((uid) =>
    scoreParticipantFromRuntime(uid, rt, msgCounts, uid),
  );
}

function collectSessionSamples() {
  const { runtime, participants } = generateSimulatedSession();
  const teamMsgTotal = runtime.participantIds.reduce(
    (s, id) => s + (runtime.telemetry.get(id)?.messages.length || 0),
    0,
  );
  const reports = scoreRuntimeParticipants(runtime);
  const byId = new Map(reports.map((r) => [r.userId, r]));

  return participants.map((p) => {
    const tel = runtime.telemetry.get(p.userId)!;
    return {
      features: extractParticipantFeatures(tel, runtime.participantIds.length, teamMsgTotal),
      truth: groundTruthVector(p),
      heuristic: vectorizeScores(byId.get(p.userId)!),
    };
  });
}

export async function trainGwaModel(options: {
  simulations: number;
  ridgeLambda?: number;
  blend?: number;
  batchLogEvery?: number;
  onProgress?: (p: GwaTrainProgress) => void;
}): Promise<GwaTrainResult> {
  const total = Math.max(1000, Math.floor(options.simulations));
  const lambda = options.ridgeLambda ?? 2.5;
  const blend = options.blend ?? 0.72;
  const logEvery = options.batchLogEvery ?? Math.max(10000, Math.floor(total / 20));
  const featureCount = defaultFeatureNames().length;
  const targetCount = GWA_TARGET_LABELS.length;

  const acc = createRidgeAccumulator(featureCount, targetCount);
  let errBeforeSum = 0;
  let errBeforeN = 0;

  for (let sim = 0; sim < total; sim++) {
    for (const sample of collectSessionSamples()) {
      accumulateRidgeSample(acc, sample.features, sample.truth);
      errBeforeSum += mae(sample.heuristic, sample.truth);
      errBeforeN += 1;
    }

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
  const maeBefore = errBeforeSum / Math.max(1, errBeforeN);

  const evalSims = Math.min(50_000, total);
  let errAfterSum = 0;
  let ssRes = 0;
  let ssTot = 0;
  let evalSampleCount = 0;
  const yFlat: number[] = [];

  for (let sim = 0; sim < evalSims; sim++) {
    for (const sample of collectSessionSamples()) {
      const modelPred = predictRow(sample.features, weights, biases);
      const blended = modelPred.map((v, j) => blend * v + (1 - blend) * sample.heuristic[j]);
      errAfterSum += mae(blended, sample.truth);
      evalSampleCount += 1;
      for (let j = 0; j < blended.length; j++) {
        yFlat.push(sample.truth[j]);
        ssRes += (sample.truth[j] - blended[j]) ** 2;
      }
    }
  }

  const yMean = mean(yFlat);
  for (const v of yFlat) ssTot += (v - yMean) ** 2;
  const maeAfter = errAfterSum / Math.max(1, evalSampleCount);
  const r2After = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const model: GwaCalibratedModel = {
    version: "cyrus-gwa-calibrated-v1",
    algorithmVersion: "cyrus-gwa-v1.1",
    trainedAt: new Date().toISOString(),
    simulations: total,
    samples: acc.sampleCount,
    metrics: {
      maeBefore: parseFloat(maeBefore.toFixed(3)),
      maeAfter: parseFloat(maeAfter.toFixed(3)),
      r2After: parseFloat(r2After.toFixed(4)),
    },
    featureNames: defaultFeatureNames(),
    targetLabels: GWA_TARGET_LABELS,
    weights,
    biases,
    blend,
    ridgeLambda: lambda,
  };

  saveGwaModel(model);
  options.onProgress?.({
    completed: total,
    total,
    samples: acc.sampleCount,
    maeBefore,
    maeAfter,
  });

  return model;
}
