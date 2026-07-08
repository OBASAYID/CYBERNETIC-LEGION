import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const GOLD = "#C9A55A";
const GOLD_GLOW = "rgba(201,165,90,0.5)";
const WAVEFORM_BARS = 18;

type AiStatus = "idle" | "listening" | "thinking" | "speaking";

function WaveformBars({ active }: { active: boolean }) {
  if (!active) {
    return (
      <div className="flex items-center gap-[2px] h-5 opacity-40">
        {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${10 + ((i % 4) * 4)}px`,
              background: GOLD,
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="cyrus-waveform">
      {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
        <div key={i} className="cyrus-waveform-bar" style={{ background: GOLD }} />
      ))}
    </div>
  );
}

export function CyrusAiBar() {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [inputText, setInputText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const shouldAutoRestartRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/cyrus/personality/message", { message });
      return response.json();
    },
    onSuccess: (data) => {
      const text: string = data.response || "CYRUS online. All systems operational.";
      setResponseText(text);
      setInputText("");
      setStatus("speaking");
      speak(text);
    },
    onError: () => {
      setStatus("idle");
      setResponseText("Connection issue. Retrying secure channel.");
      setTimeout(() => setResponseText(""), 4000);
    },
  });

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    utterance.onend = () => {
      setStatus("idle");
      setTimeout(() => setResponseText(""), 5000);
    };
    synthRef.current.speak(utterance);
  }, []);

  const handleSend = useCallback((msg?: string) => {
    const text = (msg ?? inputText).trim();
    if (!text) return;
    setResponseText("");
    setStatus("thinking");
    sendMessageMutation.mutate(text);
  }, [inputText, sendMessageMutation]);

  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    // ISpeechRecognition is declared globally in types/speech-recognition.d.ts
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) return;
    const r = new API();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onstart = () => { setIsListening(true); setStatus("listening"); };
    r.onend = () => {
      setIsListening(false);
      if (shouldAutoRestartRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.debug("[CyrusAiBar] Recognition restart skipped:", e);
          }
        }, 100);
      } else {
        setStatus("idle");
      }
    };
    r.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      setCurrentTranscript(interimTranscript);
      if (finalTranscript.trim()) {
        const lower = finalTranscript.toLowerCase().trim();
        if (lower.includes("cyrus") || lower.startsWith("hey") || responseText) {
          const clean = finalTranscript.replace(/hey cyrus/gi,"").replace(/ok cyrus/gi,"").replace(/cyrus/gi,"").trim() || "status report";
          setCurrentTranscript("");
          handleSend(clean);
        }
      }
    };
    r.onerror = () => { setIsListening(false); setStatus("idle"); };
    recognitionRef.current = r;
  }, [handleSend, responseText]);

  const toggleMic = async () => {
    if (!recognitionRef.current) initRecognition();
    if (isListening) {
      shouldAutoRestartRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus("idle");
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        shouldAutoRestartRef.current = true;
        recognitionRef.current?.start();
      } catch {
        setResponseText("Microphone access required.");
        setTimeout(() => setResponseText(""), 3000);
      }
    }
  };

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    initRecognition();
    return () => {
      shouldAutoRestartRef.current = false;
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, [initRecognition]);

  const placeholderText = currentTranscript
    ? currentTranscript
    : responseText
      ? responseText
      : "How can I assist you today?";

  const statusColor = status === "listening"
    ? "#22c55e"
    : status === "thinking"
      ? "#f59e0b"
      : status === "speaking"
        ? "#38bdf8"
        : GOLD;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[150]"
      style={{
        background: "linear-gradient(180deg, rgba(8,8,8,0.96) 0%, rgba(5,4,2,0.99) 100%)",
        borderTop: `1px solid rgba(201,165,90,0.22)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 -4px 32px rgba(0,0,0,0.65), 0 -1px 0 rgba(201,165,90,0.12)`,
      }}
    >
      {/* Gold top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${GOLD} 40%, rgba(201,165,90,0.5) 60%, transparent 100%)` }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Label + waveform */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-[13px] font-black tracking-[0.28em] uppercase"
            style={{ color: GOLD, fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            CYRUS AI
          </span>
          <WaveformBars active={status !== "idle"} />
        </div>

        {/* Status dot */}
        <div
          className="h-2 w-2 shrink-0 rounded-full cyrus-status-dot"
          style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
        />

        {/* Input */}
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={placeholderText}
            className="w-full bg-transparent text-sm outline-none placeholder:italic"
            style={{
              color: currentTranscript ? "rgba(201,165,90,0.7)" : responseText ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
              fontFamily: "'IBM Plex Sans', sans-serif",
              caretColor: GOLD,
            }}
            aria-label="CYRUS AI input"
          />
        </div>

        {/* Send button (visible when text entered) */}
        {inputText.trim() && (
          <button
            type="button"
            onClick={() => handleSend()}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all"
            style={{ background: "rgba(201,165,90,0.15)", border: `1px solid rgba(201,165,90,0.3)` }}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" style={{ color: GOLD }} />
          </button>
        )}

        {/* Mic button — gold circular */}
        <button
          type="button"
          onClick={toggleMic}
          className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300"
          style={{
            background: isListening
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : `linear-gradient(135deg, ${GOLD}, #8B6914)`,
            boxShadow: isListening
              ? "0 0 20px rgba(34,197,94,0.5)"
              : `0 0 20px ${GOLD_GLOW}`,
            border: `2px solid ${isListening ? "rgba(34,197,94,0.5)" : "rgba(201,165,90,0.4)"}`,
          }}
          aria-label={isListening ? "Stop listening" : "Activate voice input"}
          data-testid="button-toggle-mic"
        >
          {isListening
            ? <MicOff className="h-5 w-5 text-white" />
            : <Mic className="h-5 w-5 text-white" />
          }
        </button>
      </div>

      {/* Status label row */}
      {status !== "idle" && (
        <div className="flex justify-center pb-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.36em]"
            style={{ color: statusColor, fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {status === "listening" ? "LISTENING..." : status === "thinking" ? "PROCESSING..." : "SPEAKING..."}
          </span>
        </div>
      )}
    </div>
  );
}
