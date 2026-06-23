import { detectFile } from "./detect.js";
import { ensureCompatibleFormat, speechToText } from "../replit_integrations/audio/client.js";
import { extractPdfDocument } from "./pdf-extract.js";
import { Buffer } from "node:buffer";
import mammoth from "mammoth";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const visionClient =
  openaiApiKey
    ? new OpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseUrl })
    : null;

export interface ExtractionResult {
  text?: string;
  ocrText?: string;
  visionNotes?: string;
  transcript?: string;
  frames?: Array<{ index: number; ocrText?: string; visionNotes?: string }>;
  pageCount?: number;
  wordCount?: number;
  warnings: string[];
  attempted: string[];
}

async function extractTextDocument(buffer: Buffer, detectedMime?: string): Promise<{ text: string; pageCount?: number; warnings?: string[] }> {
  if (detectedMime === "application/pdf") {
    const pdf = await extractPdfDocument(buffer, async (pngBuffer, pageNum) => {
      const vis = await extractImageWithVision(pngBuffer, `PDF page ${pageNum}`);
      return vis.ocrText;
    });
    return { text: pdf.text, pageCount: pdf.pageCount, warnings: pdf.warnings };
  }
  if (detectedMime && detectedMime.includes("word")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value || "" };
  }
  return { text: buffer.toString("utf-8") };
}

async function extractImageWithVision(
  buffer: Buffer,
  context = "document image",
): Promise<{ ocrText?: string; visionNotes?: string; warnings?: string[] }> {
  const warnings: string[] = [];
  if (!visionClient) {
    warnings.push("Vision not configured (missing OpenAI env); OCR unavailable.");
    return { ocrText: "", visionNotes: "Vision unavailable", warnings };
  }
  const b64 = buffer.toString("base64");
  const mime = detectImageMime(buffer);
  try {
    const resp = await visionClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are CYRUS document OCR. Extract ALL readable text verbatim from the image — preserve structure, headings, tables, and numbering. Return only the extracted text with no commentary.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Perform high-fidelity OCR on this ${context}. Return extracted text only.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${b64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });
    const content = resp.choices[0]?.message?.content || "";
    return { ocrText: content.trim(), visionNotes: "Vision OCR", warnings };
  } catch (err: any) {
    warnings.push(`Vision call failed: ${err?.message || err}`);
    return { ocrText: "", visionNotes: "Vision failed", warnings };
  }
}

function detectImageMime(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return "image/png";
}

async function extractVideoFrame(buffer: Buffer, seconds: number): Promise<Buffer | null> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `vid-${Date.now()}.bin`);
  const outputPath = path.join(tmpDir, `frame-${Date.now()}.png`);
  await fs.writeFile(inputPath, buffer);
  try {
    await execFileAsync("ffmpeg", [
      "-i",
      inputPath,
      "-ss",
      String(seconds),
      "-vframes",
      "1",
      "-y",
      outputPath,
    ]);
    const frame = await fs.readFile(outputPath);
    return frame;
  } catch (err) {
    return null;
  } finally {
    await fs.unlink(inputPath).catch(() => { });
    await fs.unlink(outputPath).catch(() => { });
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function extractFile(buffer: Buffer, declaredMime?: string): Promise<ExtractionResult> {
  const det = await detectFile(buffer, declaredMime);
  const warnings: string[] = [];
  const attempted: string[] = [];

  const detected = det.detectedMime || det.declaredMime || "application/octet-stream";

  if (detected.startsWith("text/") || detected === "application/pdf" || detected.includes("word")) {
    attempted.push("text-extract");
    try {
      const { text, pageCount, warnings: docWarnings } = await extractTextDocument(buffer, detected);
      warnings.push(...(docWarnings || []));
      if (text && text.trim().length > 0) {
        const normalized = text.trim();
        return { text: normalized, pageCount, wordCount: countWords(normalized), warnings, attempted };
      }
      warnings.push("Primary text extraction returned empty.");
    } catch (err: any) {
      warnings.push(`Text extraction failed: ${err?.message || err}`);
    }
  }

  if (detected.startsWith("image/")) {
    attempted.push("vision-ocr");
    const vis = await extractImageWithVision(buffer);
    warnings.push(...(vis.warnings || []));
    const ocrText = vis.ocrText?.trim() || "";
    if (ocrText) {
      return { ocrText, visionNotes: vis.visionNotes, wordCount: countWords(ocrText), warnings, attempted };
    }
    return { ocrText: vis.ocrText, visionNotes: vis.visionNotes, warnings, attempted };
  }

  if (detected.startsWith("audio/")) {
    attempted.push("audio-transcribe");
    try {
      const { buffer: wav, format } = await ensureCompatibleFormat(buffer);
      const transcript = await speechToText(wav, format);
      return { transcript, wordCount: countWords(transcript || ""), warnings, attempted };
    } catch (err: any) {
      warnings.push(`Audio transcription failed: ${err?.message || err}`);
      return { warnings, attempted };
    }
  }

  if (detected.startsWith("video/")) {
    attempted.push("video-audio-transcribe");
    warnings.push("Video frame OCR partial: sampling a single frame.");
    try {
      const { buffer: wav, format } = await ensureCompatibleFormat(buffer);
      const transcript = await speechToText(wav, format);
      const frame = await extractVideoFrame(buffer, 1);
      let frameOcr = "";
      if (frame) {
        const vis = await extractImageWithVision(frame, "video frame");
        warnings.push(...(vis.warnings || []));
        frameOcr = vis.ocrText || "";
      } else {
        warnings.push("Frame sampling failed or ffmpeg missing.");
      }
      return { transcript, frames: frameOcr ? [{ index: 1, ocrText: frameOcr }] : [], warnings, attempted };
    } catch (err: any) {
      warnings.push(`Video audio transcription failed: ${err?.message || err}`);
      return { warnings, attempted };
    }
  }

  warnings.push("Unknown format; minimal inspection only.");
  return { warnings, attempted: [...attempted, "unknown-minimal"] };
}
