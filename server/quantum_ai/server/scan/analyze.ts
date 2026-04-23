import { decodeQr } from "./qr";
import { visionOcr } from "./vision";
import { detectLanguage } from "./language";
import { translateText } from "./translate";
import { interpretText } from "./interpret";
import { ScanReport } from "./report";
import { detectFile } from "../ingestion/detect";

export interface ScanOptions {
  targetLanguage?: string;
  sourceLanguage?: string;
  mode?: "business" | "casual" | "legal" | "technical" | "military";
}

function classifyQrPayload(payload: string) {
  try {
    const url = new URL(payload);
    const domain = url.hostname;
    const suspicious =
      !url.protocol.startsWith("https") ||
      ["bit.ly", "tinyurl", "goo.gl", "t.co"].some((d) => domain.endsWith(d));
    return {
      isUrl: true,
      safe: !suspicious,
      reason: suspicious ? "Non-https or shortened domain" : "HTTPS URL",
      domain,
    };
  } catch {
    const suspicious = payload.length > 512 || /token|pass|secret/i.test(payload);
    return {
      isUrl: false,
      safe: !suspicious,
      reason: suspicious ? "Contains sensitive-looking keywords" : "Plain text",
    };
  }
}

export async function analyzeScan(buffer: Buffer, declaredMime?: string, opts: ScanOptions = {}): Promise<ScanReport> {
  const det = await detectFile(buffer, declaredMime);
  const warnings: string[] = [];
  const attempted: string[] = [];

  // Try QR first
  const qr = await decodeQr(buffer);
  let scanType: ScanReport["scanType"] = "unknown";
  let qrPayload = "";
  let qrSafety: ScanReport["qrSafety"] | undefined = undefined;
  if (qr.success && qr.text) {
    scanType = "qr";
    qrPayload = qr.text;
    qrSafety = classifyQrPayload(qrPayload);
    if (qrSafety && qrSafety.isUrl && qrSafety.safe === false) {
      warnings.push(`QR URL flagged: ${qrSafety.reason} (${qrSafety.domain || "unknown domain"})`);
    }
    attempted.push("qr-decode");
  } else {
    attempted.push("qr-decode-failed");
    if (qr.error) warnings.push(qr.error);
  }

  // OCR
  let ocrText = "";
  let visionNotes = "";
  if (scanType !== "qr") {
    const vis = await visionOcr(buffer);
    ocrText = vis.ocrText || "";
    visionNotes = vis.notes;
    warnings.push(...vis.warnings);
    attempted.push("vision-ocr");
    scanType = "image";
  }

  const originalText = qrPayload || ocrText;
  if (!originalText) {
    warnings.push("No text extracted from QR/OCR.");
  }

  // Language detection
  const lang = await detectLanguage(originalText || "");
  warnings.push(...lang.warnings);
  const detectedLanguage = opts.sourceLanguage || lang.language || "unknown";
  const languageConfidence = lang.confidence;

  // Translation
  let translation = "";
  if (opts.targetLanguage) {
    const tx = await translateText(originalText || "", {
      target: opts.targetLanguage,
      source: detectedLanguage,
      mode: opts.mode,
    });
    translation = tx.translated;
    warnings.push(...tx.warnings);
    attempted.push("translate");
  }

  // Interpretation
  const interp = await interpretText(originalText || translation || "");
  warnings.push(...interp.warnings);

  const hasContent = !!(qrPayload || ocrText || translation);
  const confidence: ScanReport["confidence"] =
    !hasContent ? "Low" : languageConfidence > 0.7 ? "High" : languageConfidence > 0.4 ? "Medium" : "Low";

  const report: ScanReport = {
    success: hasContent,
    scanType,
    sourceDescription: `Size: ${det.size} bytes; Detected: ${det.detectedMime || "-"}; Declared: ${det.declaredMime || "-"}`,
    detectedLanguage,
    languageConfidence,
    translation,
    originalText,
    qrPayload: qrPayload || undefined,
    qrSafety,
    interpretation: interp.interpretation,
    keyFindings: interp.keyFindings,
    risks: interp.risks,
    ambiguities: interp.ambiguities,
    confidence,
    warnings,
    attempted,
    nextSteps: hasContent ? [] : ["Try higher-quality scan or supported format; ensure OpenAI env is configured."],
  };

  return report;
}

