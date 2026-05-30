import fs from "fs";
import path from "path";
import {
  ASSET_FEATURE_NAMES,
  ASSET_SCORE_DIMENSIONS,
} from "../../shared/asset-intelligence-types.js";
import type { CalibratedModel } from "../../shared/ml-calibration.js";

export type AssetCalibratedModel = CalibratedModel & { module: "assets" };

export const ASSET_MODEL_DIR = path.join(process.cwd(), "server", "assets", "asset-models");
export const ASSET_MODEL_PATH = path.join(ASSET_MODEL_DIR, "current.json");

let cachedModel: AssetCalibratedModel | null | undefined;

export function loadAssetModel(force = false): AssetCalibratedModel | null {
  if (!force && cachedModel !== undefined) return cachedModel;
  try {
    if (!fs.existsSync(ASSET_MODEL_PATH)) {
      cachedModel = null;
      return null;
    }
    cachedModel = JSON.parse(fs.readFileSync(ASSET_MODEL_PATH, "utf8")) as AssetCalibratedModel;
    return cachedModel;
  } catch {
    cachedModel = null;
    return null;
  }
}

export function saveAssetModel(model: AssetCalibratedModel): void {
  if (!fs.existsSync(ASSET_MODEL_DIR)) fs.mkdirSync(ASSET_MODEL_DIR, { recursive: true });
  fs.writeFileSync(ASSET_MODEL_PATH, JSON.stringify(model, null, 2));
  cachedModel = model;
}

export function defaultAssetFeatureNames(): readonly string[] {
  return ASSET_FEATURE_NAMES;
}

export function defaultAssetTargetLabels(): readonly string[] {
  return ASSET_SCORE_DIMENSIONS;
}

export function clearAssetModelCache(): void {
  cachedModel = undefined;
}
