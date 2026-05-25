import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useFileAnalysis } from "../hooks/useFileAnalysis";
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
import { CyrusHumanoid } from "../components/CyrusHumanoid";
import {
  FileUp,
  FileText,
  Search,
  FileCheck,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  Sparkles,
  Shield,
  Brain,
  Zap,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

export function FileAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [location] = useLocation();
  const handoffConsumedRef = useRef(false);
  const [docType, setDocType] = useState("report");
  const [docContent, setDocContent] = useState("");
  const [docAudience, setDocAudience] = useState("official");
  const [handoffAttach, setHandoffAttach] = useState<ModuleHandoffAttachment[] | undefined>();
  const [handoffLargeRefs, setHandoffLargeRefs] = useState<ModuleHandoffLargeRef[]>([]);

  const {
    currentFile,
    primeHandoffFile,
    lastReport,
    fullPipeline,
    generateDocument,
    isProcessing,
    isGenerating,
    clearResults,
  } = useFileAnalysis();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fullPipeline.mutate(file);
  };

  const handleGenerateDoc = () => {
    if (!docContent.trim()) return;
    generateDocument.mutate({
      docType,
      content: docContent,
      audience: docAudience,
    });
  };

  const commandHandoffText = () => {
    if (generateDocument.data?.rendered?.trim()) return generateDocument.data.rendered.trim();
    if (docContent.trim()) return docContent.trim();
    if (lastReport) {
      const parts = [
        lastReport.analysis.summary,
        ...(lastReport.analysis.keyFindings || []),
        ...(lastReport.analysis.recommendations || []),
      ].filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }
    return undefined;
  };

  useEffect(() => {
    let cancelled = false;
    if (!currentFile) {
      setHandoffAttach(undefined);
      setHandoffLargeRefs([]);
      return;
    }
    const INLINE_MAX = 900_000;
    if (currentFile.size <= INLINE_MAX) {
      setHandoffLargeRefs([]);
      void encodeFileAsHandoffAttachment(currentFile).then((a) => {
        if (!cancelled) setHandoffAttach(a ? [a] : undefined);
      });
      return () => {
        cancelled = true;
      };
    }
    setHandoffAttach(undefined);
    void registerLargeHandoffFile(currentFile).then((ref) => {
      if (cancelled) return;
      setHandoffLargeRefs(ref ? [ref] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [currentFile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("handoff") !== "1") {
      handoffConsumedRef.current = false;
      return;
    }
    if (handoffConsumedRef.current) return;
    handoffConsumedRef.current = true;
    const h = readHandoff(true);
    if (!h) return;

    void (async () => {
      try {
        if (h.text.trim()) setDocContent(h.text);
        const files = await resolveHandoffPayloadToFiles(h);
        if (files[0]) primeHandoffFile(files[0]);
      } finally {
        await revokeHandoffPayloadBlobs(h);
      }
    })();
  }, [location, primeHandoffFile]);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case "high":
        return "text-red-400 bg-red-500/20 border-red-500/30";
      case "medium":
        return "text-amber-400 bg-amber-500/20 border-amber-500/30";
      default:
        return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    }
  };

  return (
    <ModuleWorkspacePageShell
      title="Document Intelligence"
      subtitle="Analysis and generation engine"
      icon={FileText}
      commandHandoffText={commandHandoffText}
      commandHandoffSource="documents-intelligence"
      commandHandoffAttachments={() => handoffAttach}
      commandHandoffLargeRefs={() => (handoffLargeRefs.length ? handoffLargeRefs : undefined)}
      headerEnd={
        <>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 md:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Processing Ready</span>
          </div>
          <button
            type="button"
            onClick={clearResults}
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-800/50 hover:text-white"
            aria-label="Clear results"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-cyrus-wide">
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Detection</span>
              </div>
              <p className="text-lg font-bold text-purple-400">Active</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Analysis</span>
              </div>
              <p className="text-lg font-bold text-blue-400">Ready</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs text-gray-400">Risk Scan</span>
              </div>
              <p className="text-lg font-bold text-amber-400">Enabled</p>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">Generator</span>
              </div>
              <p className="text-lg font-bold text-green-400">Online</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <FileUp className="w-4 h-4 text-white" />
                  </div>
                  <span>Upload & Analyze</span>
                </h2>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full h-36 border-2 border-dashed border-gray-700/50 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
                      <span className="text-gray-400">Processing document...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                        <FileUp className="w-6 h-6 text-gray-500 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <span className="text-gray-400 group-hover:text-gray-300">
                        Click to upload file for analysis
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF, DOCX, TXT, Images
                      </span>
                    </>
                  )}
                </button>

                {currentFile && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-xl flex items-center gap-3 border border-gray-700/50">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentFile.name}</p>
                      <p className="text-xs text-gray-400">
                        {(currentFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
              </div>

              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span>Generate Document</span>
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Document Type</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full bg-gray-800/50 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-700/50"
                      >
                        <option value="report">Report</option>
                        <option value="brief">Brief</option>
                        <option value="memo">Memo</option>
                        <option value="summary">Summary</option>
                        <option value="legal">Legal Document</option>
                        <option value="technical">Technical Doc</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Target Audience</label>
                      <select
                        value={docAudience}
                        onChange={(e) => setDocAudience(e.target.value)}
                        className="w-full bg-gray-800/50 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-700/50"
                      >
                        <option value="official">Official</option>
                        <option value="executive">Executive</option>
                        <option value="technical">Technical</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Enter content or notes for document generation..."
                    className="w-full h-28 bg-gray-800/50 text-white p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 border border-gray-700/50 placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = readCommandSearchShare()?.trim();
                      if (!t) return;
                      setDocContent((prev) => (prev.trim() ? `${prev.trim()}\n\n---\n\n${t}` : t));
                    }}
                    className="w-full rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Load last CYRUS command search into this field
                  </button>

                  <button
                    onClick={handleGenerateDoc}
                    disabled={!docContent.trim() || isGenerating}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Generate Document
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {lastReport && (
                <>
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5 text-purple-400" />
                      Detection Results
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1">File Type</p>
                        <p className="font-medium text-purple-400">
                          {lastReport.detection.detectedMime || "Unknown"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1">File Size</p>
                        <p className="font-medium text-blue-400">
                          {(lastReport.detection.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-400" />
                      Analysis Report
                    </h3>

                    <div className="space-y-4">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {lastReport.analysis.summary}
                      </p>

                      {lastReport.analysis.riskLevel && (
                        <div
                          className={`p-4 rounded-xl border ${getRiskColor(lastReport.analysis.riskLevel)}`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">
                              Risk Level: {lastReport.analysis.riskLevel.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}

                      {lastReport.analysis.keyFindings?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Key Findings</p>
                          <div className="space-y-2">
                            {lastReport.analysis.keyFindings.map((finding: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg"
                              >
                                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-300">{finding}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {lastReport.analysis.recommendations && lastReport.analysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Recommendations</p>
                          <div className="space-y-2">
                            {lastReport.analysis.recommendations.map((rec: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-emerald-200">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {generateDocument.data && (
                <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-green-400" />
                      Generated Document
                    </h3>
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 max-h-64 overflow-auto border border-gray-700/50">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-gray-300">
                      {generateDocument.data.rendered}
                    </pre>
                  </div>
                </div>
              )}

              {!lastReport && !generateDocument.data && (
                <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    CYRUS Document AI
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Ask CYRUS to help analyze documents, summarize content, or generate reports.
                  </p>
                  <CyrusHumanoid 
                    module="documents" 
                    context={`User is analyzing documents. ${currentFile ? `Current file: ${currentFile.name}` : "No file uploaded"}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
    </ModuleWorkspacePageShell>
  );
}
