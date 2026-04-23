import { detectFile } from "./detect.js";
import { extractFile } from "./extract.js";
import { analyzeExtraction, extractEntities, type AnalysisCitation, type AnalysisOptions } from "./analyze.js";

export interface FullAnalysisResponse {
  detection: Awaited<ReturnType<typeof detectFile>>;
  extraction: {
    text: string;
    metadata: {
      attempted: string[];
      warnings: string[];
      pageCount?: number;
      textLength?: number;
      transcript?: string;
      ocrText?: string;
      frames?: Array<{ index: number; ocrText?: string; visionNotes?: string }>;
      visionNotes?: string;
    };
    error?: string;
  };
  analysis: {
    summary: string;
    keyFindings: string[];
    issues: string[];
    interpretation: string;
    confidence: "High" | "Medium" | "Low";
    documentType: string;
    documentTypeConfidence: "High" | "Medium" | "Low";
    decisionActions: Array<{
      action: string;
      owner: string;
      deadline: string;
      obligation: string;
    }>;
    executiveBrief: string;
    knowledgeApplied: string[];
    capabilitySummary: string;
    jurisdictionApplied: string;
    strictLegalReview: boolean;
    citationAnchors: AnalysisCitation[];
    chunksAnalyzed?: number;
    entities: Array<{ type: string; value: string }>;
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  };
  generatedAt: string;
}

export async function performFullAnalysis(
  buffer: Buffer,
  mimetype?: string,
  options: AnalysisOptions = {},
): Promise<FullAnalysisResponse> {
  const det = await detectFile(buffer, mimetype);
  const ext = await extractFile(buffer, mimetype);
  const analysis = await analyzeExtraction(ext, options);
  const hasContent = !!(ext.text || ext.ocrText || ext.transcript || (ext.frames && ext.frames.some((f) => f.ocrText)));
  const entities = analysis.entities || extractEntities((ext.text || ext.ocrText || ext.transcript || "").slice(0, 80_000));

  const riskLevel: "low" | "medium" | "high" =
    analysis.riskLevel || (analysis.confidence === "Low" ? "high" : analysis.confidence === "Medium" ? "medium" : "low");

  return {
    detection: det,
    extraction: {
      text: ext.text || ext.ocrText || ext.transcript || "",
      metadata: {
        attempted: ext.attempted,
        warnings: ext.warnings,
        pageCount: ext.pageCount,
        textLength: ext.text ? ext.text.length : ext.ocrText ? ext.ocrText.length : ext.transcript ? ext.transcript.length : 0,
        transcript: ext.transcript,
        ocrText: ext.ocrText,
        frames: ext.frames,
        visionNotes: ext.visionNotes,
      },
      error: hasContent ? undefined : "No extractable content found",
    },
    analysis: {
      summary: analysis.summary,
      keyFindings: analysis.findings,
      issues: analysis.issues,
      interpretation: analysis.interpretation,
      confidence: analysis.confidence,
      documentType: analysis.documentType || "unknown",
      documentTypeConfidence: analysis.documentTypeConfidence || "Low",
      decisionActions: analysis.decisionActions || [],
      executiveBrief: analysis.executiveBrief || analysis.summary,
      knowledgeApplied: analysis.knowledgeApplied || [],
      capabilitySummary: analysis.capabilitySummary || "Standard extraction and analysis completed",
      jurisdictionApplied: analysis.jurisdictionApplied || options.jurisdiction || "unspecified",
      strictLegalReview: analysis.strictLegalReview || false,
      citationAnchors: analysis.citationAnchors || [],
      chunksAnalyzed: analysis.chunksAnalyzed,
      entities,
      riskLevel,
      recommendations: analysis.recommendations,
    },
    generatedAt: new Date().toISOString(),
  };
}