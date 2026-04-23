import { useEffect, useRef } from "react";
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
  onSendMedia?: (file: File, caption: string) => void;
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
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  if (!conversationId) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden text-amber-200/60">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.28) 1px, transparent 0)",
            backgroundSize: "24px 24px, 32px 32px",
            backgroundPosition: "0 0, 12px 8px",
          }}
        />
        <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 via-yellow-500/10 to-orange-500/20 shadow-[0_0_40px_rgba(251,146,60,0.4),0_0_60px_rgba(6,182,212,0.2)]">
          <MessageSquare className="h-11 w-11 text-cyan-200" />
        </div>
        <h3
          className="relative mb-1 bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-200 bg-clip-text text-lg font-medium text-transparent"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          Select a channel
        </h3>
        <p className="relative text-sm text-amber-200/45">Pick a thread from the list to open the line</p>
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
      <div className="flex items-center gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-950/70 to-orange-950/30 px-4 py-3 shadow-[0_4px_24px_-8px_rgba(251,146,60,0.35)] backdrop-blur-md">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-amber-200/65 transition hover:bg-amber-500/15 hover:text-cyan-200 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_0_16px_rgba(251,146,60,0.4),0_0_12px_rgba(6,182,212,0.35)]">
            {isGroup ? <Users className="w-5 h-5" /> : getInitials(conversationName)}
          </div>
          {!isGroup && isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-lime-400 shadow-[0_0_6px_#a3e635]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white drop-shadow-sm">{conversationName}</h3>
          <p className={`text-xs ${isOnline ? "text-lime-300" : "text-amber-200/50"}`}>
            {statusText}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onAudioCall && (
            <button
              onClick={onAudioCall}
              className="rounded-lg p-2 text-amber-200/55 transition hover:bg-cyan-500/15 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className="rounded-lg p-2 text-amber-200/55 transition hover:bg-orange-500/15 hover:text-orange-200 hover:shadow-[0_0_12px_rgba(251,146,60,0.35)]"
            >
              <Video className="w-5 h-5" />
            </button>
          )}
          <button className="rounded-lg p-2 text-amber-200/40 transition hover:bg-white/5 hover:text-amber-100">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.1),transparent),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(249,115,22,0.08),transparent),linear-gradient(180deg,rgba(2,6,23,0.4),rgba(2,6,23,0.85))] px-4 py-3 scrollbar-thin scrollbar-thumb-amber-900/45 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-amber-200/50">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-cyan-500/20">
              <MessageSquare className="h-6 w-6 text-cyan-200/90" />
            </div>
            <p className="text-sm text-amber-100/85">No messages yet</p>
            <p className="mt-1 text-xs text-amber-200/40">Open the line — first transmission wins</p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div key={group.label}>
              <div className="my-3 flex items-center justify-center">
                <span className="rounded-full border border-amber-500/25 bg-slate-950/70 px-3 py-1 text-[10px] text-amber-200/75 shadow-[0_0_12px_rgba(251,146,60,0.25)]">
                  {group.label}
                </span>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
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
              <div className="h-2 w-2 animate-bounce rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" style={{ animationDelay: "300ms" }} />
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
    </div>
  );
}
