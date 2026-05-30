import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mic, MicOff, Volume2 } from "lucide-react";
import cyrusEmblem from "@/assets/generated/cyrus_military_eagle_emblem.svg";

export function CyrusVoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [showText, setShowText] = useState(false);
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const shouldAutoRestartRef = useRef(false);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/cyrus/personality/message", { message });
      return response.json();
    },
    onSuccess: (data) => {
      const responseText = data.response || "CYRUS online. All systems operational.";
      setDisplayText(responseText);
      setShowText(true);
      setStatus("speaking");
      speak(responseText);
    },
    onError: () => {
      setStatus("idle");
      setDisplayText("CYRUS: Connection issue. Retrying secure channel.");
      setShowText(true);
      speak("Connection issue. Retrying secure channel.");
      setTimeout(() => setShowText(false), 4000);
    }
  });

  const loadFemaleVoice = useCallback(() => {
    if (!synthRef.current) return;
    
    const voices = synthRef.current.getVoices();
    // Prioritize the sweetest, most natural female voices
    const femaleVoice = voices.find(v => 
      v.name.includes("Samantha") ||  // macOS - natural female
      v.name.includes("Ava") ||        // iOS - smooth female
      v.name.includes("Allison") ||    // Natural female
      v.name.includes("Victoria") ||
      v.name.includes("Karen") ||
      v.name.includes("Moira") ||
      v.name.includes("Fiona") ||
      v.name.includes("Tessa") ||
      v.name.includes("Google UK English Female") ||
      v.name.includes("Google US English Female") ||
      v.name.includes("Microsoft Aria") ||  // Azure neural voice
      v.name.includes("Microsoft Jenny") || // Azure neural voice
      v.name.includes("Microsoft Zira") ||
      v.name.toLowerCase().includes("female")
    ) || voices.find(v => 
      v.lang.includes("en") &&
      !v.name.toLowerCase().includes("male") &&
      !v.name.includes("Daniel") &&
      !v.name.includes("Alex") &&
      !v.name.includes("Fred") &&
      !v.name.includes("David") &&
      !v.name.includes("George") &&
      !v.name.includes("James")
    ) || voices[0];
    
    femaleVoiceRef.current = femaleVoice;
    console.log("[CYRUS Voice] Selected voice:", femaleVoice?.name);
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Tuned for a sweet, natural feminine voice
    utterance.rate = 0.95;    // Slightly slower for warmth
    utterance.pitch = 1.15;   // Slightly higher for feminine sweetness
    utterance.volume = 0.9;   // Slightly softer for gentleness
    
    if (femaleVoiceRef.current) {
      utterance.voice = femaleVoiceRef.current;
    }

    utterance.onstart = () => {
      setStatus("speaking");
    };

    utterance.onend = () => {
      setStatus("idle");
      setTimeout(() => setShowText(false), 4000);
    };

    synthRef.current.speak(utterance);
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === "listening") {
        setStatus("idle");
      }
      
      if (shouldAutoRestartRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
            setIsListening(true);
          } catch (e) {
            console.log("Recognition restart");
          }
        }, 100);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript(interimTranscript);

      if (finalTranscript.trim()) {
        const lowerTranscript = finalTranscript.toLowerCase().trim();
        
        if (lowerTranscript.includes("cyrus") || 
            lowerTranscript.includes("hey cyrus") || 
            lowerTranscript.includes("ok cyrus") ||
            showText) {
          
          const cleanedMessage = finalTranscript
            .replace(/hey cyrus/gi, "")
            .replace(/ok cyrus/gi, "")
            .replace(/cyrus/gi, "")
            .trim() || "status report";

          setDisplayText(`You: ${cleanedMessage}`);
          setShowText(true);
          setStatus("thinking");
          sendMessageMutation.mutate(cleanedMessage);
        }
        setCurrentTranscript("");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatus("idle");
    };

    recognitionRef.current = recognition;
  }, [status, showText, sendMessageMutation]);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

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
      } catch (error) {
        console.error("Microphone access required");
        setDisplayText("Please allow microphone access to speak with CYRUS.");
        setShowText(true);
        setTimeout(() => setShowText(false), 3000);
      }
    }
  };

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadFemaleVoice;
    }
    loadFemaleVoice();
    
    initializeSpeechRecognition();

    return () => {
      shouldAutoRestartRef.current = false;
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, [initializeSpeechRecognition, loadFemaleVoice]);

  const getStatusColor = () => {
    switch (status) {
      case "listening": return "from-green-500 to-emerald-600";
      case "thinking": return "from-[#e11d48] to-[#be123c]";
      case "speaking": return "from-cyan-500 to-blue-600";
      default: return "from-cyan-600 to-cyan-700";
    }
  };

  const getGlowColor = () => {
    switch (status) {
      case "listening": return "rgba(34, 197, 94, 0.5)";
      case "thinking": return "rgba(225, 29, 72, 0.5)";
      case "speaking": return "rgba(6, 182, 212, 0.6)";
      default: return "rgba(6, 182, 212, 0.3)";
    }
  };

  return (
    <>
      {(showText || currentTranscript) && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="relative">
            <div 
              className={`absolute -inset-px rounded-xl blur-sm opacity-80 bg-gradient-to-r ${getStatusColor()}`}
            />
            <div className="relative bg-black/90 backdrop-blur-xl rounded-xl px-6 py-4 border border-white/10">
              <div className="flex items-start gap-3">
                {status === "speaking" && (
                  <Volume2 className="h-5 w-5 text-cyan-400 mt-0.5 animate-pulse flex-shrink-0" />
                )}
                <div className="flex-1">
                  {currentTranscript ? (
                    <p className="text-white/60 text-sm italic">{currentTranscript}</p>
                  ) : (
                    <p className="text-white text-base leading-relaxed">{displayText}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
        {status === "idle" && !showText && (
          <div className="text-center">
            <p className="text-white/50 text-xs tracking-[0.2em] uppercase mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              CYRUS READY
            </p>
            <p className="text-white/30 text-[10px] tracking-wider">
              Tap or say "Hey CYRUS"
            </p>
          </div>
        )}
        
        <button
          onClick={toggleListening}
          className="relative group"
          data-testid="button-toggle-mic"
        >
          <div 
            className="absolute inset-0 rounded-full transition-all duration-500"
            style={{ 
              boxShadow: `0 0 80px 30px ${getGlowColor()}`,
              opacity: status !== "idle" ? 1 : 0.6
            }}
          />
          
          {status !== "idle" && (
            <>
              <span className={`absolute -inset-4 rounded-full border-2 border-current animate-ping opacity-30 ${
                status === "listening" ? "text-green-400" :
                status === "thinking" ? "text-[#e11d48]" :
                "text-cyan-400"
              }`} />
              <span className={`absolute -inset-6 rounded-full border border-current animate-pulse opacity-20 ${
                status === "listening" ? "text-green-400" :
                status === "thinking" ? "text-[#e11d48]" :
                "text-cyan-400"
              }`} />
            </>
          )}
          
          <div className={`relative w-24 h-24 rounded-full overflow-hidden border-2 transition-all duration-300 bg-gradient-to-br ${getStatusColor()} ${
            status !== "idle" ? "scale-110 border-white/30" : "border-white/10 group-hover:scale-105 group-hover:border-white/20"
          }`}>
            <img 
              src={cyrusEmblem} 
              alt="CYRUS" 
              className="w-full h-full object-cover opacity-90"
            />
            
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${getStatusColor()} transition-opacity ${
              isListening ? "opacity-90" : "opacity-0 group-hover:opacity-80"
            }`}>
              {isListening ? (
                <Mic className="h-10 w-10 text-white animate-pulse" />
              ) : (
                <MicOff className="h-9 w-9 text-white/90" />
              )}
            </div>
          </div>
        </button>

        {status !== "idle" && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              status === "listening" ? "bg-green-400" :
              status === "thinking" ? "bg-[#e11d48]" :
              "bg-cyan-400"
            }`} />
            <span className={`text-xs font-bold tracking-[0.3em] uppercase ${
              status === "listening" ? "text-green-400" :
              status === "thinking" ? "text-[#e11d48]" :
              "text-cyan-400"
            }`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {status === "listening" ? "LISTENING" :
               status === "thinking" ? "PROCESSING" :
               "SPEAKING"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
