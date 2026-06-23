import { useMutation } from "@tanstack/react-query";
import { useDocumentsIntelligence, type IntelOptions } from "@/hooks/useDocumentsIntelligence";
import { Button } from "@/components/ui/button";
import {
  Brain,
  ChevronDown,
  FileText,
  Gavel,
  Loader2,
  Scale,
  Scroll,
  Sparkles,
  MessageSquare,
  Upload,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  encodeFileAsHandoffAttachment,
  readCommandSearchShare,
  readHandoff,
  registerLargeHandoffFile,
  resolveHandoffPayloadToFiles,
  revokeHandoffPayloadBlobs,
  type ModuleHandoffAttachment,
  type ModuleHandoffLargeRef,
} from "@shared/module-handoff";
import { maxDocgenTargetPages, parseLargeUploadThresholdBytes, parseMaxAnalysisChunks } from "@shared/cyrus-document-limits";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { useToast } from "@/hooks/use-toast";
import { TSODILO_HUNT_SYMBOLS_URL } from "@/lib/dashboard-backdrop";

const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: "auto", label: "Auto-detect (no hint)" },
  { value: "legal_summons", label: "Summons" },
  { value: "police_report", label: "Police / incident report" },
  { value: "correspondence", label: "Letter / correspondence" },
  { value: "pitch", label: "Pitch / proposal" },
  { value: "memorandum", label: "Memorandum" },
  { value: "legal_brief", label: "Legal report / brief" },
  { value: "judgment", label: "Judgment / court opinion" },
  { value: "notice_letter", label: "Notice of intent / demand letter" },
  { value: "contract", label: "Contract / agreement" },
  { value: "constitutional", label: "Constitutional / policy instrument" },
];

const GEN_TYPES: { value: string; label: string }[] = [
  { value: "legal", label: "Legal analysis report" },
  { value: "memorandum", label: "Memorandum" },
  { value: "brief", label: "Brief" },
  { value: "summary", label: "Extended summary" },
  { value: "report", label: "Formal report" },
  { value: "technical", label: "Technical document" },
];

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const EXPORT_FORMATS: Array<{ value: "pdf" | "docx" | "html" | "md" | "txt" | "json"; label: string }> = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Word (.docx)" },
  { value: "html", label: "HTML (.html)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "txt", label: "Plain text (.txt)" },
  { value: "json", label: "Structured JSON (.json)" },
];

export default function DocumentsIntelligence() {
  const { toast } = useToast();
  const {
    intel,
    setIntel,
    currentFile,
    setHandoffStagedFile,
    syncReport,
    job,
    isSubmitting,
    runSyncFull,
    runAsync,
    generateDocument,
    exportDocument,
    exportIntelligentDocument,
    clearResults,
    classifyDocument,
    generateIntelligentDocument,
    cloneDocument,
    respondToTender,
    generateAnswerKey,
    validateCompliance,
  } = useDocumentsIntelligence();

  const [category, setCategory] = useState("auto");
  const [stagedAnalyseFile, setStagedAnalyseFile] = useState<File | null>(null);
  const [genType, setGenType] = useState("legal");
  const [genAudience, setGenAudience] = useState("legal_counsel");
  const [genBody, setGenBody] = useState("");
  const [targetPages, setTargetPages] = useState(2000);
  const [genPurpose, setGenPurpose] = useState("");
  const [includeImages, setIncludeImages] = useState(false);
  const [imageStyle, setImageStyle] = useState<"realistic_3d" | "graphical" | "schematic">("schematic");
  const [exportFormat, setExportFormat] = useState<(typeof EXPORT_FORMATS)[number]["value"]>("pdf");
  const [intelligentExportFormat, setIntelligentExportFormat] = useState<(typeof EXPORT_FORMATS)[number]["value"]>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [isIntelligentExporting, setIsIntelligentExporting] = useState(false);
  const analyseFileInputRef = useRef<HTMLInputElement>(null);
  const [handoffEncoded, setHandoffEncoded] = useState<ModuleHandoffAttachment[] | undefined>();
  const [handoffLargeRefs, setHandoffLargeRefs] = useState<ModuleHandoffLargeRef[]>([]);
  
  // Intelligent processing state
  const [intelligentFile, setIntelligentFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<any | null>(null);
  const [intelligentDoc, setIntelligentDoc] = useState<any | null>(null);
  const [isProcessingIntelligent, setIsProcessingIntelligent] = useState(false);
  const intelligentFileInputRef = useRef<HTMLInputElement>(null);

  const docHintText =
    category === "auto"
      ? ""
      : `Primary document class: ${DOC_CATEGORIES.find((c) => c.value === category)?.label ?? category}. Apply jurisdiction-aware reading and long-form structure where relevant.`;

  const onStagedFileSelected = (fileList: FileList | null) => {
    const f = fileList?.[0];
    if (!f) return;
    setStagedAnalyseFile(f);
    setIntel((s) => ({ ...s, docHint: docHintText }));
  };

  /** Single merged override so the click uses current intel + category hint (no stale closure). */
  const runStagedAnalyse = () => {
    if (!stagedAnalyseFile) return;
    const override: Partial<IntelOptions> = { ...intel, docHint: docHintText };
    if (stagedAnalyseFile.size > parseLargeUploadThresholdBytes()) {
      void runAsync(stagedAnalyseFile, override);
    } else {
      void runSyncFull(stagedAnalyseFile, override);
    }
  };

  const handleClearResults = () => {
    setStagedAnalyseFile(null);
    setHandoffStagedFile(null);
    setHandoffEncoded(undefined);
    setHandoffLargeRefs([]);
    setIntelligentFile(null);
    setClassification(null);
    setIntelligentDoc(null);
    clearResults();
  };

  // Intelligent processing handlers
  const handleClassifyDocument = async () => {
    if (!intelligentFile) return;
    setIsProcessingIntelligent(true);
    try {
      const result = await classifyDocument(intelligentFile);
      setClassification(result);
      toast({
        title: "Document Classified",
        description: `Type: ${result.category} (${(result.confidence * 100).toFixed(0)}% confidence)`,
      });
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsProcessingIntelligent(false);
    }
  };

  const handleRespondToTender = async () => {
    if (!intelligentFile) return;
    setIsProcessingIntelligent(true);
    try {
      const result = await respondToTender(intelligentFile);
      setIntelligentDoc(result);
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsProcessingIntelligent(false);
    }
  };

  const handleGenerateAnswers = async () => {
    if (!intelligentFile) return;
    setIsProcessingIntelligent(true);
    try {
      const result = await generateAnswerKey(intelligentFile);
      setIntelligentDoc(result);
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsProcessingIntelligent(false);
    }
  };

  const handleCloneDocument = async (cloneType: "exact" | "template" | "answer-filled") => {
    if (!intelligentFile) return;
    setIsProcessingIntelligent(true);
    try {
      const result = await cloneDocument(intelligentFile, cloneType);
      setIntelligentDoc(result);
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsProcessingIntelligent(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("handoff") !== "1") return;
    const h = readHandoff(true);
    if (!h) return;

    void (async () => {
      try {
        if (h.text?.trim()) setGenBody(h.text);
        const files = await resolveHandoffPayloadToFiles(h);
        if (files[0]) {
          setStagedAnalyseFile(files[0]);
          setHandoffStagedFile(files[0]);
        }
      } finally {
        await revokeHandoffPayloadBlobs(h);
      }

      if (h.text?.trim() || h.attachments?.length || h.largeAttachments?.length) {
        setGenPurpose(
          `Cross-module pipeline from ${h.sourceModule}. ${h.note ?? "Research / group collaboration follow-up."}`,
        );
        setGenType("report");
        setGenAudience("technical");
        toast({
          title: "Pipeline content ready",
          description:
            h.largeAttachments?.length || h.attachments?.length
              ? "Review text and staged file — run analysis or Generate."
              : "Review and tap Generate — or run analysis on a file.",
        });
      }
    })();
  }, [toast, setHandoffStagedFile]);

  const genMut = useMutation({
    mutationFn: async () => {
      return generateDocument({
        docType: genType,
        content: genBody,
        audience: genAudience,
        targetPages: Math.max(1, Math.min(maxDocgenTargetPages(), targetPages)),
        purpose: genPurpose || undefined,
        includeImages,
        imageStyle,
      });
    },
  });

  const fileForPipelineHandoff = stagedAnalyseFile ?? currentFile;

  useEffect(() => {
    let cancelled = false;
    if (!fileForPipelineHandoff) {
      setHandoffEncoded(undefined);
      setHandoffLargeRefs([]);
      return;
    }
    const INLINE_MAX = 900_000;
    if (fileForPipelineHandoff.size <= INLINE_MAX) {
      setHandoffLargeRefs([]);
      void encodeFileAsHandoffAttachment(fileForPipelineHandoff).then((a) => {
        if (!cancelled) setHandoffEncoded(a ? [a] : undefined);
      });
      return () => {
        cancelled = true;
      };
    }
    setHandoffEncoded(undefined);
    void registerLargeHandoffFile(fileForPipelineHandoff).then((ref) => {
      if (cancelled) return;
      setHandoffLargeRefs(ref ? [ref] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [fileForPipelineHandoff]);

  const commandHandoffText = () => {
    const rendered = genMut.data?.rendered?.trim();
    if (rendered) return rendered;
    const body = genBody.trim();
    if (body) return body;
    if (syncReport) {
      const parts = [
        syncReport.extractedSummary,
        ...(syncReport.keyFindings || []),
        syncReport.issues?.length ? `Issues: ${syncReport.issues.join("; ")}` : "",
      ].filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }
    if (job?.status === "completed" && job.result?.analysis) {
      const a = job.result.analysis;
      const parts = [
        a.executiveBrief,
        ...(a.keyFindings || []),
        a.interpretation,
      ].filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }
    const cmd = intel.analysisCommand?.trim();
    if (cmd) return `Document analysis command:\n${cmd}`;
    return undefined;
  };

  return (
    <ModuleWorkspacePageShell
      theme="dashboard"
      backdropTextureUrl={TSODILO_HUNT_SYMBOLS_URL}
      backdropPixelated
      kicker="Cyrus · Documents"
      title="Document intelligence"
      subtitle="Analysis and long-form output"
      icon={Gavel}
      commandHandoffText={commandHandoffText}
      commandHandoffSource="documents-intelligence"
      commandHandoffAttachments={() => handoffEncoded}
      commandHandoffLargeRefs={() => (handoffLargeRefs.length ? handoffLargeRefs : undefined)}
      commandContext="Document Intelligence — analysis pipeline"
      headerEnd={
        <>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-mono text-emerald-200/85">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Pipeline online
          </span>
          <Button
            type="button"
            variant="outline"
            className="border-white/18 bg-white/[0.07] text-xs text-slate-100 hover:bg-white/[0.13]"
            onClick={() => {
              const t = readCommandSearchShare()?.trim();
              if (!t) return;
              setGenBody((prev) => (prev.trim() ? `${prev.trim()}\n\n---\n\n${t}` : t));
              toast({ title: "Command search loaded", description: "Merged into the generation body." });
            }}
          >
            Last command search
          </Button>
          <Button type="button" variant="ghost" className="text-sm text-slate-200/85 hover:bg-white/[0.08]" onClick={handleClearResults}>
            Clear
          </Button>
        </>
      }
    >
        <div className="text-base">
        {/* Side-by-side console layout: analysis input | generated output */}
        <div className="grid min-h-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {/* LEFT CONSOLE: Document Analysis and Generation Input */}
          <div className="flex min-h-0 min-w-0 flex-col gap-4 sm:gap-5">
          <section className="shrink-0 rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/58 via-slate-900/76 to-slate-950/88 p-4 shadow-[0_20px_42px_rgba(0,0,0,0.36)] sm:p-5">
            <h2
              className="mb-3 flex items-center gap-2.5 text-base font-semibold text-slate-100 sm:text-lg"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              <Brain className="h-5 w-5 text-sky-200" />
              Document analysis and examination
            </h2>

            <div className="mb-3 space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-white/70">Document kind</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base text-white"
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-white/70">Jurisdiction</label>
                  <input
                    value={intel.jurisdiction}
                    onChange={(e) => setIntel((s) => ({ ...s, jurisdiction: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base"
                    placeholder="e.g. Botswana"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-white/70">Mode</label>
                  <select
                    value={intel.mode ?? "legal"}
                    onChange={(e) =>
                      setIntel((s) => ({ ...s, mode: e.target.value as typeof intel.mode }))
                    }
                    className="mt-1 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base"
                  >
                    <option value="legal">Legal</option>
                    <option value="audit">Audit</option>
                    <option value="compliance">Compliance</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={intel.strictLegalReview}
                    onChange={(e) => setIntel((s) => ({ ...s, strictLegalReview: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  Strict legal review
                </label>
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <span>Max chunks</span>
                  <input
                    type="number"
                    min={1}
                    max={parseMaxAnalysisChunks()}
                    value={intel.maxChunks}
                    onChange={(e) =>
                      setIntel((s) => ({
                        ...s,
                        maxChunks: Math.min(parseMaxAnalysisChunks(), Math.max(1, +e.target.value)),
                      }))
                    }
                    className="w-24 rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-right text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-3 sm:space-y-3.5">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/70">Run</span>
                  <p className="mt-1 text-xs text-white/50 sm:text-sm">
                    Optional command, file, then Generate.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="doc-analysis-command"
                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/70"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-cyan-400/90" />
                    Command
                  </label>
                  <textarea
                    id="doc-analysis-command"
                    name="doc-analysis-command"
                    value={intel.analysisCommand}
                    onChange={(e) => setIntel((s) => ({ ...s, analysisCommand: e.target.value }))}
                    rows={3}
                    maxLength={8000}
                    placeholder="What should the analysis focus on?"
                    className="w-full rounded-lg border border-sky-300/25 bg-slate-950/70 px-3 py-2.5 text-base leading-relaxed text-white/95 shadow-inner placeholder:text-white/45"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-sky-300/28 bg-slate-950/45 p-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-widest text-cyan-200/85">Source file</p>
                  <input
                    ref={analyseFileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      onStagedFileSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    className="h-11 w-full border border-cyan-500/40 bg-cyan-500/15 px-4 text-base text-cyan-50 hover:bg-cyan-500/25"
                    onClick={() => analyseFileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload document (PDF, Word, text, image)
                  </Button>
                  {(stagedAnalyseFile || currentFile) && (
                    <p className="mt-2 text-sm text-white/75">
                      <FileText className="mr-1.5 inline h-4 w-4" />
                      {(stagedAnalyseFile || currentFile)!.name} ·{" "}
                      {((stagedAnalyseFile || currentFile)!.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Button
                    type="button"
                    className="h-11 w-full bg-gradient-to-r from-slate-300/25 to-sky-300/35 text-base text-white shadow-md shadow-black/25 disabled:opacity-50"
                    disabled={!stagedAnalyseFile || isSubmitting}
                    onClick={runStagedAnalyse}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Working…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-white/45">Large files use a background job.</p>
                </div>
              </div>
            </section>

            {/* INTELLIGENT DOCUMENT PROCESSING */}
            <section className="shrink-0 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-900/30 via-slate-900/76 to-slate-950/88 p-4 shadow-[0_20px_42px_rgba(0,0,0,0.36)] sm:p-5">
              <h2
                className="mb-3 flex items-center gap-2.5 text-base font-semibold text-emerald-100 sm:text-lg"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                <Sparkles className="h-5 w-5 text-emerald-400" />
                Intelligent Document Processing
              </h2>
              <p className="mb-3 text-sm text-emerald-200/70">
                AI-powered classification, tender responses, exam answer generation, and document cloning
              </p>

              <div className="rounded-xl border border-dashed border-emerald-400/25 bg-slate-950/45 p-4">
                <p className="mb-2 text-xs font-mono uppercase tracking-widest text-emerald-200/85">Upload for intelligent processing</p>
                <input
                  ref={intelligentFileInputRef}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setIntelligentFile(f);
                      setClassification(null);
                      setIntelligentDoc(null);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  className="h-11 w-full border border-emerald-500/40 bg-emerald-500/15 px-4 text-base text-emerald-50 hover:bg-emerald-500/25"
                  onClick={() => intelligentFileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload document
                </Button>
                {intelligentFile && (
                  <p className="mt-2 text-sm text-emerald-100/75">
                    <FileText className="mr-1.5 inline h-4 w-4" />
                    {intelligentFile.name} · {(intelligentFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              {intelligentFile && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-sm text-emerald-200 hover:bg-emerald-500/10"
                    disabled={isProcessingIntelligent}
                    onClick={handleClassifyDocument}
                  >
                    <Brain className="mr-1.5 h-4 w-4" />
                    Classify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-sm text-emerald-200 hover:bg-emerald-500/10"
                    disabled={isProcessingIntelligent}
                    onClick={handleRespondToTender}
                  >
                    <Gavel className="mr-1.5 h-4 w-4" />
                    Respond (Tender)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-sm text-emerald-200 hover:bg-emerald-500/10"
                    disabled={isProcessingIntelligent}
                    onClick={handleGenerateAnswers}
                  >
                    <Scroll className="mr-1.5 h-4 w-4" />
                    Generate Answers
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-sm text-emerald-200 hover:bg-emerald-500/10"
                    disabled={isProcessingIntelligent}
                    onClick={() => handleCloneDocument("template")}
                  >
                    <FileText className="mr-1.5 h-4 w-4" />
                    Clone Template
                  </Button>
                </div>
              )}

              {classification && (
                <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-950/40 p-3">
                  <p className="text-sm font-semibold text-emerald-100">
                    Classification: <span className="text-emerald-300">{classification.category}</span>
                  </p>
                  <p className="text-xs text-emerald-200/70">
                    Confidence: {(classification.confidence * 100).toFixed(0)}%
                    {classification.requiresResponse && (
                      <span className="ml-2 text-emerald-400">• Requires {classification.responseType}</span>
                    )}
                  </p>
                  {classification.characteristics && classification.characteristics.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-300/60">
                      {classification.characteristics.join(" • ")}
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="shrink-0 rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/58 via-slate-900/76 to-slate-950/88 p-4 shadow-[0_20px_42px_rgba(0,0,0,0.36)] sm:p-5">
              <h2
                className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-100 sm:text-lg"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                <Wand2 className="h-5 w-5 text-sky-200" />
                Generate long output
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-white/60">
                Long-form draft — target pages up to{" "}
                <code className="rounded bg-indigo-950/50 px-1.5 py-0.5 text-sm text-indigo-200/90">
                  CYRUS_DOCGEN_MAX_PAGES
                </code>{" "}
                (cap {maxDocgenTargetPages()}).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                <div>
                  <label className="text-xs font-mono text-white/70">Type</label>
                  <select
                    value={genType}
                    onChange={(e) => setGenType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base"
                  >
                    {GEN_TYPES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-white/70">Audience</label>
                  <input
                    value={genAudience}
                    onChange={(e) => setGenAudience(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base"
                    placeholder="e.g. board, client"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-mono text-white/70">Purpose (optional)</label>
                <input
                  value={genPurpose}
                  onChange={(e) => setGenPurpose(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2.5 text-base"
                />
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-sm text-white/60">
                  <span>Target pages</span>
                  <span>{targetPages} pg</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={maxDocgenTargetPages()}
                  step={10}
                  value={targetPages}
                  onChange={(e) =>
                    setTargetPages(Math.max(1, Math.min(maxDocgenTargetPages(), Number(e.target.value || 1))))
                  }
                  className="mb-2 w-full rounded-lg border border-white/12 bg-slate-900/85 px-3 py-2 text-base text-white"
                />
                <input
                  type="range"
                  min={1}
                  max={maxDocgenTargetPages()}
                  step={10}
                  value={targetPages}
                  onChange={(e) => setTargetPages(+e.target.value)}
                  className="h-2 w-full"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Include reference images (DALL-E / local)
                </label>
                {includeImages ? (
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value as typeof imageStyle)}
                    className="rounded-lg border border-white/12 bg-slate-900/85 px-2 py-1.5 text-sm"
                  >
                    <option value="schematic">Schematic / anatomy</option>
                    <option value="graphical">Graphical infographic</option>
                    <option value="realistic_3d">Realistic 3D</option>
                  </select>
                ) : null}
              </div>
              <textarea
                value={genBody}
                onChange={(e) => setGenBody(e.target.value)}
                rows={3}
                placeholder="Outline or source text…"
                className="mt-2 w-full rounded-lg border border-white/12 bg-slate-900/70 px-3 py-2.5 text-base leading-relaxed text-white/95 placeholder:text-white/40"
              />
              <Button
                className="mt-3 h-11 w-full bg-gradient-to-r from-slate-300/22 to-sky-300/33 text-base text-white"
                type="button"
                disabled={!genBody.trim() || genMut.isPending}
                onClick={() => genMut.mutate()}
              >
                {genMut.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Scroll className="mr-2 h-5 w-5" />
                    Generate
                  </>
                )}
              </Button>
            </section>
          </div>

          {/* RIGHT CONSOLE: Generated Documents and Analysis Results */}
          <aside
            className="flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-950/40 via-slate-900/76 to-slate-950/88 shadow-[0_20px_42px_rgba(0,0,0,0.36)] backdrop-blur-sm"
            aria-label="Generated documents and intelligence output"
          >
            <div className="shrink-0 border-b border-emerald-400/20 bg-gradient-to-r from-emerald-950/50 to-slate-950/50 px-4 py-3 sm:px-5">
              <h2
                className="flex items-center gap-2 text-base font-semibold tracking-wide text-emerald-100 sm:text-lg"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                <Sparkles className="h-5 w-5 text-emerald-300" />
                Generated Documents Console
              </h2>
              <p className="text-sm leading-snug text-emerald-200/70">Intelligent output • AI-powered documents • Professional compliance</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {/* Intelligent Document Output */}
              {intelligentDoc && (
                <section className="rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/50 to-slate-950/70 p-3.5 sm:p-4">
                  <h3
                    className="mb-2 flex items-center gap-2.5 text-base font-bold text-emerald-100"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    Intelligent Document Generated
                  </h3>
                  <p className="mb-2 text-sm text-emerald-200/90">{intelligentDoc.title}</p>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs text-emerald-300/70">
                    <span>Category: {intelligentDoc.category}</span>
                    <span>•</span>
                    <span>Words: {intelligentDoc.metadata?.wordCount || 0}</span>
                    <span>•</span>
                    <span>Pages: {intelligentDoc.metadata?.pageCount || 0}</span>
                    <span>•</span>
                    <span>Quality: {((intelligentDoc.metadata?.qualityScore || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto rounded-lg border border-emerald-400/20 bg-black/30 p-2.5 sm:p-3">
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-emerald-100/90">
                      {intelligentDoc.content.slice(0, 50000)}
                    </pre>
                  </div>
                  {intelligentDoc.metadata?.complianceChecks && intelligentDoc.metadata.complianceChecks.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-300/70">
                      Compliance: {intelligentDoc.metadata.complianceChecks.join(" • ")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={intelligentExportFormat}
                        onChange={(e) =>
                          setIntelligentExportFormat(e.target.value as (typeof EXPORT_FORMATS)[number]["value"])
                        }
                        className="h-9 appearance-none rounded-md border border-emerald-400/30 bg-slate-900 pl-3 pr-8 text-sm text-emerald-100"
                      >
                        {EXPORT_FORMATS.map((fmt) => (
                          <option key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/80" />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-sm"
                      disabled={isIntelligentExporting}
                      onClick={async () => {
                        try {
                          setIsIntelligentExporting(true);
                          const file = await exportIntelligentDocument(intelligentExportFormat, intelligentDoc);
                          downloadBlob(file.filename, file.blob);
                          toast({
                            title: "Download ready",
                            description: `Exported as ${intelligentExportFormat.toUpperCase()}`,
                          });
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : "Export failed";
                          toast({ title: "Export failed", description: msg, variant: "destructive" });
                        } finally {
                          setIsIntelligentExporting(false);
                        }
                      }}
                    >
                      {isIntelligentExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Download ${intelligentExportFormat.toUpperCase()}`
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-emerald-400/30 text-sm text-emerald-200"
                      onClick={() =>
                        downloadText(`${intelligentDoc.title || "intelligent-doc"}.md`, intelligentDoc.content)
                      }
                    >
                      Quick .md
                    </Button>
                  </div>
                </section>
              )}

              {syncReport && (
                <section className="rounded-xl border border-sky-300/28 bg-slate-950/55 p-3.5 sm:p-4">
                  <h3
                    className="mb-2 flex items-center gap-2.5 text-base font-medium text-sky-200"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    <Scale className="h-5 w-5" />
                    Synchronous report
                  </h3>
                  <p className="text-sm text-white/75">{syncReport.sourceDescription}</p>
                  <div className="mt-2 text-base leading-relaxed text-white/90">{syncReport.extractedSummary}</div>
                  <ul className="mt-3 list-inside list-disc text-sm text-sky-100/85">
                    {(syncReport.keyFindings || []).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  {syncReport.issues?.length > 0 && (
                    <div className="mt-2 text-sm text-[#e11d48]/80">Issues: {syncReport.issues.join("; ")}</div>
                  )}
                  <p className="mt-2 text-sm text-white/80">Confidence: {syncReport.confidence}</p>
                </section>
              )}

              {job && job.status === "failed" && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3.5 text-sm text-red-200">
                  {job.error}
                </div>
              )}

              {job && !["completed", "failed"].includes(job.status) && (
                <div className="rounded-xl border border-sky-300/24 bg-slate-950/50 p-3.5 text-sm text-sky-100/85">
                  <div className="mb-1 font-mono text-sm">Job {job.id}</div>
                  {job.stageLabel} — {job.progress}%
                </div>
              )}

              {job?.result?.analysis && job.status === "completed" && (
                <section className="rounded-xl p-3.5 sm:p-4" style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)" }}>
                  <h3
                    className="mb-2 flex items-center gap-2.5 text-base font-bold text-white"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    <Sparkles className="h-5 w-5" />
                    Background job complete
                  </h3>
                  <p className="text-sm text-white/78">
                    {job.result.analysis.documentType} · chunks {job.result.analysis.chunksAnalyzed ?? 1} ·{" "}
                    {job.result.extraction?.metadata?.pageCount != null
                      ? `${job.result.extraction.metadata.pageCount} pages`
                      : "pages n/a"}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-white/92">{job.result.analysis.executiveBrief}</p>
                  <ul className="mt-3 list-inside list-disc text-sm text-white/85">
                    {(job.result.analysis.keyFindings || []).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                  {job.result.analysis.knowledgeApplied && job.result.analysis.knowledgeApplied.length > 0 && (
                    <p className="mt-2 text-sm text-sky-200/85">
                      Knowledge signals: {job.result.analysis.knowledgeApplied.join(" · ")}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 text-base"
                    onClick={() =>
                      downloadText(
                        "cyrus-long-analysis.md",
                        `# Analysis\n\n${job.result?.analysis?.executiveBrief ?? ""}\n\n## Findings\n\n${(job.result?.analysis?.keyFindings || []).map((f) => `- ${f}`).join("\n")}\n\n## Interpretation\n\n${job.result?.analysis?.interpretation ?? ""}`,
                      )
                    }
                  >
                    Export summary (.md)
                  </Button>
                </section>
              )}

              {genMut.data && (
                <section className="flex min-h-0 flex-col gap-2 rounded-xl border border-sky-300/25 bg-slate-950/55 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      className="text-base font-medium text-indigo-100"
                      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                    >
                      Generated document
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value as (typeof EXPORT_FORMATS)[number]["value"])}
                          className="h-10 appearance-none rounded-md border border-indigo-400/30 bg-slate-900 pl-3 pr-8 text-sm text-indigo-100"
                        >
                          {EXPORT_FORMATS.map((fmt) => (
                            <option key={fmt.value} value={fmt.value}>
                              {fmt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200/80" />
                      </div>
                      <Button
                        type="button"
                        size="default"
                        variant="outline"
                        disabled={isExporting}
                        className="border-cyan-500/40 text-base text-cyan-200 hover:bg-cyan-500/10"
                        onClick={async () => {
                          try {
                            setIsExporting(true);
                            const file = await exportDocument(exportFormat, genMut.data);
                            downloadBlob(file.filename, file.blob);
                            toast({ title: "Download ready", description: `Exported as ${exportFormat.toUpperCase()}` });
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : "Export failed";
                            toast({ title: "Export failed", description: msg, variant: "destructive" });
                          } finally {
                            setIsExporting(false);
                          }
                        }}
                      >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Download ${exportFormat.toUpperCase()}`}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-white/70">{genMut.data.title}</p>
                  <div className="min-h-0 max-h-[min(28dvh,260px)] flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2.5 sm:p-3">
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                      {genMut.data.rendered.length > 200_000
                        ? `${genMut.data.rendered.slice(0, 200_000)}\n\n… (truncated for display; download the file for the full text.)`
                        : genMut.data.rendered}
                    </pre>
                  </div>
                </section>
              )}

              {genMut.isPending && (
                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-950/25 p-3.5 text-sm text-indigo-100/90">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  Generating document…
                </div>
              )}

              {!syncReport &&
                !genMut.data &&
                !isSubmitting &&
                !genMut.isPending &&
                job?.status !== "failed" &&
                (!job || ["completed", "failed"].includes(job.status)) &&
                !job?.result?.analysis && (
                  <div className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400/20 bg-emerald-950/20 px-3 py-6 text-center text-sm leading-relaxed text-emerald-100/70">
                    <Sparkles className="h-10 w-10 text-emerald-400/50" />
                    <p className="font-semibold text-emerald-200">AI-Powered Document Intelligence</p>
                    <p className="max-w-md text-emerald-300/60">
                      Upload a document or generate content in the <span className="text-emerald-200/90">left console</span>. 
                      Intelligent analysis and professional documents will appear here with ML-enhanced processing.
                    </p>
                  </div>
                )}
            </div>
          </aside>
        </div>
        </div>
    </ModuleWorkspacePageShell>
  );
}
