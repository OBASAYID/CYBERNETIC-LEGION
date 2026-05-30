/**
 * Vision / scan scoring — DB-free heuristics + offline interpret for training.
 */

import {
  VISION_ALGORITHM_VERSION,
  VISION_FEATURE_NAMES,
  VISION_SCORE_DIMENSIONS,
  type VisionScoreDimension,
  type VisionScoreVector,
} from "../../shared/vision-intelligence-types.js";
import { applyCalibratedBlend, clamp, type CalibratedModel } from "../../shared/ml-calibration.js";
import { loadVisionModel } from "./vision-model.js";

export { VISION_ALGORITHM_VERSION, VISION_FEATURE_NAMES, VISION_SCORE_DIMENSIONS };
export type { VisionScoreDimension, VisionScoreVector };

export type ScanAnalysisSignals = {
  textLength: number;
  languageConfidence: number;
  scanType: "qr" | "image" | "document" | "unknown";
  qrSafe: boolean;
  qrIsUrl: boolean;
  keyFindingsCount: number;
  risksCount: number;
  ambiguitiesCount: number;
  warningsCount: number;
  hasTranslation: boolean;
  hasContent: boolean;
  interpretationLength: number;
  confidence: "High" | "Medium" | "Low";
  mode: string;
  ocrAttempted: boolean;
};

const CONF_SCORE: Record<string, number> = { High: 1, Medium: 0.65, Low: 0.35 };

/** Offline heuristic interpret — no LLM required for simulation/training. */
export function heuristicInterpretText(text: string): {
  interpretation: string;
  keyFindings: string[];
  risks: string[];
  ambiguities: string[];
} {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return {
      interpretation: "No extractable content.",
      keyFindings: [],
      risks: ["Empty scan payload"],
      ambiguities: ["Source text missing"],
    };
  }

  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const interpretation = sentences.slice(0, 2).join(" ") || clean.slice(0, 280);

  const findingPatterns = [
    /[^.\n]{0,60}\b(?:amount|total|date|reference|invoice|order|account|name|address)\b[^.\n]{0,120}/gi,
    /[^.\n]{0,80}\b(?:shall|must|required|deadline|due)\b[^.\n]{0,120}/gi,
  ];
  const riskPatterns = [
    /[^.\n]{0,80}\b(?:risk|warning|urgent|overdue|penalty|suspicious|token|secret|password)\b[^.\n]{0,120}/gi,
  ];
  const ambiguityPatterns = [
    /[^.\n]{0,80}\b(?:unclear|ambiguous|approx|maybe|unknown|TBD|pending)\b[^.\n]{0,120}/gi,
  ];

  const uniq = (matches: string[], limit: number) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of matches) {
      const v = m.trim();
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push(v);
      if (out.length >= limit) break;
    }
    return out;
  };

  return {
    interpretation,
    keyFindings: uniq(findingPatterns.flatMap((p) => clean.match(p) || []), 6),
    risks: uniq(riskPatterns.flatMap((p) => clean.match(p) || []), 4),
    ambiguities: uniq(ambiguityPatterns.flatMap((p) => clean.match(p) || []), 3),
  };
}

export function extractVisionFeatures(signals: ScanAnalysisSignals): number[] {
  return [
    clamp(signals.textLength / 4000, 0, 1),
    clamp(signals.languageConfidence, 0, 1),
    clamp(signals.keyFindingsCount / 8, 0, 1),
    clamp(signals.risksCount / 6, 0, 1),
    clamp(signals.ambiguitiesCount / 4, 0, 1),
    clamp(signals.warningsCount / 8, 0, 1),
    signals.scanType === "qr" ? 1 : 0,
    signals.qrSafe ? 1 : 0,
    signals.hasTranslation ? 1 : 0,
    signals.hasContent ? 1 : 0,
    clamp(signals.interpretationLength / 500, 0, 1),
    clamp(
      signals.keyFindingsCount / Math.max(1, signals.ambiguitiesCount + 1) / 3,
      0,
      1,
    ),
    signals.qrSafe && !signals.risksCount ? 1 : clamp(1 - signals.risksCount / 5, 0, 1),
    clamp(signals.languageConfidence * 0.6 + (signals.hasContent ? 0.35 : 0), 0, 1),
    clamp((signals.textLength / 1200) * (signals.hasContent ? 1 : 0.2), 0, 1),
    signals.confidence === "High" ? 1 : signals.confidence === "Medium" ? 0.65 : 0.35,
    signals.mode === "business" ? 1 : 0,
    signals.mode === "legal" ? 1 : 0,
    signals.mode === "technical" ? 1 : 0,
    signals.ocrAttempted ? 1 : 0,
  ];
}

export function heuristicVisionScores(signals: ScanAnalysisSignals): VisionScoreVector {
  const conf = (CONF_SCORE[signals.confidence] ?? 0.5) * 100;
  const ocrQuality = clamp(38 + signals.textLength / 45 + signals.languageConfidence * 35);
  const languageCertainty = clamp(40 + signals.languageConfidence * 55);
  const threatInv = clamp(
    90 - signals.risksCount * 12 - (signals.qrSafe ? 0 : 25) - (signals.qrIsUrl && !signals.qrSafe ? 20 : 0),
  );
  const findingDensity = clamp(42 + signals.keyFindingsCount * 8);
  const riskSeverityInv = clamp(88 - signals.risksCount * 14);
  const clarity = clamp(45 + signals.interpretationLength / 12 + signals.languageConfidence * 20);
  const qrSafety = clamp(signals.scanType === "qr" ? (signals.qrSafe ? 92 : 35) : 70);
  const translationReadiness = clamp(50 + (signals.hasTranslation ? 28 : 0) + signals.languageConfidence * 15);
  const interpretationConfidence = clamp(44 + conf * 0.35 + signals.keyFindingsCount * 5);
  const contentCompleteness = clamp(35 + (signals.hasContent ? 35 : 0) + signals.textLength / 80);
  const semanticCoherence = clamp(
    40 + signals.keyFindingsCount * 6 - signals.ambiguitiesCount * 8 + signals.languageConfidence * 15,
  );
  const overall = clamp(
    (ocrQuality +
      languageCertainty +
      threatInv +
      findingDensity +
      riskSeverityInv +
      clarity +
      qrSafety +
      translationReadiness +
      interpretationConfidence +
      contentCompleteness +
      semanticCoherence) /
      11,
  );

  return {
    ocr_quality: ocrQuality,
    language_certainty: languageCertainty,
    threat_inverse: threatInv,
    finding_density: findingDensity,
    risk_severity_inverse: riskSeverityInv,
    clarity,
    qr_safety: qrSafety,
    translation_readiness: translationReadiness,
    interpretation_confidence: interpretationConfidence,
    content_completeness: contentCompleteness,
    semantic_coherence: semanticCoherence,
    overall_scan_quality: overall,
  };
}

export function vectorizeVisionScores(scores: VisionScoreVector): number[] {
  return VISION_SCORE_DIMENSIONS.map((d) => scores[d]);
}

export function scoresFromVector(values: number[]): VisionScoreVector {
  return Object.fromEntries(
    VISION_SCORE_DIMENSIONS.map((d, i) => [d, clamp(values[i] ?? 50)]),
  ) as VisionScoreVector;
}

export function applyVisionCalibration(
  signals: ScanAnalysisSignals,
  heuristic?: VisionScoreVector,
): { scores: VisionScoreVector; calibrated: boolean; algorithmVersion: string } {
  const base = heuristic ?? heuristicVisionScores(signals);
  const model = loadVisionModel();
  if (!model) {
    return { scores: base, calibrated: false, algorithmVersion: "cyrus-vision-v1.0" };
  }
  const features = extractVisionFeatures(signals);
  const blended = applyCalibratedBlend(vectorizeVisionScores(base), features, model);
  return {
    scores: scoresFromVector(blended),
    calibrated: true,
    algorithmVersion: VISION_ALGORITHM_VERSION,
  };
}

export function getVisionAlgorithmVersion(): string {
  return loadVisionModel() ? VISION_ALGORITHM_VERSION : "cyrus-vision-v1.0";
}

export function buildVisionCalibrationMeta(model: CalibratedModel | null) {
  if (!model) return undefined;
  return {
    algorithmVersion: VISION_ALGORITHM_VERSION,
    trainedAt: model.trainedAt,
    simulations: model.simulations,
    metrics: model.metrics,
    blend: model.blend,
  };
}

export function buildScanSignalsFromReport(
  report: {
    scanType: ScanAnalysisSignals["scanType"];
    detectedLanguage: string;
    languageConfidence: number;
    translation?: string;
    originalText?: string;
    qrPayload?: string;
    qrSafety?: { isUrl: boolean; safe: boolean };
    interpretation?: string;
    keyFindings: string[];
    risks: string[];
    ambiguities: string[];
    confidence: ScanAnalysisSignals["confidence"];
    warnings: string[];
    attempted: string[];
    success: boolean;
  },
  mode = "business",
): ScanAnalysisSignals {
  const text = report.originalText || report.qrPayload || report.translation || "";
  return {
    textLength: text.length,
    languageConfidence: report.languageConfidence,
    scanType: report.scanType,
    qrSafe: report.qrSafety?.safe ?? true,
    qrIsUrl: report.qrSafety?.isUrl ?? false,
    keyFindingsCount: report.keyFindings.length,
    risksCount: report.risks.length,
    ambiguitiesCount: report.ambiguities.length,
    warningsCount: report.warnings.length,
    hasTranslation: Boolean(report.translation),
    hasContent: report.success,
    interpretationLength: (report.interpretation || "").length,
    confidence: report.confidence,
    mode,
    ocrAttempted: report.attempted.some((a) => a.includes("ocr")),
  };
}
