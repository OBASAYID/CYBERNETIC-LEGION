import type { ExtractionResult } from "./extract.js";

export interface ResolvedDocumentText {
  text: string;
  source: "text" | "ocr" | "transcript" | "frames";
}

export function resolveDocumentText(extracted: ExtractionResult): ResolvedDocumentText | null {
  if (extracted.text?.trim()) {
    return { text: extracted.text.trim(), source: "text" };
  }
  if (extracted.ocrText?.trim()) {
    return { text: extracted.ocrText.trim(), source: "ocr" };
  }
  if (extracted.transcript?.trim()) {
    return { text: extracted.transcript.trim(), source: "transcript" };
  }
  const frameText = (extracted.frames || [])
    .map((f) => f.ocrText?.trim())
    .filter(Boolean)
    .join("\n\n");
  if (frameText) {
    return { text: frameText, source: "frames" };
  }
  return null;
}

export function extractionFailureMessage(extracted: ExtractionResult): string {
  const parts = ["Could not extract readable text from this document."];
  if (extracted.attempted.length > 0) {
    parts.push(`Attempted: ${extracted.attempted.join(", ")}.`);
  }
  const actionable = extracted.warnings.filter((w) => !w.includes("placeholder"));
  if (actionable.length > 0) {
    parts.push(actionable.slice(0, 3).join(" "));
  } else {
    parts.push("Try a clearer scan, or ensure OPENAI_API_KEY is set for OCR fallback.");
  }
  return parts.join(" ");
}
