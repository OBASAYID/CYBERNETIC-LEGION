import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";

export interface ScanResult {
  success: boolean;
  type: "qr" | "ocr" | "vision";
  text?: string;
  detectedLanguage?: string;
  translation?: string;
  interpretation?: string;
  riskNotes?: string[];
  confidence?: number;
  error?: string;
}

export interface TranslateResult {
  originalText: string;
  detectedLanguage: string;
  targetLanguage: string;
  translatedText: string;
  confidence: number;
}

export function useScan() {
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [lastTranslation, setLastTranslation] = useState<TranslateResult | null>(null);

  const scanQR = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await systemFetch("/api/scan/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) throw new Error("QR scan failed");
      const result = await res.json();
      setLastResult({ ...result, type: "qr" });
      return result;
    },
  });

  const scanOCR = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await systemFetch("/api/scan/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) throw new Error("OCR scan failed");
      const result = await res.json();
      setLastResult({ ...result, type: "ocr" });
      return result;
    },
  });

  const scanVision = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await systemFetch("/api/scan/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) throw new Error("Vision scan failed");
      const result = await res.json();
      setLastResult({ ...result, type: "vision" });
      return result;
    },
  });

  const detectLanguage = useMutation({
    mutationFn: async (text: string) => {
      const res = await systemFetch("/api/scan/detect-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Language detection failed");
      return res.json();
    },
  });

  const translate = useMutation({
    mutationFn: async ({
      text,
      targetLanguage,
    }: {
      text: string;
      targetLanguage: string;
    }) => {
      const res = await systemFetch("/api/scan/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
      });
      const result = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Translation failed");
      }
      const translatedRaw = result.translatedText ?? result.translation;
      const translatedText =
        typeof translatedRaw === "string" ? translatedRaw.trim() : String(translatedRaw ?? "").trim();
      if (!translatedText) {
        throw new Error("Translation response was empty.");
      }
      const normalized: TranslateResult = {
        originalText: typeof result.originalText === "string" ? result.originalText : text,
        detectedLanguage: String(result.detectedLanguage ?? "Unknown"),
        targetLanguage: String(result.targetLanguage ?? targetLanguage),
        translatedText,
        confidence: typeof result.confidence === "number" ? result.confidence : 0,
      };
      setLastTranslation(normalized);
      return normalized;
    },
  });

  const interpret = useMutation({
    mutationFn: async (text: string) => {
      const res = await systemFetch("/api/scan/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Interpretation failed");
      return res.json();
    },
  });

  const generateReport = useMutation({
    mutationFn: async (scanResult: ScanResult) => {
      const res = await systemFetch("/api/scan/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanResult),
      });
      if (!res.ok) throw new Error("Report generation failed");
      return res.json();
    },
  });

  return {
    lastResult,
    lastTranslation,
    scanQR,
    scanOCR,
    scanVision,
    detectLanguage,
    translate,
    interpret,
    generateReport,
    isScanning: scanQR.isPending || scanOCR.isPending || scanVision.isPending,
    isTranslating: translate.isPending,
    clearResults: () => {
      setLastResult(null);
      setLastTranslation(null);
    },
  };
}

/** Full pipeline: file → server `analyzeScan` (QR / OCR / language / translation / interpretation → CYRUS report). */
export function useScanAnalyze() {
  return useMutation({
    mutationFn: async (params: { file: File; targetLanguage: string; mode: string; sourceLanguage?: string }) => {
      const form = new FormData();
      form.append("file", params.file);
      form.append("targetLanguage", params.targetLanguage);
      form.append("mode", params.mode);
      if (params.sourceLanguage) form.append("sourceLanguage", params.sourceLanguage);
      const res = await systemFetch("/api/scan/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Full scan failed");
      return data;
    },
  });
}
