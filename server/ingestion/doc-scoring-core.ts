/**
 * Document intelligence scoring — DB-free heuristics + feature extraction for calibration.
 */

import {
  DOC_ALGORITHM_VERSION,
  DOC_SCORE_DIMENSIONS,
  DOC_FEATURE_NAMES,
  type DocScoreDimension,
  type DocScoreVector,
} from "../../shared/doc-intelligence-types.js";
import { applyCalibratedBlend, clamp, type CalibratedModel } from "../../shared/ml-calibration.js";
import { loadDocModel } from "./doc-model.js";

export { DOC_ALGORITHM_VERSION, DOC_SCORE_DIMENSIONS, DOC_FEATURE_NAMES };
export type { DocScoreDimension, DocScoreVector };

export type DocAnalysisSignals = {
  textLength: number;
  chunkCount: number;
  findingsCount: number;
  issuesCount: number;
  actionsCount: number;
  citationsCount: number;
  entitiesCount: number;
  recommendationsCount: number;
  documentType: string;
  documentTypeConfidence: "High" | "Medium" | "Low";
  riskLevel: "low" | "medium" | "high";
  confidence: "High" | "Medium" | "Low";
  strictLegalReview: boolean;
  jurisdictionSet: boolean;
  mode: string;
  hasLegalBridge: boolean;
  mandatoryActions: number;
  summaryQuality?: number;
};

const CONF_SCORE: Record<string, number> = { High: 1, Medium: 0.65, Low: 0.35 };
const RISK_INVERSE: Record<string, number> = { low: 1, medium: 0.55, high: 0.2 };

export function extractDocFeatures(signals: DocAnalysisSignals): number[] {
  const kChars = Math.max(1, signals.textLength / 1000);
  const chunks = Math.max(1, signals.chunkCount);
  const actions = Math.max(1, signals.actionsCount);

  return [
    clamp(signals.textLength / 50_000, 0, 1),
    clamp(chunks / 20, 0, 1),
    clamp(signals.findingsCount / 20, 0, 1),
    clamp(signals.issuesCount / 15, 0, 1),
    clamp(signals.actionsCount / 20, 0, 1),
    clamp(signals.citationsCount / 20, 0, 1),
    clamp(signals.entitiesCount / 40, 0, 1),
    CONF_SCORE[signals.documentTypeConfidence] ?? 0.5,
    RISK_INVERSE[signals.riskLevel] ?? 0.5,
    CONF_SCORE[signals.confidence] ?? 0.5,
    signals.mode === "legal" || signals.strictLegalReview ? 1 : 0,
    signals.jurisdictionSet ? 1 : 0,
    clamp(signals.mandatoryActions / actions, 0, 1),
    clamp(signals.citationsCount / chunks / 5, 0, 1),
    clamp(signals.entitiesCount / kChars / 8, 0, 1),
    clamp(signals.findingsCount / Math.max(1, signals.issuesCount + 1) / 4, 0, 1),
    clamp(signals.mandatoryActions / actions, 0, 1),
    signals.documentType.includes("audit") || signals.mode === "audit" ? 1 : 0,
    signals.documentType.includes("compliance") || signals.mode === "compliance" ? 1 : 0,
    signals.documentType.includes("legal") ? 1 : 0,
    signals.hasLegalBridge ? 1 : 0,
    clamp(signals.recommendationsCount / 10, 0, 1),
  ];
}

export function heuristicDocScores(signals: DocAnalysisSignals): DocScoreVector {
  const typeConf = (CONF_SCORE[signals.documentTypeConfidence] ?? 0.5) * 100;
  const riskInv = (RISK_INVERSE[signals.riskLevel] ?? 0.5) * 100;
  const conf = (CONF_SCORE[signals.confidence] ?? 0.5) * 100;
  const completeness = clamp(
    35 + (signals.textLength / 800) + signals.chunkCount * 4 + signals.findingsCount * 2,
  );
  const citationQuality = clamp(40 + signals.citationsCount * 4 + signals.citationsCount / Math.max(1, signals.chunkCount) * 8);
  const entityCoverage = clamp(38 + signals.entitiesCount * 1.8);
  const obligationClarity = clamp(
    42 + signals.actionsCount * 3 + (signals.mandatoryActions / Math.max(1, signals.actionsCount)) * 25,
  );
  const compliance = clamp(
    50 + signals.findingsCount * 1.5 - signals.issuesCount * 4 + (signals.strictLegalReview ? 8 : 0),
  );
  const auditReadiness = clamp(
    45 +
      (signals.documentType.includes("audit") ? 18 : 0) +
      signals.citationsCount * 2 -
      signals.issuesCount * 3,
  );
  const regulatory = clamp(
    48 +
      (signals.jurisdictionSet ? 12 : 0) +
      (signals.hasLegalBridge ? 10 : 0) +
      (signals.documentType.includes("compliance") ? 10 : 0),
  );
  const actionability = clamp(44 + signals.actionsCount * 2.5 + signals.recommendationsCount * 2);
  const executiveReadiness = clamp(
    46 + conf * 0.25 + completeness * 0.15 + (signals.summaryQuality ?? 0),
  );

  const overall = clamp(
    (compliance +
      riskInv +
      completeness +
      citationQuality +
      entityCoverage +
      obligationClarity +
      typeConf +
      executiveReadiness +
      auditReadiness +
      regulatory +
      actionability) /
      11,
  );

  return {
    compliance,
    legal_risk_inverse: riskInv,
    completeness,
    citation_quality: citationQuality,
    entity_coverage: entityCoverage,
    obligation_clarity: obligationClarity,
    type_certainty: typeConf,
    executive_readiness: executiveReadiness,
    audit_readiness: auditReadiness,
    regulatory_alignment: regulatory,
    actionability,
    overall_quality: overall,
  };
}

/** Optional 0–15 boost from summary length / structure (simulator + runtime). */
export type DocAnalysisSignalsWithSummary = DocAnalysisSignals & { summaryQuality?: number };

export function vectorizeDocScores(scores: DocScoreVector): number[] {
  return DOC_SCORE_DIMENSIONS.map((d) => scores[d]);
}

export function scoresFromVector(values: number[]): DocScoreVector {
  return Object.fromEntries(
    DOC_SCORE_DIMENSIONS.map((d, i) => [d, clamp(values[i] ?? 50)]),
  ) as DocScoreVector;
}

export function applyDocCalibration(
  signals: DocAnalysisSignalsWithSummary,
  heuristic?: DocScoreVector,
): { scores: DocScoreVector; calibrated: boolean; algorithmVersion: string } {
  const base = heuristic ?? heuristicDocScores(signals);
  const model = loadDocModel();
  if (!model) {
    return { scores: base, calibrated: false, algorithmVersion: "cyrus-doc-v1.0" };
  }
  const features = extractDocFeatures(signals);
  const blended = applyCalibratedBlend(vectorizeDocScores(base), features, model);
  return {
    scores: scoresFromVector(blended),
    calibrated: true,
    algorithmVersion: DOC_ALGORITHM_VERSION,
  };
}

export function getDocAlgorithmVersion(): string {
  return loadDocModel() ? DOC_ALGORITHM_VERSION : "cyrus-doc-v1.0";
}

export function buildDocCalibrationMeta(model: CalibratedModel | null) {
  if (!model) return undefined;
  return {
    algorithmVersion: DOC_ALGORITHM_VERSION,
    trainedAt: model.trainedAt,
    simulations: model.simulations,
    metrics: model.metrics,
    blend: model.blend,
  };
}
