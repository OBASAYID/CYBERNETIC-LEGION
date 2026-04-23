import { ExtractionResult } from "./extract";
import { DetectionResult } from "./detect";

export interface AnalysisReport {
  success: boolean;
  title: string;
  docType: string;
  sourceDescription: string;
  extractedSummary: string;
  transcript?: string;
  ocrText?: string;
  keyFindings: string[];
  issues: string[];
  interpretation: string;
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  attempted: string[];
  warnings: string[];
}

export function buildReport(
  det: DetectionResult,
  ext: ExtractionResult,
  analysis: { summary: string; findings: string[]; issues: string[]; interpretation: string; recommendations: string[]; confidence: "High" | "Medium" | "Low" },
  success: boolean,
): AnalysisReport {
  return {
    success,
    title: "File Analysis Report",
    docType: det.detectedMime || det.declaredMime || "unknown",
    sourceDescription: `Size: ${det.size} bytes; Declared: ${det.declaredMime || "-"}; Detected: ${det.detectedMime || "-"}; Hash: ${det.sha256}`,
    extractedSummary: analysis.summary,
    transcript: ext.transcript,
    ocrText: ext.ocrText,
    keyFindings: analysis.findings,
    issues: analysis.issues,
    interpretation: analysis.interpretation,
    recommendations: analysis.recommendations,
    confidence: analysis.confidence,
    attempted: ext.attempted,
    warnings: ext.warnings,
  };
}

