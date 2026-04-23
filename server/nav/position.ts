import { PositionFix, ScoredFix } from "./types.js";

let currentFix: PositionFix | null = null;

function confidenceFromAccuracy(acc: number): number {
  if (acc <= 1) return 0.99;
  if (acc <= 3) return 0.97;
  if (acc <= 5) return 0.95;
  if (acc <= 10) return 0.92;
  if (acc <= 20) return 0.85;
  if (acc <= 50) return 0.65;
  if (acc <= 100) return 0.45;
  if (acc <= 200) return 0.25;
  return 0.1;
}

export function updateFix(fix: PositionFix) {
  const now = Date.now();
  if (now - fix.timestamp > 5 * 60 * 1000) {
    throw new Error("Fix is too old");
  }
  currentFix = fix;
}

export function getBestFix(): ScoredFix | null {
  if (!currentFix) return null;
  const ageMs = Date.now() - currentFix.timestamp;
  const agePenalty = Math.min(ageMs / (5 * 60 * 1000), 1);
  const confidence = Math.max(0, confidenceFromAccuracy(currentFix.accuracy) * (1 - 0.7 * agePenalty));
  return { ...currentFix, ageMs, confidence };
}
