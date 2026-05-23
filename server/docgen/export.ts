import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";

export type DocAttachment = {
  id?: string;
  kind?: "image";
  sectionTitle?: string;
  caption?: string;
  dataUrl?: string;
  url?: string;
};

export type ExportFormat = "pdf" | "docx" | "html" | "md" | "txt" | "json";

export type ExportPayload = {
  title?: string;
  rendered?: string;
  htmlRendered?: string;
  docType?: string;
  audience?: string;
  confidence?: string;
  sections?: Array<{ title: string; content: string }>;
  attachments?: DocAttachment[];
  wordCount?: number;
  estimatedPages?: number;
};

function sanitizeFileStem(input: string): string {
  const cleaned = input.trim().replace(/[^a-z0-9_\-. ]/gi, "").replace(/\s+/g, "-");
  return cleaned || "cyrus-document";
}

function plainTextFromMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .trim();
}

function normalizeText(doc: ExportPayload): string {
  if (typeof doc.rendered === "string" && doc.rendered.trim()) {
    return plainTextFromMarkdown(doc.rendered);
  }
  const lines: string[] = [];
  if (doc.title) lines.push(doc.title, "");
  if (Array.isArray(doc.sections) && doc.sections.length > 0) {
    for (const section of doc.sections) {
      lines.push(section.title);
      lines.push(plainTextFromMarkdown(section.content || ""));
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function parseDataUrl(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  try {
    return Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
}

async function drawWrappedLine(
  pdf: PDFDocument,
  state: { page: PDFPage; y: number },
  text: string,
  font: PDFFont,
  fontSize: number,
  margin: number,
  lineHeight: number,
  maxWidth: number,
) {
  const chunks = wrapText(text, font, fontSize, maxWidth);
  for (const chunk of chunks) {
    if (state.y < margin + lineHeight) {
      state.page = pdf.addPage([595.28, 841.89]);
      state.y = state.page.getHeight() - margin;
    }
    state.page.drawText(chunk, {
      x: margin,
      y: state.y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    state.y -= lineHeight;
  }
}

async function exportAsPdf(doc: ExportPayload): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const pageWidth = 595.28;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 11;
  const lineHeight = 14;

  let page = pdf.addPage([pageWidth, 841.89]);
  const state = { page, y: page.getHeight() - margin };

  const title = doc.title || "CYRUS Generated Document";
  await drawWrappedLine(pdf, state, title, bold, 16, margin, 18, maxWidth);
  state.y -= 8;

  const meta = [
    doc.docType ? `Type: ${doc.docType}` : "",
    doc.audience ? `Audience: ${doc.audience}` : "",
    doc.confidence ? `Confidence: ${doc.confidence}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  if (meta) {
    await drawWrappedLine(pdf, state, meta, font, 9, margin, 12, maxWidth);
    state.y -= 6;
  }

  const attachmentsBySection = new Map<string, DocAttachment[]>();
  for (const att of doc.attachments || []) {
    const key = att.sectionTitle || "";
    if (!attachmentsBySection.has(key)) attachmentsBySection.set(key, []);
    attachmentsBySection.get(key)!.push(att);
  }

  if (doc.sections?.length) {
    for (const section of doc.sections) {
      state.y -= 6;
      await drawWrappedLine(pdf, state, section.title, bold, 13, margin, 16, maxWidth);
      const body = plainTextFromMarkdown(section.content || "");
      for (const paragraph of body.split(/\n{2,}/).filter(Boolean)) {
        await drawWrappedLine(pdf, state, paragraph, font, fontSize, margin, lineHeight, maxWidth);
        state.y -= 4;
      }

      for (const att of attachmentsBySection.get(section.title) || []) {
        const src = att.dataUrl || att.url;
        if (!src?.startsWith("data:image")) continue;
        const buf = parseDataUrl(src);
        if (!buf) continue;
        try {
          const image = src.includes("jpeg") || src.includes("jpg")
            ? await pdf.embedJpg(buf)
            : await pdf.embedPng(buf);
          const dims = image.scale(0.45);
          if (state.y < margin + dims.height + 30) {
            state.page = pdf.addPage([pageWidth, 841.89]);
            state.y = state.page.getHeight() - margin;
          }
          state.page.drawImage(image, {
            x: margin,
            y: state.y - dims.height,
            width: dims.width,
            height: dims.height,
          });
          state.y -= dims.height + 6;
          if (att.caption) {
            await drawWrappedLine(pdf, state, att.caption, font, 9, margin, 11, maxWidth);
          }
          state.y -= 8;
        } catch {
          // skip bad image bytes
        }
      }
    }
  } else {
    const body = normalizeText(doc);
    for (const line of body.split("\n")) {
      if (!line.trim()) {
        state.y -= lineHeight / 2;
        continue;
      }
      await drawWrappedLine(pdf, state, line, font, fontSize, margin, lineHeight, maxWidth);
    }
  }

  return Buffer.from(await pdf.save());
}

async function exportAsDocx(doc: ExportPayload): Promise<Buffer> {
  const children: Paragraph[] = [];
  const title = doc.title || "CYRUS Generated Document";
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: title, bold: true })],
    }),
  );

  if (doc.docType || doc.audience || doc.confidence) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [doc.docType ? `Type: ${doc.docType}` : "", doc.audience ? `Audience: ${doc.audience}` : "", doc.confidence ? `Confidence: ${doc.confidence}` : ""]
              .filter(Boolean)
              .join(" | "),
            italics: true,
            color: "555555",
          }),
        ],
      }),
    );
  }

  const attachmentsBySection = new Map<string, DocAttachment[]>();
  for (const att of doc.attachments || []) {
    const key = att.sectionTitle || "";
    if (!attachmentsBySection.has(key)) attachmentsBySection.set(key, []);
    attachmentsBySection.get(key)!.push(att);
  }

  if (doc.sections?.length) {
    for (const section of doc.sections) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(section.title)] }));
      for (const paragraph of plainTextFromMarkdown(section.content || "").split(/\n{2,}/).filter(Boolean)) {
        children.push(new Paragraph({ children: [new TextRun(paragraph)] }));
      }
      for (const att of attachmentsBySection.get(section.title) || []) {
        const buf = att.dataUrl ? parseDataUrl(att.dataUrl) : null;
        if (buf) {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buf,
                  transformation: { width: 420, height: 420 },
                  type: "png",
                }),
              ],
            }),
          );
        }
        if (att.caption) {
          children.push(new Paragraph({ children: [new TextRun({ text: att.caption, italics: true, size: 20 })] }));
        }
      }
    }
  } else {
    const text = normalizeText(doc);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) {
        children.push(new Paragraph({}));
        continue;
      }
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  const document = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(document));
}

export async function exportGeneratedDocument(
  format: ExportFormat,
  doc: ExportPayload,
): Promise<{ filename: string; contentType: string; data: Buffer }> {
  const stem = sanitizeFileStem(doc.title || "cyrus-document");
  if (format === "html") {
    const html = (doc.htmlRendered || `<html><body><pre>${normalizeText(doc)}</pre></body></html>`).trim();
    return { filename: `${stem}.html`, contentType: "text/html; charset=utf-8", data: Buffer.from(html, "utf8") };
  }
  if (format === "md") {
    const md = doc.rendered || normalizeText(doc);
    return { filename: `${stem}.md`, contentType: "text/markdown; charset=utf-8", data: Buffer.from(md, "utf8") };
  }
  if (format === "txt") {
    const txt = normalizeText(doc);
    return { filename: `${stem}.txt`, contentType: "text/plain; charset=utf-8", data: Buffer.from(txt, "utf8") };
  }
  if (format === "json") {
    return {
      filename: `${stem}.json`,
      contentType: "application/json; charset=utf-8",
      data: Buffer.from(JSON.stringify(doc, null, 2), "utf8"),
    };
  }
  if (format === "docx") {
    const data = await exportAsDocx(doc);
    return {
      filename: `${stem}.docx`,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data,
    };
  }
  const data = await exportAsPdf(doc);
  return { filename: `${stem}.pdf`, contentType: "application/pdf", data };
}
