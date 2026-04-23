import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Send, X, Play, Pause } from "lucide-react";

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

const MAX_DURATION = 300;

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array(30).fill(0.1)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [audioUrl]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);

    const barCount = 30;
    const step = Math.floor(data.length / barCount);
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const val = data[i * step] / 255;
      bars.push(Math.max(0.08, val));
    }
    setWaveformBars(bars);
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        audioBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("preview");

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close();
        }
      };

      recorder.start(100);
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            recorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);

      updateWaveform();
    } catch (err) {
      console.error("[VoiceRecorder] Failed to start recording:", err);
    }
  }, [updateWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleSend = useCallback(() => {
    if (audioBlobRef.current) {
      onSend(audioBlobRef.current, duration);
    }
  }, [onSend, duration]);

  const handleCancel = useCallback(() => {
    cleanup();
    setState("idle");
    setDuration(0);
    setAudioUrl(null);
    setWaveformBars(Array(30).fill(0.1));
    onCancel();
  }, [cleanup, onCancel]);

  const togglePreviewPlayback = useCallback(() => {
    if (!audioUrl) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (state === "idle") {
    return (
      <button
        onClick={startRecording}
        className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
        title="Record voice note"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-xl border border-red-500/30 rounded-xl px-4 py-3 w-full">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0" />

        <div className="flex-1 flex items-end gap-px h-8 overflow-hidden">
          {waveformBars.map((val, i) => (
            <div
              key={i}
              className="flex-1 bg-red-400/80 rounded-full transition-all duration-75"
              style={{ height: `${val * 100}%`, minHeight: "3px" }}
            />
          ))}
        </div>

        <span className="text-sm text-red-400 font-mono shrink-0 w-12 text-right">
          {formatTime(duration)}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCancel}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={stopRecording}
            className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gray-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl px-4 py-3 w-full">
      <button
        onClick={togglePreviewPlayback}
        className="p-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-full transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="flex-1 flex items-end gap-px h-6 overflow-hidden opacity-60">
        {waveformBars.map((val, i) => (
          <div
            key={i}
            className="flex-1 bg-cyan-400/60 rounded-full"
            style={{ height: `${Math.max(val, 0.15) * 100}%`, minHeight: "3px" }}
          />
        ))}
      </div>

      <span className="text-sm text-cyan-400 font-mono shrink-0 w-12 text-right">
        {formatTime(duration)}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCancel}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          className="p-1.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
