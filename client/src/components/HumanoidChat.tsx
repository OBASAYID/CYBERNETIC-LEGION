import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Mic, MicOff, Volume2, VolumeX, Brain, Heart, Sparkles,
  MessageCircle, Phone, X, Minimize2, Maximize2, Loader2, Smile,
} from "lucide-react";

interface HumanoidMessage {
  id: string;
  role: "human" | "cyrus";
  content: string;
  timestamp: Date;
  emotion?: string;
  backchannel?: string;
  isThinking?: boolean;
  prosodyText?: string;
}

interface EmotionState {
  dominant: string;
  valence: number;
  arousal: number;
  confidence: number;
  moodTrend?: string;
  aiEmotion?: string;
}

const EMOTION_COLORS: Record<string, { bg: string; text: string; glow: string; label: string }> = {
  happy:      { bg: "bg-amber-500/20", text: "text-amber-400", glow: "shadow-amber-500/30", label: "Happy" },
  excited:    { bg: "bg-orange-500/20", text: "text-orange-400", glow: "shadow-orange-500/30", label: "Excited" },
  sad:        { bg: "bg-blue-500/20", text: "text-blue-400", glow: "shadow-blue-500/30", label: "Reflective" },
  angry:      { bg: "bg-red-500/20", text: "text-red-400", glow: "shadow-red-500/30", label: "Intense" },
  calm:       { bg: "bg-teal-500/20", text: "text-teal-400", glow: "shadow-teal-500/30", label: "Calm" },
  confident:  { bg: "bg-purple-500/20", text: "text-purple-400", glow: "shadow-purple-500/30", label: "Confident" },
  empathetic: { bg: "bg-pink-500/20", text: "text-pink-400", glow: "shadow-pink-500/30", label: "Empathetic" },
  curious:    { bg: "bg-cyan-500/20", text: "text-cyan-400", glow: "shadow-cyan-500/30", label: "Curious" },
  thoughtful: { bg: "bg-indigo-500/20", text: "text-indigo-400", glow: "shadow-indigo-500/30", label: "Thoughtful" },
  neutral:    { bg: "bg-gray-500/20", text: "text-gray-400", glow: "shadow-gray-500/30", label: "Attentive" },
  confused:   { bg: "bg-yellow-500/20", text: "text-yellow-400", glow: "shadow-yellow-500/30", label: "Processing" },
};

const THINKING_PHRASES = [
  "Processing your thoughts...",
  "Considering that carefully...",
  "Reflecting on what you said...",
  "Thinking about the best way to respond...",
  "Taking a moment to understand...",
  "Weighing my thoughts...",
];

export function HumanoidChat() {
  const [messages, setMessages] = useState<HumanoidMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState("");
  const [emotionState, setEmotionState] = useState<EmotionState>({
    dominant: "neutral", valence: 0, arousal: 0.5, confidence: 0,
  });
  const [showEmotionPanel, setShowEmotionPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasGreeted, setHasGreeted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasGreeted) {
      generateGreeting();
      setHasGreeted(true);
    }
  }, [hasGreeted]);

  const generateGreeting = async () => {
    try {
      const res = await systemFetch("/api/humanoid/conversation/greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "User just opened the humanoid conversation mode" }),
      });
      const data = await res.json();
      if (data.greeting) {
        setMessages([{
          id: Date.now().toString(),
          role: "cyrus",
          content: data.greeting,
          timestamp: new Date(),
          emotion: "happy",
        }]);
        if (voiceEnabled) {
          speakWithEmotion(data.greeting, "happy");
        }
      }
    } catch {
      setMessages([{
        id: Date.now().toString(),
        role: "cyrus",
        content: "Hello! I'm here and ready to talk. What's on your mind?",
        timestamp: new Date(),
        emotion: "calm",
      }]);
    }
  };

  const speakWithEmotion = async (text: string, emotion: string = "neutral") => {
    try {
      setIsSpeaking(true);
      const response = await systemFetch("/api/cyrus/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "rachel", emotion }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play().catch(() => setIsSpeaking(false));
      } else {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = emotion === 'excited' ? 1.1 : emotion === 'sad' ? 0.85 : 1.0;
          utterance.pitch = emotion === 'happy' ? 1.15 : emotion === 'sad' ? 0.9 : 1.05;
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
        }
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const conversationTurn = useMutation({
    mutationFn: async (message: string) => {
      const res = await systemFetch("/api/humanoid/conversation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      return res.json();
    },
    onMutate: () => {
      setIsThinking(true);
      const phrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
      setThinkingPhrase(phrase);
    },
    onSuccess: (data) => {
      setIsThinking(false);

      if (data.emotionAnalysis) {
        setEmotionState({
          dominant: data.emotionAnalysis.userEmotion || "neutral",
          valence: data.emotionAnalysis.valence || 0,
          arousal: data.emotionAnalysis.arousal || 0.5,
          confidence: data.emotionAnalysis.confidence || 0,
          moodTrend: data.emotionAnalysis.moodTrend,
          aiEmotion: data.emotionAnalysis.aiEmotion,
        });
      }

      const naturalDelay = data.naturalDelay || 400;

      thinkingTimerRef.current = setTimeout(() => {
        const cyrusMsg: HumanoidMessage = {
          id: Date.now().toString(),
          role: "cyrus",
          content: data.response,
          timestamp: new Date(),
          emotion: data.emotionAnalysis?.aiEmotion || "neutral",
          backchannel: data.backchannel,
          prosodyText: data.prosody?.enhancedText,
        };

        setMessages(prev => [...prev, cyrusMsg]);

        if (voiceEnabled) {
          speakWithEmotion(
            data.prosody?.enhancedText || data.response,
            data.emotionAnalysis?.aiEmotion || "neutral"
          );
        }
      }, Math.min(naturalDelay, 1200));
    },
    onError: () => {
      setIsThinking(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "cyrus",
        content: "I had trouble processing that. Could you say it again?",
        timestamp: new Date(),
        emotion: "thoughtful",
      }]);
    },
  });

  const handleSubmit = useCallback((text?: string) => {
    const message = (text || input).trim();
    if (!message || conversationTurn.isPending) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "human",
      content: message,
      timestamp: new Date(),
    }]);

    conversationTurn.mutate(message);
    setInput("");
    inputRef.current?.focus();
  }, [input, conversationTurn]);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let transcript = "";

    recognition.onresult = (event) => {
      transcript = "";
      let isFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      setInput(transcript);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (transcript.trim()) {
          recognition.stop();
        }
      }, 1500);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) {
        handleSubmit(transcript.trim());
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, handleSubmit]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, []);

  const getEmotionStyle = (emotion: string) => {
    return EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
  };

  const currentAIEmotion = getEmotionStyle(emotionState.aiEmotion || "neutral");
  const currentUserEmotion = getEmotionStyle(emotionState.dominant);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 transition-all z-50 group"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
        <span className="absolute -top-8 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Talk to CYRUS
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] max-h-[680px] bg-black/95 backdrop-blur-xl rounded-2xl border border-gray-800/60 shadow-2xl shadow-black/50 z-50 flex flex-col overflow-hidden">
      {/* Header - Humanoid Presence */}
      <div className="px-4 py-3 border-b border-gray-800/60 bg-gradient-to-r from-gray-900/80 to-black/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${currentAIEmotion.text} transition-colors duration-700`}
                   style={{ borderColor: 'currentColor' }}>
                <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black transition-colors duration-500 ${
                isSpeaking ? 'bg-blue-400 animate-pulse' : isThinking ? 'bg-amber-400 animate-pulse' : 'bg-green-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">CYRUS</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${currentAIEmotion.bg} ${currentAIEmotion.text} transition-all duration-700`}>
                  {currentAIEmotion.label}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                {isSpeaking ? "Speaking..." : isThinking ? "Thinking..." : isListening ? "Listening to you..." : "Online"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEmotionPanel(!showEmotionPanel)}
              className={`p-1.5 rounded-lg transition-colors ${showEmotionPanel ? 'bg-pink-500/20 text-pink-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              title="Emotional awareness"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              title={voiceEnabled ? "Voice on" : "Voice off"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Emotion Awareness Panel */}
        {showEmotionPanel && (
          <div className="mt-3 p-3 bg-gray-900/60 rounded-xl border border-gray-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">Emotional Awareness</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Your mood</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentUserEmotion.bg}`} style={{ backgroundColor: currentUserEmotion.text.replace('text-', '').includes('400') ? undefined : undefined }} />
                  <span className={`text-xs font-medium ${currentUserEmotion.text}`}>{currentUserEmotion.label}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">My response tone</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentAIEmotion.bg}`} />
                  <span className={`text-xs font-medium ${currentAIEmotion.text}`}>{currentAIEmotion.label}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Mood trend</p>
                <span className="text-xs text-gray-300">
                  {emotionState.moodTrend === 'improving' ? '↑ Improving' :
                   emotionState.moodTrend === 'declining' ? '↓ Declining' : '→ Stable'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Confidence</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${(emotionState.confidence || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{Math.round((emotionState.confidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[440px]">
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cyan-500/20 shadow-lg shadow-cyan-500/10 mb-4">
              <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Start a conversation</p>
            <p className="text-xs text-gray-600">Talk naturally — I understand emotions and context</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"} animate-in`}>
            {msg.role === "cyrus" && (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1 border border-gray-700">
                <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="max-w-[80%]">
              {msg.backchannel && msg.role === "cyrus" && (
                <p className="text-[11px] text-gray-500 italic mb-1 ml-1">{msg.backchannel}</p>
              )}
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "human"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-gray-900 text-gray-100 rounded-bl-md border border-gray-800/40"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              <div className={`flex items-center gap-2 mt-1 ${msg.role === "human" ? "justify-end" : "justify-start"} px-1`}>
                <span className="text-[10px] text-gray-600">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.emotion && msg.role === "cyrus" && (
                  <span className={`text-[10px] ${getEmotionStyle(msg.emotion).text}`}>
                    {getEmotionStyle(msg.emotion).label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start animate-in">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1 border border-gray-700">
              <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="bg-gray-900 border border-gray-800/40 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-1 ml-1 italic">{thinkingPhrase}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Voice Activity Indicator */}
      {(isListening || isSpeaking) && (
        <div className="px-4 py-2 border-t border-gray-800/30">
          <div className="flex items-center justify-center gap-2">
            {isListening && (
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-blue-400 rounded-full animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animationDelay: `${i * 100}ms`,
                        animationDuration: `${400 + Math.random() * 300}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-blue-400">Listening...</span>
              </>
            )}
            {isSpeaking && (
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-purple-400 rounded-full animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animationDelay: `${i * 80}ms`,
                        animationDuration: `${300 + Math.random() * 400}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-purple-400">Speaking...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800/60 bg-gray-950/50">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoiceInput}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20 animate-pulse"
                : "bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            title={isListening ? "Stop listening" : "Speak to CYRUS"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={isListening ? "Speak now..." : "Say something..."}
              className="w-full bg-gray-800/40 text-sm text-white placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-cyan-500/30 border border-gray-800/40 transition-all"
              disabled={conversationTurn.isPending || isListening}
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || conversationTurn.isPending}
            className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl disabled:opacity-30 hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
