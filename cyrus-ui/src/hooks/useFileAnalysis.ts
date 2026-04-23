import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

export interface FileAnalysisReport {
  success: boolean;
  title: string;
  docType: string;
  sourceDescription: string;
  extractedSummary: string;
  transcript?: string;
  ocrText?: string;
  keyFindings: string[];
  issues: string[];
  interpretation: string;
  recommendations: string[];
  confidence: string;
  attempted: string[];
  warnings: string[];
}

export function useFileAnalysis() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<FileAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await systemFetch("/api/files/analyze", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data);
      toast({ title: data.success ? "Analysis completed" : "Partial/Failed analysis", description: data.docType });
    } catch (err: any) {
      toast({ title: "Analysis error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return { file, setFile, report, loading, analyze };
}

