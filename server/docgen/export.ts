import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export type ExportFormat = "pdf" | "docx" | "html" | "md" | "txt" | "json";

export type ExportPayload = {
  title?: string;
  rendered?: string;
  htmlRendered?: string;
  docType?: string;
  audience?: string;
  confidence?: string;
  sections?: Array<{ title: string; content: string }>;
  wordCount?: number;
  estimatedPages?: number;
};

function sanitizeFileStem(input: string): string {
  const cleaned = input.trim().replace(/[^a-z0-9_\-. ]/gi, "").replace(/\s+/g, "-");
  return cleaned || "cyrus-document";
}

function normalizeText(doc: ExportPayload): string {
  if (typeof doc.rendered === "string" && doc.rendered.trim()) return doc.rendered;
  const lines: string[] = [];
  if (doc.title) lines.push(`# ${doc.title}`, "");
  if (Array.isArray(doc.sections) && doc.sections.length > 0) {
    for (const section of doc.sections) {
      lines.push(`## ${section.title}`);
      lines.push(section.content || "");
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

async function exportAsPdf(doc: ExportPayload): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  let currentPage = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const fontSize = 11;
  const lineHeight = 14;
  let y = currentPage.getHeight() - margin;

  const title = doc.title || "CYRUS Generated Document";
  currentPage.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.07, 0.13, 0.22),
  });
  y -= 24;

  const meta = [
    doc.docType ? `Type: ${doc.docType}` : "",
    doc.audience ? `Audience: ${doc.audience}` : "",
    doc.confidence ? `Confidence: ${doc.confidence}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  if (meta) {
    currentPage.drawText(meta, { x: margin, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 20;
  }

  const body = normalizeText(doc).replace(/\r\n/g, "\n");
  const lines = body.split("\n");

  for (const rawLine of lines) {
    const line = rawLine || " ";
    const drawFont = line.startsWith("# ") || line.startsWith("## ") ? bold : font;
    const stripped = line.replace(/^#+\s*/, "");
    const chunks = stripped.match(/.{1,95}/g) || [stripped];

    for (const chunk of chunks) {
      if (y < margin + lineHeight) {
        currentPage = pdf.addPage([595.28, 841.89]);
        y = currentPage.getHeight() - margin;
      } else {
        // keep same page
      }
      currentPage.drawText(chunk, { x: margin, y, size: fontSize, font: drawFont, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
    y -= 2;
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

  const text = normalizeText(doc);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      children.push(new Paragraph({}));
      continue;
    }
    if (line.startsWith("## ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.slice(3))] }));
    } else if (line.startsWith("# ")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.slice(2))] }));
    } else {
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
    const md = normalizeText(doc);
    return { filename: `${stem}.md`, contentType: "text/markdown; charset=utf-8", data: Buffer.from(md, "utf8") };
  }
  if (format === "txt") {
    const txt = normalizeText(doc).replace(/^#+\s*/gm, "");
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
