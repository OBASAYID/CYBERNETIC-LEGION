import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { readHandoff, saveHandoff } from "@shared/module-handoff";
import { useScan, useScanAnalyze } from "../hooks/useScan";
import { useCameraCapture } from "../hooks/useCameraCapture";
import { CyrusHumanoid } from "../components/CyrusHumanoid";
import {
  Camera,
  QrCode,
  ArrowRight,
  FileText,
  Eye,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Scan,
  Sparkles,
  Brain,
  Globe,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

export function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState("en");
  const [copied, setCopied] = useState(false);

  const {
    lastResult,
    lastTranslation,
    scanQR,
    scanOCR,
    scanVision,
    translate,
    isScanning,
    clearResults,
  } = useScan();
  const [location, setLocation] = useLocation();
  const [pipelineText, setPipelineText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("handoff") !== "1") return;
    const h = readHandoff(true);
    if (h?.text) setPipelineText(h.text);
  }, [location]);

  const analyzeFull = useScanAnalyze();
  const {
    videoRef,
    state: camState,
    errorMessage: camError,
    start: startCamera,
    stop: stopCamera,
    captureDataUrl,
  } = useCameraCapture({ maxEdge: 1280, quality: 0.82 });

  const [analyzeMode, setAnalyzeMode] = useState<"business" | "casual" | "legal" | "technical" | "military">("business");
  const [fullReport, setFullReport] = useState<Record<string, unknown> | null>(null);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = (type: "qr" | "ocr" | "vision") => {
    if (!imagePreview) return;
    const base64Data = imagePreview.split(",")[1];
    if (type === "qr") scanQR.mutate(base64Data);
    else if (type === "ocr") scanOCR.mutate(base64Data);
    else scanVision.mutate(base64Data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "hi", name: "Hindi" },
    { code: "sw", name: "Swahili" },
    { code: "zu", name: "Zulu" },
    { code: "tn", name: "Setswana" },
  ];

  const visionContext = [
    "Workspace: Vision & optical — scenes, objects, codes, and labels.",
    lastResult ? `Last scan (${lastResult.type}): ${lastResult.text?.slice(0, 1200) || "—"}` : null,
    fullReport && typeof fullReport.originalText === "string"
      ? `Full CYRUS pipeline — source text (excerpt): ${String(fullReport.originalText).slice(0, 800)}`
      : null,
    fullReport && typeof fullReport.translation === "string" && fullReport.translation
      ? `Full CYRUS pipeline — translation to workspace target (${targetLang}): ${String(fullReport.translation).slice(0, 800)}`
      : null,
    fullReport && typeof fullReport.interpretation === "string" && fullReport.interpretation
      ? `CYRUS interpretation: ${String(fullReport.interpretation).slice(0, 1200)}`
      : null,
    imagePreview ? "Image ready in workspace (camera or upload)." : "No capture yet.",
  ]
    .filter(Boolean)
    .join("\n");

  const runFullAnalysis = (file: File) => {
    setFullReport(null);
    analyzeFull.mutate(
      { file, targetLanguage: targetLang, mode: analyzeMode },
      {
        onSuccess: (data) => setFullReport(data as Record<string, unknown>),
      },
    );
  };

  const captureFromCamera = () => {
    const dataUrl = captureDataUrl();
    if (!dataUrl) return;
    setImagePreview(dataUrl);
    setFullReport(null);
  };

  const dataUrlToFile = (dataUrl: string, name: string) => {
    const b = dataUrl.split(",")[1];
    if (!b) return null;
    const byteChars = atob(b);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return new File([bytes], name, { type: "image/jpeg" });
  };

  const scanSequence: ("qr" | "ocr" | "vision")[] = ["vision", "ocr", "qr"];

  return (
    <ModuleWorkspacePageShell
      kicker="Optical analysis"
      title="Vision & Optical"
      subtitle="Scenes, objects, and codes: capture with the camera, then Vision, OCR, or QR. Full CYRUS analysis can decode and report in your chosen output language."
      icon={Eye}
      headerEnd={
        <>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 md:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">AI Ready</span>
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
      <div className="mx-auto max-w-7xl">
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4 sm:p-5">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Globe className="h-4 w-4 text-emerald-400" aria-hidden />
              Research pipeline — text &amp; languages
            </h3>
            <p className="mb-3 text-xs text-white/60">
              Content from the Command console or Document intelligence appears here. Choose an output language, then translate. Students and collaborators can work in their own language, then hand off to a report or group chat.
            </p>
            <textarea
              value={pipelineText}
              onChange={(e) => setPipelineText(e.target.value)}
              rows={4}
              placeholder="Paste handoff text, or use text from a prior module…"
              className="mb-3 w-full rounded-lg border border-white/12 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <label className="shrink-0 text-xs text-white/60">Translate to</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="flex-1 rounded-lg border border-white/12 bg-slate-900/80 px-2 py-1.5 text-sm text-white"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!pipelineText.trim() || translate.isPending}
                onClick={() => translate.mutate({ text: pipelineText.trim(), targetLanguage: targetLang })}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:from-emerald-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {translate.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Translate handoff
              </button>
            </div>
            {lastTranslation && (
              <p className="mt-2 text-xs text-emerald-300/90">Translation ready — copy or send forward below.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const t =
                    pipelineText ||
                    (lastResult?.text ?? "") ||
                    (lastTranslation ? lastTranslation.translatedText : "") ||
                    (fullReport && typeof fullReport.translation === "string" ? String(fullReport.translation) : "");
                  if (!t.trim()) return;
                  saveHandoff({
                    text: t,
                    sourceModule: "vision",
                    title: "Vision → report",
                    note: "Build or edit long-form in Document intelligence",
                  });
                  setLocation("/files?handoff=1");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100"
              >
                <FileText className="h-3.5 w-3.5" />
                Open in Document intelligence
                <ArrowRight className="h-3 w-3 opacity-50" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const t =
                    pipelineText ||
                    lastResult?.text ||
                    (lastTranslation ? lastTranslation.translatedText : "");
                  if (!t.trim()) return;
                  saveHandoff({
                    text: t,
                    sourceModule: "vision",
                    title: "Vision → Pshare",
                    note: "Share with your study or project group on Pshare",
                  });
                  setLocation("/comms?tab=pshare&handoff=1");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Pshare
                <ArrowRight className="h-3 w-3 opacity-50" />
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="order-1 bg-gray-900/60 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs text-gray-400">Scene / Vision</span>
              </div>
              <p className="text-lg font-bold text-cyan-400">Primary</p>
            </div>
            <div className="order-2 bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">QR & codes</span>
              </div>
              <p className="text-lg font-bold text-purple-400">Active</p>
            </div>
            <div className="order-3 bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">OCR (labels)</span>
              </div>
              <p className="text-lg font-bold text-blue-400">Ready</p>
            </div>
            <div className="order-4 bg-gray-900/60 backdrop-blur-sm border border-violet-500/25 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-xs text-gray-400">Full report</span>
              </div>
              <p className="text-lg font-bold text-violet-300">Pipeline</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid md:grid-cols-1 gap-6">
                <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <span>Device camera</span>
                  </h2>
                  <p className="text-xs text-gray-500 mb-3">
                    Frame a scene, object, label, or code. Use Vision for what you see, QR for barcodes, OCR for text on surfaces. Full CYRUS analysis can produce a structured report in your selected output language.
                  </p>
                  <div className="relative mb-4 overflow-hidden rounded-xl border border-cyan-500/20 bg-black/40">
                    <video
                      ref={videoRef}
                      className="h-48 w-full object-cover"
                      playsInline
                      muted
                    />
                    {camState !== "preview" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-4 text-center text-xs text-gray-500">
                        {camState === "idle" && "Camera off"}
                        {camState === "denied" && "Allow camera in the browser to scan live text."}
                        {camState === "error" && (camError || "Camera unavailable.")}
                      </div>
                    )}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {camState !== "preview" ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
                      >
                        Start camera
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={captureFromCamera}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        >
                          Capture to workspace
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                        >
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                  {camError && <p className="mb-2 text-xs text-amber-400/90">{camError}</p>}

                  <h2 className="text-lg font-semibold mb-4 mt-6 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span>Or upload an image</span>
                  </h2>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-gray-800/50 rounded-xl border border-gray-700/50"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <span className="text-white text-sm">×</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-700/50 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                    >
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                        <Camera className="w-6 h-6 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <span className="text-gray-400 group-hover:text-gray-300">Click to upload image</span>
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {scanSequence.map((t, i) => {
                      const isPrimary = i === 0;
                      const base =
                        "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all";
                      const ring = isPrimary ? " ring-2 ring-amber-400/40 ring-offset-2 ring-offset-[#1a1a1a]" : "";
                      const style =
                        t === "vision"
                          ? "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-lg shadow-cyan-500/20"
                          : t === "ocr"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-lg shadow-purple-500/20";
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleScan(t)}
                          disabled={!imagePreview || isScanning}
                          title={
                            t === "vision"
                              ? "Scene / object description"
                              : t === "ocr"
                                ? "Extract text"
                                : "Decode QR / barcode"
                          }
                          className={`${base} ${style}${ring}`}
                        >
                          {t === "vision" && <Eye className="w-4 h-4" />}
                          {t === "ocr" && <FileText className="w-4 h-4" />}
                          {t === "qr" && <QrCode className="w-4 h-4" />}
                          <span className="text-sm font-medium">
                            {t === "vision" ? "Vision" : t === "ocr" ? "OCR" : "QR"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isScanning && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-cyan-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing image...</span>
                    </div>
                  )}

                  <div className="mt-6 rounded-xl border border-violet-500/25 bg-violet-950/20 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-200">
                      <Brain className="h-4 w-4 text-violet-400" />
                      Full CYRUS analysis
                    </h3>
                    <p className="mb-3 text-xs text-gray-500">
                      Decode QR (if any) → OCR → language detection → output in the language you choose below → brief interpretation. Use after capture when you want one consolidated report.
                    </p>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs text-gray-400 sm:shrink-0">Output language</label>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full flex-1 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 sm:max-w-xs"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs text-gray-400 sm:shrink-0">Tone / mode</label>
                      <select
                        value={analyzeMode}
                        onChange={(e) => setAnalyzeMode(e.target.value as typeof analyzeMode)}
                        className="w-full flex-1 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 sm:max-w-xs"
                      >
                        <option value="business">Business</option>
                        <option value="casual">Casual</option>
                        <option value="legal">Legal</option>
                        <option value="technical">Technical</option>
                        <option value="military">Military</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!imagePreview) return;
                        const file = dataUrlToFile(imagePreview, "scan-capture.jpg");
                        if (file) runFullAnalysis(file);
                      }}
                      disabled={!imagePreview || analyzeFull.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzeFull.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Running full analysis…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Run full CYRUS analysis
                        </>
                      )}
                    </button>
                    {analyzeFull.isError && (
                      <p className="mt-2 text-xs text-amber-400/90">
                        {analyzeFull.error instanceof Error ? analyzeFull.error.message : "Full analysis failed."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {lastResult && (
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Scan className="w-5 h-5 text-cyan-400" />
                        {lastResult.type.toUpperCase()} Result
                      </h3>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          lastResult.success 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {lastResult.success ? "Success" : "Failed"}
                      </span>
                    </div>

                    {lastResult.text && (
                      <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700/50">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm whitespace-pre-wrap text-gray-200">{lastResult.text}</p>
                          <button
                            onClick={() => copyToClipboard(lastResult.text!)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      {lastResult.detectedLanguage && (
                        <p className="text-gray-400">
                          <span className="text-gray-500">Language:</span> {lastResult.detectedLanguage}
                        </p>
                      )}
                      {lastResult.confidence && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Confidence:</span>
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                              style={{ width: `${lastResult.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-cyan-400">{(lastResult.confidence * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    {lastResult.riskNotes && lastResult.riskNotes.length > 0 && (
                      <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium text-sm">Risk Notes</span>
                        </div>
                        <ul className="text-sm text-amber-200/80 space-y-1">
                          {lastResult.riskNotes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-400">•</span>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {fullReport && (
                  <div className="bg-gray-900/60 backdrop-blur-sm border border-violet-500/30 rounded-xl p-5 md:col-span-2">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-violet-400" />
                      Full CYRUS report
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {String(fullReport.sourceDescription || "")}
                    </p>
                    {typeof fullReport.originalText === "string" && fullReport.originalText && (
                      <div className="mb-3 rounded-lg border border-gray-700/50 bg-gray-800/40 p-3">
                        <p className="text-xs text-gray-500 mb-1">Source / extracted</p>
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{fullReport.originalText}</p>
                      </div>
                    )}
                    {typeof fullReport.translation === "string" && fullReport.translation && (
                      <div className="mb-3 rounded-lg border border-violet-500/25 bg-violet-950/20 p-3">
                        <p className="text-xs text-violet-400 mb-1">Translation ({targetLang})</p>
                        <p className="text-sm text-violet-100 whitespace-pre-wrap">{fullReport.translation}</p>
                      </div>
                    )}
                    {typeof fullReport.interpretation === "string" && fullReport.interpretation && (
                      <div className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-950/15 p-3">
                        <p className="text-xs text-cyan-400 mb-1">Interpretation</p>
                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{fullReport.interpretation}</p>
                      </div>
                    )}
                    {Array.isArray(fullReport.warnings) && fullReport.warnings.length > 0 && (
                      <ul className="text-xs text-amber-200/80 space-y-1">
                        {fullReport.warnings.map((w: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span>CYRUS — vision & safety</span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Ask what is in the frame, whether a QR link looks safe, and how to read labels. Full analysis below can also produce a report in your chosen output language.
                </p>
                <CyrusHumanoid module="vision" context={visionContext} />
              </div>

              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
                <h3 className="font-semibold mb-4 text-sm text-gray-400">This workspace</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-cyan-500/15">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Scene & Vision</p>
                      <p className="text-xs text-gray-500">What the image shows</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">QR / barcode</p>
                      <p className="text-xs text-gray-500">Instant decode</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">OCR (labels & signs)</p>
                      <p className="text-xs text-gray-500">Text on surfaces</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-violet-500/15">
                    <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                      <Brain className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Full CYRUS report</p>
                      <p className="text-xs text-gray-500">Includes optional translated output</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </ModuleWorkspacePageShell>
  );
}
