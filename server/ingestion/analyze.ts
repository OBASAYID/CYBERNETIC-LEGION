import { localLLM } from "../ai/local-llm-client.js";
import { ExtractionResult } from "./extract.js";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const useLocalLLM = process.env.USE_LOCAL_LLM !== "false";
let openaiClient: any = null;

const CHUNK_SIZE = 24_000;
const MAX_CHUNKS = 120;

async function initOpenAIClient() {
    if (!openaiClient && !useLocalLLM && openaiApiKey) {
        const OpenAI = (await import("openai")).default;
        openaiClient = new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl });
    }
}

export interface AnalysisOptions {
    jurisdiction?: string;
    strictLegalReview?: boolean;
    mode?: "standard" | "legal" | "audit" | "compliance";
    docHint?: string;
    /** Freeform user instruction for what to extract, emphasize, or answer about the upload. */
    analysisCommand?: string;
    maxChunks?: number;
}

export interface AnalysisCitation {
    clause: string;
    excerpt: string;
    rationale: string;
}

export interface AnalysisResult {
    summary: string;
    findings: string[];
    issues: string[];
    interpretation: string;
    recommendations: string[];
    confidence: "High" | "Medium" | "Low";
    documentType?: string;
    documentTypeConfidence?: "High" | "Medium" | "Low";
    decisionActions?: Array<{
        action: string;
        owner: string;
        deadline: string;
        obligation: string;
    }>;
    executiveBrief?: string;
    knowledgeApplied?: string[];
    capabilitySummary?: string;
    jurisdictionApplied?: string;
    strictLegalReview?: boolean;
    citationAnchors?: AnalysisCitation[];
    chunksAnalyzed?: number;
    entities?: Array<{ type: string; value: string }>;
    riskLevel?: "low" | "medium" | "high";
}

interface ChunkInsight {
    summary: string;
    findings: string[];
    issues: string[];
    actions: Array<{
        action: string;
        owner: string;
        deadline: string;
        obligation: string;
    }>;
    citations: AnalysisCitation[];
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let index = 0; index < text.length; index += chunkSize) {
        chunks.push(text.slice(index, index + chunkSize));
    }
    return chunks;
}

function uniqueStrings(values: string[], limit: number): string[] {
    const seen = new Set<string>();
    const output: string[] = [];
    for (const value of values) {
        const normalized = value.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(normalized);
        if (output.length >= limit) break;
    }
    return output;
}

function inferDocumentType(text: string, hint?: string): { type: string; confidence: "High" | "Medium" | "Low" } {
    const sample = `${hint || ""}\n${text.slice(0, 4000)}`.toLowerCase();

    if (/(constitution|chapter\s+\d+|article\s+\d+)/.test(sample)) {
        return { type: "constitutional_document", confidence: "High" };
    }
    if (/(audit|internal control|finding|management response)/.test(sample)) {
        return { type: "audit_report", confidence: "High" };
    }
    if (/(compliance|regulatory|obligation|non-conformity|non-compliance)/.test(sample)) {
        return { type: "compliance_report", confidence: "High" };
    }
    if (/(agreement|contract|whereas|party|hereby|shall)/.test(sample)) {
        return { type: "legal_contract", confidence: "High" };
    }
    if (/(memorandum|brief|submission|relief sought|standard of review)/.test(sample)) {
        return { type: "legal_brief", confidence: "Medium" };
    }
    if (/(methodology|research|hypothesis|results|discussion)/.test(sample)) {
        return { type: "research_report", confidence: "Medium" };
    }
    if (/(policy|implementation|scope|applicability)/.test(sample)) {
        return { type: "policy_document", confidence: "Medium" };
    }
    return { type: hint || "general_document", confidence: "Low" };
}

export function extractEntities(text: string): Array<{ type: string; value: string }> {
    const entities: Array<{ type: string; value: string }> = [];
    const pushMany = (type: string, matches: string[], limit: number) => {
        for (const value of uniqueStrings(matches, limit)) {
            entities.push({ type, value });
        }
    };

    const dateMatches = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi) || [];
    const moneyMatches = text.match(/(?:BWP|USD|GBP|EUR|ZAR)\s?\d[\d,\.]*|\$\s?\d[\d,\.]*/gi) || [];
    const clauseMatches = text.match(/(?:Section|Article|Clause|Part|Chapter)\s+[A-Za-z0-9().-]+/g) || [];
    const orgMatches = text.match(/\b[A-Z][A-Z&.,\- ]{3,}\b/g) || [];
    const personMatches = text.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) || [];

    pushMany("date", dateMatches, 12);
    pushMany("amount", moneyMatches, 12);
    pushMany("legal_reference", clauseMatches, 16);
    pushMany("organization", orgMatches.filter((item) => item.length < 60), 12);
    pushMany("person", personMatches, 12);

    return entities.slice(0, 40);
}

function detectLegalDocument(content: string): boolean {
    const legalKeywords = [
        "court", "case", "law", "legal", "act", "statute", "regulation", "constitution",
        "plaintiff", "defendant", "judge", "attorney", "agreement", "contract", "liability",
        "criminal", "civil", "property", "constitutional", "supreme court", "botswana",
    ];
    const lower = content.toLowerCase();
    return legalKeywords.filter((keyword) => lower.includes(keyword)).length >= 3;
}

function heuristicChunkAnalysis(chunk: string, chunkIndex: number): ChunkInsight {
    const cleanChunk = chunk.replace(/\s+/g, " ").trim();
    const sentences = cleanChunk.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 3).join(" ").slice(0, 420) || cleanChunk.slice(0, 420);

    const findingPatterns = [
        /[^.\n]{0,80}\b(?:shall|must|required to|agrees to|is responsible for|shall ensure)\b[^.\n]{0,180}/gi,
        /[^.\n]{0,80}\b(?:section|article|clause|chapter)\b[^.\n]{0,180}/gi,
        /[^.\n]{0,80}\b(?:objective|scope|purpose|finding|recommendation)\b[^.\n]{0,180}/gi,
    ];
    const issuePatterns = [
        /[^.\n]{0,80}\b(?:risk|breach|default|penalty|violation|gap|warning|non-compliance|nonconformity|liability)\b[^.\n]{0,180}/gi,
        /[^.\n]{0,80}\b(?:missing|absent|unclear|undefined|incomplete|overdue)\b[^.\n]{0,180}/gi,
    ];

    const findings = uniqueStrings(
        findingPatterns.flatMap((pattern) => chunk.match(pattern) || []),
        8,
    );
    const issues = uniqueStrings(
        issuePatterns.flatMap((pattern) => chunk.match(pattern) || []),
        6,
    );

    const citations = uniqueStrings(
        chunk.match(/(?:Section|Article|Clause|Part|Chapter)\s+[A-Za-z0-9().-]+[^\n]{0,120}/g) || [],
        6,
    ).map((excerpt) => ({
        clause: excerpt.split(/[:,-]/)[0].trim() || `Chunk ${chunkIndex + 1}`,
        excerpt: excerpt.trim(),
        rationale: `Referenced directly in chunk ${chunkIndex + 1} and used as an anchor for synthesis.`,
    }));

    const actionRegex = /([^.;\n]{0,60}\b(?:shall|must|required to|is to)\b[^.;\n]{0,220})/gi;
    const actions = uniqueStrings(chunk.match(actionRegex) || [], 6).map((sentence) => {
        const deadlineMatch = sentence.match(/(?:by|within|before|no later than)\s+([^.;,]+)/i);
        return {
            action: sentence.trim(),
            owner: sentence.match(/(?:party|department|board|committee|company|respondent|applicant|authority)/i)?.[0] || "Unspecified",
            deadline: deadlineMatch?.[1]?.trim() || "Unspecified",
            obligation: sentence.includes("must") || sentence.includes("shall") ? "Mandatory" : "Advisory",
        };
    });

    return {
        summary,
        findings,
        issues,
        actions,
        citations,
    };
}

function riskFromIssues(issueCount: number, strictLegalReview: boolean): "low" | "medium" | "high" {
    if (issueCount >= 8 || (strictLegalReview && issueCount >= 5)) return "high";
    if (issueCount >= 3) return "medium";
    return "low";
}

function heuristicRecommendations(docType: string, issues: string[], actions: Array<{ action: string; owner: string; deadline: string; obligation: string }>): string[] {
    const recommendations: string[] = [];
    if (issues.length > 0) {
        recommendations.push("Review all identified issues and resolve the highest-risk gaps first.");
    }
    if (actions.length > 0) {
        recommendations.push("Convert extracted obligations into a tracked action register with owners and deadlines.");
    }
    if (docType.includes("legal")) {
        recommendations.push("Validate the analysis against the controlling jurisdiction before any filing or enforcement action.");
    }
    if (docType.includes("audit") || docType.includes("compliance")) {
        recommendations.push("Map each finding to a control, remediation owner, and verification date.");
    }
    recommendations.push("Retain citation anchors and source excerpts to support downstream reporting and review.");
    return uniqueStrings(recommendations, 8);
}

async function synthesizeWithAI(payload: {
    docType: string;
    jurisdiction?: string;
    strictLegalReview?: boolean;
    docHint?: string;
    analysisCommand?: string;
    summaries: string[];
    findings: string[];
    issues: string[];
    actions: Array<{ action: string; owner: string; deadline: string; obligation: string }>;
}): Promise<Partial<AnalysisResult> | null> {
    const synthesisPrompt = [
        "You are CYRUS Document Intelligence.",
        `Document type: ${payload.docType}.`,
        payload.jurisdiction ? `Jurisdiction: ${payload.jurisdiction}.` : "",
        payload.strictLegalReview ? "Apply strict legal review in the synthesis." : "",
        payload.docHint ? `Document / category context: ${payload.docHint}` : "",
        payload.analysisCommand
            ? `User instruction — prioritize this when synthesizing (address it explicitly in summary, executiveBrief, and findings as appropriate): ${payload.analysisCommand}`
            : "",
        "Return valid JSON with keys: summary, interpretation, executiveBrief, findings, issues, recommendations, confidence, capabilitySummary, knowledgeApplied.",
        "Keep findings to 20 items max and issues to 15 items max.",
    ].filter(Boolean).join(" ");

    const userPayload = JSON.stringify({
        summaries: payload.summaries.slice(0, 30),
        findings: payload.findings.slice(0, 40),
        issues: payload.issues.slice(0, 30),
        actions: payload.actions.slice(0, 20),
    });

    try {
        if (useLocalLLM) {
            const response = await localLLM.chat([
                { role: "system", content: synthesisPrompt },
                { role: "user", content: userPayload },
            ], { temperature: 0.2, max_tokens: 1200 });
            return JSON.parse(response);
        }

        if (!openaiClient) return null;
        const resp = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: synthesisPrompt },
                { role: "user", content: userPayload },
            ],
            response_format: { type: "json_object" },
            max_tokens: 1600,
        });
        return JSON.parse(resp.choices[0]?.message?.content || "{}");
    } catch {
        return null;
    }
}

async function performLegalAnalysis(content: string, jurisdiction: string, strictReview: boolean): Promise<AnalysisResult | null> {
    try {
        const bridgeBase = process.env.QUANTUM_BRIDGE_URL || "http://quantum-bridge:5001";
        const response = await fetch(`${bridgeBase}/legal/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: content.slice(0, 120_000),
                jurisdiction,
                strictLegalReview: strictReview,
            }),
        });

        if (!response.ok) {
            throw new Error(`Legal analysis request failed: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) return null;

        const legalAnalysis = result.legal_analysis || {};
        const documentInfo = result.document_info || {};

        return {
            summary: legalAnalysis.summary || documentInfo.summary || "Legal document analysis completed",
            findings: Array.isArray(legalAnalysis.key_findings) ? legalAnalysis.key_findings : [],
            issues: Array.isArray(legalAnalysis.issues) ? legalAnalysis.issues : [],
            interpretation: legalAnalysis.interpretation || "Legal analysis performed",
            recommendations: Array.isArray(legalAnalysis.recommendations) ? legalAnalysis.recommendations : [],
            confidence: result.confidence || "Medium",
            documentType: legalAnalysis.document_type || "legal_document",
            documentTypeConfidence: "High",
            decisionActions: Array.isArray(legalAnalysis.recommended_proceedings) ? legalAnalysis.recommended_proceedings : [],
            executiveBrief: legalAnalysis.executive_summary || "",
            knowledgeApplied: Array.isArray(legalAnalysis.applicable_laws) ? legalAnalysis.applicable_laws : [],
            capabilitySummary: legalAnalysis.capability_summary || "Legal bridge analysis applied",
            jurisdictionApplied: jurisdiction,
            strictLegalReview: strictReview,
            citationAnchors: Array.isArray(legalAnalysis.citation_anchors) ? legalAnalysis.citation_anchors : [],
            chunksAnalyzed: legalAnalysis.chunks_analyzed || 1,
            entities: Array.isArray(legalAnalysis.entities) ? legalAnalysis.entities : [],
            riskLevel: legalAnalysis.risk_level || "medium",
        };
    } catch (error) {
        console.error("[Legal Analysis] Failed to perform legal analysis:", error);
        return null;
    }
}

export async function analyzeExtraction(ext: ExtractionResult, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    await initOpenAIClient();

    const contentPieces = [
        ext.text || "",
        ext.ocrText || "",
        ext.transcript || "",
        ...(ext.frames?.map((frame) => frame.ocrText || "").filter(Boolean) || []),
    ].filter(Boolean);
    const aggregateText = contentPieces.join("\n").trim();

    const hintForType = [options.docHint, options.analysisCommand].filter(Boolean).join("\n");
    const { type: documentType, confidence: documentTypeConfidence } = inferDocumentType(aggregateText, hintForType || options.mode);
    const entities = extractEntities(aggregateText.slice(0, 80_000));

    if (!aggregateText) {
        return {
            summary: "No extracted text",
            findings: [],
            issues: ["No extractable content found."],
            interpretation: "Minimal analysis due to missing extracted content.",
            recommendations: ["Re-upload with higher quality or supported format."],
            confidence: "Low",
            documentType,
            documentTypeConfidence,
            decisionActions: [],
            executiveBrief: "No content available.",
            knowledgeApplied: [],
            capabilitySummary: "No content to analyze.",
            jurisdictionApplied: options.jurisdiction || "unspecified",
            strictLegalReview: Boolean(options.strictLegalReview),
            citationAnchors: [],
            chunksAnalyzed: 0,
            entities: [],
            riskLevel: "high",
        };
    }

    const maxChunks = options.maxChunks || MAX_CHUNKS;
    const chunks = splitIntoChunks(aggregateText, CHUNK_SIZE).slice(0, maxChunks);
    const chunkInsights = chunks.map((chunk, index) => heuristicChunkAnalysis(chunk, index));

    const summaries = chunkInsights.map((item) => item.summary).filter(Boolean);
    const findings = uniqueStrings(chunkInsights.flatMap((item) => item.findings), 20);
    const issues = uniqueStrings(chunkInsights.flatMap((item) => item.issues), 15);
    const decisionActions = chunkInsights.flatMap((item) => item.actions).slice(0, 20);
    const citationAnchors = chunkInsights.flatMap((item) => item.citations).slice(0, 20);

    let summary = uniqueStrings(summaries, 4).join(" ").slice(0, 900);
    let interpretation = `The document appears to be a ${documentType.replace(/_/g, " ")} analyzed across ${chunks.length} content chunk${chunks.length === 1 ? "" : "s"}.`;
    let executiveBrief = summary.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ") || summary;
    let knowledgeApplied = uniqueStrings([
        documentType.replace(/_/g, " "),
        options.jurisdiction || "general analysis",
        options.strictLegalReview ? "strict legal review" : "standard review",
        chunks.length > 1 ? "chunk synthesis" : "single pass review",
    ], 8);
    let capabilitySummary = `Large-document chunk analysis processed ${chunks.length} chunk${chunks.length === 1 ? "" : "s"} with heuristic extraction of findings, issues, actions, citations, and entities.`;
    let recommendations = heuristicRecommendations(documentType, issues, decisionActions);
    let confidence: "High" | "Medium" | "Low" = aggregateText.length > 12_000 ? "High" : aggregateText.length > 2_000 ? "Medium" : "Low";

    const aiSynthesis = await synthesizeWithAI({
        docType: documentType,
        jurisdiction: options.jurisdiction,
        strictLegalReview: options.strictLegalReview,
        docHint: options.docHint,
        analysisCommand: options.analysisCommand,
        summaries,
        findings,
        issues,
        actions: decisionActions,
    });

    if (aiSynthesis) {
        summary = typeof aiSynthesis.summary === "string" && aiSynthesis.summary.trim() ? aiSynthesis.summary : summary;
        interpretation = typeof aiSynthesis.interpretation === "string" && aiSynthesis.interpretation.trim() ? aiSynthesis.interpretation : interpretation;
        executiveBrief = typeof aiSynthesis.executiveBrief === "string" && aiSynthesis.executiveBrief.trim() ? aiSynthesis.executiveBrief : executiveBrief;
        capabilitySummary = typeof aiSynthesis.capabilitySummary === "string" && aiSynthesis.capabilitySummary.trim() ? aiSynthesis.capabilitySummary : capabilitySummary;
        knowledgeApplied = Array.isArray(aiSynthesis.knowledgeApplied) ? uniqueStrings(aiSynthesis.knowledgeApplied as string[], 10) : knowledgeApplied;
        recommendations = Array.isArray(aiSynthesis.recommendations) ? uniqueStrings(aiSynthesis.recommendations as string[], 10) : recommendations;
        if (aiSynthesis.confidence === "High" || aiSynthesis.confidence === "Medium" || aiSynthesis.confidence === "Low") {
            confidence = aiSynthesis.confidence;
        }
    }

    const shouldUseLegalBridge = (options.mode === "legal" || detectLegalDocument(aggregateText) || Boolean(options.strictLegalReview)) && options.jurisdiction;
    const legalBridge = shouldUseLegalBridge
        ? await performLegalAnalysis(aggregateText, options.jurisdiction || "Botswana", Boolean(options.strictLegalReview))
        : null;

    const mergedFindings = uniqueStrings([...(legalBridge?.findings || []), ...findings], 20);
    const mergedIssues = uniqueStrings([...(legalBridge?.issues || []), ...issues], 15);
    const mergedRecommendations = uniqueStrings([...(legalBridge?.recommendations || []), ...recommendations], 10);
    const mergedActions = [...(legalBridge?.decisionActions || []), ...decisionActions].slice(0, 20);
    const mergedCitations = [...(legalBridge?.citationAnchors || []), ...citationAnchors].slice(0, 20);
    const mergedEntities = uniqueStrings(
        [...(legalBridge?.entities || []), ...entities].map((entity) => `${entity.type}::${entity.value}`),
        40,
    ).map((item) => {
        const [type, value] = item.split("::");
        return { type, value };
    });

    return {
        summary: legalBridge?.summary || summary,
        findings: mergedFindings,
        issues: mergedIssues,
        interpretation: legalBridge?.interpretation || interpretation,
        recommendations: mergedRecommendations,
        confidence: legalBridge?.confidence || confidence,
        documentType: legalBridge?.documentType || documentType,
        documentTypeConfidence: legalBridge?.documentTypeConfidence || documentTypeConfidence,
        decisionActions: mergedActions,
        executiveBrief: legalBridge?.executiveBrief || executiveBrief,
        knowledgeApplied: uniqueStrings([...(legalBridge?.knowledgeApplied || []), ...knowledgeApplied], 10),
        capabilitySummary: legalBridge?.capabilitySummary || capabilitySummary,
        jurisdictionApplied: legalBridge?.jurisdictionApplied || options.jurisdiction || "unspecified",
        strictLegalReview: legalBridge?.strictLegalReview ?? Boolean(options.strictLegalReview),
        citationAnchors: mergedCitations,
        chunksAnalyzed: legalBridge?.chunksAnalyzed || chunks.length,
        entities: mergedEntities,
        riskLevel: legalBridge?.riskLevel || riskFromIssues(mergedIssues.length, Boolean(options.strictLegalReview)),
    };
}
