/** Document intelligence — calibrated scoring dimensions. */

export const DOC_SCORE_DIMENSIONS = [
  "compliance",
  "legal_risk_inverse",
  "completeness",
  "citation_quality",
  "entity_coverage",
  "obligation_clarity",
  "type_certainty",
  "executive_readiness",
  "audit_readiness",
  "regulatory_alignment",
  "actionability",
  "overall_quality",
] as const;

export type DocScoreDimension = (typeof DOC_SCORE_DIMENSIONS)[number];
export type DocScoreVector = Record<DocScoreDimension, number>;

export const DOC_ALGORITHM_VERSION = "cyrus-doc-v1.1";

export const DOC_FEATURE_NAMES = [
  "text_length_norm",
  "chunk_count_norm",
  "findings_density",
  "issues_density",
  "actions_density",
  "citations_density",
  "entities_density",
  "type_confidence_score",
  "risk_inverse",
  "conf_score",
  "legal_mode",
  "jurisdiction_set",
  "obligation_ratio",
  "citation_per_chunk",
  "entity_per_kchars",
  "finding_issue_ratio",
  "mandatory_action_ratio",
  "audit_mode",
  "compliance_mode",
  "legal_type",
  "legal_bridge",
  "recommendations_density",
] as const;
