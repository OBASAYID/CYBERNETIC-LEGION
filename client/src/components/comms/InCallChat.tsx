import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, X } from "lucide-react";

interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

interface InCallChatProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  messages: ChatMessage[];
  onSendMessage?: (message: string) => void;
  onClose: () => void;
  socketRef?: React.MutableRefObject<any>;
}

export function InCallChat({
  roomId,
  currentUserId,
  currentUserName,
  messages,
  onSendMessage,
  onClose,
  socketRef,
}: InCallChatProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (onSendMessage) {
      onSendMessage(trimmed);
    } else if (socketRef?.current?.connected) {
      socketRef.current.emit("call-chat-message", {
        roomId,
        message: trimmed,
        timestamp: new Date().toISOString(),
      });
    }

    setText("");
  }, [text, roomId, onSendMessage, socketRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="w-72 bg-gray-900/95 border-l border-gray-800/50 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/40">
        <h3 className="text-sm font-semibold text-white">In-Call Chat</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-500 text-center">
              No messages yet.
              <br />
              Chat with call participants here.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div
                key={idx}
                className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
              >
                {!isOwn && (
                  <span className="text-[10px] text-cyan-400/80 mb-0.5 px-1">
                    {msg.senderName}
                  </span>
                )}
                <div
                  className={`max-w-[220px] px-3 py-1.5 rounded-xl text-xs ${isOwn ? "bg-cyan-600/30 text-cyan-100 rounded-br-sm" : "bg-gray-800/60 text-gray-200 rounded-bl-sm"}`}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] text-gray-500 mt-0.5 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-800/40">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800/60 border border-gray-700/40 text-white text-xs placeholder-gray-500 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
