/**
 * Fuses document intelligence (extract → classify → intelligent brief)
 * with long-form docgen for firm, professional multi-page output.
 */

import { generateDocument, type GeneratedDoc } from "../docgen/generate.js";
import { performFullAnalysis } from "./full-analysis.js";
import { extractFile } from "./extract.js";
import { resolveDocumentText, extractionFailureMessage } from "./resolve-document-text.js";
import {
  classifyDocument,
  generateIntelligentDocument,
  generateTenderResponse,
  type DocumentCategory,
  type DocumentClassification,
  type GeneratedIntelligentDocument,
} from "./doc-intelligence-engine.js";
import type { AnalysisOptions } from "./analyze.js";
import { maxDocgenTargetPages } from "../../shared/cyrus-document-limits.js";

export interface FusedDraftInput {
  buffer: Buffer;
  mimetype?: string;
  fileName?: string;
  docType?: string;
  audience?: string;
  purpose?: string;
  targetPages?: number;
  includeImages?: boolean;
  imageStyle?: "realistic_3d" | "graphical" | "schematic";
  jurisdiction?: string;
  mode?: AnalysisOptions["mode"];
  strictLegalReview?: boolean;
  maxChunks?: number;
  analysisCommand?: string;
  docHint?: string;
}

export interface FusedDraftResult {
  classification: DocumentClassification;
  intelligenceBrief: GeneratedIntelligentDocument;
  analysisSummary: {
    executiveBrief: string;
    keyFindings: string[];
    interpretation: string;
    documentType: string;
    pageCount?: number;
  };
  document: GeneratedDoc;
  fusedContextLength: number;
}

function mapCategoryToDocType(category: DocumentCategory, requested?: string): string {
  if (requested?.trim()) return requested.trim();
  switch (category) {
    case "tender":
    case "proposal":
      return "executive_summary";
    case "legal":
    case "contract":
      return "legal_brief";
    case "technical":
      return "technical_report";
    case "report":
    case "research":
      return "research_report";
    case "administrative":
    case "correspondence":
      return "correspondence";
    case "examination":
    case "quiz":
      return "application_evaluation";
    case "policy":
      return "policy_paper";
    default:
      return "executive_summary";
  }
}

function buildFusedRawText(params: {
  fileName?: string;
  extractedText: string;
  classification: DocumentClassification;
  intelligenceBrief: GeneratedIntelligentDocument;
  analysis: Awaited<ReturnType<typeof performFullAnalysis>>;
  purpose?: string;
  analysisCommand?: string;
  docHint?: string;
}): string {
  const parts: string[] = [
    "# CYRUS Fused Document Intelligence Pipeline",
    "",
    params.purpose ? `Purpose: ${params.purpose}` : "",
    params.fileName ? `Source file: ${params.fileName}` : "",
    params.docHint ? `Document hint: ${params.docHint}` : "",
    params.analysisCommand ? `Operator command: ${params.analysisCommand}` : "",
    "",
    "## Classification",
    `Category: ${params.classification.category}`,
    `Confidence: ${(params.classification.confidence * 100).toFixed(0)}%`,
    params.classification.characteristics.length
      ? `Characteristics: ${params.classification.characteristics.join(", ")}`
      : "",
    "",
    "## Analysis Executive Brief",
    params.analysis.analysis.executiveBrief || params.analysis.analysis.summary,
    "",
    "## Key Findings",
    ...(params.analysis.analysis.keyFindings || []).map((f) => `- ${f}`),
    "",
    "## Interpretation",
    params.analysis.analysis.interpretation || "",
    "",
    "## Intelligent Response Draft (expand into full professional document)",
    params.intelligenceBrief.content,
    "",
    "## Source Document Text",
    params.extractedText.slice(0, 80_000),
  ].filter(Boolean);

  return parts.join("\n");
}

export async function runFusedProfessionalDraft(input: FusedDraftInput): Promise<FusedDraftResult> {
  const extracted = await extractFile(input.buffer, input.mimetype);
  const resolved = resolveDocumentText(extracted);
  if (!resolved) {
    throw new Error(extractionFailureMessage(extracted));
  }

  const classification = await classifyDocument(resolved.text, {
    fileName: input.fileName,
    pageCount: extracted.pageCount,
  });

  const analysis = await performFullAnalysis(input.buffer, input.mimetype, {
    jurisdiction: input.jurisdiction,
    mode: input.mode,
    strictLegalReview: input.strictLegalReview,
    maxChunks: input.maxChunks,
    docHint: input.docHint,
    analysisCommand: input.analysisCommand,
  });

  let intelligenceBrief: GeneratedIntelligentDocument;
  if (classification.category === "tender") {
    intelligenceBrief = await generateTenderResponse(resolved.text, classification, {
      fileName: input.fileName,
      pageCount: extracted.pageCount,
    });
  } else {
    intelligenceBrief = await generateIntelligentDocument({
      sourceDocument: resolved.text,
      documentType: classification.category,
      format: "formal",
      targetLength: "comprehensive",
      requirements: [
        input.purpose || "Produce a firm, submission-ready professional document.",
        input.analysisCommand || "",
        ...(analysis.analysis.keyFindings || []).slice(0, 8),
      ].filter(Boolean),
      context: {
        jurisdiction: input.jurisdiction,
        mode: input.mode,
        docHint: input.docHint,
      },
    });
  }

  const fusedRawText = buildFusedRawText({
    fileName: input.fileName,
    extractedText: resolved.text,
    classification,
    intelligenceBrief,
    analysis,
    purpose: input.purpose,
    analysisCommand: input.analysisCommand,
    docHint: input.docHint,
  });

  const targetPages = Math.max(
    12,
    Math.min(maxDocgenTargetPages(), Number(input.targetPages || 48)),
  );

  const document = await generateDocument({
    mode: "full",
    docType: mapCategoryToDocType(classification.category, input.docType),
    audience: input.audience || "official",
    purpose:
      input.purpose ||
      `Professional ${classification.category} document fused from CYRUS intelligence pipeline`,
    topic: intelligenceBrief.title || input.fileName || "CYRUS Professional Document",
    rawText: fusedRawText,
    targetPages,
    includeImages: input.includeImages,
    imageStyle: input.imageStyle,
  });

  if (document.wordCount < 200) {
    throw new Error(
      "Fused draft produced insufficient content. Verify AI provider configuration and retry.",
    );
  }

  return {
    classification,
    intelligenceBrief,
    analysisSummary: {
      executiveBrief: analysis.analysis.executiveBrief || analysis.analysis.summary,
      keyFindings: analysis.analysis.keyFindings || [],
      interpretation: analysis.analysis.interpretation || "",
      documentType: analysis.analysis.documentType,
      pageCount: extracted.pageCount,
    },
    document,
    fusedContextLength: fusedRawText.length,
  };
}
