import fs from "fs";
import path from "path";
import { VISION_SCORE_DIMENSIONS, VISION_FEATURE_NAMES } from "../../shared/vision-intelligence-types.js";
import type { CalibratedModel } from "../../shared/ml-calibration.js";

export type VisionCalibratedModel = CalibratedModel & { module: "vision" };

export const VISION_MODEL_DIR = path.join(process.cwd(), "server", "scan", "vision-models");
export const VISION_MODEL_PATH = path.join(VISION_MODEL_DIR, "current.json");

let cachedModel: VisionCalibratedModel | null | undefined;

export function loadVisionModel(force = false): VisionCalibratedModel | null {
  if (!force && cachedModel !== undefined) return cachedModel;
  try {
    if (!fs.existsSync(VISION_MODEL_PATH)) {
      cachedModel = null;
      return null;
    }
    cachedModel = JSON.parse(fs.readFileSync(VISION_MODEL_PATH, "utf8")) as VisionCalibratedModel;
    return cachedModel;
  } catch {
    cachedModel = null;
    return null;
  }
}

export function saveVisionModel(model: VisionCalibratedModel): void {
  if (!fs.existsSync(VISION_MODEL_DIR)) fs.mkdirSync(VISION_MODEL_DIR, { recursive: true });
  fs.writeFileSync(VISION_MODEL_PATH, JSON.stringify(model, null, 2));
  cachedModel = model;
}

export function defaultVisionFeatureNames(): readonly string[] {
  return VISION_FEATURE_NAMES;
}

export function defaultVisionTargetLabels(): readonly string[] {
  return VISION_SCORE_DIMENSIONS;
}

export function clearVisionModelCache(): void {
  cachedModel = undefined;
}
