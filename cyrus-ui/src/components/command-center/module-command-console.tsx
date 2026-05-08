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
import { SMOKE_VORTEX_TEXTURE_URL } from "@/lib/dashboard-backdrop";
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
 * Pinned to the bottom of the viewport, matching module workspace max width so the bar is always visible on long pages.
 */
export function ModuleCommandConsoleDock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none fixed bottom-0 left-0 right-0 z-30", className)}
      role="presentation"
    >
      {/* Warm orange fading into sky blue behind the command console */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[min(26rem,58vh)] overflow-hidden"
        aria-hidden
      >
        <div className="absolute bottom-[-1.5rem] left-[18%] h-52 w-[min(28rem,72vw)] rounded-full bg-orange-500/12 blur-3xl" />
        <div className="absolute bottom-[-0.5rem] right-[12%] h-48 w-[min(32rem,78vw)] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-40 w-[min(48rem,96vw)] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400/8 via-cyan-300/6 to-sky-400/9 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950/95 to-transparent" />
      </div>
      <div className="pointer-events-auto relative z-20 mx-auto w-full max-w-screen-2xl px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-6 sm:pb-1.5 sm:pt-1.5 lg:px-8">
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
          "relative z-20 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-950/45 via-slate-950/50 to-sky-950/45 p-1 shadow-[0_0_44px_-20px_rgba(251,146,60,0.35),0_0_48px_-22px_rgba(56,189,248,0.28),0_10px_28px_rgba(15,23,42,0.18)] backdrop-blur-xl",
          className,
        )}
        aria-label="CYRUS command console (minimized)"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-500/10 via-transparent to-sky-400/12" aria-hidden />
        <div
          className="cyrus-command-console-smoke pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-14 overflow-hidden rounded-b-2xl"
          aria-hidden
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 45%, black 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 45%, black 100%)",
          }}
        >
          <div className="cyrus-smoke-animated cyrus-console-smoke-wisp-a absolute -bottom-3 left-[12%] right-[20%] h-12 rounded-[50%] bg-[radial-gradient(ellipse_100%_100%_at_50%_100%,rgba(251,146,60,0.22),rgba(15,23,42,0.35)_55%,transparent_72%)] blur-xl mix-blend-screen" />
          <div className="cyrus-smoke-animated cyrus-console-smoke-wisp-b absolute -bottom-4 left-[18%] right-[14%] h-14 rounded-[50%] bg-[radial-gradient(ellipse_100%_90%_at_50%_100%,rgba(56,189,248,0.16),rgba(2,6,23,0.4)_52%,transparent_75%)] blur-[18px] mix-blend-screen" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-2 rounded-2xl bg-slate-900/45 px-3 py-2.5 shadow-inner shadow-orange-500/5 backdrop-blur-sm sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/15 to-sky-500/12">
              <Terminal className="h-4 w-4 text-orange-200" aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <p
                className="text-[9px] font-mono uppercase tracking-[0.3em] text-orange-200/55"
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/35 bg-gradient-to-br from-orange-500/15 to-sky-500/20 text-sky-200 transition hover:border-sky-300/55 hover:from-orange-500/25 hover:to-sky-400/30"
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
        "relative z-20 flex min-h-[24rem] max-h-[min(88vh,42rem)] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950/40 via-slate-950/52 to-sky-950/42 p-1 shadow-[0_0_44px_-20px_rgba(251,146,60,0.32),0_0_46px_-22px_rgba(56,189,248,0.26),0_10px_28px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:min-h-[26rem]",
        className,
      )}
      aria-label="CYRUS command console"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-[linear-gradient(115deg,rgba(251,146,60,0.14)_0%,rgba(15,23,42,0.35)_42%,rgba(14,165,233,0.12)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.38) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-orange-500/12 via-transparent to-sky-400/14" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_85%_50%_at_15%_20%,rgba(251,146,60,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_48%_at_88%_75%,rgba(56,189,248,0.11),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(118deg,rgba(251,146,60,0.06)_0%,transparent_40%,rgba(125,211,252,0.07)_100%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] bg-slate-900/38 p-4 shadow-inner shadow-orange-500/8 backdrop-blur-sm sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(253,186,116,0.06),transparent_50%,rgba(125,211,252,0.05),transparent_70%)]"
          aria-hidden
        />
        <div
          className="cyrus-command-console-smoke pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(12.5rem,46%)] overflow-hidden rounded-b-[1.25rem]"
          aria-hidden
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 32%, black 78%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 32%, black 78%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-orange-950/25 via-sky-950/8 to-transparent" aria-hidden />
          <div className="cyrus-smoke-animated cyrus-console-smoke-wisp-a absolute -bottom-2 left-[4%] right-[6%] h-[min(7rem,36%)] max-h-36 rounded-[50%] bg-[radial-gradient(ellipse_100%_100%_at_50%_100%,rgba(251,146,60,0.2),rgba(120,53,15,0.12)_42%,rgba(15,23,42,0.5)_58%,transparent_76%)] blur-2xl mix-blend-screen" />
          <div className="cyrus-smoke-animated cyrus-console-smoke-wisp-b absolute -bottom-8 left-[10%] right-[12%] h-[min(8.5rem,42%)] max-h-44 rounded-[50%] bg-[radial-gradient(ellipse_100%_88%_at_50%_100%,rgba(125,211,252,0.14),rgba(30,58,138,0.22)_48%,rgba(2,6,23,0.55)_62%,transparent_78%)] blur-[26px] mix-blend-screen" />
          <div
            className="cyrus-smoke-animated cyrus-console-vortex-bottom absolute bottom-[-18%] left-1/2 h-[10.5rem] w-[min(26rem,108%)] max-w-none -translate-x-1/2 bg-contain bg-[center_bottom] bg-no-repeat opacity-[0.13] mix-blend-screen"
            style={{
              backgroundImage: `url(${SMOKE_VORTEX_TEXTURE_URL})`,
              filter: "blur(1.2px) contrast(1.06) saturate(0.9)",
            }}
          />
          <div
            className="cyrus-smoke-animated cyrus-console-vortex-bottom absolute bottom-[-22%] left-1/2 h-[12rem] w-[min(28rem,112%)] max-w-none -translate-x-1/2 bg-contain bg-[center_bottom] bg-no-repeat opacity-[0.08] mix-blend-screen"
            style={{
              backgroundImage: `url(${SMOKE_VORTEX_TEXTURE_URL})`,
              filter: "blur(2.8px) brightness(0.92) saturate(0.85)",
            }}
          />
        </div>
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {inModule ? (
          <button
            type="button"
            onClick={() => setConsoleMinimized(true)}
            className="absolute right-1 top-0 z-30 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/90 text-sky-200/90 shadow-sm transition hover:border-orange-400/40 hover:text-white sm:right-2"
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
                className="pointer-events-none absolute inset-0 -m-1.5 animate-ping rounded-full border border-orange-400/35 opacity-40"
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
                "relative flex h-[4.75rem] w-[4.75rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-orange-400/50 bg-slate-900/80 px-1.5 pb-1.5 pt-1.5 shadow-[0_0_22px_rgba(251,146,60,0.2),0_0_18px_rgba(56,189,248,0.12)] transition focus:outline-none focus:ring-2 focus:ring-orange-400/45 disabled:opacity-50 sm:h-[5.25rem] sm:w-[5.25rem]",
                isListening && "border-sky-300/75 shadow-[0_0_26px_rgba(125,211,252,0.28),0_0_14px_rgba(251,146,60,0.15)]",
              )}
            >
              <img
                src="/images/cyrus-logo.png"
                alt=""
                className="h-[2.35rem] w-[2.35rem] shrink-0 rounded-full object-cover sm:h-[2.6rem] sm:w-[2.6rem]"
                draggable={false}
              />
              <Mic
                className={cn("h-3.5 w-3.5 shrink-0 text-orange-200/95", isListening && "text-sky-200")}
                aria-hidden
              />
            </button>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-orange-200/55">Cyrus AI</p>
          <h2
            className="mt-0.5 bg-gradient-to-r from-orange-200 via-amber-100 to-sky-200 bg-clip-text text-lg font-bold tracking-tight text-transparent"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Command console
          </h2>
          {voiceError ? <p className="mt-2 max-w-sm text-[11px] text-amber-300/90">{voiceError}</p> : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-sky-500/65">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3 w-3 text-orange-400/70 opacity-90" aria-hidden />
              <Cpu className="h-3 w-3 text-sky-400/55" />
              <span className="font-mono">/api/infer</span>
            </div>
            <button
              type="button"
              onClick={reloadConsole}
              disabled={send.isPending}
              title="Clear the log, input, and voice state (wait if CYRUS is replying)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-sky-200/90 transition hover:border-orange-400/35 hover:bg-orange-950/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reload console
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-orange-400/20 bg-gradient-to-r from-orange-950/35 via-slate-900/50 to-sky-950/35 px-2 py-2 sm:gap-2">
          <span className="w-full pl-0.5 text-[9px] font-mono uppercase tracking-[0.28em] text-orange-300/55 sm:w-auto sm:pl-0">
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
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition hover:border-sky-400/40 hover:bg-sky-950/35"
            >
              <Icon className="h-3.5 w-3.5 text-sky-300/85" />
              {label}
              <ArrowRight className="h-3 w-3 text-white/35" />
            </button>
          ))}
        </div>
        {handoffHint && <p className="mb-2 text-[11px] text-amber-300/90">{handoffHint}</p>}

        <div
            className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 font-mono text-xs leading-relaxed text-slate-200/90 sm:px-3 sm:py-2.5 sm:text-[13px]"
        >
          {log.length === 0 && !send.isPending && (
            <p className="text-slate-500/90">Prompt CYRUS — query, plan, or ask anything in this module.</p>
          )}
          {log.map((line, i) => (
            <div key={i} className={line.role === "user" ? "text-orange-200/90" : "text-slate-300"}>
              <span className="text-slate-600">{line.role === "user" ? "› " : "∴ "}</span>
              <span className="whitespace-pre-wrap break-words">{line.content}</span>
            </div>
          ))}
          {send.isPending && (
            <div className="flex items-center gap-1.5 text-sky-100/85">
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
            className="min-h-[3rem] max-h-32 flex-1 resize-y rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            disabled={send.isPending}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || send.isPending}
            className="inline-flex h-12 min-w-[3.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-400/40 bg-gradient-to-br from-orange-500/20 to-sky-500/25 px-4 text-sm font-medium text-sky-100 transition hover:from-orange-500/30 hover:to-sky-400/35 disabled:opacity-40"
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
