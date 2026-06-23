import { Buffer } from "node:buffer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  method: "pdf-parse" | "pdftoppm-ocr" | "none";
  warnings: string[];
}

async function getPdfPageCount(inputPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("pdfinfo", [inputPath]);
    const match = stdout.match(/Pages:\s+(\d+)/i);
    if (match) return parseInt(match[1], 10);
  } catch {
    // poppler optional at runtime
  }
  return 0;
}

/**
 * Extract embedded text using pdf-parse v2 (PDFParse class API).
 */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: (result.text || "").trim(),
      pageCount: result.total || result.pages?.length || 0,
    };
  } finally {
    await parser.destroy();
  }
}

/**
 * Render PDF pages to PNG via pdftoppm and OCR each page with vision.
 */
export async function extractPdfWithPageOcr(
  buffer: Buffer,
  ocrPage: (pngBuffer: Buffer, pageNum: number) => Promise<string | undefined>,
  options?: { maxPages?: number; dpi?: number },
): Promise<PdfExtractResult> {
  const warnings: string[] = [];
  const maxPages = options?.maxPages ?? 25;
  const dpi = options?.dpi ?? 150;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cyrus-pdf-"));

  try {
    const inputPath = path.join(tmpDir, "input.pdf");
    await fs.writeFile(inputPath, buffer);

    let pageCount = await getPdfPageCount(inputPath);
    if (pageCount <= 0) {
      try {
        const parsed = await extractPdfText(buffer);
        pageCount = parsed.pageCount || 1;
      } catch {
        pageCount = 1;
      }
    }

    const pagesToProcess = Math.min(pageCount, maxPages);
    if (pageCount > maxPages) {
      warnings.push(`OCR limited to first ${maxPages} of ${pageCount} pages`);
    }

    const prefix = path.join(tmpDir, "page");
    try {
      await execFileAsync("pdftoppm", [
        "-png",
        "-r",
        String(dpi),
        "-f",
        "1",
        "-l",
        String(pagesToProcess),
        inputPath,
        prefix,
      ]);
    } catch (err: any) {
      warnings.push(`pdftoppm unavailable or failed: ${err?.message || err}`);
      return { text: "", pageCount, method: "none", warnings };
    }

    const ocrParts: string[] = [];
    for (let page = 1; page <= pagesToProcess; page++) {
      const pngPath = `${prefix}-${page}.png`;
      try {
        const pngBuffer = await fs.readFile(pngPath);
        const pageText = await ocrPage(pngBuffer, page);
        if (pageText?.trim()) {
          ocrParts.push(`--- Page ${page} ---\n${pageText.trim()}`);
        }
      } catch {
        warnings.push(`Could not OCR page ${page}`);
      }
    }

    return {
      text: ocrParts.join("\n\n"),
      pageCount,
      method: "pdftoppm-ocr",
      warnings,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function extractPdfDocument(
  buffer: Buffer,
  ocrPage: (pngBuffer: Buffer, pageNum: number) => Promise<string | undefined>,
): Promise<PdfExtractResult> {
  const warnings: string[] = [];

  try {
    const parsed = await extractPdfText(buffer);
    if (parsed.text.length >= 40) {
      return { text: parsed.text, pageCount: parsed.pageCount, method: "pdf-parse", warnings };
    }
    if (parsed.text.length > 0) {
      warnings.push("PDF text layer sparse; attempting page OCR");
    } else {
      warnings.push("PDF has no extractable text layer; attempting page OCR");
    }
  } catch (err: any) {
    warnings.push(`PDF text extraction failed: ${err?.message || err}`);
  }

  const ocr = await extractPdfWithPageOcr(buffer, ocrPage);
  return {
    text: ocr.text,
    pageCount: ocr.pageCount,
    method: ocr.method,
    warnings: [...warnings, ...ocr.warnings],
  };
}
