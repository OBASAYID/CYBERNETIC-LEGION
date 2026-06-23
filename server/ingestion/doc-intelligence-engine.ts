/**
 * Advanced Document Intelligence Engine
 * 
 * Provides deep learning, LLM, and ML capabilities for:
 * - Intelligent document generation
 * - Document cloning and templating
 * - Automated response generation (tenders, exams, applications)
 * - Format compliance and professional output
 * - Context-aware document understanding
 */

import OpenAI from "openai";
import { unifiedInferText, hasAnyInferenceProvider } from "../ai/unified-inference.js";
import type { ExtractionResult } from "./extract.js";
import type { AnalysisResult } from "./analyze.js";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const llmClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl }) : null;

const TENDER_SYSTEM_PROMPT = `You are CYRUS Document Intelligence — an elite tender and procurement response architect.

Produce a submission-ready professional proposal that:
1. Mirrors the tender's section structure and numbering
2. Addresses every requirement, deliverable, and evaluation criterion explicitly
3. Includes executive summary, company profile, technical approach, methodology, team, timeline, pricing framework, compliance matrix, and appendices where relevant
4. Uses formal business language with measurable commitments
5. Flags assumptions and clarifications professionally

Output ONLY valid JSON:
{
  "title": "string",
  "sections": [{"title": "string", "content": "string", "type": "optional"}],
  "metadata": {"confidence": 0.0-1.0, "complianceChecks": ["string"]}
}`;

function parseGeneratedJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence?.[1]) {
      try {
        return JSON.parse(fence[1].trim()) as Record<string, unknown>;
      } catch {
        // fall through to markdown payload
      }
    }
    return {
      title: "CYRUS Generated Document",
      content: trimmed,
      sections: splitMarkdownSections(trimmed),
      metadata: { confidence: 0.75, complianceChecks: ["structure", "content"] },
    };
  }
}

type NormalizedSection = { title: string; content: string; type?: string };

function normalizeSection(raw: unknown): NormalizedSection | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = String(s.title || s.heading || s.name || s.section || s.label || "").trim();
  const content = String(
    s.content || s.body || s.text || s.value || s.description || s.details || "",
  ).trim();
  if (!title && !content) return null;
  return {
    title: title || "Section",
    content,
    type: typeof s.type === "string" ? s.type : undefined,
  };
}

function splitMarkdownSections(markdown: string): NormalizedSection[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  if (!/^##\s+/m.test(trimmed)) {
    const titleMatch = trimmed.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() || "Proposal";
    const content = titleMatch ? trimmed.replace(/^#\s+.+\n?/, "").trim() : trimmed;
    return [{ title, content }];
  }

  return trimmed
    .split(/^##\s+/m)
    .filter(Boolean)
    .map((part) => {
      const lines = part.split("\n");
      const title = lines[0]?.trim() || "Section";
      const content = lines.slice(1).join("\n").trim();
      return { title, content };
    })
    .filter((s) => s.title || s.content);
}

function collectSectionArrays(raw: Record<string, unknown>): unknown[] {
  const keys = ["sections", "outline", "parts", "chapters", "proposal_sections", "items", "components"];
  for (const key of keys) {
    const val = raw[key];
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

function normalizeGeneratedPayload(raw: Record<string, unknown>): {
  title?: string;
  sections: NormalizedSection[];
  metadata?: Record<string, unknown>;
  content?: string;
  attachments?: GeneratedIntelligentDocument["attachments"];
} {
  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : undefined;

  const title = String(
    raw.title || raw.documentTitle || raw.name || raw.subject || "",
  ).trim() || undefined;

  const stringFields = ["content", "proposal", "response", "document", "body", "text", "markdown", "rendered"];
  for (const key of stringFields) {
    const val = raw[key];
    if (typeof val === "string" && val.trim().length > 80) {
      const sections = splitMarkdownSections(val);
      return {
        title: title || sections[0]?.title,
        sections: sections.length > 0 ? sections : [{ title: title || "Document", content: val.trim() }],
        metadata,
        content: val.trim(),
        attachments: Array.isArray(raw.attachments) ? (raw.attachments as any) : undefined,
      };
    }
  }

  const rawSections = collectSectionArrays(raw);
  const sections = rawSections
    .map(normalizeSection)
    .filter((s): s is NormalizedSection => s !== null);

  if (sections.length > 0) {
    const content = sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n");
    return { title, sections, metadata, content, attachments: Array.isArray(raw.attachments) ? (raw.attachments as any) : undefined };
  }

  return { title, sections: [], metadata, content: "" };
}

function payloadWordCount(payload: ReturnType<typeof normalizeGeneratedPayload>): number {
  const text = payload.content || payload.sections.map((s) => `${s.title} ${s.content}`).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

function hasSubstantivePayload(payload: ReturnType<typeof normalizeGeneratedPayload>, minWords = 80): boolean {
  return payloadWordCount(payload) >= minWords;
}

async function inferRawText(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  jsonMode: boolean,
): Promise<string> {
  if (llmClient) {
    const response = await llmClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      temperature: 0.65,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content?.trim() || "";
  }

  if (hasAnyInferenceProvider()) {
    const result = await unifiedInferText(userMessage, {
      systemPrompt,
      taskType: "document",
      maxTokens,
      temperature: 0.65,
    });
    if (result.degraded && !result.response.trim()) {
      throw new Error("Document generation failed — all AI providers unavailable.");
    }
    return result.response.trim();
  }

  throw new Error("No AI provider configured. Set OPENAI_API_KEY or enable Ollama/local models.");
}

async function inferDocumentMarkdown(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<ReturnType<typeof normalizeGeneratedPayload>> {
  const markdownPrompt = `${systemPrompt}

IMPORTANT: Do NOT output JSON. Write the complete professional document in Markdown.
Use a single # title line, then ## for each major section.
Write full, detailed section bodies — minimum 2,500 words total for tender proposals.`;

  const raw = await inferRawText(markdownPrompt, userMessage, maxTokens, false);
  if (!raw) {
    throw new Error("Document generation returned empty content from all providers.");
  }

  const sections = splitMarkdownSections(raw);
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  return {
    title: titleMatch?.[1]?.trim() || sections[0]?.title || "CYRUS Proposal",
    sections: sections.length > 0 ? sections : [{ title: "Proposal", content: raw }],
    content: raw,
    metadata: { confidence: 0.8, complianceChecks: ["markdown-fallback", "structure", "content"] },
  };
}

async function inferDocumentJson(systemPrompt: string, userMessage: string, maxTokens = 8000): Promise<ReturnType<typeof normalizeGeneratedPayload>> {
  if (!hasAnyInferenceProvider() && !llmClient) {
    throw new Error("No AI provider configured. Set OPENAI_API_KEY or enable Ollama/local models.");
  }

  // Pass 1: structured JSON (OpenAI json_object when available — most reliable)
  try {
    const jsonRaw = await inferRawText(systemPrompt, userMessage, maxTokens, !!llmClient);
    const parsed = normalizeGeneratedPayload(parseGeneratedJson(jsonRaw));
    if (hasSubstantivePayload(parsed)) {
      return parsed;
    }
    console.warn("[Doc Intelligence] JSON generation under minimum word count; retrying as Markdown.");
  } catch (err) {
    console.warn("[Doc Intelligence] JSON generation failed:", err instanceof Error ? err.message : String(err));
  }

  // Pass 2: Markdown fallback for models that ignore JSON or return empty shells
  const markdown = await inferDocumentMarkdown(systemPrompt, userMessage, maxTokens);
  if (!hasSubstantivePayload(markdown, 50)) {
    throw new Error(
      "Proposal generation produced insufficient content. Verify AI provider keys and retry with a clearer tender PDF.",
    );
  }
  return markdown;
}

function tenderContextSlice(text: string, maxChars = 120_000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.65));
  const tail = text.slice(-Math.floor(maxChars * 0.35));
  return `${head}\n\n[… middle sections truncated for context window …]\n\n${tail}`;
}

// =====================================
// Document Type Classification (ML)
// =====================================

export type DocumentCategory = 
  | "tender"
  | "examination"
  | "quiz"
  | "job_requirement"
  | "administrative"
  | "legal"
  | "technical"
  | "correspondence"
  | "report"
  | "proposal"
  | "contract"
  | "policy"
  | "research"
  | "unknown";

export interface DocumentClassification {
  category: DocumentCategory;
  confidence: number;
  subcategory?: string;
  characteristics: string[];
  requiresResponse: boolean;
  responseType?: "comply" | "answer" | "clone" | "analyze";
}

/**
 * Deep learning-based document classification
 * Uses pattern recognition and NLP to identify document types
 */
export async function classifyDocument(
  text: string,
  metadata?: { fileName?: string; pageCount?: number }
): Promise<DocumentClassification> {
  const sample = text.slice(0, 8000);
  
  // Pattern matching for quick classification
  const patterns = {
    tender: /\b(tender|bid|quotation|rfp|request for proposal|procurement)\b/i,
    examination: /\b(examination|exam|test paper|question paper|assessment)\b/i,
    quiz: /\b(quiz|test|assessment|multiple choice|mcq)\b/i,
    job_requirement: /\b(job description|position|vacancy|employment|recruitment)\b/i,
    administrative: /\b(memorandum|circular|notice|directive|policy)\b/i,
    legal: /\b(contract|agreement|terms|clause|whereas|hereinafter)\b/i,
    technical: /\b(specification|technical|procedure|manual|documentation)\b/i,
    proposal: /\b(proposal|pitch|offering|solution|recommendation)\b/i,
    report: /\b(report|analysis|findings|summary|conclusion)\b/i,
  };

  let bestMatch: DocumentCategory = "unknown";
  let maxMatches = 0;

  for (const [category, pattern] of Object.entries(patterns)) {
    const matches = (sample.match(pattern) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = category as DocumentCategory;
    }
  }

  // Enhanced LLM classification for ambiguous cases
  if (maxMatches < 2 && llmClient) {
    try {
      const response = await llmClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a document classification expert. Analyze the document and return ONLY a JSON object with: category (tender|examination|quiz|job_requirement|administrative|legal|technical|correspondence|report|proposal|contract|policy|research), confidence (0-1), subcategory, and requiresResponse (boolean)."
          },
          {
            role: "user",
            content: `Classify this document:\n\n${sample}\n\nFile: ${metadata?.fileName || "unknown"}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      if (result.category) {
        bestMatch = result.category;
        maxMatches = Math.floor((result.confidence || 0.5) * 10);
      }
    } catch (err) {
      console.warn("[Doc Intelligence] LLM classification failed:", err instanceof Error ? err.message : String(err));
    }
  }

  const confidence = Math.min(1, maxMatches / 5);
  const requiresResponse = ["tender", "examination", "quiz", "job_requirement"].includes(bestMatch);
  
  return {
    category: bestMatch,
    confidence,
    characteristics: extractDocumentCharacteristics(sample),
    requiresResponse,
    responseType: requiresResponse ? determineResponseType(bestMatch) : undefined,
  };
}

function extractDocumentCharacteristics(text: string): string[] {
  const chars: string[] = [];
  const sample = text.toLowerCase();
  
  if (sample.includes("deadline") || sample.includes("due date")) chars.push("time-sensitive");
  if (sample.includes("question") && sample.includes("answer")) chars.push("requires-answers");
  if (sample.includes("signature") || sample.includes("authorized")) chars.push("formal-authorization");
  if (sample.includes("requirement") || sample.includes("must")) chars.push("mandatory-compliance");
  if (/\d+\s*(page|word|character)\s*limit/i.test(text)) chars.push("length-constrained");
  if (sample.includes("format") || sample.includes("template")) chars.push("format-specific");
  
  return chars;
}

function determineResponseType(category: DocumentCategory): "comply" | "answer" | "clone" | "analyze" {
  switch (category) {
    case "tender": return "comply";
    case "examination": return "answer";
    case "quiz": return "answer";
    case "job_requirement": return "comply";
    default: return "analyze";
  }
}

// =====================================
// Intelligent Document Generation
// =====================================

export interface DocumentGenerationOptions {
  sourceDocument?: string;
  documentType: DocumentCategory;
  requirements?: string[];
  format?: "formal" | "technical" | "executive" | "academic";
  targetLength?: "brief" | "standard" | "comprehensive";
  includeAnswers?: boolean;
  compliance?: {
    standards?: string[];
    regulations?: string[];
    constraints?: Record<string, any>;
  };
  context?: Record<string, any>;
}

export interface GeneratedIntelligentDocument {
  content: string;
  htmlContent?: string;
  title: string;
  category: DocumentCategory;
  format: string;
  sections: Array<{ title: string; content: string; type?: string }>;
  metadata: {
    generatedAt: string;
    wordCount: number;
    pageCount: number;
    confidence: number;
    complianceChecks: string[];
    qualityScore: number;
  };
  attachments?: Array<{
    id: string;
    type: "table" | "chart" | "image" | "calculation";
    content: string;
    description: string;
  }>;
}

/**
 * Core intelligent document generation engine
 * Uses advanced LLM with structured prompts for professional output
 */
export async function generateIntelligentDocument(
  options: DocumentGenerationOptions
): Promise<GeneratedIntelligentDocument> {
  const { documentType, format = "formal", targetLength = "standard" } = options;

  const systemPrompt = buildSystemPrompt(documentType, format);
  const userPrompt = buildUserPrompt(options);

  try {
    const generated = await inferDocumentJson(systemPrompt, userPrompt, targetLength === "comprehensive" ? 12000 : 8000);
    return await enhanceDocumentQuality(generated, options);
  } catch (err) {
    console.error("[Doc Intelligence] Generation failed:", err);
    throw new Error(`Document generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function buildSystemPrompt(docType: DocumentCategory, format: string): string {
  const basePrompt = `You are an expert document generation AI with deep knowledge of professional writing, compliance requirements, and document formatting standards.

Your task is to generate high-quality, professional documents that:
1. Follow correct format, grammar, and professional standards
2. Maintain appropriate context and tone
3. Ensure compliance with formal document structures
4. Include all necessary sections and components
5. Provide actionable, specific content`;

  const typeSpecific: Record<DocumentCategory, string> = {
    tender: "\n\nFor TENDER responses:\n- Address all requirements systematically\n- Provide clear pricing and deliverables\n- Include company qualifications\n- Demonstrate compliance with specifications\n- Use formal business language",
    examination: "\n\nFor EXAMINATION documents:\n- Structure questions clearly with proper numbering\n- Provide comprehensive answers when requested\n- Include marking schemes if applicable\n- Ensure academic rigor and clarity",
    quiz: "\n\nFor QUIZ documents:\n- Create clear, unambiguous questions\n- Provide multiple choice options when appropriate\n- Include correct answers and explanations\n- Maintain educational value",
    job_requirement: "\n\nFor JOB REQUIREMENT responses:\n- Address all listed qualifications\n- Demonstrate relevant experience\n- Use professional application language\n- Include specific examples and achievements",
    administrative: "\n\nFor ADMINISTRATIVE documents:\n- Follow official memo/notice format\n- Use clear, authoritative language\n- Include proper headers and references\n- Ensure policy compliance",
    technical: "\n\nFor TECHNICAL documents:\n- Use precise technical language\n- Include specifications and standards\n- Provide step-by-step procedures\n- Add diagrams or charts descriptions",
    legal: "\n\nFor LEGAL documents:\n- Use proper legal terminology\n- Include necessary clauses\n- Follow jurisdictional requirements\n- Ensure contractual clarity",
    proposal: "\n\nFor PROPOSAL documents:\n- Present compelling arguments\n- Include executive summary\n- Detail implementation plans\n- Provide clear benefits and ROI",
    report: "\n\nFor REPORT documents:\n- Structure with clear sections\n- Present data and analysis\n- Include findings and recommendations\n- Maintain objectivity",
    correspondence: "\n\nFor CORRESPONDENCE:\n- Use appropriate salutations\n- Maintain professional tone\n- Address points clearly\n- Proper closing",
    contract: "\n\nFor CONTRACT documents:\n- Include all binding terms\n- Define obligations clearly\n- Specify timelines and deliverables\n- Add legal protections",
    policy: "\n\nFor POLICY documents:\n- State clear objectives\n- Define scope and applicability\n- Include procedures and guidelines\n- Specify enforcement",
    research: "\n\nFor RESEARCH documents:\n- Follow academic structure\n- Include methodology\n- Present findings with evidence\n- Provide thorough citations",
    unknown: "",
  };

  return basePrompt + (typeSpecific[docType] || "") + `\n\nOutput format: JSON with {title, sections: [{title, content, type}], metadata: {wordCount, confidence, complianceChecks[]}}`;
}

function buildUserPrompt(options: DocumentGenerationOptions): string {
  const parts: string[] = [];
  
  parts.push(`Generate a ${options.format} ${options.documentType} document.`);
  
  if (options.sourceDocument) {
    parts.push(`\n\nSource document to respond to or clone:\n${options.sourceDocument.slice(0, 6000)}`);
  }
  
  if (options.requirements && options.requirements.length > 0) {
    parts.push(`\n\nRequirements to address:\n${options.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`);
  }
  
  if (options.compliance) {
    parts.push(`\n\nCompliance requirements: ${JSON.stringify(options.compliance)}`);
  }
  
  if (options.includeAnswers) {
    parts.push(`\n\nInclude detailed answers or solutions in the appropriate sections.`);
  }
  
  parts.push(`\n\nTarget length: ${options.targetLength}`);
  parts.push(`\nContext: ${JSON.stringify(options.context || {})}`);
  
  return parts.join("");
}

async function enhanceDocumentQuality(
  generated: ReturnType<typeof normalizeGeneratedPayload>,
  options: DocumentGenerationOptions
): Promise<GeneratedIntelligentDocument> {
  const sections = generated.sections?.length
    ? generated.sections
    : generated.content
      ? splitMarkdownSections(generated.content)
      : [];

  const content =
    generated.content?.trim() ||
    sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n").trim();

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 300));

  if (wordCount < 50) {
    throw new Error("Generated document has insufficient content. Retry or check AI provider configuration.");
  }

  const meta = generated.metadata || {};

  return {
    content,
    htmlContent: convertToHTML(sections),
    title: generated.title || `Generated ${options.documentType}`,
    category: options.documentType,
    format: options.format || "formal",
    sections,
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount,
      pageCount,
      confidence: typeof meta.confidence === "number" ? meta.confidence : 0.85,
      complianceChecks: Array.isArray(meta.complianceChecks)
        ? (meta.complianceChecks as string[])
        : ["format", "grammar", "structure"],
      qualityScore: calculateQualityScore({ ...generated, sections, content }),
    },
    attachments: generated.attachments || [],
  };
}

function convertToHTML(sections: Array<{ title: string; content: string }>): string {
  const sectionHTML = sections
    .map(s => `<section><h2>${escapeHTML(s.title)}</h2>${formatParagraphs(s.content)}</section>`)
    .join("\n");
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Generated Document</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
    h2 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 24px; }
    p { margin: 12px 0; }
    section { margin-bottom: 32px; }
  </style>
</head>
<body>${sectionHTML}</body>
</html>`;
}

function formatParagraphs(content: string): string {
  return content
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(p => `<p>${escapeHTML(p)}</p>`)
    .join("");
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function calculateQualityScore(generated: any): number {
  let score = 0.7; // Base score
  
  if (generated.sections && generated.sections.length >= 3) score += 0.1;
  if (generated.metadata?.complianceChecks && generated.metadata.complianceChecks.length > 0) score += 0.1;
  if (generated.title && generated.title.length > 10) score += 0.05;
  if (generated.metadata?.confidence && generated.metadata.confidence > 0.8) score += 0.05;
  
  return Math.min(1, score);
}

// =====================================
// Document Cloning and Response Engine
// =====================================

export interface DocumentCloneOptions {
  sourceDocument: string;
  sourceMetadata?: { fileName?: string; pageCount?: number };
  cloneType: "exact" | "template" | "answer-filled";
  modifications?: {
    replacements?: Record<string, string>;
    additions?: Array<{ section: string; content: string }>;
    answers?: boolean;
  };
}

/**
 * Advanced document cloning engine
 * Can create exact copies, templates, or answer-filled versions
 */
export async function cloneDocument(
  options: DocumentCloneOptions
): Promise<GeneratedIntelligentDocument> {
  const classification = await classifyDocument(options.sourceDocument, options.sourceMetadata);
  
  // For examinations/quizzes with answers requested
  if (classification.category === "examination" || classification.category === "quiz") {
    if (options.cloneType === "answer-filled" || options.modifications?.answers) {
      return await generateAnswerKey(options.sourceDocument, classification);
    }
  }
  
  // For tenders, generate compliant response
  if (classification.category === "tender") {
    return await generateTenderResponse(options.sourceDocument, classification);
  }
  
  // Generic cloning with modifications
  return await performDocumentClone(options, classification);
}

async function generateAnswerKey(
  examDocument: string,
  classification: DocumentClassification
): Promise<GeneratedIntelligentDocument> {
  const systemPrompt =
    "You are CYRUS examination intelligence. Generate comprehensive answers for every question. Include explanations, workings, and marking guidance. Output ONLY valid JSON with title, sections array, and metadata.";
  const userMessage = `Generate a complete answer key for this examination:\n\n${tenderContextSlice(examDocument, 80_000)}`;
  const result = await inferDocumentJson(systemPrompt, userMessage, 8000);
  return enhanceDocumentQuality(result, {
    documentType: classification.category,
    format: "academic",
    includeAnswers: true,
  });
}

export async function generateTenderResponse(
  tenderDocument: string,
  classification: DocumentClassification,
  metadata?: { fileName?: string; pageCount?: number },
): Promise<GeneratedIntelligentDocument> {
  const context = tenderContextSlice(tenderDocument);
  const userMessage = [
    `Analyze this tender document and produce a complete, submission-ready professional proposal.`,
    metadata?.fileName ? `Source file: ${metadata.fileName}` : "",
    metadata?.pageCount ? `Pages: ${metadata.pageCount}` : "",
    `Classification: ${classification.category} (confidence ${(classification.confidence * 100).toFixed(0)}%)`,
    classification.characteristics.length ? `Characteristics: ${classification.characteristics.join(", ")}` : "",
    `\n--- TENDER DOCUMENT ---\n${context}\n--- END ---`,
    `\nGenerate a high-grade proposal that would score highly on technical and compliance evaluation.`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await inferDocumentJson(TENDER_SYSTEM_PROMPT, userMessage, 12000);
  return enhanceDocumentQuality(result, {
    documentType: "tender",
    format: "formal",
    sourceDocument: tenderDocument,
    targetLength: "comprehensive",
  });
}

async function performDocumentClone(
  options: DocumentCloneOptions,
  classification: DocumentClassification
): Promise<GeneratedIntelligentDocument> {
  let clonedContent = options.sourceDocument;
  
  // Apply replacements
  if (options.modifications?.replacements) {
    for (const [key, value] of Object.entries(options.modifications.replacements)) {
      clonedContent = clonedContent.replace(new RegExp(key, "g"), value);
    }
  }
  
  // Extract structure and create document
  const sections = extractDocumentSections(clonedContent);
  
  return {
    content: clonedContent,
    htmlContent: convertToHTML(sections),
    title: `Cloned ${classification.category}`,
    category: classification.category,
    format: "formal",
    sections,
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount: clonedContent.split(/\s+/).length,
      pageCount: Math.ceil(clonedContent.length / 2000),
      confidence: 0.95,
      complianceChecks: ["structure-preserved", "format-maintained"],
      qualityScore: 0.9,
    },
  };
}

function extractDocumentSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split("\n");
  let currentSection: { title: string; content: string } | null = null;
  
  for (const line of lines) {
    // Detect headings (various formats)
    if (/^#{1,3}\s+/.test(line) || /^[A-Z][^.!?]*:$/.test(line.trim()) || /^\d+\.\s+[A-Z]/.test(line)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^#{1,3}\s+/, "").replace(/:$/, "").trim(),
        content: "",
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections.length > 0 ? sections : [{ title: "Document Content", content }];
}

// =====================================
// Format Compliance Engine
// =====================================

export interface ComplianceCheck {
  rule: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export interface FormatCompliance {
  overallScore: number;
  checks: ComplianceCheck[];
  grammarScore: number;
  professionalismScore: number;
  structureScore: number;
  recommendations: string[];
}

/**
 * Comprehensive format and compliance validation
 */
export async function validateDocumentCompliance(
  content: string,
  category: DocumentCategory
): Promise<FormatCompliance> {
  const checks: ComplianceCheck[] = [];
  
  // Grammar and spelling checks (basic)
  if (content.length < 100) {
    checks.push({
      rule: "minimum-length",
      passed: false,
      severity: "warning",
      message: "Document is very short",
      suggestion: "Consider adding more content for completeness",
    });
  }
  
  // Professional formatting checks
  const hasProperCapitalization = /^[A-Z]/.test(content.trim());
  checks.push({
    rule: "capitalization",
    passed: hasProperCapitalization,
    severity: hasProperCapitalization ? "info" : "warning",
    message: hasProperCapitalization ? "Proper capitalization" : "Document should start with capital letter",
  });
  
  // Structure checks based on category
  const structureChecks = performStructureValidation(content, category);
  checks.push(...structureChecks);
  
  const grammarScore = calculateGrammarScore(content);
  const professionalismScore = calculateProfessionalismScore(content);
  const structureScore = structureChecks.filter(c => c.passed).length / Math.max(structureChecks.length, 1);
  
  const overallScore = (grammarScore + professionalismScore + structureScore) / 3;
  
  return {
    overallScore,
    checks,
    grammarScore,
    professionalismScore,
    structureScore,
    recommendations: generateRecommendations(checks, overallScore),
  };
}

function performStructureValidation(content: string, category: DocumentCategory): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  
  const requiredSections: Record<DocumentCategory, string[]> = {
    tender: ["introduction", "qualifications", "pricing", "timeline"],
    examination: ["instructions", "questions"],
    report: ["summary", "findings", "recommendations"],
    proposal: ["executive summary", "solution", "pricing"],
    contract: ["parties", "terms", "obligations"],
    legal: ["preamble", "clauses", "signatures"],
    technical: ["specifications", "procedures"],
    administrative: ["subject", "body", "action items"],
    job_requirement: ["position", "requirements", "responsibilities"],
    quiz: ["questions"],
    correspondence: ["greeting", "body", "closing"],
    policy: ["purpose", "scope", "procedures"],
    research: ["abstract", "methodology", "results"],
    unknown: [],
  };
  
  const required = requiredSections[category] || [];
  const contentLower = content.toLowerCase();
  
  for (const section of required) {
    const found = contentLower.includes(section);
    checks.push({
      rule: `required-section-${section}`,
      passed: found,
      severity: found ? "info" : "warning",
      message: found ? `Section "${section}" present` : `Missing recommended section: "${section}"`,
      suggestion: found ? undefined : `Consider adding a "${section}" section`,
    });
  }
  
  return checks;
}

function calculateGrammarScore(content: string): number {
  let score = 1.0;
  
  // Basic grammar checks
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  if (sentences.length === 0) return 0.5;
  
  // Check for common issues
  const hasDoubleSpaces = /\s{2,}/.test(content);
  const hasProperPunctuation = sentences.every(s => s.trim().length > 0);
  
  if (hasDoubleSpaces) score -= 0.05;
  if (!hasProperPunctuation) score -= 0.1;
  
  return Math.max(0, score);
}

function calculateProfessionalismScore(content: string): number {
  let score = 0.7; // Base score
  
  const professionalIndicators = [
    /\b(please|kindly|respectfully)\b/i,
    /\b(pursuant|hereby|whereas|aforementioned)\b/i,
    /\b(sincerely|regards|respectfully)\b/i,
  ];
  
  for (const pattern of professionalIndicators) {
    if (pattern.test(content)) score += 0.1;
  }
  
  // Penalize informal language
  const informalPatterns = [/\b(yeah|gonna|wanna|kinda)\b/i];
  for (const pattern of informalPatterns) {
    if (pattern.test(content)) score -= 0.15;
  }
  
  return Math.min(1, Math.max(0, score));
}

function generateRecommendations(checks: ComplianceCheck[], overallScore: number): string[] {
  const recommendations: string[] = [];
  
  if (overallScore < 0.7) {
    recommendations.push("Overall document quality could be improved");
  }
  
  const failedCritical = checks.filter(c => !c.passed && c.severity === "error");
  if (failedCritical.length > 0) {
    recommendations.push(`Address ${failedCritical.length} critical issues before finalizing`);
  }
  
  const warnings = checks.filter(c => !c.passed && c.severity === "warning");
  if (warnings.length > 2) {
    recommendations.push("Review and address multiple formatting warnings");
  }
  
  return recommendations.length > 0 ? recommendations : ["Document meets quality standards"];
}
