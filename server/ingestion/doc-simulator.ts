/**
 * Synthetic document sessions with known ground-truth quality archetypes.
 */

import { randomBytes } from "crypto";
import {
  DOC_SCORE_DIMENSIONS,
  type DocScoreVector,
} from "../../shared/doc-intelligence-types.js";
import type { DocAnalysisSignals } from "./doc-scoring-core.js";

export type DocArchetype =
  | "audit_exemplar"
  | "compliance_ready"
  | "legal_contract"
  | "policy_standard"
  | "research_solid"
  | "incomplete_draft"
  | "high_risk_breach"
  | "sparse_general";

const ARCHETYPE_TRUTH: Record<DocArchetype, DocScoreVector> = {
  audit_exemplar: {
    compliance: 92,
    legal_risk_inverse: 88,
    completeness: 90,
    citation_quality: 91,
    entity_coverage: 84,
    obligation_clarity: 86,
    type_certainty: 90,
    executive_readiness: 88,
    audit_readiness: 94,
    regulatory_alignment: 89,
    actionability: 85,
    overall_quality: 90,
  },
  compliance_ready: {
    compliance: 90,
    legal_risk_inverse: 85,
    completeness: 86,
    citation_quality: 82,
    entity_coverage: 80,
    obligation_clarity: 88,
    type_certainty: 87,
    executive_readiness: 84,
    audit_readiness: 88,
    regulatory_alignment: 92,
    actionability: 86,
    overall_quality: 87,
  },
  legal_contract: {
    compliance: 86,
    legal_risk_inverse: 78,
    completeness: 88,
    citation_quality: 90,
    entity_coverage: 82,
    obligation_clarity: 91,
    type_certainty: 92,
    executive_readiness: 80,
    audit_readiness: 76,
    regulatory_alignment: 88,
    actionability: 83,
    overall_quality: 85,
  },
  policy_standard: {
    compliance: 78,
    legal_risk_inverse: 82,
    completeness: 80,
    citation_quality: 72,
    entity_coverage: 70,
    obligation_clarity: 74,
    type_certainty: 75,
    executive_readiness: 78,
    audit_readiness: 72,
    regulatory_alignment: 76,
    actionability: 70,
    overall_quality: 76,
  },
  research_solid: {
    compliance: 74,
    legal_risk_inverse: 90,
    completeness: 85,
    citation_quality: 78,
    entity_coverage: 68,
    obligation_clarity: 62,
    type_certainty: 80,
    executive_readiness: 82,
    audit_readiness: 70,
    regulatory_alignment: 65,
    actionability: 58,
    overall_quality: 74,
  },
  incomplete_draft: {
    compliance: 48,
    legal_risk_inverse: 55,
    completeness: 42,
    citation_quality: 38,
    entity_coverage: 40,
    obligation_clarity: 45,
    type_certainty: 50,
    executive_readiness: 44,
    audit_readiness: 40,
    regulatory_alignment: 42,
    actionability: 46,
    overall_quality: 44,
  },
  high_risk_breach: {
    compliance: 32,
    legal_risk_inverse: 22,
    completeness: 58,
    citation_quality: 55,
    entity_coverage: 52,
    obligation_clarity: 40,
    type_certainty: 70,
    executive_readiness: 38,
    audit_readiness: 35,
    regulatory_alignment: 30,
    actionability: 42,
    overall_quality: 38,
  },
  sparse_general: {
    compliance: 55,
    legal_risk_inverse: 72,
    completeness: 35,
    citation_quality: 30,
    entity_coverage: 28,
    obligation_clarity: 32,
    type_certainty: 45,
    executive_readiness: 40,
    audit_readiness: 38,
    regulatory_alignment: 48,
    actionability: 36,
    overall_quality: 42,
  },
};

const ARCHETYPES = Object.keys(ARCHETYPE_TRUTH) as DocArchetype[];

function pickArchetype(): DocArchetype {
  return ARCHETYPES[randomBytes(1)[0] % ARCHETYPES.length];
}

function jitter(n: number, spread = 6): number {
  const delta = (randomBytes(1)[0] % (spread * 2 + 1)) - spread;
  return Math.max(0, Math.min(100, n + delta));
}

export function groundTruthVector(archetype: DocArchetype): number[] {
  const truth = ARCHETYPE_TRUTH[archetype];
  return DOC_SCORE_DIMENSIONS.map((d) => jitter(truth[d]));
}

export function generateSimulatedDocument(): { signals: DocAnalysisSignals; archetype: DocArchetype } {
  const archetype = pickArchetype();
  const truth = ARCHETYPE_TRUTH[archetype];

  const textLength = Math.floor(
    (truth.completeness / 100) * 45_000 + (randomBytes(2).readUInt16BE(0) % 8000),
  );
  const chunkCount = Math.max(1, Math.ceil(textLength / 24_000));
  const issuesCount = Math.round((100 - truth.legal_risk_inverse) / 8 + (randomBytes(1)[0] % 3));
  const findingsCount = Math.round(truth.compliance / 5 + chunkCount * 2);
  const actionsCount = Math.round(truth.obligation_clarity / 6);
  const mandatoryActions = Math.round(actionsCount * (truth.obligation_clarity / 100));
  const citationsCount = Math.round(truth.citation_quality / 5);
  const entitiesCount = Math.round(truth.entity_coverage / 2.5);
  const recommendationsCount = Math.round(truth.actionability / 8);

  const docTypes: Record<DocArchetype, string> = {
    audit_exemplar: "audit_report",
    compliance_ready: "compliance_report",
    legal_contract: "legal_contract",
    policy_standard: "policy_document",
    research_solid: "research_report",
    incomplete_draft: "general_document",
    high_risk_breach: "compliance_report",
    sparse_general: "general_document",
  };

  const typeConf: DocAnalysisSignals["documentTypeConfidence"] =
    truth.type_certainty > 82 ? "High" : truth.type_certainty > 60 ? "Medium" : "Low";
  const riskLevel: DocAnalysisSignals["riskLevel"] =
    truth.legal_risk_inverse > 75 ? "low" : truth.legal_risk_inverse > 45 ? "medium" : "high";
  const confidence: DocAnalysisSignals["confidence"] =
    truth.overall_quality > 80 ? "High" : truth.overall_quality > 55 ? "Medium" : "Low";

  const signals: DocAnalysisSignals = {
    textLength,
    chunkCount,
    findingsCount,
    issuesCount,
    actionsCount,
    citationsCount,
    entitiesCount,
    recommendationsCount,
    documentType: docTypes[archetype],
    documentTypeConfidence: typeConf,
    riskLevel,
    confidence,
    strictLegalReview: archetype === "legal_contract" || archetype === "high_risk_breach",
    jurisdictionSet: archetype !== "sparse_general" && archetype !== "incomplete_draft",
    mode:
      archetype === "audit_exemplar"
        ? "audit"
        : archetype === "compliance_ready" || archetype === "high_risk_breach"
          ? "compliance"
          : archetype === "legal_contract"
            ? "legal"
            : "standard",
    hasLegalBridge: archetype === "legal_contract" || archetype === "compliance_ready",
    mandatoryActions,
    summaryQuality: Math.round(truth.executive_readiness / 7),
  };

  return { signals, archetype };
}
