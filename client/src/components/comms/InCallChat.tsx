import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Image as ImageIcon, Paperclip, Send, X, FileAudio } from "lucide-react";
import { commsAssetUrl } from "@shared/cyrus-api-client";
import { COMMS_MEDIA_FILE_ACCEPT, type CommsUploadProgress } from "../../lib/comms-media-upload";
import { isCommsCad3dFile } from "../../lib/comms-cad-formats";
import { CommsMediaDropZone } from "./CommsMediaDropZone";
import { CommsMediaMessageBody } from "./CommsMediaMessageBody";
import { CommsUploadProgressBar } from "./CommsUploadProgress";
import { useCommsMediaPaste } from "../../hooks/useCommsMediaPaste";

export interface InCallChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  messageType?: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  sharedMediaId?: string;
}

interface InCallChatProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  messages: InCallChatMessage[];
  onSendMessage?: (message: string) => void;
  onSendMedia?: (
    file: File,
    caption: string,
    onProgress?: (progress: CommsUploadProgress) => void,
  ) => Promise<void>;
  onDeleteMessage?: (messageId: string) => void;
  onClose: () => void;
  socketRef?: React.MutableRefObject<any>;
}

export function InCallChat({
  roomId,
  currentUserId,
  currentUserName,
  messages,
  onSendMessage,
  onSendMedia,
  onDeleteMessage,
  onClose,
  socketRef,
}: InCallChatProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CommsUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearAttachment = useCallback(() => {
    setAttachPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const queueAttachment = useCallback(
    (file: File) => {
      if (!onSendMedia) return;
      setAttachPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { file, url: URL.createObjectURL(file) };
      });
    },
    [onSendMedia],
  );

  useCommsMediaPaste(queueAttachment, Boolean(onSendMedia) && !uploading);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (attachPreview && onSendMedia) {
      setUploading(true);
      setUploadError(null);
      setUploadProgress({ loaded: 0, total: attachPreview.file.size, percent: 0, phase: "init" });
      try {
        await onSendMedia(attachPreview.file, trimmed, setUploadProgress);
        clearAttachment();
        setText("");
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
      return;
    }
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
  }, [text, attachPreview, roomId, onSendMessage, onSendMedia, socketRef, clearAttachment]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) queueAttachment(file);
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

  const renderBody = (msg: InCallChatMessage) => (
    <CommsMediaMessageBody
      msg={msg}
      holoSurface
      compact
      roomId={roomId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      socketRef={socketRef}
    />
  );

  const canSend = Boolean((text.trim() || attachPreview) && !uploading);

  return (
    <CommsMediaDropZone
      enabled={Boolean(onSendMedia) && !uploading}
      holoSurface
      onFile={queueAttachment}
      className="flex w-80 max-w-[92vw] flex-col border-l border-cyan-500/20 bg-[#021018]/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-cyan-500/20 px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-white">In-call chat</h3>
          <p className="text-[10px] text-cyan-300/55">Drop CAD · STL · STEP · OBJ · media</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-800/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-gray-800"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-gray-500">
              Share photos, documents, or files with everyone on this call.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUserId;
            const isCad =
              msg.messageType === "cad-3d" || isCommsCad3dFile(msg.fileName, msg.fileMimeType);
            const msgKey = msg.id || `${msg.timestamp}-${idx}`;
            return (
              <div key={msgKey} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn ? (
                  <span className="mb-0.5 px-1 text-[10px] text-cyan-400/80">{msg.senderName}</span>
                ) : null}
                <div
                  className={`relative rounded-xl px-3 py-1.5 text-xs ${
                    isCad ? "max-w-[min(100%,320px)]" : "max-w-[240px]"
                  } ${
                    isOwn
                      ? "rounded-br-sm bg-cyan-600/30 text-cyan-100"
                      : "rounded-bl-sm bg-gray-800/60 text-gray-200"
                  }`}
                >
                  {isOwn && msg.id && onDeleteMessage ? (
                    <button
                      type="button"
                      title="Delete message"
                      onClick={() => onDeleteMessage(msg.id!)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-600/90 p-0.5 text-white opacity-70 hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  ) : null}
                  {renderBody(msg)}
                </div>
                <span className="mt-0.5 px-1 text-[9px] text-gray-500">{formatTime(msg.timestamp)}</span>
              </div>
            );
          })
        )}
      </div>

      {attachPreview ? (
        <div className="flex items-center gap-2 border-t border-cyan-500/15 px-3 py-2">
          <div className="relative inline-block">
            {attachPreview.file.type.startsWith("image/") ? (
              <img src={attachPreview.url} alt="" className="h-14 rounded-lg border border-gray-700/50" />
            ) : attachPreview.file.type.startsWith("video/") ? (
              <video src={attachPreview.url} className="h-14 max-w-[120px] rounded-lg border border-gray-700/50" muted playsInline />
            ) : (
              <div className="flex max-w-[160px] items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/80 px-2 py-1.5">
                {attachPreview.file.type.startsWith("audio/") ? (
                  <FileAudio className="h-4 w-4 shrink-0 text-cyan-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-cyan-400" />
                )}
                <span className="truncate text-[10px] text-gray-300">{attachPreview.file.name}</span>
              </div>
            )}
            <button
              type="button"
              onClick={clearAttachment}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      ) : null}

      <CommsUploadProgressBar
        fileName={attachPreview?.file.name}
        progress={uploadProgress}
        error={uploadError}
      />

      <div className="flex items-center gap-2 border-t border-cyan-500/20 px-3 py-2.5">
        <input
          ref={fileRef}
          type="file"
          accept={COMMS_MEDIA_FILE_ACCEPT}
          className="hidden"
          onChange={handleFilePick}
        />
        {onSendMedia ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg p-2 text-cyan-300/80 transition hover:bg-cyan-500/10 disabled:opacity-40"
            title="Attach photo, video, or file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        ) : null}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? "Uploading…" : attachPreview ? "Add a caption…" : "Message or caption…"}
          disabled={uploading}
          className="flex-1 rounded-lg border border-gray-700/40 bg-gray-800/60 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="rounded-lg bg-cyan-600 p-2 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
    </CommsMediaDropZone>
  );
}
