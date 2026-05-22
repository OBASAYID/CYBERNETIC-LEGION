import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { ConversationList, Conversation } from "./ConversationList";
import { ChatView } from "./ChatView";
import { CommsMessage } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

interface CommsPlatformProps {
  conversations: Conversation[];
  messages: CommsMessage[];
  currentUserId: string;
  typingUsers?: Record<string, string[]>;
  initialConversationId?: string | null;
  onSendMessage: (conversationId: string, content: string) => void;
  onSendMedia?: (conversationId: string, file: File, caption: string) => void;
  onSendVoice?: (conversationId: string, blob: Blob, duration: number) => void;
  onSendLocation?: (conversationId: string) => void;
  onToggleEmoji?: () => void;
  onTypingStart?: (conversationId: string) => void;
  onTypingStop?: (conversationId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onAudioCall?: (conversationId: string, name: string) => void;
  onVideoCall?: (conversationId: string, name: string) => void;
  onCreateGroup?: () => void;
  onNewChat?: () => void;
  sidebar?: React.ReactNode;
  /** e.g. full user directory (all online/offline) */
  roster?: React.ReactNode;
  getAvatarForUser?: (userId: string) => string | null | undefined;
  /** New chat (MessageSquare): bottom composer + cascade + roster picks */
  newChatMode?: boolean;
  newChatCascadeKey?: number;
  newChatPicks?: string[];
  onToggleNewChatPick?: (userId: string) => void;
  onNewChatSend?: (content: string) => void;
  onDismissNewChat?: () => void;
  getUserDisplayName?: (userId: string) => string;
  /** Shown on smaller screens when roster is hidden; tap to toggle picks. */
  newChatPickCandidates?: { id: string; displayName: string }[];
  /** Full NEXUS glass / cyan reference surface (replaces legacy amber chat chrome). */
  holoSurface?: boolean;
}

export function CommsPlatform({
  conversations,
  messages,
  currentUserId,
  typingUsers = {},
  initialConversationId,
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
  onCreateGroup,
  onNewChat,
  sidebar,
  roster,
  getAvatarForUser,
  newChatMode = false,
  newChatCascadeKey = 0,
  newChatPicks = [],
  onToggleNewChatPick,
  onNewChatSend,
  onDismissNewChat,
  getUserDisplayName,
  newChatPickCandidates = [],
  holoSurface = false,
}: CommsPlatformProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [cascadeVisible, setCascadeVisible] = useState(false);

  useEffect(() => {
    if (newChatCascadeKey > 0) {
      setCascadeVisible(true);
      const t = window.setTimeout(() => setCascadeVisible(false), 5000);
      return () => window.clearTimeout(t);
    }
  }, [newChatCascadeKey]);

  useEffect(() => {
    if (initialConversationId) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        setSelectedConversation(conv);
        setMobileView("chat");
      }
    }
  }, [initialConversationId, conversations]);

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv);
      setMobileView("chat");
      onDismissNewChat?.();
    },
    [onDismissNewChat]
  );

  const handleBack = useCallback(() => {
    setMobileView("list");
  }, []);

  const filteredMessages = selectedConversation
    ? messages.filter(
        (m) =>
          m.recipientId === selectedConversation.id ||
          m.senderId === selectedConversation.id ||
          (selectedConversation.isGroup && m.recipientId === selectedConversation.id)
      )
    : [];

  const currentTyping = selectedConversation ? typingUsers[selectedConversation.id] || [] : [];

  const firstPick = newChatPicks[0];
  const pickLabel = firstPick && getUserDisplayName ? getUserDisplayName(firstPick) : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div
        className="relative flex min-h-0 flex-1 overflow-hidden"
        style={holoSurface ? { perspective: "1500px" } : undefined}
      >
      {cascadeVisible && (
        <div key={newChatCascadeKey} className="comms-chat-cascade" aria-hidden>
          <div className="comms-chat-cascade__band" />
        </div>
      )}
      {holoSurface ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(0,229,255,0.12),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(139,92,246,0.08),transparent_50%)]"
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_20%_-20%,rgba(251,191,36,0.12),transparent_50%),radial-gradient(ellipse_100%_60%_at_100%_0%,rgba(249,115,22,0.08),transparent_45%),radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(6,182,212,0.1),transparent_50%)]"
          aria-hidden
        />
      )}
      {sidebar && (
        <div
          className={`relative hidden w-16 shrink-0 flex-col items-center border-r py-4 lg:flex ${
            holoSurface
              ? "border-cyan-500/25 bg-black/30 backdrop-blur-md"
              : "border-amber-500/20 bg-gradient-to-b from-amber-950/25 to-slate-950/50"
          }`}
        >
          {sidebar}
        </div>
      )}

      <div
        className={`relative w-full shrink-0 border-r md:w-80 lg:w-80 ${
          holoSurface
            ? "border-cyan-400/35 bg-black/35 shadow-[inset_0_0_48px_rgba(0,229,255,0.07),0_0_40px_-16px_rgba(0,229,255,0.2)] backdrop-blur-xl md:rounded-l-2xl md:[transform:rotateY(5deg)] md:[transform-origin:right_center]"
            : "border-amber-500/25 bg-gradient-to-b from-amber-950/20 via-slate-950/40 to-orange-950/15 shadow-[inset_0_0_40px_rgba(251,146,60,0.06)]"
        } ${
          mobileView === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}
      >
        <ConversationList
          holoSurface={holoSurface}
          conversations={conversations}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
          onCreateGroup={onCreateGroup}
          onNewChat={onNewChat}
        />
      </div>

      <div
        className={`relative min-h-0 min-w-0 flex-1 ${
          holoSurface
            ? "border-cyan-400/25 bg-black/28 shadow-[inset_0_0_70px_rgba(0,229,255,0.05)] backdrop-blur-xl md:scale-[1.01] md:[transform-origin:center_top]"
            : "bg-gradient-to-br from-cyan-950/25 via-slate-950/50 to-orange-950/18"
        } ${
          mobileView === "list" ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}
      >
        <ChatView
          holoSurface={holoSurface}
          conversationId={selectedConversation?.id || null}
          conversationName={selectedConversation?.name || ""}
          isGroup={selectedConversation?.isGroup || false}
          isOnline={selectedConversation?.isOnline}
          participantCount={selectedConversation?.participants?.length}
          messages={filteredMessages}
          currentUserId={currentUserId}
          getAvatarForUser={getAvatarForUser}
          typingUsers={currentTyping}
          onSendMessage={(content) =>
            selectedConversation && onSendMessage(selectedConversation.id, content)
          }
          onSendMedia={
            onSendMedia && selectedConversation
              ? (file, caption) => onSendMedia(selectedConversation.id, file, caption)
              : undefined
          }
          onSendVoice={
            onSendVoice && selectedConversation
              ? (blob, dur) => onSendVoice(selectedConversation.id, blob, dur)
              : undefined
          }
          onSendLocation={
            onSendLocation && selectedConversation
              ? () => onSendLocation(selectedConversation.id)
              : undefined
          }
          onToggleEmoji={onToggleEmoji}
          onTypingStart={
            onTypingStart && selectedConversation
              ? () => onTypingStart(selectedConversation.id)
              : undefined
          }
          onTypingStop={
            onTypingStop && selectedConversation
              ? () => onTypingStop(selectedConversation.id)
              : undefined
          }
          onReact={onReact}
          onAudioCall={
            onAudioCall && selectedConversation
              ? () => onAudioCall(selectedConversation.id, selectedConversation.name)
              : undefined
          }
          onVideoCall={
            onVideoCall && selectedConversation
              ? () => onVideoCall(selectedConversation.id, selectedConversation.name)
              : undefined
          }
          onBack={handleBack}
          composerSuppressed={newChatMode}
        />
      </div>

      {roster && (
        <div
          className={`hidden w-[min(100%,18rem)] shrink-0 min-[1100px]:flex min-[1100px]:flex-col min-[1100px]:border-l ${
            holoSurface
              ? "min-[1100px]:border-cyan-400/35 min-[1100px]:bg-black/35 min-[1100px]:shadow-[inset_0_0_40px_rgba(0,229,255,0.06),0_0_36px_-14px_rgba(0,229,255,0.18)] min-[1100px]:backdrop-blur-xl min-[1100px]:rounded-r-2xl min-[1100px]:[transform:rotateY(-5deg)] min-[1100px]:[transform-origin:left_center]"
              : "min-[1100px]:border-amber-500/25"
          }`}
        >
          {roster}
        </div>
      )}
      </div>

      {newChatMode && onNewChatSend && (
        <div
          className={`relative z-40 shrink-0 border-t backdrop-blur-md ${
            holoSurface
              ? "border-cyan-400/45 bg-gradient-to-r from-slate-950/95 via-cyan-950/35 to-violet-950/30 shadow-[0_-8px_36px_-6px_rgba(0,229,255,0.22)]"
              : "border-orange-500/40 bg-gradient-to-r from-slate-950/98 via-orange-950/30 to-cyan-950/40 shadow-[0_-8px_32px_-6px_rgba(249,115,22,0.25)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <p
              className={`min-w-0 text-[10px] font-mono ${
                holoSurface ? "text-cyan-100/90" : "text-orange-200/90"
              }`}
            >
              <span className="text-cyan-300/90">New chat</span>
              {newChatPicks.length > 0 ? (
                <span className={holoSurface ? "text-cyan-50/90" : "text-amber-100/80"}>
                  {" "}
                  → {pickLabel || "Selected"}
                  {newChatPicks.length > 1 ? ` +${newChatPicks.length - 1}` : ""}
                </span>
              ) : (
                <span className="text-white/50"> — pick users (green) in the roster or below</span>
              )}
            </p>
            {onDismissNewChat && (
              <button
                type="button"
                onClick={onDismissNewChat}
                className="shrink-0 rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
                title="Close new-chat bar"
                aria-label="Close new chat mode"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {onToggleNewChatPick && newChatPickCandidates.length > 0 && (
            <div className="flex min-[1100px]:hidden flex-wrap gap-1.5 border-b border-white/5 px-3 py-1.5">
              {newChatPickCandidates.map((u) => {
                const on = newChatPicks.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggleNewChatPick(u.id)}
                    className={`max-w-[8rem] truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                      on
                        ? "border-lime-400/90 bg-lime-500/20 text-lime-100 shadow-[0_0_10px_rgba(74,222,128,0.45)]"
                        : holoSurface
                          ? "border-white/10 bg-slate-900/60 text-cyan-200/75 hover:border-cyan-400/35"
                          : "border-white/10 bg-slate-900/60 text-amber-200/70 hover:border-amber-500/30"
                    }`}
                  >
                    {u.displayName}
                  </button>
                );
              })}
            </div>
          )}
          <MessageInput
            holoSurface={holoSurface}
            onSend={(content) => onNewChatSend(content)}
            onSendMedia={
              firstPick
                ? (file, caption) => onSendMedia?.(firstPick, file, caption)
                : undefined
            }
            onSendVoice={
              firstPick
                ? (blob, dur) => onSendVoice?.(firstPick, blob, dur)
                : undefined
            }
            onSendLocation={firstPick ? () => onSendLocation?.(firstPick) : undefined}
            onTypingStart={firstPick && onTypingStart ? () => onTypingStart(firstPick) : undefined}
            onTypingStop={firstPick && onTypingStop ? () => onTypingStop(firstPick) : undefined}
            disabled={newChatPicks.length === 0}
            placeholder={
              newChatPicks.length
                ? pickLabel
                  ? `Message to ${pickLabel}…`
                  : "Type a message…"
                : "Select one or more users in the roster (right) first…"
            }
          />
        </div>
      )}
    </div>
  );
}
