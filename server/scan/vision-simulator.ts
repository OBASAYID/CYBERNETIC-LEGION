/**
 * Synthetic scan sessions with known ground-truth quality archetypes.
 */

import { randomBytes } from "crypto";
import {
  VISION_SCORE_DIMENSIONS,
  type VisionScoreVector,
} from "../../shared/vision-intelligence-types.js";
import type { ScanAnalysisSignals } from "./vision-scoring-core.js";
import { heuristicInterpretText } from "./vision-scoring-core.js";

export type VisionArchetype =
  | "clean_receipt"
  | "business_invoice"
  | "legal_notice"
  | "qr_safe_url"
  | "qr_suspicious"
  | "noisy_ocr"
  | "ambiguous_text"
  | "empty_scan";

const ARCHETYPE_TRUTH: Record<VisionArchetype, VisionScoreVector> = {
  clean_receipt: {
    ocr_quality: 88,
    language_certainty: 90,
    threat_inverse: 92,
    finding_density: 78,
    risk_severity_inverse: 90,
    clarity: 86,
    qr_safety: 75,
    translation_readiness: 70,
    interpretation_confidence: 84,
    content_completeness: 82,
    semantic_coherence: 85,
    overall_scan_quality: 86,
  },
  business_invoice: {
    ocr_quality: 82,
    language_certainty: 85,
    threat_inverse: 88,
    finding_density: 86,
    risk_severity_inverse: 84,
    clarity: 80,
    qr_safety: 72,
    translation_readiness: 68,
    interpretation_confidence: 82,
    content_completeness: 80,
    semantic_coherence: 81,
    overall_scan_quality: 82,
  },
  legal_notice: {
    ocr_quality: 78,
    language_certainty: 80,
    threat_inverse: 70,
    finding_density: 84,
    risk_severity_inverse: 68,
    clarity: 76,
    qr_safety: 70,
    translation_readiness: 72,
    interpretation_confidence: 78,
    content_completeness: 78,
    semantic_coherence: 74,
    overall_scan_quality: 76,
  },
  qr_safe_url: {
    ocr_quality: 70,
    language_certainty: 75,
    threat_inverse: 85,
    finding_density: 55,
    risk_severity_inverse: 88,
    clarity: 72,
    qr_safety: 94,
    translation_readiness: 60,
    interpretation_confidence: 70,
    content_completeness: 65,
    semantic_coherence: 68,
    overall_scan_quality: 74,
  },
  qr_suspicious: {
    ocr_quality: 65,
    language_certainty: 60,
    threat_inverse: 28,
    finding_density: 40,
    risk_severity_inverse: 25,
    clarity: 55,
    qr_safety: 22,
    translation_readiness: 50,
    interpretation_confidence: 48,
    content_completeness: 58,
    semantic_coherence: 45,
    overall_scan_quality: 42,
  },
  noisy_ocr: {
    ocr_quality: 38,
    language_certainty: 42,
    threat_inverse: 75,
    finding_density: 35,
    risk_severity_inverse: 72,
    clarity: 40,
    qr_safety: 68,
    translation_readiness: 45,
    interpretation_confidence: 38,
    content_completeness: 42,
    semantic_coherence: 36,
    overall_scan_quality: 44,
  },
  ambiguous_text: {
    ocr_quality: 62,
    language_certainty: 48,
    threat_inverse: 68,
    finding_density: 50,
    risk_severity_inverse: 60,
    clarity: 45,
    qr_safety: 70,
    translation_readiness: 55,
    interpretation_confidence: 42,
    content_completeness: 55,
    semantic_coherence: 38,
    overall_scan_quality: 52,
  },
  empty_scan: {
    ocr_quality: 15,
    language_certainty: 10,
    threat_inverse: 50,
    finding_density: 5,
    risk_severity_inverse: 45,
    clarity: 12,
    qr_safety: 50,
    translation_readiness: 10,
    interpretation_confidence: 8,
    content_completeness: 5,
    semantic_coherence: 8,
    overall_scan_quality: 15,
  },
};

const ARCHETYPES = Object.keys(ARCHETYPE_TRUTH) as VisionArchetype[];

function pickArchetype(): VisionArchetype {
  return ARCHETYPES[randomBytes(1)[0] % ARCHETYPES.length];
}

function jitter(n: number, spread = 6): number {
  const delta = (randomBytes(1)[0] % (spread * 2 + 1)) - spread;
  return Math.max(0, Math.min(100, n + delta));
}

export function groundTruthVector(archetype: VisionArchetype): number[] {
  const truth = ARCHETYPE_TRUTH[archetype];
  return VISION_SCORE_DIMENSIONS.map((d) => jitter(truth[d]));
}

const SAMPLE_TEXT: Record<VisionArchetype, string> = {
  clean_receipt:
    "Receipt #8842. Date: 12 March 2025. Total BWP 245.50. Vendor: Metro Supplies Ltd. Payment confirmed.",
  business_invoice:
    "Invoice INV-2025-019. Amount USD 4,200. Due by 30 April 2025. Account reference AC-9912. Delivery address confirmed.",
  legal_notice:
    "Notice under Section 12. The respondent must comply by 15 June 2025. Failure may result in penalty. Reference Case CR-441.",
  qr_safe_url: "https://portal.example.gov.bw/verify?id=88291",
  qr_suspicious: "http://bit.ly/x7token?pass=secret",
  noisy_ocr: "Inv0ice ??? T0tal approx maybe 4,2OO due TBD unclear pending",
  ambiguous_text: "Meeting maybe next week. Amount unclear. Reference pending TBD.",
  empty_scan: "",
};

export function generateSimulatedScan(): { signals: ScanAnalysisSignals; archetype: VisionArchetype } {
  const archetype = pickArchetype();
  const truth = ARCHETYPE_TRUTH[archetype];
  const text = SAMPLE_TEXT[archetype];
  const interp = heuristicInterpretText(text);

  const scanType: ScanAnalysisSignals["scanType"] =
    archetype === "qr_safe_url" || archetype === "qr_suspicious"
      ? "qr"
      : archetype === "empty_scan"
        ? "unknown"
        : "image";

  const languageConfidence =
    archetype === "empty_scan"
      ? 0.05
      : archetype === "noisy_ocr"
        ? 0.35 + (randomBytes(1)[0] % 20) / 100
        : archetype === "ambiguous_text"
          ? 0.42 + (randomBytes(1)[0] % 15) / 100
          : 0.75 + (randomBytes(1)[0] % 20) / 100;

  const confidence: ScanAnalysisSignals["confidence"] =
    truth.overall_scan_quality > 75 ? "High" : truth.overall_scan_quality > 45 ? "Medium" : "Low";

  const signals: ScanAnalysisSignals = {
    textLength: text.length,
    languageConfidence,
    scanType,
    qrSafe: archetype !== "qr_suspicious",
    qrIsUrl: scanType === "qr",
    keyFindingsCount: interp.keyFindings.length || Math.round(truth.finding_density / 20),
    risksCount: interp.risks.length || (archetype === "qr_suspicious" ? 3 : 0),
    ambiguitiesCount: interp.ambiguities.length || (archetype === "ambiguous_text" ? 3 : 0),
    warningsCount: archetype === "noisy_ocr" ? 4 : archetype === "empty_scan" ? 2 : 0,
    hasTranslation: archetype === "legal_notice" && randomBytes(1)[0] % 2 === 0,
    hasContent: archetype !== "empty_scan",
    interpretationLength: interp.interpretation.length,
    confidence,
    mode:
      archetype === "legal_notice"
        ? "legal"
        : archetype === "business_invoice" || archetype === "clean_receipt"
          ? "business"
          : "casual",
    ocrAttempted: scanType === "image",
  };

  return { signals, archetype };
}
