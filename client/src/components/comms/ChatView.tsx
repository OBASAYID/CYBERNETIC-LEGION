import { useEffect, useRef, useCallback } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Users,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { MessageBubble, CommsMessage } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { CommsMediaDropZone } from "./CommsMediaDropZone";
import { GroupWorkAssessmentPanel } from "./GroupWorkAssessmentPanel";

interface ChatViewProps {
  conversationId: string | null;
  conversationName: string;
  isGroup: boolean;
  isOnline?: boolean;
  participantCount?: number;
  messages: CommsMessage[];
  currentUserId: string;
  typingUsers?: string[];
  onSendMessage: (content: string) => void;
  onSendMedia?: (
    file: File,
    caption: string,
    onProgress?: (progress: import("../../lib/comms-media-upload").CommsUploadProgress) => void,
  ) => Promise<void> | void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onSendLocation?: () => void;
  onToggleEmoji?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onBack?: () => void;
  getAvatarForUser?: (userId: string) => string | null | undefined;
  /** When true, bottom message input is hidden (e.g. floating new-chat composer is shown). */
  composerSuppressed?: boolean;
  holoSurface?: boolean;
  participantIds?: string[];
  getUserDisplayName?: (userId: string) => string;
}

export function ChatView({
  conversationId,
  conversationName,
  isGroup,
  isOnline,
  participantCount,
  messages,
  currentUserId,
  typingUsers = [],
  onSendMessage,
  onSendMedia,
  onSendVoice,
  onSendLocation,
  onToggleEmoji,
  onTypingStart,
  onTypingStop,
  onReact,
  onAudioCall,
  onVideoCall,
  onBack,
  getAvatarForUser,
  composerSuppressed = false,
  holoSurface = false,
  participantIds,
  getUserDisplayName,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDropMedia = useCallback(
    (file: File) => {
      onSendMedia?.(file, "");
    },
    [onSendMedia],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  if (!conversationId) {
    return (
      <div
        className={`relative flex h-full flex-col items-center justify-center overflow-hidden ${holoSurface ? "text-cyan-200/55" : "text-amber-200/60"}`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: holoSurface
              ? "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.45) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(139, 92, 246, 0.22) 1px, transparent 0)"
              : "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.28) 1px, transparent 0)",
            backgroundSize: "24px 24px, 32px 32px",
            backgroundPosition: "0 0, 12px 8px",
          }}
        />
        <div
          className={
            holoSurface
              ? "relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/22 via-sky-500/12 to-violet-500/20 shadow-[0_0_40px_rgba(0,229,255,0.35),0_0_60px_rgba(139,92,246,0.2)]"
              : "relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 via-yellow-500/10 to-orange-500/20 shadow-[0_0_40px_rgba(251,146,60,0.4),0_0_60px_rgba(6,182,212,0.2)]"
          }
        >
          <MessageSquare className="h-11 w-11 text-cyan-200" />
        </div>
        <h3
          className={
            holoSurface
              ? "relative mb-1 bg-gradient-to-r from-cyan-200 via-sky-100 to-violet-200 bg-clip-text text-lg font-medium text-transparent"
              : "relative mb-1 bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-200 bg-clip-text text-lg font-medium text-transparent"
          }
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          {holoSurface ? "Your secure comms hub" : "Select a channel"}
        </h3>
        <p className={`relative max-w-sm px-6 text-center text-sm ${holoSurface ? "text-cyan-200/50" : "text-amber-200/45"}`}>
          {holoSurface
            ? "Choose a conversation to send encrypted messages, voice notes, media, and 3D CAD models."
            : "Pick a thread from the list to open the line"}
        </p>
        {holoSurface ? (
          <ul className="relative mt-5 flex flex-wrap justify-center gap-2 px-4">
            {["Encrypted chat", "Voice notes", "Media & CAD", "HD calls"].map((label) => (
              <li
                key={label}
                className="rounded-full border border-cyan-500/25 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-medium text-cyan-100/75"
              >
                {label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const statusText = isGroup
    ? `${participantCount || 0} participants`
    : isOnline
      ? "Online"
      : "Offline";

  const groupByDate = (msgs: CommsMessage[]) => {
    const groups: { label: string; messages: CommsMessage[] }[] = [];
    let currentLabel = "";
    for (const msg of msgs) {
      const d = new Date(msg.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let label: string;
      if (d.toDateString() === today.toDateString()) {
        label = "Today";
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = "Yesterday";
      } else {
        label = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      }
      if (label !== currentLabel) {
        groups.push({ label, messages: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  };

  const dateGroups = groupByDate(messages);

  return (
    <div className="relative flex h-full flex-col">
      <div
        className={
          holoSurface
            ? "flex items-center gap-3 border-b border-cyan-400/30 bg-gradient-to-r from-slate-950/75 via-cyan-950/25 to-violet-950/20 px-4 py-3 shadow-[0_4px_24px_-8px_rgba(0,229,255,0.25)] backdrop-blur-md"
            : "flex items-center gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-950/70 to-orange-950/30 px-4 py-3 shadow-[0_4px_24px_-8px_rgba(251,146,60,0.35)] backdrop-blur-md"
        }
      >
        {onBack && (
          <button
            onClick={onBack}
            className={
              holoSurface
                ? "rounded-lg p-1.5 text-cyan-200/70 transition hover:bg-cyan-500/15 hover:text-cyan-50 md:hidden"
                : "rounded-lg p-1.5 text-amber-200/65 transition hover:bg-amber-500/15 hover:text-cyan-200 md:hidden"
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="relative">
          <div
            className={
              holoSurface
                ? "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-sm font-semibold text-white shadow-[0_0_16px_rgba(0,229,255,0.35),0_0_12px_rgba(139,92,246,0.3)]"
                : "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_0_16px_rgba(251,146,60,0.4),0_0_12px_rgba(6,182,212,0.35)]"
            }
          >
            {isGroup ? <Users className="w-5 h-5" /> : getInitials(conversationName)}
          </div>
          {!isGroup && isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-lime-400 shadow-[0_0_6px_#a3e635]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white drop-shadow-sm">{conversationName}</h3>
          <p className={`text-xs ${isOnline ? "text-lime-300" : holoSurface ? "text-cyan-200/45" : "text-amber-200/50"}`}>
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onAudioCall && (
            <button
              onClick={onAudioCall}
              className={
                holoSurface
                  ? "rounded-lg p-2 text-cyan-200/60 transition hover:bg-cyan-500/20 hover:text-cyan-50 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                  : "rounded-lg p-2 text-amber-200/55 transition hover:bg-cyan-500/15 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
              }
            >
              <Phone className="w-5 h-5" />
            </button>
          )}
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className={
                holoSurface
                  ? "rounded-lg p-2 text-cyan-200/55 transition hover:bg-violet-500/18 hover:text-violet-100 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "rounded-lg p-2 text-amber-200/55 transition hover:bg-orange-500/15 hover:text-orange-200 hover:shadow-[0_0_12px_rgba(251,146,60,0.35)]"
              }
            >
              <Video className="w-5 h-5" />
            </button>
          )}
          <button
            className={
              holoSurface
                ? "rounded-lg p-2 text-cyan-200/40 transition hover:bg-white/5 hover:text-cyan-100"
                : "rounded-lg p-2 text-amber-200/40 transition hover:bg-white/5 hover:text-amber-100"
            }
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isGroup && conversationId ? (
        <GroupWorkAssessmentPanel
          groupId={conversationId}
          groupName={conversationName}
          myUserId={currentUserId}
          participantIds={participantIds}
          getUserDisplayName={getUserDisplayName}
          holoSurface={holoSurface}
        />
      ) : null}

      <CommsMediaDropZone
        enabled={Boolean(onSendMedia) && !composerSuppressed}
        holoSurface={holoSurface}
        onFile={handleDropMedia}
        className="flex min-h-0 flex-1 flex-col"
      >
      <div
        ref={scrollRef}
        className={
          holoSurface
            ? "flex-1 space-y-1 overflow-y-auto bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,229,255,0.09),transparent),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(139,92,246,0.08),transparent),linear-gradient(180deg,rgba(2,6,23,0.35),rgba(2,6,23,0.88))] px-4 py-3 scrollbar-thin scrollbar-thumb-cyan-900/40 scrollbar-track-transparent"
            : "flex-1 space-y-1 overflow-y-auto bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.1),transparent),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(249,115,22,0.08),transparent),linear-gradient(180deg,rgba(2,6,23,0.4),rgba(2,6,23,0.85))] px-4 py-3 scrollbar-thin scrollbar-thumb-amber-900/45 scrollbar-track-transparent"
        }
      >
        {messages.length === 0 ? (
          <div className={`flex h-full flex-col items-center justify-center ${holoSurface ? "text-cyan-200/50" : "text-amber-200/50"}`}>
            <div
              className={
                holoSurface
                  ? "mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/28 to-violet-500/18"
                  : "mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-cyan-500/20"
              }
            >
              <MessageSquare className="h-6 w-6 text-cyan-200/90" />
            </div>
            <p className={`text-sm ${holoSurface ? "text-cyan-100/85" : "text-amber-100/85"}`}>No messages yet</p>
            <p className={`mt-1 text-xs ${holoSurface ? "text-cyan-200/38" : "text-amber-200/40"}`}>
              Open the line — attach, paste, or drop files to share
            </p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.label}>
              <div className="my-3 flex items-center justify-center">
                <span
                  className={
                    holoSurface
                      ? "rounded-full border border-cyan-500/30 bg-slate-950/70 px-3 py-1 text-[10px] text-cyan-200/80 shadow-[0_0_12px_rgba(0,229,255,0.22)]"
                      : "rounded-full border border-amber-500/25 bg-slate-950/70 px-3 py-1 text-[10px] text-amber-200/75 shadow-[0_0_12px_rgba(251,146,60,0.25)]"
                  }
                >
                  {group.label}
                </span>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  holoSurface={holoSurface}
                  message={msg}
                  isOwn={msg.senderId === currentUserId}
                  senderAvatarUrl={getAvatarForUser?.(msg.senderId) ?? msg.senderAvatarUrl}
                  onReact={onReact}
                />
              ))}
            </div>
          ))
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex gap-1">
              <div
                className={`h-2 w-2 animate-bounce rounded-full ${holoSurface ? "bg-cyan-300 shadow-[0_0_6px_#22d3ee]" : "bg-amber-400 shadow-[0_0_6px_#fbbf24]"}`}
                style={{ animationDelay: "0ms" }}
              />
              <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" style={{ animationDelay: "150ms" }} />
              <div
                className={`h-2 w-2 animate-bounce rounded-full ${holoSurface ? "bg-violet-400 shadow-[0_0_6px_#a78bfa]" : "bg-amber-400 shadow-[0_0_6px_#fbbf24]"}`}
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs text-cyan-200/70">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
      </div>

      {!composerSuppressed && (
        <MessageInput
          holoSurface={holoSurface}
          onSend={onSendMessage}
          onSendMedia={onSendMedia}
          onSendVoice={onSendVoice}
          onSendLocation={onSendLocation}
          onToggleEmoji={onToggleEmoji}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          disabled={!conversationId}
        />
      )}
      </CommsMediaDropZone>
    </div>
  );
}
