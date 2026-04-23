import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import { Cpu, Send, Mic, MicOff, Volume2, X, Minimize2, Maximize2, Loader2, Eye } from "lucide-react";

interface CyrusHumanoidProps {
  module: "vision" | "documents" | "navigation" | "communications" | "systems" | "aerospace";
  context?: string;
  onAnalysis?: (response: string) => void;
  compact?: boolean;
}

const modulePrompts: Record<string, string> = {
  vision: "You are CYRUS, a humanoid intelligence engaged in visual analysis. Identify objects, analyze images, describe scenes, and provide insights about what you perceive.",
  documents: "You are CYRUS, a humanoid intelligence engaged in document analysis. Analyze files, extract information, summarize content, identify risks, and generate professional documents.",
  navigation: "You are CYRUS, a humanoid intelligence engaged in navigation and geolocation. Assist with route planning, location analysis, travel estimates, and geographic intelligence.",
  communications: "You are CYRUS, a humanoid intelligence engaged in secure communications. Manage calls, compose messages, and execute communication protocols.",
  systems: "You are CYRUS, a humanoid intelligence engaged in hardware and device control. Manage devices, monitor systems, troubleshoot issues, and execute security operations.",
  aerospace: "You are CYRUS, a humanoid intelligence engaged in UAV/drone operations. Execute flight planning, mission parameters, telemetry analysis, and autonomous operations.",
};

export function CyrusHumanoid({ module, context, onAnalysis, compact = false }: CyrusHumanoidProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "cyrus"; content: string; visual?: { topic: string; category: string; image: string } }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const systemContext = `${modulePrompts[module]}\n\nCurrent context: ${context || "No specific context provided."}`;
      
      const response = await systemFetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message,
          systemContext,
          module 
        }),
      });
      
      if (!response.ok) throw new Error("Failed to get response");
      return response.json();
    },
    onSuccess: (data) => {
      const cyrusResponse = data.response || "I apologize, I couldn't process that request.";
      const visual = data.visual?.image ? { topic: data.visual.topic, category: data.visual.category, image: data.visual.image } : undefined;
      setMessages(prev => [...prev, { role: "cyrus", content: cyrusResponse, visual }]);
      onAnalysis?.(cyrusResponse);
      
      if (!compact) {
        speakResponse(cyrusResponse);
      }
    },
  });

  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      const response = await systemFetch("/api/cyrus/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova" }),
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.onended = () => setIsSpeaking(false);
        audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSubmit(transcript);
      };
      
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (text?: string) => {
    const message = text || input.trim();
    if (!message || sendMessage.isPending) return;
    
    setMessages(prev => [...prev, { role: "user", content: message }]);
    sendMessage.mutate(message);
    setInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform z-50"
      >
        <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
      </button>
    );
  }

  return (
    <div className={`bg-[#1c1c1e] rounded-xl border border-[rgba(84,84,88,0.65)] overflow-hidden ${compact ? "fixed bottom-4 right-4 w-80 shadow-2xl z-50" : ""}`}>
      <div className="px-3 py-2 bg-[#2c2c2e] border-b border-[rgba(84,84,88,0.65)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
            <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-semibold">CYRUS HUMANOID</span>
          {isSpeaking && (
            <Volume2 className="w-3 h-3 text-[#0a84ff] animate-pulse" />
          )}
        </div>
        {compact && (
          <button onClick={() => setIsExpanded(false)} className="p-1 text-[rgba(235,235,245,0.4)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20 opacity-70">
                <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-[rgba(235,235,245,0.4)]">
                Engage CYRUS for {module} operations
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                msg.role === "user" 
                  ? "bg-[#0a84ff] text-white" 
                  : "bg-[#3a3a3c] text-white"
              }`}>
                {msg.content}
                {msg.visual?.image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-cyan-500/20">
                    <img src={msg.visual.image} alt={`Visual: ${msg.visual.topic}`} className="w-full h-auto" loading="lazy" />
                    <div className="px-2 py-1 bg-[#1a1a2e] text-[10px] text-cyan-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{msg.visual.topic} ({msg.visual.category})</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="bg-[#3a3a3c] rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 text-[#0a84ff] animate-spin" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-2 border-t border-[rgba(84,84,88,0.65)]">
        <div className="flex items-center gap-2 bg-[rgba(120,120,128,0.2)] rounded-lg px-3 py-2">
          <button
            onClick={toggleVoice}
            className={`p-1 rounded transition-colors ${isListening ? "text-red-400" : "text-[rgba(235,235,245,0.4)] hover:text-white"}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Speak to CYRUS..."
            className="flex-1 bg-transparent text-xs text-white placeholder-[rgba(235,235,245,0.3)] outline-none"
            disabled={sendMessage.isPending}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || sendMessage.isPending}
            className="p-1 text-[#0a84ff] disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
