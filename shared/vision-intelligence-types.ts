/** Vision / optical scan — calibrated scoring dimensions. */

export const VISION_SCORE_DIMENSIONS = [
  "ocr_quality",
  "language_certainty",
  "threat_inverse",
  "finding_density",
  "risk_severity_inverse",
  "clarity",
  "qr_safety",
  "translation_readiness",
  "interpretation_confidence",
  "content_completeness",
  "semantic_coherence",
  "overall_scan_quality",
] as const;

export type VisionScoreDimension = (typeof VISION_SCORE_DIMENSIONS)[number];
export type VisionScoreVector = Record<VisionScoreDimension, number>;

export const VISION_ALGORITHM_VERSION = "cyrus-vision-v1.1";

export const VISION_FEATURE_NAMES = [
  "text_length_norm",
  "language_confidence",
  "findings_density",
  "risks_density",
  "ambiguity_density",
  "warnings_density",
  "qr_scan",
  "qr_safe",
  "has_translation",
  "has_content",
  "interpretation_len_norm",
  "semantic_coherence_proxy",
  "threat_inverse",
  "clarity_proxy",
  "content_completeness_proxy",
  "high_confidence",
  "business_mode",
  "legal_mode",
  "technical_mode",
  "ocr_attempted",
] as const;
