import fs from "fs";
import path from "path";
import { DOC_SCORE_DIMENSIONS, DOC_FEATURE_NAMES } from "../../shared/doc-intelligence-types.js";
import type { CalibratedModel } from "../../shared/ml-calibration.js";

export type DocCalibratedModel = CalibratedModel & { module: "documents" };

export const DOC_MODEL_DIR = path.join(process.cwd(), "server", "ingestion", "doc-models");
export const DOC_MODEL_PATH = path.join(DOC_MODEL_DIR, "current.json");

let cachedModel: DocCalibratedModel | null | undefined;

export function loadDocModel(force = false): DocCalibratedModel | null {
  if (!force && cachedModel !== undefined) return cachedModel;
  try {
    if (!fs.existsSync(DOC_MODEL_PATH)) {
      cachedModel = null;
      return null;
    }
    cachedModel = JSON.parse(fs.readFileSync(DOC_MODEL_PATH, "utf8")) as DocCalibratedModel;
    return cachedModel;
  } catch {
    cachedModel = null;
    return null;
  }
}

export function saveDocModel(model: DocCalibratedModel): void {
  if (!fs.existsSync(DOC_MODEL_DIR)) fs.mkdirSync(DOC_MODEL_DIR, { recursive: true });
  fs.writeFileSync(DOC_MODEL_PATH, JSON.stringify(model, null, 2));
  cachedModel = model;
}

export function defaultDocFeatureNames(): readonly string[] {
  return DOC_FEATURE_NAMES;
}

export function defaultDocTargetLabels(): readonly string[] {
  return DOC_SCORE_DIMENSIONS;
}

export function clearDocModelCache(): void {
  cachedModel = undefined;
}
