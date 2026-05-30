import { useState, useRef, useEffect, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Cpu, Loader2, Maximize2, Mic, Minimize2, RotateCcw, Send, Terminal } from "lucide-react";
import { getCommandCenterNavByPath } from "@/config/command-center-nav";
import {
  clearCommandSearchShare,
  formatCommandHandoffTranscript,
  mergeWorkspaceAndCommandHandoff,
  saveHandoff,
  writeCommandSearchShare,
  type ModuleHandoffAttachment,
  type ModuleHandoffLargeRef,
} from "@shared/module-handoff";
import { getSpeechRecognitionConstructor, speakCyrusTts } from "@shared/command-console-voice";
import { TSODILO_SYMBOLS_STELE_URL } from "@/lib/dashboard-backdrop";
import { systemFetch } from "@/lib/system-api";
import { cn } from "@/lib/utils";

const COMMAND_SYSTEM =
  "You are CYRUS, the main AI operating this Command Center. The user is in a module workspace below the main dashboard. " +
  "Be helpful, direct, and technically precise. You may answer questions, run thought experiments, and guide operators. " +
  "Keep answers concise when the user asks for quick help; expand when they ask for depth.";

type Exchange = { role: "user" | "cyrus"; content: string };

export type ModuleCommandConsoleProps = {
  /** Page title / subtitle or other hint so CYRUS knows which surface is open. */
  pageContext?: string;
  className?: string;
  /** `module` = show minimize control (module workspace pages). Dashboard leaves this default. */
  scope?: "dashboard" | "module";
  /** Parent can reduce bottom padding when the console is collapsed (module shell). */
  onLayoutChange?: (minimized: boolean) => void;
  /**
   * When the console chat is empty, Pipeline handoff can still use text from the workspace above
   * (e.g. Documents analysis / generated body). Non-empty return value takes precedence over chat.
   */
  workspaceHandoffText?: () => string | undefined;
  /** `sourceModule` on the saved handoff when text comes from `workspaceHandoffText`. */
  workspaceHandoffSource?: string;
  /** Optional small files to send with pipeline handoff (e.g. staged upload). */
  workspaceHandoffAttachments?: () => ModuleHandoffAttachment[] | undefined;
  /** Large files stored in IndexedDB; session handoff holds refs only. */
  workspaceHandoffLargeRefs?: () => ModuleHandoffLargeRef[] | undefined;
};

/**
 * Pinned to the bottom of the viewport; narrower than the workspace so the command bar stays compact and centered.
 */
export function ModuleCommandConsoleDock({
  children,
  className,
  showBackdropGlow = true,
}: {
  children: ReactNode;
  className?: string;
  showBackdropGlow?: boolean;
}) {
  return (
    <div
      className={cn("pointer-events-none fixed bottom-0 left-0 right-0 z-30", className)}
      role="presentation"
    >
      {showBackdropGlow ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[min(26rem,58vh)] overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-x-0 bottom-0 h-full opacity-[0.14] mix-blend-soft-light"
            style={{
              backgroundImage: "url(/tsodilo-markings-canvas.png)",
              backgroundPosition: "center bottom",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute bottom-[-1.5rem] left-[18%] h-52 w-[min(28rem,72vw)] rounded-full blur-3xl" style={{ background: "rgba(225,29,72,0.05)" }} />
          <div className="absolute bottom-[-0.5rem] right-[12%] h-48 w-[min(32rem,78vw)] rounded-full blur-3xl" style={{ background: "rgba(6,182,212,0.04)" }} />
          <div className="absolute bottom-0 left-1/2 h-40 w-[min(48rem,96vw)] -translate-x-1/2 rounded-full blur-3xl" style={{ background: "linear-gradient(90deg, rgba(225,29,72,0.04), rgba(6,182,212,0.04), rgba(124,58,237,0.03))" }} />
        </div>
      ) : null}
      <div className="pointer-events-auto relative z-20 mx-auto w-full max-w-cyrus-console cyrus-safe-x px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-6 sm:pb-1.5 sm:pt-1.5 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export function ModuleCommandConsole({
  pageContext,
  className,
  scope = "dashboard",
  onLayoutChange,
  workspaceHandoffText,
  workspaceHandoffSource,
  workspaceHandoffAttachments,
  workspaceHandoffLargeRefs,
}: ModuleCommandConsoleProps) {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [log, setLog] = useState<Exchange[]>([]);
  const [handoffHint, setHandoffHint] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const inModule = scope === "module";
  const logEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingStopRef = useRef(false);
  const transcriptRef = useRef("");
  const speakNextRef = useRef(false);

  const send = useMutation({
    mutationFn: async (message: string) => {
      const systemContext = `${COMMAND_SYSTEM}\n\nModule workspace: ${pageContext || "Command Center module."}`;
      const res = await systemFetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, systemContext, module: "systems" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Request failed");
      }
      return res.json() as { response?: string };
    },
    onSuccess: async (data) => {
      const text = data.response || "—";
      setLog((prev) => [...prev, { role: "cyrus", content: text }]);
      if (speakNextRef.current) {
        speakNextRef.current = false;
        void speakCyrusTts(text);
      }
    },
    onError: (e: Error) => {
      speakNextRef.current = false;
      setLog((prev) => [...prev, { role: "cyrus", content: e.message || "Error." }]);
    },
  });

  const submit = () => {
    const m = input.trim();
    if (!m || send.isPending) return;
    if (isListening) {
      pendingStopRef.current = false;
      recognitionRef.current?.stop();
    }
    speakNextRef.current = false;
    setLog((prev) => [...prev, { role: "user", content: m }]);
    setInput("");
    send.mutate(m);
  };

  const toggleCyrusVoice = () => {
    if (send.isPending) return;
    setVoiceError(null);
    if (isListening) {
      pendingStopRef.current = true;
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setVoiceError("Voice input needs a supported browser (e.g. Chrome or Edge).");
      return;
    }
    pendingStopRef.current = false;
    transcriptRef.current = "";
    setInput("");
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let t = "";
      for (let i = 0; i < event.results.length; i++) {
        t += event.results[i]![0]!.transcript;
      }
      transcriptRef.current = t;
      setInput(t);
    };
    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted") return;
      setIsListening(false);
      if (event.error === "not-allowed") setVoiceError("Microphone permission denied.");
      else if (event.error !== "no-speech") setVoiceError("Voice input error.");
    };
    rec.onend = () => {
      setIsListening(false);
      if (!pendingStopRef.current) return;
      pendingStopRef.current = false;
      const t = transcriptRef.current.trim();
      if (!t) return;
      speakNextRef.current = true;
      setLog((prev) => [...prev, { role: "user", content: t }]);
      setInput("");
      send.mutate(t);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setVoiceError("Could not start microphone.");
    }
  };

  useEffect(() => {
    return () => {
      pendingStopRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, send.isPending]);

  useEffect(() => {
    writeCommandSearchShare(formatCommandHandoffTranscript(log));
  }, [log]);

  const goHandoff = (target: "files" | "scan" | "comms" | "pshare") => {
    const fromWorkspace = (workspaceHandoffText?.() ?? "").trim();
    const transcript = formatCommandHandoffTranscript(log).trim();
    writeCommandSearchShare(transcript);

    const rawAtt = workspaceHandoffAttachments?.() ?? [];
    const attachments = rawAtt.filter((a) => a?.data && a.name);
    const largeRefs = (workspaceHandoffLargeRefs?.() ?? []).filter((r) => r?.id && r.name);
    const merged = mergeWorkspaceAndCommandHandoff(workspaceHandoffText?.() ?? "", transcript).trim();
    const attachNames = [
      ...attachments.map((a) => a.name),
      ...largeRefs.map((r) => `${r.name} (${(r.size / (1024 * 1024)).toFixed(1)} MB)`),
    ].filter(Boolean);
    const fallbackText =
      attachNames.length > 0 ? `Cross-module handoff — attached file(s): ${attachNames.join(", ")}` : "";
    const text = merged || fallbackText;
    if (!text && attachments.length === 0 && largeRefs.length === 0) {
      setHandoffHint(
        "Nothing to send yet — add a file or text in this module, or run a CYRUS command search below, then tap a pipeline target.",
      );
      return;
    }
    setHandoffHint(null);
    const hasWs = fromWorkspace.length > 0;
    const hasCmd = transcript.length > 0;
    const fromModule = hasWs ? (workspaceHandoffSource?.trim() || "module-workspace") : "command-console";
    let note =
      fromModule === "command-console"
        ? "Cross-module handoff from Command console — generate a report, translate, or share with the group."
        : `Cross-module handoff from ${fromModule} — continue in the target module.`;
    if (hasWs && hasCmd) note = `${note} Includes full CYRUS command search/Q&A transcript.`;
    if (attachments.length || largeRefs.length) note = `${note} Includes staged file(s) for analysis where supported.`;
    saveHandoff({
      text: text || fallbackText,
      sourceModule: fromModule,
      title: fromModule === "command-console" ? "Command → pipeline" : "Workspace → pipeline",
      note,
      attachments: attachments.length ? attachments : undefined,
      largeAttachments: largeRefs.length ? largeRefs : undefined,
    });
    if (target === "files") setLocation("/files?handoff=1");
    else if (target === "scan") setLocation("/scan?handoff=1");
    else if (target === "comms") setLocation("/comms?handoff=1");
    else setLocation("/comms?tab=pshare&handoff=1");
  };

  const pipelineTargets: {
    id: "files" | "scan" | "comms" | "pshare";
    path: string;
    title: string;
    labelOverride?: string;
  }[] = [
    { id: "files", path: "/files", title: "Build / analyze report" },
    { id: "scan", path: "/scan", title: "Translate & multilingual" },
    { id: "comms", path: "/comms", title: "Group chat" },
    { id: "pshare", path: "/comms", title: "Group feed", labelOverride: "Pshare" },
  ];

  const reloadConsole = () => {
    if (send.isPending) return;
    pendingStopRef.current = false;
    speakNextRef.current = false;
    transcriptRef.current = "";
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsListening(false);
    setInput("");
    setLog([]);
    setHandoffHint(null);
    setVoiceError(null);
    clearCommandSearchShare();
    send.reset();
  };

  const setConsoleMinimized = (next: boolean) => {
    if (next && isListening) {
      pendingStopRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
    setMinimized(next);
  };

  useEffect(() => {
    onLayoutChange?.(Boolean(inModule && minimized));
  }, [inModule, minimized, onLayoutChange]);

  if (inModule && minimized) {
    return (
      <section
        className={cn("relative z-20 overflow-hidden rounded-2xl p-px", className)}
        style={{ background: "rgba(13,13,30,0.95)", border: "1px solid rgba(225,29,72,0.2)", boxShadow: "0 0 30px rgba(225,29,72,0.08)" }}
        aria-label="CYRUS command console (minimized)"
      >
        <div className="relative flex items-center justify-between gap-2 rounded-2xl px-4 py-3" style={{ background: "rgba(8,8,16,0.8)" }}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)" }}>
              <Terminal className="h-4 w-4 text-[#e11d48]" aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#e11d48]/55" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>Cyrus AI</p>
              <p className="truncate text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>Command Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConsoleMinimized(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#06b6d4] transition hover:bg-[#06b6d4]/10"
            style={{ border: "1px solid rgba(6,182,212,0.3)" }}
            aria-label="Expand command console"
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("relative z-20 flex min-h-[24rem] max-h-[min(88vh,42rem)] flex-col overflow-hidden rounded-2xl p-px sm:min-h-[26rem] cyrus-xs-command-console", className)}
      style={{ background: "rgba(13,13,30,0.97)", border: "1px solid rgba(225,29,72,0.2)", boxShadow: "0 0 60px rgba(225,29,72,0.06), 0 20px 60px rgba(0,0,0,0.6)" }}
      aria-label="CYRUS command console"
    >
      <div className="pointer-events-none absolute inset-0 cyrus-console-accent-amber" aria-hidden />
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.12]" aria-hidden />
      <div
        className="pointer-events-none absolute right-3 top-3 h-10 w-10 rounded-full border border-amber-300/30 bg-cover bg-center opacity-[0.22] mix-blend-screen cyrus-symbol-watermark"
        style={{ backgroundImage: `url(${TSODILO_SYMBOLS_STELE_URL})` }}
        aria-hidden
      />
      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(225,29,72,0.6) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      {/* Corner glow top-left */}
      <div className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #e11d48, transparent 70%)", filter: "blur(30px)" }} />
      {/* Corner glow bottom-right */}
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)", filter: "blur(30px)" }} />
      {/* Top border accent */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.5) 40%, rgba(6,182,212,0.3) 60%, transparent)" }} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col rounded-2xl p-4 sm:p-5" style={{ background: "rgba(8,8,16,0.6)", backdropFilter: "blur(20px)" }}>
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {inModule ? (
          <button
            type="button"
            onClick={() => setConsoleMinimized(true)}
            className="absolute right-1 top-0 z-30 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-[#e11d48]/10 hover:text-[#e11d48] sm:right-2"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            aria-expanded="true"
            aria-label="Minimize command console"
            title="Minimize"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="relative mb-2">
            {isListening ? (
              <span className="pointer-events-none absolute inset-0 -m-1.5 animate-ping rounded-full opacity-40" style={{ border: "1px solid rgba(225,29,72,0.5)" }} aria-hidden />
            ) : null}
            <button
              type="button"
              onClick={toggleCyrusVoice}
              disabled={send.isPending}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop listening and send to CYRUS" : "Start voice input to CYRUS"}
              className={cn(
                "relative flex h-[4.75rem] w-[4.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 pb-1.5 pt-1.5 transition focus:outline-none disabled:opacity-50 sm:h-[5.25rem] sm:w-[5.25rem] cyrus-xs-voice-button",
              )}
              style={{
                border: isListening ? "2px solid rgba(6,182,212,0.6)" : "2px solid rgba(225,29,72,0.4)",
                background: "rgba(8,8,16,0.8)",
                boxShadow: isListening ? "0 0 24px rgba(6,182,212,0.3)" : "0 0 20px rgba(225,29,72,0.15)",
              }}
            >
              <img src="/images/cyrus-logo.png" alt="" className="h-[2.35rem] w-[2.35rem] shrink-0 rounded-full object-cover sm:h-[2.6rem] sm:w-[2.6rem]" draggable={false} />
              <Mic className={cn("h-3.5 w-3.5 shrink-0", isListening ? "text-[#06b6d4]" : "text-[#e11d48]/80")} aria-hidden />
            </button>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#e11d48]/50">Cyrus AI</p>
          <h2 className="mt-0.5 text-lg font-black tracking-tight text-white" style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}>
            Command Console
          </h2>
          {voiceError ? <p className="mt-2 max-w-sm text-[11px] text-[#e11d48]/80">{voiceError}</p> : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-white/35">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3 text-[#e11d48]/60" aria-hidden />
              <Cpu className="h-3 w-3 text-[#06b6d4]/55" />
              <span className="font-mono">/api/infer</span>
            </div>
            <button
              type="button"
              onClick={reloadConsole}
              disabled={send.isPending}
              title="Clear the log, input, and voice state"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:text-[#e11d48] hover:bg-[#e11d48]/08 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reload
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 sm:gap-2 cyrus-xs-pipeline" style={{ background: "rgba(225,29,72,0.05)", border: "1px solid rgba(225,29,72,0.12)" }}>
          <span className="w-full pl-0.5 text-[9px] font-mono uppercase tracking-[0.28em] text-[#e11d48]/50 sm:w-auto sm:pl-0">Pipeline</span>
          {pipelineTargets.map(({ id, path, title, labelOverride }) => {
            const nav = getCommandCenterNavByPath(path);
            if (!nav) return null;
            const Icon = nav.Icon;
            const label = labelOverride ?? nav.dashboardLabel;
            return (
              <button
                key={id}
                type="button"
                title={title}
                onClick={() => goHandoff(id)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition hover:text-white hover:bg-[#06b6d4]/10"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#06b6d4]/80" strokeWidth={1.75} />
                {label}
                <ArrowRight className="h-3 w-3 shrink-0 text-white/25" />
              </button>
            );
          })}
        </div>
        {handoffHint && <p className="mb-2 text-[11px] text-[#e11d48]/80">{handoffHint}</p>}

        <div className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-xl px-3 py-2.5 font-mono text-xs leading-relaxed text-white/85 sm:px-3 sm:py-2.5 sm:text-[13px] cyrus-xs-command-log" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {log.length === 0 && !send.isPending && (
            <p className="text-white/25">Prompt CYRUS — query, plan, or ask anything in this module.</p>
          )}
          {log.map((line, i) => (
            <div key={i} className={line.role === "user" ? "" : "text-white/70"} style={line.role === "user" ? { color: "rgba(225,29,72,0.85)" } : {}}>
              <span className="text-white/20">{line.role === "user" ? "› " : "∴ "}</span>
              <span className="whitespace-pre-wrap break-words">{line.content}</span>
            </div>
          ))}
          {send.isPending && (
            <div className="flex items-center gap-1.5 text-[#06b6d4]/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Processing…</span>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        <div className="mt-auto flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Message CYRUS…"
            rows={2}
            className="min-h-[3rem] max-h-32 flex-1 resize-y rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none cyrus-xs-command-input"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(225,29,72,0.2)" }}
            disabled={send.isPending}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || send.isPending}
            className="inline-flex h-12 min-w-[3.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-30 cyrus-xs-send-button"
            style={{ background: "rgba(225,29,72,0.85)", border: "1px solid rgba(225,29,72,0.5)" }}
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}
