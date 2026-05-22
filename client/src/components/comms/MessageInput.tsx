import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  MapPin,
  X,
  Image as ImageIcon,
  FileAudio,
} from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { analyzeTextSentiment } from "../../hooks/useCommsIntelligence";

interface MessageInputProps {
  onSend: (content: string) => void;
  onSendMedia?: (file: File, caption: string) => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onSendLocation?: () => void;
  onToggleEmoji?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  holoSurface?: boolean;
}

export function MessageInput({
  onSend,
  onSendMedia,
  onSendVoice,
  onSendLocation,
  onToggleEmoji,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type a message...",
  holoSurface = false,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sentiment, setSentiment] = useState<{ score: number; label: string; confidence: number }>({ score: 0, label: "neutral", confidence: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePickerAccept =
    "image/*,video/*,audio/*," +
    "application/pdf,application/zip," +
    "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation," +
    "text/plain,text/html,text/csv,text/markdown,application/json,application/xml," +
    ".pdf,.html,.htm,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp," +
    ".txt,.csv,.md,.json,.xml,.zip," +
    ".mp3,.m4a,.wav,.ogg,.flac,.aac,.mp4,.webm,.mov,.mkv";
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sentimentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sentimentTimeoutRef.current) clearTimeout(sentimentTimeoutRef.current);
    if (text.trim().length < 3) {
      setSentiment({ score: 0, label: "neutral", confidence: 0 });
      return;
    }
    sentimentTimeoutRef.current = setTimeout(() => {
      const result = analyzeTextSentiment(text);
      setSentiment(result);
    }, 300);
    return () => {
      if (sentimentTimeoutRef.current) clearTimeout(sentimentTimeoutRef.current);
    };
  }, [text]);

  const handleSend = useCallback(() => {
    if (attachPreview && onSendMedia) {
      onSendMedia(attachPreview.file, text.trim());
      URL.revokeObjectURL(attachPreview.url);
      setAttachPreview(null);
      setText("");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    onTypingStop?.();
  }, [text, attachPreview, onSend, onSendMedia, onTypingStop]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) {
      onTypingStart?.();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTypingStop?.(), 2000);
    } else {
      onTypingStop?.();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachPreview({ file, url });
    e.target.value = "";
  };

  const clearAttachment = () => {
    if (attachPreview) {
      URL.revokeObjectURL(attachPreview.url);
      setAttachPreview(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        onSendVoice?.(blob, recordingTime);
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((p) => {
          if (p >= 300) {
            mediaRecorderRef.current?.stop();
            return p;
          }
          return p + 1;
        });
      }, 1000);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isRecording) {
    return (
      <div
        className={
          holoSurface
            ? "flex items-center gap-3 border-t border-cyan-400/35 bg-gradient-to-r from-slate-950/95 via-cyan-950/25 to-violet-950/20 px-4 py-3 backdrop-blur-md"
            : "flex items-center gap-3 border-t border-amber-500/25 bg-gradient-to-r from-slate-950/95 via-amber-950/20 to-cyan-950/30 px-4 py-3 backdrop-blur-md"
        }
      >
        <button
          onClick={cancelRecording}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-400 font-mono">{formatTime(recordingTime)}</span>
          <div className="flex gap-[2px] items-center flex-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] bg-red-400/60 rounded-full animate-pulse"
                style={{
                  height: `${6 + Math.random() * 16}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={stopRecording}
          className={
            holoSurface
              ? "rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 p-2.5 shadow-[0_0_16px_rgba(0,229,255,0.35),0_0_12px_rgba(139,92,246,0.3)] transition hover:from-cyan-400 hover:to-violet-500"
              : "rounded-full bg-gradient-to-br from-amber-500 to-cyan-500 p-2.5 shadow-[0_0_16px_rgba(251,146,60,0.4),0_0_12px_rgba(6,182,212,0.35)] transition hover:from-amber-400 hover:to-cyan-400"
          }
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        holoSurface
          ? "relative border-t border-cyan-400/35 bg-gradient-to-r from-slate-950/95 via-cyan-950/18 to-violet-950/22 backdrop-blur-md"
          : "relative border-t border-amber-500/25 bg-gradient-to-r from-slate-950/95 via-orange-950/12 to-cyan-950/35 backdrop-blur-md"
      }
    >
      {showEmoji && (
        <div className="absolute bottom-full left-2 mb-2 z-50">
          <EmojiPicker
            onSelect={(emoji) => {
              setText(prev => prev + emoji);
              setShowEmoji(false);
            }}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}
      {attachPreview && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="relative inline-block">
            {attachPreview.file.type.startsWith("image/") ? (
              <img src={attachPreview.url} alt="" className="h-16 rounded-lg border border-gray-700/50" />
            ) : attachPreview.file.type.startsWith("video/") ? (
              <video src={attachPreview.url} className="h-20 max-w-[200px] rounded-lg border border-gray-700/50" muted playsInline />
            ) : (
              <div className="flex max-w-[220px] items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/80 px-3 py-2">
                {attachPreview.file.type.startsWith("audio/") ? (
                  <FileAudio className={`h-4 w-4 shrink-0 ${holoSurface ? "text-cyan-400" : "text-amber-400"}`} />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-cyan-400" />
                )}
                <span className="truncate text-xs text-gray-300">{attachPreview.file.name}</span>
              </div>
            )}
            <button
              onClick={clearAttachment}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={disabled}
            className={`rounded-full p-2 transition-colors disabled:opacity-40 ${
              showEmoji
                ? holoSurface
                  ? "bg-cyan-500/25 text-cyan-50"
                  : "bg-amber-500/20 text-amber-100"
                : holoSurface
                  ? "text-cyan-200/50 hover:bg-cyan-500/12 hover:text-cyan-100"
                  : "text-amber-200/50 hover:bg-amber-500/10 hover:text-cyan-200"
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          {onSendMedia && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={
                  holoSurface
                    ? "rounded-full p-2 text-cyan-200/50 transition hover:bg-cyan-500/15 hover:text-cyan-100 disabled:opacity-40"
                    : "rounded-full p-2 text-amber-200/50 transition hover:bg-cyan-500/10 hover:text-cyan-200 disabled:opacity-40"
                }
                title="Share photos, videos, documents (PDF, Word, Excel, HTML…), or other files"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept={filePickerAccept}
              />
            </>
          )}
          {onSendLocation && (
            <button
              onClick={onSendLocation}
              disabled={disabled}
              className={
                holoSurface
                  ? "rounded-full p-2 text-cyan-200/50 transition hover:bg-violet-500/15 hover:text-violet-100 disabled:opacity-40"
                  : "rounded-full p-2 text-amber-200/50 transition hover:bg-orange-500/12 hover:text-orange-200 disabled:opacity-40"
              }
            >
              <MapPin className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`w-full max-h-[120px] resize-none rounded-xl border bg-slate-950/60 px-3.5 py-2.5 pr-8 text-sm text-white focus:border-cyan-400/50 focus:outline-none focus:ring-2 disabled:opacity-40 ${
              holoSurface
                ? "border-cyan-500/35 placeholder-cyan-200/30 focus:ring-cyan-500/25"
                : "border-amber-500/30 placeholder-amber-200/35 focus:ring-amber-500/30"
            }`}
            style={{ minHeight: "40px" }}
          />
          {text.trim().length >= 3 && (
            <div
              className="absolute right-2.5 top-1/2 -translate-y-1/2 group cursor-default"
              title={`Sentiment: ${sentiment.label} (${(sentiment.score * 100).toFixed(0)}%)`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  sentiment.label === "positive" ? "bg-emerald-400 shadow-emerald-400/50 shadow-sm" :
                  sentiment.label === "negative" ? "bg-red-400 shadow-red-400/50 shadow-sm" :
                  "bg-gray-500"
                }`}
              />
              <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block">
                <div className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-[10px] text-gray-300 whitespace-nowrap shadow-lg">
                  {sentiment.label} ({(sentiment.score * 100).toFixed(0)}%)
                </div>
              </div>
            </div>
          )}
        </div>

        {text.trim() || attachPreview ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className={
              holoSurface
                ? "rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-violet-600 p-2.5 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:via-sky-400 hover:to-violet-500 disabled:opacity-40"
                : "rounded-full bg-gradient-to-br from-amber-500 via-cyan-500 to-orange-600 p-2.5 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:via-cyan-400 hover:to-orange-500 disabled:opacity-40"
            }
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : onSendVoice ? (
          <button
            onClick={startRecording}
            disabled={disabled}
            className={
              holoSurface
                ? "rounded-full p-2.5 text-cyan-200/50 transition hover:bg-cyan-500/15 hover:text-cyan-100 disabled:opacity-40"
                : "rounded-full p-2.5 text-amber-200/50 transition hover:bg-amber-500/15 hover:text-cyan-200 disabled:opacity-40"
            }
          >
            <Mic className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className={
              holoSurface
                ? "rounded-full bg-gradient-to-br from-cyan-500 via-sky-500 to-violet-600 p-2.5 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:via-sky-400 hover:to-violet-500 disabled:opacity-40"
                : "rounded-full bg-gradient-to-br from-amber-500 via-cyan-500 to-orange-600 p-2.5 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:via-cyan-400 hover:to-orange-500 disabled:opacity-40"
            }
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
