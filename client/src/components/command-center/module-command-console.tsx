import { useState, useRef, useEffect, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Cpu,
  Eye,
  FileText,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  RotateCcw,
  Send,
  Share2,
  Terminal,
} from "lucide-react";
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
import { systemFetch } from "@shared/cyrus-api-client";
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
  /** When the console chat is empty, Pipeline handoff can use text from the workspace above. */
  workspaceHandoffText?: () => string | undefined;
  /** `sourceModule` on the saved handoff when text comes from `workspaceHandoffText`. */
  workspaceHandoffSource?: string;
  /** Optional small files to send with pipeline handoff (e.g. staged upload). */
  workspaceHandoffAttachments?: () => ModuleHandoffAttachment[] | undefined;
  workspaceHandoffLargeRefs?: () => ModuleHandoffLargeRef[] | undefined;
};

/**
 * Pinned to the bottom of the viewport; narrower than the workspace so the command bar stays compact and centered.
 */
export function ModuleCommandConsoleDock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none fixed bottom-0 left-0 right-0 z-30", className)}
      role="presentation"
    >
      {/* Illuminated green + fading blue: light source behind the command console, blocked by the console panel */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[min(26rem,58vh)] overflow-hidden"
        aria-hidden
      >
        <div className="absolute bottom-[-1.5rem] left-1/2 h-48 w-[min(44rem,96vw)] -translate-x-1/2 rounded-full bg-emerald-400/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-44 w-[min(50rem,100vw)] -translate-x-1/2 rounded-full bg-sky-500/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-36 w-[min(36rem,88vw)] -translate-x-1/2 rounded-full bg-blue-600/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950/95 to-transparent" />
      </div>
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
        className={cn(
          "relative z-20 overflow-hidden rounded-3xl bg-black/20 p-1 shadow-[0_0_50px_-22px_rgba(34,211,238,0.08),0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-[2px]",
          className,
        )}
        aria-label="CYRUS command console (minimized)"
      >
        <div className="relative z-10 flex items-center justify-between gap-2 rounded-2xl bg-black/26 px-3 py-2.5 shadow-inner shadow-black/35 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
              <Terminal className="h-4 w-4 text-cyan-300" aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <p
                className="text-[9px] font-mono uppercase tracking-[0.3em] text-cyan-200/55"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Cyrus AI
              </p>
              <p
                className="truncate text-sm font-semibold text-white/90"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Command console
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConsoleMinimized(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
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
      className={cn(
        "relative z-20 flex min-h-[24rem] max-h-[min(88vh,42rem)] flex-col overflow-hidden rounded-3xl bg-black/20 p-1 shadow-[0_0_50px_-22px_rgba(34,211,238,0.08),0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-[2px] sm:min-h-[26rem]",
        className,
      )}
      aria-label="CYRUS command console"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-black/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.22) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-cyan-300/8 via-white/4 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(253,230,138,0.05),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_75%_45%_at_50%_-8%,rgba(255,255,255,0.07),rgba(255,255,255,0.02)_40%,transparent_65%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(125deg,rgba(255,255,255,0.04)_0%,transparent_38%,rgba(255,255,255,0.01)_100%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] bg-black/22 p-4 shadow-inner shadow-black/30 backdrop-blur-[1px] sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(255,255,255,0.04),transparent_58%)]"
          aria-hidden
        />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {inModule ? (
          <button
            type="button"
            onClick={() => setConsoleMinimized(true)}
            className="absolute right-1 top-0 z-30 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/90 text-cyan-200/90 shadow-sm transition hover:border-cyan-500/40 hover:text-white sm:right-2"
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
              <span
                className="pointer-events-none absolute inset-0 -m-1.5 animate-ping rounded-full border border-cyan-400/40 opacity-40"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              onClick={toggleCyrusVoice}
              disabled={send.isPending}
              aria-pressed={isListening}
              aria-label={
                isListening ? "Stop listening and send to CYRUS" : "Start voice input to CYRUS"
              }
              className={cn(
                "relative flex h-[4.75rem] w-[4.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-cyan-400/45 bg-slate-900/80 px-1.5 pb-1.5 pt-1.5 shadow-[0_0_20px_rgba(34,211,238,0.16)] transition focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 sm:h-[5.25rem] sm:w-[5.25rem]",
                isListening && "border-orange-400/60 shadow-[0_0_24px_rgba(251,146,60,0.18)]",
              )}
            >
              <img
                src="/images/cyrus-logo.png"
                alt=""
                className="h-[2.35rem] w-[2.35rem] shrink-0 rounded-full object-cover sm:h-[2.6rem] sm:w-[2.6rem]"
                draggable={false}
              />
              <Mic
                className={cn("h-3.5 w-3.5 shrink-0 text-cyan-200/95", isListening && "text-orange-300")}
                aria-hidden
              />
            </button>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-200/60">Cyrus AI</p>
          <h2
            className="mt-0.5 bg-gradient-to-r from-cyan-100 via-white to-orange-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Command console
          </h2>
          {voiceError ? <p className="mt-2 max-w-sm text-[11px] text-amber-300/90">{voiceError}</p> : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-cyan-500/60">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3 opacity-70" aria-hidden />
              <Cpu className="h-3 w-3 text-cyan-500/50" />
              <span className="font-mono">/api/infer</span>
            </div>
            <button
              type="button"
              onClick={reloadConsole}
              disabled={send.isPending}
              title="Clear the log, input, and voice state (wait if CYRUS is replying)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-cyan-200/90 transition hover:border-cyan-500/40 hover:bg-cyan-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reload console
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-slate-900/50 px-2 py-2 sm:gap-2">
          <span className="w-full pl-0.5 text-[9px] font-mono uppercase tracking-[0.28em] text-cyan-500/60 sm:w-auto sm:pl-0">
            Pipeline
          </span>
          {(
            [
              { id: "files" as const, label: "Docs", Icon: FileText, title: "Build / analyze report" },
              { id: "scan" as const, label: "Vision", Icon: Eye, title: "Translate & multilingual" },
              { id: "comms" as const, label: "Chat", Icon: MessageSquare, title: "Group chat" },
              { id: "pshare" as const, label: "Pshare", Icon: Share2, title: "Group feed" },
            ] as const
          ).map(({ id, label, Icon, title }) => (
            <button
              key={id}
              type="button"
              title={title}
              onClick={() => goHandoff(id)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition hover:border-cyan-500/35 hover:bg-cyan-950/50"
            >
              <Icon className="h-3.5 w-3.5 text-cyan-300/80" />
              {label}
              <ArrowRight className="h-3 w-3 text-white/35" />
            </button>
          ))}
        </div>
        {handoffHint ? <p className="mb-2 text-[11px] text-amber-300/90">{handoffHint}</p> : null}

        <div
          className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 font-mono text-xs leading-relaxed text-slate-200/90 sm:px-3 sm:py-2.5 sm:text-[13px]"
        >
          {log.length === 0 && !send.isPending && (
            <p className="text-slate-500/90">Prompt CYRUS — query, plan, or ask anything in this module.</p>
          )}
          {log.map((line, i) => (
            <div key={i} className={line.role === "user" ? "text-cyan-200/90" : "text-slate-300"}>
              <span className="text-slate-600">{line.role === "user" ? "› " : "∴ "}</span>
              <span className="whitespace-pre-wrap break-words">{line.content}</span>
            </div>
          ))}
          {send.isPending && (
            <div className="flex items-center gap-1.5 text-orange-200/80">
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
            className="min-h-[3rem] max-h-32 flex-1 resize-y rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/35"
            disabled={send.isPending}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || send.isPending}
            className="inline-flex h-12 min-w-[3.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-4 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-40"
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
