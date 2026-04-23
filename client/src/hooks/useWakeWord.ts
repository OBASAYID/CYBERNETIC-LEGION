import { useState, useRef, useCallback, useEffect } from "react";

export interface WakeWordConfig {
  wakeWords: string[];
  sensitivity: number;
  silenceTimeout: number;
  autoRestart: boolean;
  onWakeWordDetected?: (transcript: string) => void;
  onCommand?: (command: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
}

const defaultConfig: WakeWordConfig = {
  wakeWords: ["cyrus", "cyras", "cyprus", "sirus", "syrus", "hey cyrus", "okay cyrus", "ok cyrus"],
  sensitivity: 0.6,
  silenceTimeout: 2000,
  autoRestart: true,
};

export function useWakeWord(config: Partial<WakeWordConfig> = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  const [isListening, setIsListening] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commandBufferRef = useRef<string>("");
  const isActivatedRef = useRef(false);
  const isListeningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const checkForWakeWord = useCallback((transcript: string): boolean => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const wakeWord of mergedConfig.wakeWords) {
      if (normalizedTranscript.includes(wakeWord.toLowerCase())) {
        return true;
      }
    }
    
    const phoneticVariations = [
      /\bcy\s*r[uo]s\b/i,
      /\bsai\s*r[uo]s\b/i,
      /\bsi\s*r[uo]s\b/i,
      /\bcyp\s*r[uo]s\b/i,
      /\bsyr\s*[uo]s\b/i,
    ];
    
    for (const pattern of phoneticVariations) {
      if (pattern.test(normalizedTranscript)) {
        return true;
      }
    }
    
    return false;
  }, [mergedConfig.wakeWords]);

  const extractCommand = useCallback((transcript: string): string => {
    const normalizedTranscript = transcript.toLowerCase();
    
    for (const wakeWord of mergedConfig.wakeWords) {
      const wakeWordLower = wakeWord.toLowerCase();
      const index = normalizedTranscript.indexOf(wakeWordLower);
      if (index !== -1) {
        const afterWakeWord = transcript.slice(index + wakeWord.length).trim();
        if (afterWakeWord.length > 0) {
          return afterWakeWord;
        }
      }
    }
    
    return transcript;
  }, [mergedConfig.wakeWords]);

  const startListening = useCallback(() => {
    if (isStoppingRef.current || isListeningRef.current) {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      mergedConfig.onError?.("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    (recognition as any).maxAlternatives = 3;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      mergedConfig.onListeningChange?.(true);
      console.log("[WakeWord] Listening started - waiting for 'CYRUS'...");
    };

    recognition.onresult = (event) => {
      clearSilenceTimer();
      
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setLastTranscript(currentTranscript);

      if (!isActivatedRef.current) {
        if (checkForWakeWord(currentTranscript)) {
          console.log("[WakeWord] Wake word detected:", currentTranscript);
          isActivatedRef.current = true;
          setIsActivated(true);
          mergedConfig.onWakeWordDetected?.(currentTranscript);
          
          const command = extractCommand(currentTranscript);
          if (command && command.trim().length > 0) {
            commandBufferRef.current = command.trim();
          }
          
          silenceTimerRef.current = setTimeout(() => {
            if (commandBufferRef.current.length > 0) {
              const fullCommand = commandBufferRef.current.trim();
              console.log("[WakeWord] Command captured:", fullCommand);
              setIsProcessing(true);
              mergedConfig.onCommand?.(fullCommand);
              
              commandBufferRef.current = "";
              isActivatedRef.current = false;
              setIsActivated(false);
              setIsProcessing(false);
            } else {
              console.log("[WakeWord] No command after wake word, resetting...");
              isActivatedRef.current = false;
              setIsActivated(false);
            }
          }, mergedConfig.silenceTimeout);
        }
      } else {
        if (finalTranscript) {
          const cleanedFinal = extractCommand(finalTranscript).trim();
          if (cleanedFinal && !commandBufferRef.current.includes(cleanedFinal)) {
            commandBufferRef.current = (commandBufferRef.current + " " + cleanedFinal).trim();
          }
        }
        
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (commandBufferRef.current.trim().length > 0) {
            const fullCommand = commandBufferRef.current.trim();
            console.log("[WakeWord] Command captured:", fullCommand);
            setIsProcessing(true);
            mergedConfig.onCommand?.(fullCommand);
            
            commandBufferRef.current = "";
            isActivatedRef.current = false;
            setIsActivated(false);
            setIsProcessing(false);
          }
        }, mergedConfig.silenceTimeout);
      }
    };

    recognition.onerror = (event) => {
      console.error("[WakeWord] Recognition error:", event.error);
      
      if (event.error === "not-allowed") {
        mergedConfig.onError?.("Microphone access denied. Please allow microphone access.");
        isListeningRef.current = false;
        setIsListening(false);
        mergedConfig.onListeningChange?.(false);
        return;
      }
      
      if (event.error === "aborted") {
        return;
      }
      
      if (event.error === "no-speech" || event.error === "audio-capture" || event.error === "network") {
        if (mergedConfig.autoRestart && isListeningRef.current && !isStoppingRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current && !isStoppingRef.current) {
              recognitionRef.current = null;
              startListening();
            }
          }, 500);
        }
      }
    };

    recognition.onend = () => {
      console.log("[WakeWord] Recognition ended");
      
      if (mergedConfig.autoRestart && isListeningRef.current && !isStoppingRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && !isStoppingRef.current) {
            recognitionRef.current = null;
            startListening();
          }
        }, 300);
      } else {
        isListeningRef.current = false;
        setIsListening(false);
        mergedConfig.onListeningChange?.(false);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error("[WakeWord] Failed to start recognition:", error);
      mergedConfig.onError?.("Failed to start speech recognition");
    }
  }, [checkForWakeWord, extractCommand, clearSilenceTimer, mergedConfig, isListening]);

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    clearSilenceTimer();
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    
    isListeningRef.current = false;
    setIsListening(false);
    setIsActivated(false);
    isActivatedRef.current = false;
    commandBufferRef.current = "";
    mergedConfig.onListeningChange?.(false);
    
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 100);
    
    console.log("[WakeWord] Listening stopped");
  }, [clearSilenceTimer, mergedConfig]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetActivation = useCallback(() => {
    isActivatedRef.current = false;
    setIsActivated(false);
    commandBufferRef.current = "";
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isActivated,
    isProcessing,
    lastTranscript,
    startListening,
    stopListening,
    toggleListening,
    resetActivation,
  };
}
