import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseMaxAnalysisChunks } from "@shared/cyrus-document-limits";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

/** Aligns with `server/ingestion/report.ts` `AnalysisReport`. */
export type SyncAnalysisReport = {
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
  confidence: "High" | "Medium" | "Low";
  attempted: string[];
  warnings: string[];
};

export type FileAnalysisJob = {
  id: string;
  status: string;
  progress: number;
  stageLabel: string;
  result?: {
    analysis: {
      keyFindings: string[];
      executiveBrief: string;
      interpretation: string;
      documentType: string;
      knowledgeApplied: string[];
      chunksAnalyzed?: number;
    };
    extraction: { metadata?: { pageCount?: number; textLength?: number; warnings?: string[] } };
  };
  error?: string;
};

export type GeneratedDocument = {
  rendered: string;
  htmlRendered?: string;
  title: string;
  docType?: string;
  audience?: string;
  confidence?: "High" | "Medium" | "Low";
  wordCount: number;
  estimatedPages: number;
  sections: { title: string; content: string }[];
};

export type IntelOptions = {
  jurisdiction: string;
  mode: "standard" | "legal" | "audit" | "compliance" | undefined;
  docHint: string;
  /** User prompt: what they want the analysis to focus on or deliver. */
  analysisCommand: string;
  strictLegalReview: boolean;
  maxChunks: number;
};

const defaultIntel: IntelOptions = {
  jurisdiction: "Botswana",
  mode: "legal",
  docHint: "",
  analysisCommand: "",
  strictLegalReview: true,
  maxChunks: Math.min(1024, parseMaxAnalysisChunks()),
};

function appendFormFields(form: FormData, o: IntelOptions) {
  form.set("jurisdiction", o.jurisdiction);
  if (o.mode) form.set("mode", o.mode);
  if (o.docHint.trim()) form.set("docHint", o.docHint.trim());
  if (o.analysisCommand.trim()) form.set("analysisCommand", o.analysisCommand.trim());
  form.set("strictLegalReview", o.strictLegalReview ? "true" : "false");
  form.set("maxChunks", String(o.maxChunks));
}

export function useDocumentsIntelligence() {
  const { toast } = useToast();
  const [intel, setIntel] = useState<IntelOptions>(defaultIntel);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [syncReport, setSyncReport] = useState<SyncAnalysisReport | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const jobQuery = useQuery({
    queryKey: ["/api/files/analysis-jobs", activeJobId],
    enabled: Boolean(activeJobId),
    refetchInterval: (q) => {
      const s = (q.state.data as FileAnalysisJob | undefined)?.status;
      if (s === "completed" || s === "failed") return false;
      return 1500;
    },
    queryFn: async () => {
      if (!activeJobId) return null;
      const res = await systemFetch(`/api/files/analysis-jobs/${activeJobId}`);
      if (!res.ok) throw new Error("Job poll failed");
      return res.json() as Promise<FileAnalysisJob>;
    },
  });

  const runSyncFull = useCallback(
    async (file: File, override?: Partial<IntelOptions>) => {
      const o = { ...intel, ...override };
      setIntel(o);
      setIsSubmitting(true);
      setCurrentFile(file);
      setSyncReport(null);
      setActiveJobId(null);
      try {
        const form = new FormData();
        form.append("file", file);
        appendFormFields(form, o);
        const res = await systemFetch("/api/files/full-analysis", { method: "POST", body: form });
        const data = (await res.json()) as SyncAnalysisReport & { error?: string };
        if (!res.ok) throw new Error(data.error || "Full analysis failed");
        setSyncReport(data);
        toast({
          title: data.success ? "Analysis complete" : "Analysis finished with notes",
          description: `Confidence: ${data.confidence}`,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Analysis failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [intel, toast],
  );

  const runAsync = useCallback(
    async (file: File, override?: Partial<IntelOptions>) => {
      const o = { ...intel, ...override };
      setIntel(o);
      setIsSubmitting(true);
      setCurrentFile(file);
      setSyncReport(null);
      setActiveJobId(null);
      try {
        const form = new FormData();
        form.append("file", file);
        appendFormFields(form, o);
        const res = await systemFetch("/api/files/full-analysis-async", { method: "POST", body: form });
        const data = (await res.json()) as { job?: { id: string }; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to start job");
        if (data.job?.id) {
          setActiveJobId(data.job.id);
          toast({ title: "Long-document job started", description: "Polling for completion…" });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Async analysis failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [intel, toast],
  );

  const generateDocument = useCallback(
    async (input: {
      docType: string;
      content: string;
      audience: string;
      targetPages: number;
      purpose?: string;
    }) => {
      const res = await systemFetch("/api/docgen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: input.docType,
          audience: input.audience,
          rawText: input.content,
          targetPages: input.targetPages,
          purpose: input.purpose,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Document generation failed");
      }
      return res.json() as Promise<GeneratedDocument>;
    },
    [],
  );

  const exportDocument = useCallback(async (format: "pdf" | "docx" | "html" | "md" | "txt" | "json", doc: GeneratedDocument) => {
    const res = await systemFetch("/api/docgen/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title: doc.title,
        rendered: doc.rendered,
        htmlRendered: doc.htmlRendered,
        docType: doc.docType,
        audience: doc.audience,
        confidence: doc.confidence,
        sections: doc.sections,
        wordCount: doc.wordCount,
        estimatedPages: doc.estimatedPages,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || "Document export failed");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `${doc.title || "cyrus-document"}.${format}`;
    return { blob, filename };
  }, []);

  const clearResults = useCallback(() => {
    setSyncReport(null);
    setActiveJobId(null);
    setCurrentFile(null);
  }, []);

  const setHandoffStagedFile = useCallback((file: File | null) => {
    setCurrentFile(file);
  }, []);

  return {
    intel,
    setIntel,
    currentFile,
    setHandoffStagedFile,
    syncReport,
    job: jobQuery.data,
    isSubmitting: isSubmitting || jobQuery.isFetching,
    runSyncFull,
    runAsync,
    generateDocument,
    exportDocument,
    clearResults,
  };
}
