import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseMaxAnalysisChunks } from "@shared/cyrus-document-limits";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

// =====================================
// Enhanced Types for Intelligent System
// =====================================

export type DocumentCategory = 
  | "tender"
  | "examination"
  | "quiz"
  | "job_requirement"
  | "administrative"
  | "legal"
  | "technical"
  | "correspondence"
  | "report"
  | "proposal"
  | "contract"
  | "policy"
  | "research"
  | "unknown";

export interface DocumentClassification {
  category: DocumentCategory;
  confidence: number;
  subcategory?: string;
  characteristics: string[];
  requiresResponse: boolean;
  responseType?: "comply" | "answer" | "clone" | "analyze";
}

export interface IntelligentDocument {
  content: string;
  htmlContent?: string;
  title: string;
  category: DocumentCategory;
  format: string;
  sections: Array<{ title: string; content: string; type?: string }>;
  metadata: {
    generatedAt: string;
    wordCount: number;
    pageCount: number;
    confidence: number;
    complianceChecks: string[];
    qualityScore: number;
  };
  attachments?: Array<{
    id: string;
    type: "table" | "chart" | "image" | "calculation";
    content: string;
    description: string;
  }>;
}

export interface FormatCompliance {
  overallScore: number;
  checks: Array<{
    rule: string;
    passed: boolean;
    severity: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  grammarScore: number;
  professionalismScore: number;
  structureScore: number;
  recommendations: string[];
}

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
  attachments?: Array<{
    id: string;
    kind: "image";
    style: "realistic_3d" | "graphical" | "schematic";
    sectionTitle?: string;
    caption: string;
    prompt: string;
    url?: string;
    dataUrl?: string;
  }>;
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
      includeImages?: boolean;
      imageStyle?: "realistic_3d" | "graphical" | "schematic";
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
          includeImages: input.includeImages ?? false,
          imageStyle: input.imageStyle ?? "schematic",
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
        attachments: doc.attachments,
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

  const exportIntelligentDocument = useCallback(
    async (format: "pdf" | "docx" | "html" | "md" | "txt" | "json", doc: IntelligentDocument) => {
      const score = doc.metadata?.confidence ?? 0;
      const confidence: "High" | "Medium" | "Low" =
        score >= 0.75 ? "High" : score >= 0.5 ? "Medium" : "Low";
      return exportDocument(format, {
        title: doc.title,
        rendered: doc.content,
        htmlRendered: doc.htmlContent,
        docType: doc.category,
        audience: doc.format,
        confidence,
        sections: doc.sections,
        wordCount: doc.metadata?.wordCount,
        estimatedPages: doc.metadata?.pageCount,
      });
    },
    [exportDocument],
  );

  const clearResults = useCallback(() => {
    setSyncReport(null);
    setActiveJobId(null);
    setCurrentFile(null);
  }, []);

  const setHandoffStagedFile = useCallback((file: File | null) => {
    setCurrentFile(file);
  }, []);

  // =====================================
  // Intelligent Document Functions
  // =====================================

  const classifyDocument = useCallback(
    async (file: File) => {
      try {
        const form = new FormData();
        form.append("file", file);
        
        const res = await systemFetch("/api/documents/classify", { method: "POST", body: form });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Classification failed");
        
        return data.classification as DocumentClassification;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Classification failed";
        toast({ title: "Classification Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

  const generateIntelligentDocument = useCallback(
    async (options: {
      sourceFile?: File;
      sourceText?: string;
      documentType: DocumentCategory;
      requirements?: string[];
      format?: "formal" | "technical" | "executive" | "academic";
      targetLength?: "brief" | "standard" | "comprehensive";
      includeAnswers?: boolean;
    }) => {
      try {
        const form = new FormData();
        if (options.sourceFile) form.append("sourceFile", options.sourceFile);
        if (options.sourceText) form.append("sourceDocument", options.sourceText);
        form.append("documentType", options.documentType);
        if (options.requirements) form.append("requirements", JSON.stringify(options.requirements));
        if (options.format) form.append("format", options.format);
        if (options.targetLength) form.append("targetLength", options.targetLength);
        if (options.includeAnswers !== undefined) form.append("includeAnswers", String(options.includeAnswers));
        
        const res = await systemFetch("/api/documents/generate-intelligent", { method: "POST", body: form });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Generation failed");
        
        toast({ title: "Document Generated", description: "Intelligent document ready" });
        return data.document as IntelligentDocument;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        toast({ title: "Generation Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

  const cloneDocument = useCallback(
    async (file: File, cloneType: "exact" | "template" | "answer-filled") => {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("cloneType", cloneType);
        
        const res = await systemFetch("/api/documents/clone", { method: "POST", body: form });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Cloning failed");
        
        toast({ title: "Document Cloned", description: "Document cloned successfully" });
        return data.document as IntelligentDocument;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Cloning failed";
        toast({ title: "Cloning Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

  const respondToTender = useCallback(
    async (file: File) => {
      try {
        const form = new FormData();
        form.append("file", file);
        
        const res = await systemFetch("/api/documents/respond-tender", { method: "POST", body: form });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Tender response failed");

        const tenderResponse = data.tenderResponse as IntelligentDocument;
        const words = tenderResponse?.metadata?.wordCount ?? tenderResponse?.content?.split(/\s+/).filter(Boolean).length ?? 0;
        if (!tenderResponse?.content?.trim() || words < 50) {
          throw new Error(
            "Proposal generation returned empty or insufficient content. Check AI provider keys on the server and retry.",
          );
        }

        toast({
          title: "Tender Response Generated",
          description: `${words.toLocaleString()} words · ready for PDF/Word export`,
        });
        return tenderResponse;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Tender response failed";
        toast({ title: "Tender Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

  const generateAnswerKey = useCallback(
    async (file: File) => {
      try {
        const form = new FormData();
        form.append("file", file);
        
        const res = await systemFetch("/api/documents/generate-answers", { method: "POST", body: form });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Answer generation failed");
        
        toast({ title: "Answer Key Generated", description: "Comprehensive answers ready" });
        return data.answerKey as IntelligentDocument;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Answer generation failed";
        toast({ title: "Answer Generation Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

  const validateCompliance = useCallback(
    async (content: string, category: DocumentCategory) => {
      try {
        const res = await systemFetch("/api/documents/validate-compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, category }),
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Validation failed");
        
        return data.compliance as FormatCompliance;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Validation failed";
        toast({ title: "Validation Error", description: msg, variant: "destructive" });
        throw e;
      }
    },
    [toast]
  );

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
    exportIntelligentDocument,
    clearResults,
    // Intelligent document functions
    classifyDocument,
    generateIntelligentDocument,
    cloneDocument,
    respondToTender,
    generateAnswerKey,
    validateCompliance,
  };
}
