import { useState } from "react";
import {
  MapPin,
  Play,
  Pause,
  Check,
  CheckCheck,
  FileText,
  Info,
  FileAudio,
  Download,
  ExternalLink,
  BookOpen,
  Film,
} from "lucide-react";
import { systemApiUrl } from "@shared/cyrus-api-client";
import { formatCommsFileSize, inferCommsMediaCategory } from "@shared/comms/media-formats";
import { CommsCad3dAttachment } from "./CommsCad3dAttachment";

function resolveChatMediaUrl(pathOrUrl: string | undefined): string {
  if (!pathOrUrl) return "";
  return systemApiUrl(pathOrUrl);
}

function withDownloadParam(resolvedUrl: string): string {
  if (!resolvedUrl) return "";
  return resolvedUrl.includes("?") ? `${resolvedUrl}&download=1` : `${resolvedUrl}?download=1`;
}

export type MessageType = "text" | "emoji" | "media" | "cad-3d" | "voice-note" | "location" | "system";

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
  fileSizeBytes?: number;
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
  holoSurface?: boolean;
}

function bubbleInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MessageBubble({
  message,
  isOwn,
  senderAvatarUrl: senderAvatarUrlProp,
  onReact,
  holoSurface = false,
}: MessageBubbleProps) {
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

      case "cad-3d": {
        const raw = message.mediaUrl || "";
        const url = resolveChatMediaUrl(raw);
        const downloadUrl = raw ? withDownloadParam(url) : "";
        return (
          <CommsCad3dAttachment
            url={url}
            downloadUrl={downloadUrl}
            fileName={message.fileName}
            mimeType={message.mediaMimeType}
            caption={message.content}
            holoSurface={holoSurface}
          />
        );
      }

      case "media": {
        const raw = message.mediaUrl || "";
        const url = resolveChatMediaUrl(raw);
        const downloadUrl = raw ? withDownloadParam(url) : "";
        const fn = (message.fileName || "").toLowerCase();
        const mt = (message.mediaMimeType || "").toLowerCase();
        const isImg = mt.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(fn);
        const isVid = mt.startsWith("video/") || /\.(mp4|webm|mov|mkv|m4v|avi|wmv|mpeg|mpg|3gp)$/i.test(fn);
        const isAud = mt.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac|aac|opus|wma)$/i.test(fn);
        const isAudiobook = /\.(m4b|aa|aax)$/i.test(fn) || mt.includes("audible");
        const isEbook = /\.(epub|mobi|azw3?|fb2)$/i.test(fn) || mt.includes("epub") || mt.includes("mobipocket") || mt.includes("ebook");
        const isPdf = mt.includes("pdf") || fn.endsWith(".pdf");
        const isHtml = mt.includes("html") || /\.(html?|xhtml)$/i.test(fn);
        const isTexty =
          mt.startsWith("text/plain") ||
          mt.startsWith("text/csv") ||
          mt.includes("markdown") ||
          /\.(txt|csv|md)$/i.test(fn);
        const isOffice =
          /\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$/i.test(fn) ||
          mt.includes("wordprocessingml") ||
          mt.includes("spreadsheetml") ||
          mt.includes("presentationml") ||
          mt.includes("msword") ||
          mt.includes("ms-excel") ||
          mt.includes("ms-powerpoint");

        return (
          <div className="space-y-1.5">
            {isImg && url && (
              <div className="max-w-[min(100%,280px)] overflow-hidden rounded-lg">
                <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                  <img
                    src={url}
                    alt={message.fileName || "Image"}
                    className="h-auto max-h-60 w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                  />
                </a>
              </div>
            )}
            {isVid && url && (
              <div className="max-w-[min(100%,360px)] overflow-hidden rounded-lg border border-white/10">
                <video src={url} className="max-h-64 w-full" controls playsInline preload="metadata" />
              </div>
            )}
            {(isAud || isAudiobook) && url && (
              <div
                className={`min-w-[240px] max-w-md rounded-lg border bg-slate-950/50 px-2 py-1.5 ${
                  holoSurface ? "border-cyan-400/35" : "border-amber-500/25"
                }`}
              >
                <p className="mb-1 flex items-center gap-1 truncate text-[10px] text-cyan-200/80">
                  {isAudiobook ? <BookOpen className="h-3 w-3 shrink-0" /> : <FileAudio className="h-3 w-3 shrink-0" />}
                  {message.fileName || (isAudiobook ? "Audiobook" : "Audio")}
                  {message.fileSizeBytes ? ` · ${formatCommsFileSize(message.fileSizeBytes)}` : ""}
                </p>
                <audio src={url} className="h-8 w-full" controls preload="metadata" />
              </div>
            )}
            {isEbook && url && (
              <div className="flex min-w-0 max-w-sm flex-col gap-1 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 shrink-0 text-violet-300" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{message.fileName || "E-book"}</p>
                    <p className="text-[10px] text-white/45">
                      {inferCommsMediaCategory(message.fileName, mt) === "ebook" ? "E-book" : "Book file"}
                      {message.fileSizeBytes ? ` · ${formatCommsFileSize(message.fileSizeBytes)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-violet-200 underline">
                    Open
                  </a>
                  <a href={downloadUrl} className="inline-flex items-center gap-1 text-violet-200/90 underline">
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            )}
            {isPdf && url && (
              <div className="max-w-[min(100%,100%)] space-y-1">
                <details className="rounded-lg border border-white/10 bg-black/25">
                  <summary className="cursor-pointer select-none px-2 py-1.5 text-[11px] text-cyan-200/90">
                    Preview PDF
                  </summary>
                  <iframe
                    title={message.fileName || "PDF"}
                    src={`${url}#toolbar=1`}
                    className="mt-0 h-72 w-full rounded-b-md border-0 bg-white/95"
                  />
                </details>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-300 underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                  <a
                    href={downloadUrl}
                    className={`inline-flex items-center gap-1 underline ${holoSurface ? "text-cyan-200/90" : "text-amber-200/90"}`}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            )}
            {isHtml && url && (
              <div className="max-w-full space-y-1">
                <p className={`text-[10px] ${holoSurface ? "text-cyan-200/65" : "text-amber-200/70"}`}>
                  HTML preview is sandboxed (scripts disabled). Open in a new tab for full behavior.
                </p>
                <details className="rounded-lg border border-white/10 bg-black/25">
                  <summary className="cursor-pointer select-none px-2 py-1.5 text-[11px] text-cyan-200/90">
                    Preview HTML
                  </summary>
                  <iframe
                    title={message.fileName || "HTML"}
                    src={url}
                    sandbox=""
                    className="mt-0 h-64 w-full rounded-b-md border-0 bg-white"
                  />
                </details>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-300 underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in browser
                  </a>
                  <a
                    href={downloadUrl}
                    className={`inline-flex items-center gap-1 underline ${holoSurface ? "text-cyan-200/90" : "text-amber-200/90"}`}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              </div>
            )}
            {isTexty && url && !isPdf && !isHtml && (
              <div className="flex min-w-0 max-w-sm flex-col gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
                  <span className="truncate text-sm">{message.fileName || "Text file"}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                    View
                  </a>
                  <a href={downloadUrl} className={`underline ${holoSurface ? "text-cyan-200/90" : "text-amber-200/90"}`}>
                    Download
                  </a>
                </div>
              </div>
            )}
            {isOffice && url && !isPdf && !isHtml && (
              <div
                className={`flex min-w-0 max-w-sm flex-col gap-1 rounded-lg border px-3 py-2 ${
                  holoSurface
                    ? "border-cyan-400/30 bg-cyan-950/15"
                    : "border-amber-500/20 bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`h-5 w-5 shrink-0 ${holoSurface ? "text-cyan-300" : "text-amber-300"}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{message.fileName || "Document"}</p>
                    <p className="text-[10px] text-white/45">Download and open in Word, Excel, or similar.</p>
                  </div>
                </div>
                <a
                  href={downloadUrl}
                  className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
                    holoSurface
                      ? "border-cyan-400/35 bg-cyan-500/12 text-cyan-50"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            )}
            {!isImg && !isVid && !isAud && !isAudiobook && !isEbook && !isPdf && !isHtml && !isTexty && !isOffice && url && (
              <a
                href={downloadUrl}
                className="flex min-w-0 max-w-sm items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
              >
                {(message.fileName || "").match(/\.(mp3|m4a|m4b|wav|ogg|flac|aac)$/i) ? (
                  <FileAudio className={`h-5 w-5 shrink-0 ${holoSurface ? "text-cyan-300" : "text-amber-300"}`} />
                ) : (message.fileName || "").match(/\.(mp4|mkv|mov|avi|wmv)$/i) ? (
                  <Film className="h-5 w-5 shrink-0 text-sky-300" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-cyan-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm">{message.fileName || "File"}</p>
                  <p className="text-xs text-gray-400">
                    {message.fileSizeBytes
                      ? formatCommsFileSize(message.fileSizeBytes)
                      : message.mediaMimeType || ""}
                  </p>
                </div>
                <Download className="ml-auto h-4 w-4 shrink-0 text-white/50" />
              </a>
            )}
            {message.content?.trim() && (
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
            )}
          </div>
        );
      }

      case "voice-note":
        return (
          <VoiceNoteInline
            key={message.mediaUrl || message.id}
            duration={message.duration}
            url={resolveChatMediaUrl(message.mediaUrl)}
          />
        );

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
            className={`absolute z-20 -top-2 h-8 w-8 overflow-hidden rounded-full border-2 bg-slate-900 shadow-lg ${
              holoSurface
                ? "border-cyan-400/50 shadow-cyan-500/20"
                : "border-amber-400/50 shadow-amber-500/25"
            } ${isOwn ? "right-0" : "right-0"}`}
            style={{ top: "-0.5rem" }}
            title={message.senderName}
          >
            <img src={senderAvatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        {!senderAvatarUrl && (
          <div
            className={`absolute -top-1 right-0 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-bold text-white shadow-md ${
              holoSurface
                ? isOwn
                  ? "border-cyan-300/50 bg-gradient-to-br from-cyan-600/85 to-violet-700/70"
                  : "border-cyan-400/40 bg-gradient-to-br from-slate-700/90 to-cyan-700/55"
                : isOwn
                  ? "border-cyan-400/40 bg-gradient-to-br from-cyan-600/80 to-amber-600/65"
                  : "border-amber-500/35 bg-gradient-to-br from-amber-600/70 to-cyan-600/60"
            }`}
            title={message.senderName}
          >
            {bubbleInitials(message.senderName)}
          </div>
        )}
        {!isOwn && (
          <p className={`mb-0.5 ml-1 pr-9 text-[10px] font-medium ${holoSurface ? "text-cyan-200/90" : "text-amber-200/90"}`}>
            {message.senderName}
          </p>
        )}
        <div
          className={`mt-2 rounded-2xl px-3.5 py-2 ${
            holoSurface
              ? isOwn
                ? "rounded-br-md bg-gradient-to-br from-cyan-500/92 via-sky-500/85 to-violet-600/82 text-white shadow-[0_4px_22px_-4px_rgba(0,229,255,0.45),0_0_26px_-8px_rgba(139,92,246,0.32)]"
                : "rounded-bl-md border border-cyan-400/28 bg-slate-900/82 text-cyan-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
              : isOwn
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
                className={`cursor-pointer rounded-full border bg-slate-900/90 px-1.5 py-0.5 text-xs transition-colors hover:border-cyan-400/35 ${
                  holoSurface ? "border-cyan-500/35 hover:bg-cyan-950/35" : "border-amber-500/30 hover:bg-amber-950/40"
                }`}
                onClick={() => onReact?.(message.id, emoji)}
              >
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}

        {showReactions && onReact && (
          <div
            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-8 z-10 flex gap-1 rounded-full border bg-slate-950/95 px-2 py-1 shadow-xl backdrop-blur-md ${
              holoSurface
                ? "border-cyan-400/35 shadow-cyan-500/12"
                : "border-amber-500/30 shadow-orange-500/15"
            }`}
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
