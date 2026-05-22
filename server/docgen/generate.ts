import { maxDocgenTargetPages } from "../../shared/cyrus-document-limits.js";
import { templates, type DocType, defaultDocType, type Audience } from "./templates.js";
import { analyzeDocument, type DocGenInput, type AnalysisOutput } from "./analyze.js";

export interface GeneratedDoc {
    docType: DocType | string;
    audience: Audience | string;
    title: string;
    confidence: "High" | "Medium" | "Low";
    assumptions: string[];
    missing: string[];
    sections: { title: string; content: string }[];
    outline: Array<{ level: string; title: string; purpose: string }>;
    pullQuotes: Array<{ quote: string; sectionTitle: string; placement: string }>;
    layoutPlan: Array<{ kind: string; title: string; placement: string; notes: string }>;
    graphicsPlan: Array<{ sectionTitle: string; assetType: string; placement: string; brief: string }>;
    dataVisuals: AnalysisOutput["dataVisuals"];
    rendered: string;
    htmlRendered: string;
    wordCount: number;
    estimatedPages: number;
    targetPages?: number;
    attachments?: Array<{
        id: string;
        kind: "image";
        style: "realistic_3d" | "graphical" | "schematic";
        sectionTitle?: string;
        caption: string;
        prompt: string;
        url?: string;
        dataUrl?: string;
    }>;
}

function maxTargetPages(): number {
  return maxDocgenTargetPages();
}

function normalizeTargetPages(input: DocGenInput): number {
  return Math.max(1, Math.min(maxTargetPages(), Number(input.targetPages || 12)));
}

function wordsPerPage(input: DocGenInput): number {
    return Math.max(180, Math.min(420, Number(input.wordsPerPage || 280)));
}

function countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

function clipSource(text: string, max = 2000): string {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max)}...`;
}

function expandSectionsForTargetPages(
    sections: { title: string; content: string }[],
    targetPages: number,
    wordsPerPg: number,
    seedText: string,
): { title: string; content: string }[] {
    const targetWords = Math.max(1200, targetPages * wordsPerPg);
    const expanded = sections.map((section) => ({ ...section }));
    let totalWords = expanded.reduce((sum, section) => sum + countWords(section.content), 0);
    if (totalWords >= targetWords) return expanded;

    const source = clipSource(seedText || expanded.map((s) => s.content).join("\n\n"), 3500);
    let pass = 0;
    // Guardrail for runaway loops on very high page counts.
    const maxPasses = Math.max(24, Math.ceil(targetPages / 16));

    while (totalWords < targetWords && pass < maxPasses) {
        for (let index = 0; index < expanded.length && totalWords < targetWords; index += 1) {
            const section = expanded[index];
            const segment = [
                "",
                `### Extended Coverage ${pass + 1}.${index + 1}`,
                `This section is intentionally expanded for long-form output planning around ${targetPages} pages. It deepens context, constraints, operational detail, and implementation steps for ${section.title.toLowerCase()}.`,
                source
                    ? `Source reinforcement: ${source}`
                    : "Source reinforcement: Additional source detail was not provided, so this expansion follows the same narrative line with explicit assumptions.",
                "Additional elaboration: include procedural checkpoints, legal/compliance implications where relevant, stakeholder responsibilities, risk treatment, and measurable outcomes.",
            ].join("\n");
            section.content = `${section.content}\n${segment}`;
            totalWords += countWords(segment);
        }
        pass += 1;
    }

    return expanded;
}

function renderMarkdown(doc: Omit<GeneratedDoc, "rendered" | "htmlRendered" | "wordCount" | "estimatedPages">): string {
    const lines: string[] = [];
    lines.push(`# ${doc.title}`);
    lines.push("");
    lines.push(`Document Type: ${String(doc.docType)}`);
    lines.push(`Audience: ${String(doc.audience)}`);
    lines.push(`Confidence: ${doc.confidence}`);
    lines.push("");

    if (doc.outline.length > 0) {
        lines.push("## Outline");
        for (const item of doc.outline) {
            lines.push(`- ${item.level}: ${item.title} - ${item.purpose}`);
        }
        lines.push("");
    }

    for (const section of doc.sections) {
        lines.push(`## ${section.title}`);
        lines.push(section.content || "_Not provided_");
        lines.push("");
    }

    if (doc.assumptions.length) {
        lines.push("## Assumptions");
        for (const item of doc.assumptions) lines.push(`- ${item}`);
        lines.push("");
    }

    if (doc.missing.length) {
        lines.push("## Missing Sections");
        for (const item of doc.missing) lines.push(`- ${item}`);
        lines.push("");
    }

    return lines.join("\n");
}

function renderHtml(doc: Omit<GeneratedDoc, "rendered" | "htmlRendered" | "wordCount" | "estimatedPages">): string {
    const sectionHtml = doc.sections
        .map(
            (section) => `
        <section class="section">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.content
                    .split(/\n{2,}/)
                    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
                    .join("")}
        </section>`,
        )
        .join("\n");

    const outlineHtml = doc.outline.length
        ? `<aside class="outline"><h3>Outline</h3><ul>${doc.outline
            .map((item) => `<li><strong>${escapeHtml(item.level)}</strong> ${escapeHtml(item.title)}<span>${escapeHtml(item.purpose)}</span></li>`)
            .join("")}</ul></aside>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(doc.title)}</title>
    <style>
      :root {
        --paper: #f6f1e6;
        --ink: #1a1a1a;
        --muted: #585858;
        --accent: #0f766e;
        --line: #d4cbb8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background: linear-gradient(180deg, #ede7da 0%, #f8f5ed 100%);
      }
      .page {
        width: min(980px, 100%);
        margin: 24px auto 48px;
        background: rgba(255,255,255,0.88);
        border: 1px solid var(--line);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.12);
        display: grid;
        grid-template-columns: 260px 1fr;
      }
      .rail {
        padding: 28px 22px;
        border-right: 1px solid var(--line);
        background: linear-gradient(180deg, #ece4d3 0%, #f6f1e6 100%);
      }
      .main {
        padding: 36px 44px 48px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 34px;
        line-height: 1.1;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 20px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 8px;
      }
      h3 {
        margin: 0 0 12px;
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      p {
        margin: 0 0 14px;
        line-height: 1.75;
        color: var(--ink);
      }
      .meta {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
      }
      .outline ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .outline li {
        padding: 10px 0;
        border-top: 1px solid rgba(0,0,0,0.07);
        font-size: 13px;
      }
      .outline span {
        display: block;
        color: var(--muted);
        margin-top: 4px;
      }
      .section { page-break-inside: avoid; }
      @media print {
        body { background: white; }
        .page { width: 100%; margin: 0; box-shadow: none; border: none; }
      }
      @media (max-width: 860px) {
        .page { grid-template-columns: 1fr; }
        .rail { border-right: none; border-bottom: 1px solid var(--line); }
        .main { padding: 24px 20px 32px; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="rail">
        <h3>Document Profile</h3>
        <div class="meta">
          <div><strong>Type:</strong> ${escapeHtml(String(doc.docType))}</div>
          <div><strong>Audience:</strong> ${escapeHtml(String(doc.audience))}</div>
          <div><strong>Confidence:</strong> ${escapeHtml(doc.confidence)}</div>
          <div><strong>Target Pages:</strong> ${escapeHtml(String(doc.targetPages || "n/a"))}</div>
        </div>
        ${outlineHtml}
      </div>
      <main class="main">
        <h1>${escapeHtml(doc.title)}</h1>
        ${sectionHtml}
      </main>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function mergeTemplateSections(docType: string, analysis: AnalysisOutput) {
    const template = templates[(docType as DocType)] || templates[defaultDocType];
    return template.map((templateSection) => {
        const found = analysis.sections.find((section) => section.title.toLowerCase() === templateSection.title.toLowerCase());
        return {
            title: templateSection.title,
            content: found?.content || "",
        };
    });
}

export async function generateDocument(input: DocGenInput): Promise<GeneratedDoc> {
    const analysis = await analyzeDocument(input);
    const docType = input.docType || defaultDocType;
    const audience = input.audience || "official";
    const targetPages = normalizeTargetPages(input);
    const wpp = wordsPerPage(input);
    const sections = expandSectionsForTargetPages(
        mergeTemplateSections(String(docType), analysis),
        targetPages,
        wpp,
        input.rawText || input.topic || input.purpose || "",
    );
    const missing = Array.from(new Set([
        ...analysis.missing,
        ...sections.filter((section) => section.content.trim().length < 20).map((section) => section.title),
    ]));

    const base = {
        docType,
        audience,
        title: analysis.title,
        confidence: analysis.confidence,
        assumptions: analysis.assumptions,
        missing,
        sections,
        outline: analysis.outline,
        pullQuotes: analysis.pullQuotes,
        layoutPlan: analysis.layoutPlan,
        graphicsPlan: analysis.graphicsPlan,
        dataVisuals: analysis.dataVisuals,
        targetPages,
        attachments: [] as GeneratedDoc["attachments"],
    };

    const rendered = renderMarkdown(base);
    const htmlRendered = renderHtml(base);
    const wordCount = rendered.split(/\s+/).filter(Boolean).length;
    const estimatedPages = Math.max(base.targetPages, Math.ceil(wordCount / wpp));

    return {
        ...base,
        rendered,
        htmlRendered,
        wordCount,
        estimatedPages,
    };
}
