import fs from "fs";
import path from "path";
import {
  GWA_COMPETENCIES,
  GWA_PSYCH_DIMENSIONS,
  type GwaCompetencyScores,
  type GwaPsychScores,
} from "../../shared/gwa-types.js";
import { GWA_FEATURE_NAMES } from "./gwa-scoring-core.js";

export type GwaCalibratedModel = {
  version: string;
  algorithmVersion: string;
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
  /** [targetIndex][featureIndex] */
  weights: number[][];
  biases: number[];
  /** Final = blend * model + (1-blend) * heuristic */
  blend: number;
  ridgeLambda: number;
};

export const GWA_MODEL_DIR = path.join(process.cwd(), "server", "comms", "gwa-models");
export const GWA_MODEL_PATH = path.join(GWA_MODEL_DIR, "current.json");

let cachedModel: GwaCalibratedModel | null | undefined;

export function loadGwaModel(force = false): GwaCalibratedModel | null {
  if (!force && cachedModel !== undefined) return cachedModel;
  try {
    if (!fs.existsSync(GWA_MODEL_PATH)) {
      cachedModel = null;
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(GWA_MODEL_PATH, "utf8")) as GwaCalibratedModel;
    cachedModel = raw;
    return raw;
  } catch {
    cachedModel = null;
    return null;
  }
}

export function saveGwaModel(model: GwaCalibratedModel): void {
  if (!fs.existsSync(GWA_MODEL_DIR)) {
    fs.mkdirSync(GWA_MODEL_DIR, { recursive: true });
  }
  fs.writeFileSync(GWA_MODEL_PATH, JSON.stringify(model, null, 2));
  cachedModel = model;
}

export function applyCalibratedModel(
  heuristicVector: number[],
  features: number[],
  model: GwaCalibratedModel,
): { competencies: GwaCompetencyScores; psychological: GwaPsychScores } {
  const out = heuristicVector.map((h, i) => {
    let pred = model.biases[i] || 0;
    const row = model.weights[i] || [];
    for (let j = 0; j < features.length; j++) {
      pred += (row[j] || 0) * features[j];
    }
    pred = Math.max(0, Math.min(100, pred));
    return model.blend * pred + (1 - model.blend) * h;
  });

  const competencies = Object.fromEntries(
    GWA_COMPETENCIES.map((c, i) => [c, out[i]]),
  ) as GwaCompetencyScores;

  const psychological = Object.fromEntries(
    GWA_PSYCH_DIMENSIONS.map((p, i) => [p, out[i + GWA_COMPETENCIES.length]]),
  ) as GwaPsychScores;

  return { competencies, psychological };
}

export function clearModelCache(): void {
  cachedModel = undefined;
}

export function defaultFeatureNames(): readonly string[] {
  return GWA_FEATURE_NAMES;
}
