import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";

export interface FileDetectionResult {
  declaredMime?: string;
  detectedMime?: string;
  ext?: string;
  size: number;
  sha256: string;
}

export interface ExtractionResult {
  text?: string;
  metadata?: Record<string, any>;
  pages?: number;
  images?: string[];
  tables?: any[];
  error?: string;
}

export interface AnalysisResult {
  summary: string;
  keyFindings: string[];
  entities: { type: string; value: string }[];
  sentiment?: string;
  topics?: string[];
  riskLevel?: "low" | "medium" | "high";
  recommendations?: string[];
}

export interface FileReport {
  detection: FileDetectionResult;
  extraction: ExtractionResult;
  analysis: AnalysisResult;
  generatedAt: string;
}

export function useFileAnalysis() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [lastReport, setLastReport] = useState<FileReport | null>(null);

  const detectFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await systemFetch("/api/files/detect", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("File detection failed");
      return res.json();
    },
  });

  const extractFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await systemFetch("/api/files/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("File extraction failed");
      return res.json();
    },
  });

  const analyzeFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await systemFetch("/api/files/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("File analysis failed");
      return res.json();
    },
  });

  const fullPipeline = useMutation({
    mutationFn: async (file: File) => {
      setCurrentFile(file);
      const formData = new FormData();
      formData.append("file", file);
      const res = await systemFetch("/api/files/full-analysis", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Full analysis failed");
      const report = await res.json();
      setLastReport(report);
      return report;
    },
  });

  const generateDocument = useMutation({
    mutationFn: async ({
      docType,
      content,
      audience,
    }: {
      docType: string;
      content: string;
      audience?: string;
    }) => {
      const res = await systemFetch("/api/docgen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, content, audience }),
      });
      if (!res.ok) throw new Error("Document generation failed");
      return res.json();
    },
  });

  return {
    currentFile,
    lastReport,
    detectFile,
    extractFile,
    analyzeFile,
    fullPipeline,
    generateDocument,
    isProcessing:
      detectFile.isPending ||
      extractFile.isPending ||
      analyzeFile.isPending ||
      fullPipeline.isPending,
    isGenerating: generateDocument.isPending,
    clearResults: () => {
      setCurrentFile(null);
      setLastReport(null);
    },
  };
}
