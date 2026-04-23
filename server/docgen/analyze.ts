import OpenAI from "openai";
import { Audience, DocType, templates, toneByAudience, defaultDocType } from "./templates.js";

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const llmClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl }) : null;

const DOC_CONTEXT_LIMIT = 24_000;

export interface SectionContent {
    title: string;
    content: string;
}

export interface AnalysisOutput {
    title: string;
    sections: SectionContent[];
    confidence: "High" | "Medium" | "Low";
    assumptions: string[];
    missing: string[];
    outline: Array<{ level: string; title: string; purpose: string }>;
    pullQuotes: Array<{ quote: string; sectionTitle: string; placement: string }>;
    layoutPlan: Array<{ kind: string; title: string; placement: string; notes: string }>;
    graphicsPlan: Array<{ sectionTitle: string; assetType: string; placement: string; brief: string }>;
    dataVisuals: Array<{
        id: string;
        kind: "table" | "bar_chart" | "line_chart" | "pie_chart" | "pictograph";
        title: string;
        sectionTitle: string;
        placement: string;
        rationale: string;
        sourceReference: string;
        unit?: string;
        labels?: string[];
        values?: number[];
        columns?: string[];
        rows?: string[][];
    }>;
}

export interface DocGenInput {
    mode: "full" | "convert" | "assist";
    docType?: DocType | string;
    audience?: Audience | string;
    purpose?: string;
    topic?: string;
    rawText?: string;
    data?: string;
    targetPages?: number;
    wordsPerPage?: number;
    includeImages?: boolean;
    imageStyle?: "realistic_3d" | "graphical" | "schematic";
}

function normalizeDocType(docType?: string): DocType {
    switch ((docType || "").toLowerCase()) {
        case "report":
        case "document":
            return "executive_summary";
        case "brief":
            return "legal_brief";
        case "memo":
            return "correspondence";
        case "letter":
            return "correspondence";
        case "summary":
            return "executive_summary";
        case "legal":
            return "legal_brief";
        case "technical":
            return "technical_report";
        default:
            return (docType as DocType) || defaultDocType;
    }
}

function normalizeAudience(audience?: string): Audience {
    switch ((audience || "").toLowerCase()) {
        case "executive":
            return "executive";
        case "technical":
            return "technical";
        case "military":
            return "military";
        default:
            return "official";
    }
}

function titleFromInput(docType: DocType, payload: DocGenInput): string {
    const root = payload.topic || payload.purpose || payload.rawText?.slice(0, 80) || "Untitled";
    return `${docType.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}: ${root.slice(0, 72)}`;
}

function fallbackContent(template: DocType, payload: DocGenInput): AnalysisOutput {
    const secs = templates[template] || templates[defaultDocType];
    const baseContent = payload.rawText || payload.topic || payload.purpose || "Content not provided.";
    const sections = secs.map((section) => ({
        title: section.title,
        content: `${baseContent.slice(0, 500)}\n\nFurther detail is required to complete this section for production use.`,
    }));
    return buildDeterministicOutput(template, normalizeAudience(payload.audience), payload, sections, ["LLM generation unavailable; heuristic content was used."]);
}

function buildDeterministicOutput(
    docType: DocType,
    audience: Audience,
    payload: DocGenInput,
    sections: SectionContent[],
    assumptions: string[],
): AnalysisOutput {
    const rawText = payload.rawText || payload.topic || payload.purpose || "";
    const outline = sections.map((section, index) => ({
        level: index === 0 ? "H1" : "H2",
        title: section.title,
        purpose: `${section.title} for ${docType.replace(/_/g, " ")}`,
    }));
    const pullQuotes = sections.slice(0, 4).map((section, index) => ({
        quote: section.content.split(/(?<=[.!?])\s+/)[0]?.slice(0, 180) || section.content.slice(0, 180),
        sectionTitle: section.title,
        placement: index % 2 === 0 ? "sidebar" : "body",
    }));
    const layoutPlan = sections.map((section, index) => ({
        kind: index === 0 ? "hero" : index % 3 === 0 ? "two-column" : "single-column",
        title: section.title,
        placement: `Page ${Math.floor(index / 2) + 1}`,
        notes: `Present ${section.title.toLowerCase()} in a ${audience}-appropriate layout with strong hierarchy.`,
    }));
    const graphicsPlan = sections.slice(0, 3).map((section, index) => ({
        sectionTitle: section.title,
        assetType: index === 0 ? "cover graphic" : "supporting illustration",
        placement: index === 0 ? "cover" : "inline-right",
        brief: `Visual supporting ${section.title.toLowerCase()} for a ${docType.replace(/_/g, " ")} output.`,
    }));
    const dataVisuals = rawText.match(/\d/) ? [
        {
            id: "dv-1",
            kind: "table" as const,
            title: "Key Quantitative References",
            sectionTitle: sections[Math.min(1, sections.length - 1)]?.title || "Overview",
            placement: "inline",
            rationale: "Summarizes explicit numeric details referenced in the source material.",
            sourceReference: "Source text extraction",
            columns: ["Item", "Value"],
            rows: rawText.match(/(?:\d+[\d,.%]*)/g)?.slice(0, 5).map((value, index) => [`Metric ${index + 1}`, value]) || [],
        },
    ] : [];

    return {
        title: titleFromInput(docType, payload),
        sections,
        confidence: rawText.length > 4000 ? "High" : rawText.length > 1200 ? "Medium" : "Low",
        assumptions,
        missing: sections.filter((section) => section.content.trim().length < 40).map((section) => section.title),
        outline,
        pullQuotes,
        layoutPlan,
        graphicsPlan,
        dataVisuals,
    };
}

async function generateSectionContent(
    docType: DocType,
    audience: Audience,
    payload: DocGenInput,
    sectionTitles: string[],
    context: string,
): Promise<Record<string, string>> {
    if (!llmClient) return {};

    try {
        const response = await llmClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: [
                        `You are a professional ${audience} writer producing a ${docType.replace(/_/g, " ")}.`,
                        `Write in a ${toneByAudience[audience]} tone.`,
                        "Return JSON whose keys exactly match the requested section titles and whose values are complete section drafts.",
                        "Use only the supplied context and state assumptions inside the prose when information is sparse.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        purpose: payload.purpose,
                        topic: payload.topic,
                        sections: sectionTitles,
                        context,
                    }),
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 2600,
        });
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
        return {};
    }
}

export async function analyzeDocument(payload: DocGenInput): Promise<AnalysisOutput> {
    const docType = normalizeDocType(payload.docType);
    const audience = normalizeAudience(payload.audience);
    const template = templates[docType] || templates[defaultDocType];
    const rawText = payload.rawText || payload.topic || payload.purpose || "";

    if (!rawText && !payload.data) {
        return fallbackContent(docType, payload);
    }

    const context = rawText.slice(0, DOC_CONTEXT_LIMIT);
    const batches: string[][] = [];
    for (let index = 0; index < template.length; index += 4) {
        batches.push(template.slice(index, index + 4).map((item) => item.title));
    }

    const contentMap: Record<string, string> = {};
    for (const batch of batches) {
        const generated = await generateSectionContent(docType, audience, payload, batch, context);
        Object.assign(contentMap, generated);
    }

    const sections = template.map((section) => ({
        title: section.title,
        content:
            contentMap[section.title] ||
            `${(rawText || payload.topic || payload.purpose || "Supporting detail required.").slice(0, 700)}\n\nThis section should be expanded with source-specific detail before publication.`,
    }));

    const assumptions: string[] = [];
    if (rawText.length > DOC_CONTEXT_LIMIT) {
        assumptions.push(`Generation used the first ${DOC_CONTEXT_LIMIT.toLocaleString()} characters of source context for drafting.`);
    }
    if (!llmClient) {
        assumptions.push("LLM service unavailable; heuristic section drafting applied.");
    }

    return buildDeterministicOutput(docType, audience, payload, sections, assumptions);
}
