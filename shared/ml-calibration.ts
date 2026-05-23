/**
 * Shared ridge-regression calibration for CYRUS modules (GWA, documents, vision).
 * Trains on simulated ground truth; blends learned scores with heuristics at runtime.
 */

export type CalibratedModel = {
  version: string;
  algorithmVersion: string;
  module: "gwa" | "documents" | "vision" | "assets";
  trainedAt: string;
  simulations: number;
  samples: number;
  metrics: {
    maeBefore: number;
    maeAfter: number;
    r2After: number;
  };
  featureNames: readonly string[];
  targetLabels: readonly string[];
  weights: number[][];
  biases: number[];
  blend: number;
  ridgeLambda: number;
};

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function mae(a: number[], b: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0) / a.length;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * (b[i] ?? 0);
  return s;
}

function solveSymmetric(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col] || 1e-9;
    for (let j = col; j <= n; j++) M[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

export function ridgeFit(
  X: number[][],
  Y: number[][],
  lambda: number,
): { weights: number[][]; biases: number[] } {
  const n = X.length;
  const f = X[0]?.length || 0;
  const t = Y[0]?.length || 0;
  if (!n || !f || !t) return { weights: [], biases: [] };

  const xtx: number[][] = Array.from({ length: f }, () => Array(f).fill(0));
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < f; a++) {
      for (let b = 0; b < f; b++) xtx[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let d = 0; d < f; d++) xtx[d][d] += lambda;

  const xty: number[][] = Array.from({ length: f }, () => Array(t).fill(0));
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < f; a++) {
      for (let c = 0; c < t; c++) xty[a][c] += X[i][a] * Y[i][c];
    }
  }

  const weights: number[][] = Array.from({ length: t }, () => Array(f).fill(0));
  const biases: number[] = Array(t).fill(0);

  for (let c = 0; c < t; c++) {
    const rhs = xty.map((row) => row[c]);
    const w = solveSymmetric(xtx, rhs);
    for (let a = 0; a < f; a++) weights[c][a] = w[a];
    const yMean = mean(Y.map((row) => row[c]));
    const xwMean = mean(X.map((row) => dot(row, weights[c])));
    biases[c] = yMean - xwMean;
  }

  return { weights, biases };
}

/** O(1)-memory ridge training — accumulates X'X / X'Y without storing all rows. */
export type RidgeAccumulator = {
  featureCount: number;
  targetCount: number;
  xtx: number[][];
  xty: number[][];
  xSum: number[];
  ySum: number[];
  sampleCount: number;
};

export function createRidgeAccumulator(featureCount: number, targetCount: number): RidgeAccumulator {
  return {
    featureCount,
    targetCount,
    xtx: Array.from({ length: featureCount }, () => Array(featureCount).fill(0)),
    xty: Array.from({ length: featureCount }, () => Array(targetCount).fill(0)),
    xSum: Array(featureCount).fill(0),
    ySum: Array(targetCount).fill(0),
    sampleCount: 0,
  };
}

export function accumulateRidgeSample(acc: RidgeAccumulator, x: number[], y: number[]): void {
  for (let a = 0; a < acc.featureCount; a++) {
    acc.xSum[a] += x[a] ?? 0;
    for (let b = 0; b < acc.featureCount; b++) {
      acc.xtx[a][b] += (x[a] ?? 0) * (x[b] ?? 0);
    }
    for (let c = 0; c < acc.targetCount; c++) {
      acc.xty[a][c] += (x[a] ?? 0) * (y[c] ?? 0);
    }
  }
  for (let c = 0; c < acc.targetCount; c++) acc.ySum[c] += y[c] ?? 0;
  acc.sampleCount += 1;
}

export function solveRidgeAccumulator(
  acc: RidgeAccumulator,
  lambda: number,
): { weights: number[][]; biases: number[] } {
  const { featureCount: f, targetCount: t, sampleCount: n } = acc;
  if (!n || !f || !t) return { weights: [], biases: [] };

  const xtx = acc.xtx.map((row, i) => row.map((v, j) => (i === j ? v + lambda : v)));
  const weights: number[][] = Array.from({ length: t }, () => Array(f).fill(0));
  const biases: number[] = Array(t).fill(0);
  const invN = 1 / n;

  for (let c = 0; c < t; c++) {
    const rhs = acc.xty.map((row) => row[c]);
    const w = solveSymmetric(xtx, rhs);
    for (let a = 0; a < f; a++) weights[c][a] = w[a];
    biases[c] = acc.ySum[c] * invN - dot(acc.xSum, w) * invN;
  }

  return { weights, biases };
}

export function predictRow(features: number[], weights: number[][], biases: number[]): number[] {
  return weights.map((row, i) => {
    let v = biases[i] || 0;
    for (let j = 0; j < features.length; j++) v += (row[j] || 0) * features[j];
    return clamp(v);
  });
}

export function applyCalibratedBlend(
  heuristicVector: number[],
  features: number[],
  model: CalibratedModel,
): number[] {
  const pred = predictRow(features, model.weights, model.biases);
  return pred.map((v, i) => clamp(model.blend * v + (1 - model.blend) * (heuristicVector[i] ?? 50)));
}

export function computeTrainingMetrics(
  X: number[][],
  Y: number[][],
  heuristicRows: number[][],
  weights: number[][],
  biases: number[],
  blend: number,
): { maeBefore: number; maeAfter: number; r2After: number } {
  let errBefore = 0;
  let errAfter = 0;
  let ssRes = 0;
  let ssTot = 0;
  const yFlat = Y.flat();
  const yMean = mean(yFlat);

  for (let i = 0; i < X.length; i++) {
    const pred = predictRow(X[i], weights, biases);
    const blended = pred.map((v, j) => blend * v + (1 - blend) * heuristicRows[i][j]);
    errBefore += mae(heuristicRows[i], Y[i]);
    errAfter += mae(blended, Y[i]);
    for (let j = 0; j < blended.length; j++) {
      ssRes += (Y[i][j] - blended[j]) ** 2;
      ssTot += (Y[i][j] - yMean) ** 2;
    }
  }

  return {
    maeBefore: errBefore / Math.max(1, X.length),
    maeAfter: errAfter / Math.max(1, X.length),
    r2After: ssTot > 0 ? 1 - ssRes / ssTot : 0,
  };
}

export type TrainCalibratedModelInput = {
  module: CalibratedModel["module"];
  version: string;
  algorithmVersion: string;
  simulations: number;
  featureNames: readonly string[];
  targetLabels: readonly string[];
  X: number[][];
  Y: number[][];
  heuristicRows: number[][];
  ridgeLambda?: number;
  blend?: number;
};

export function buildCalibratedModel(input: TrainCalibratedModelInput): CalibratedModel {
  const lambda = input.ridgeLambda ?? 2.5;
  const blend = input.blend ?? 0.72;
  const { weights, biases } = ridgeFit(input.X, input.Y, lambda);
  const metrics = computeTrainingMetrics(input.X, input.Y, input.heuristicRows, weights, biases, blend);

  return {
    version: input.version,
    algorithmVersion: input.algorithmVersion,
    module: input.module,
    trainedAt: new Date().toISOString(),
    simulations: input.simulations,
    samples: input.X.length,
    metrics: {
      maeBefore: parseFloat(metrics.maeBefore.toFixed(3)),
      maeAfter: parseFloat(metrics.maeAfter.toFixed(3)),
      r2After: parseFloat(metrics.r2After.toFixed(4)),
    },
    featureNames: input.featureNames,
    targetLabels: input.targetLabels,
    weights,
    biases,
    blend,
    ridgeLambda: lambda,
  };
}
