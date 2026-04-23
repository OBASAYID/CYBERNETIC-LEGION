import { detectFile } from "./detect.js";
import { ensureCompatibleFormat, speechToText } from "../replit_integrations/audio/client.js";
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

async function extractTextDocument(buffer: Buffer, detectedMime?: string): Promise<{ text: string; pageCount?: number }> {
  if (detectedMime === "application/pdf") {
    const pdfModule = await import("pdf-parse");
    const parsePdf = (pdfModule as any).default ?? pdfModule;
    const data = await parsePdf(buffer, { max: 0 });
    return { text: data.text || "", pageCount: data.numpages };
  }
  if (detectedMime && detectedMime.includes("word")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value || "" };
  }
  // Fallback: attempt UTF-8 decode
  return { text: buffer.toString("utf-8") };
}

async function extractImageWithVision(buffer: Buffer): Promise<{ ocrText?: string; visionNotes?: string; warnings?: string[] }> {
  const warnings: string[] = [];
  if (!visionClient) {
    warnings.push("Vision not configured (missing OpenAI env); returning placeholder.");
    return { ocrText: "", visionNotes: "Vision unavailable", warnings };
  }
  // OpenAI Vision expects base64 image input
  const b64 = buffer.toString("base64");
  try {
    const resp = await visionClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR and visual analysis tool. Extract readable text verbatim and describe notable visual elements (objects, layout, stamps, signatures). Return concise OCR text and notes.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Perform OCR and brief visual notes.",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${b64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    });
    const content = resp.choices[0]?.message?.content || "";
    // Heuristic: split into OCR vs notes
    return { ocrText: content, visionNotes: "Vision/OCR from model", warnings };
  } catch (err: any) {
    warnings.push(`Vision call failed: ${err?.message || err}`);
    return { ocrText: "", visionNotes: "Vision failed", warnings };
  }
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

export async function extractFile(buffer: Buffer, declaredMime?: string): Promise<ExtractionResult> {
  const det = await detectFile(buffer, declaredMime);
  const warnings: string[] = [];
  const attempted: string[] = [];

  const detected = det.detectedMime || det.declaredMime || "application/octet-stream";

  // Branch by detected MIME
  if (detected.startsWith("text/") || detected === "application/pdf" || detected.includes("word")) {
    attempted.push("text-extract");
    try {
      const { text, pageCount } = await extractTextDocument(buffer, detected);
      if (text && text.trim().length > 0) {
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return { text, pageCount, wordCount, warnings, attempted };
      }
      warnings.push("Primary text extraction returned empty; attempting OCR if applicable.");
    } catch (err: any) {
      warnings.push(`Text extraction failed: ${err?.message || err}`);
    }
  }

  if (detected.startsWith("image/") || detected === "application/pdf") {
    attempted.push("vision-ocr");
    const vis = await extractImageWithVision(buffer);
    warnings.push(...(vis.warnings || []));
    return { ocrText: vis.ocrText, visionNotes: vis.visionNotes, warnings, attempted };
  }

  if (detected.startsWith("audio/")) {
    attempted.push("audio-transcribe");
    try {
      const { buffer: wav, format } = await ensureCompatibleFormat(buffer);
      const transcript = await speechToText(wav, format);
      return { transcript, warnings, attempted };
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
      // Sample a frame at 1s for OCR (placeholder)
      const frame = await extractVideoFrame(buffer, 1);
      let frameOcr = "";
      if (frame) {
        const vis = await extractImageWithVision(frame);
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

  // Unknown / fallback
  warnings.push("Unknown format; minimal inspection only.");
  return { warnings, attempted: [...attempted, "unknown-minimal"] };
}

