import { useState } from "react";
import {
  MapPin,
  Play,
  Pause,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Info,
  FileAudio,
} from "lucide-react";

export type MessageType = "text" | "emoji" | "media" | "voice-note" | "location" | "system";

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface CommsMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: MessageType;
  mediaUrl?: string;
  mediaMimeType?: string;
  fileName?: string;
  duration?: number;
  latitude?: number;
  longitude?: number;
  reactions?: Reaction[];
  /** Profile photo for message bubble; also pass via MessageBubble `senderAvatarUrl` prop */
  senderAvatarUrl?: string | null;
}

interface MessageBubbleProps {
  message: CommsMessage;
  isOwn: boolean;
  /** Resolved avatar URL; overrides `message.senderAvatarUrl` if set */
  senderAvatarUrl?: string | null;
  onReact?: (messageId: string, emoji: string) => void;
}

function bubbleInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MessageBubble({ message, isOwn, senderAvatarUrl: senderAvatarUrlProp, onReact }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderContent = () => {
    switch (message.type) {
      case "system":
        return (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 italic py-1">
            <Info className="w-3 h-3" />
            <span>{message.content}</span>
          </div>
        );

      case "media": {
        const url = message.mediaUrl || "";
        const fn = (message.fileName || "").toLowerCase();
        const mt = message.mediaMimeType || "";
        const isImg = mt.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(fn);
        const isVid = mt.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(fn);
        const isAud = mt.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(fn);
        return (
          <div className="space-y-1.5">
            {isImg && (
              <div className="max-w-[min(100%,280px)] overflow-hidden rounded-lg">
                <img
                  src={url}
                  alt={message.fileName || "Image"}
                  className="h-auto max-h-60 w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                />
              </div>
            )}
            {isVid && (
              <div className="max-w-[min(100%,320px)] overflow-hidden rounded-lg border border-white/10">
                <video src={url} className="max-h-56 w-full" controls playsInline preload="metadata" />
              </div>
            )}
            {isAud && (
              <div className="min-w-[220px] max-w-sm rounded-lg border border-amber-500/25 bg-slate-950/50 px-2 py-1.5">
                <p className="mb-1 truncate text-[10px] text-cyan-200/80">
                  {message.fileName || "Audio"}
                </p>
                <audio src={url} className="h-8 w-full" controls preload="metadata" />
              </div>
            )}
            {!isImg && !isVid && !isAud && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 max-w-sm items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
              >
                {(message.fileName || "").match(/\.(mp3|m4a|wav|ogg|flac|aac)$/i) ? (
                  <FileAudio className="h-5 w-5 shrink-0 text-amber-300" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm">{message.fileName || "File"}</p>
                  {message.mediaMimeType && (
                    <p className="text-xs text-gray-400">{message.mediaMimeType}</p>
                  )}
                </div>
              </a>
            )}
            {message.content && <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>}
          </div>
        );
      }

      case "voice-note":
        return <VoiceNoteInline duration={message.duration} url={message.mediaUrl} />;

      case "location":
        return (
          <a
            href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <MapPin className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Shared Location</p>
              <p className="text-xs text-gray-400">
                {message.latitude?.toFixed(4)}, {message.longitude?.toFixed(4)}
              </p>
            </div>
          </a>
        );

      case "emoji":
        return <span className="text-4xl leading-none">{message.content}</span>;

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        {renderContent()}
      </div>
    );
  }

  const senderAvatarUrl = senderAvatarUrlProp ?? message.senderAvatarUrl;

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 group`}
      onDoubleClick={() => setShowReactions((v) => !v)}
    >
      <div className={`max-w-[75%] relative ${isOwn ? "items-end" : "items-start"}`}>
        {senderAvatarUrl && (
          <div
            className={`absolute z-20 -top-2 h-8 w-8 overflow-hidden rounded-full border-2 border-amber-400/50 bg-slate-900 shadow-lg shadow-amber-500/25 ${
              isOwn ? "right-0" : "right-0"
            }`}
            style={{ top: "-0.5rem" }}
            title={message.senderName}
          >
            <img src={senderAvatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        {!senderAvatarUrl && (
          <div
            className={`absolute -top-1 right-0 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-bold text-white shadow-md ${
              isOwn
                ? "border-cyan-400/40 bg-gradient-to-br from-cyan-600/80 to-amber-600/65"
                : "border-amber-500/35 bg-gradient-to-br from-amber-600/70 to-cyan-600/60"
            }`}
            title={message.senderName}
          >
            {bubbleInitials(message.senderName)}
          </div>
        )}
        {!isOwn && (
          <p className="mb-0.5 ml-1 pr-9 text-[10px] font-medium text-amber-200/90">{message.senderName}</p>
        )}
        <div
          className={`mt-2 rounded-2xl px-3.5 py-2 ${
            isOwn
              ? "rounded-br-md bg-gradient-to-br from-amber-500/95 via-orange-500/88 to-cyan-600/85 text-white shadow-[0_4px_22px_-4px_rgba(251,146,60,0.5),0_0_26px_-8px_rgba(6,182,212,0.38)]"
              : "rounded-bl-md border border-amber-500/25 bg-slate-900/80 text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
          }`}
        >
          {renderContent()}
          <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-white/40">{formatTime(message.timestamp)}</span>
            {isOwn && (
              message.read
                ? <CheckCheck className="h-3 w-3 text-lime-200 drop-shadow-[0_0_4px_rgba(190,242,100,0.6)]" />
                : <Check className="h-3 w-3 text-white/50" />
            )}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex gap-0.5 mt-0.5 ${isOwn ? "justify-end mr-1" : "justify-start ml-1"}`}>
            {groupReactions(message.reactions).map(({ emoji, count }) => (
              <span
                key={emoji}
                className="cursor-pointer rounded-full border border-amber-500/30 bg-slate-900/90 px-1.5 py-0.5 text-xs transition-colors hover:border-cyan-400/35 hover:bg-amber-950/40"
                onClick={() => onReact?.(message.id, emoji)}
              >
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}

        {showReactions && onReact && (
          <div
            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-8 z-10 flex gap-1 rounded-full border border-amber-500/30 bg-slate-950/95 px-2 py-1 shadow-xl shadow-orange-500/15 backdrop-blur-md`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                className="text-sm hover:scale-125 transition-transform"
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupReactions(reactions: Reaction[]) {
  const map = new Map<string, number>();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}

function VoiceNoteInline({ duration, url }: { duration?: number; url?: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => (url ? new Audio(url) : null));

  const togglePlay = () => {
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
      audio.onended = () => setPlaying(false);
    }
    setPlaying(!playing);
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex gap-[2px] items-end h-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-current opacity-40"
              style={{ height: `${4 + Math.random() * 12}px` }}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px] text-white/50 shrink-0">{formatDuration(duration)}</span>
    </div>
  );
}
