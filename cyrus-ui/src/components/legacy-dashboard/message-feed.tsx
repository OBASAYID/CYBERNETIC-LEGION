import { Camera, Check, Copy, Mail, MessageCircle, Share2, X } from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  role: "user" | "cyrus";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
  imageUrl?: string;
  hasVideo?: boolean;
  videoUrl?: string;
};

export function LegacyMessageFeed({
  messages,
  isThinking,
  cyrusEmblem,
  shareMessageId,
  copiedMessageId,
  setShareMessageId,
  shareToWhatsApp,
  shareToFacebook,
  shareToEmail,
  copyToClipboard,
  messagesEndRef,
}: {
  messages: Message[];
  isThinking: boolean;
  cyrusEmblem: string;
  shareMessageId: string | null;
  copiedMessageId: string | null;
  setShareMessageId: (value: string | null) => void;
  shareToWhatsApp: (content: string) => void;
  shareToFacebook: (content: string) => void;
  shareToEmail: (content: string) => void;
  copyToClipboard: (content: string, messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            data-testid={`message-${message.role}-${message.id}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                message.role === "user" ? "bg-blue-500 text-white" : "bg-white/10 text-white"
              }`}
            >
              {message.role === "cyrus" && (
                <div className="flex items-center gap-2 mb-2">
                  <img src={cyrusEmblem} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-xs font-medium text-white/60">CYRUS</span>
                </div>
              )}
              {message.hasVideo && message.videoUrl && (
                <div className="mb-3 max-w-full rounded-xl overflow-hidden border border-white/15 bg-black/30">
                  <video
                    src={message.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-64 w-full object-contain"
                    data-testid="video-message-attachment"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
              {message.hasImage && message.imageUrl && (
                <div className="mb-3">
                  <img
                    src={message.imageUrl}
                    alt="Uploaded image"
                    className="max-w-full max-h-64 rounded-xl object-contain"
                    data-testid="img-message-attachment"
                  />
                </div>
              )}
              {message.hasImage && !message.imageUrl && (
                <div className="flex items-center gap-1.5 text-xs text-white/50 mb-2">
                  <Camera className="w-3 h-3" />
                  <span>Photo attached</span>
                </div>
              )}
              {message.role === "cyrus" ? (
                <>
                  <div className="text-[15px] leading-relaxed prose prose-invert prose-sm max-w-none prose-headings:text-white prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-p:text-white/90 prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5 prose-ol:my-2 prose-ol:pl-4 prose-strong:text-white prose-strong:font-semibold prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-emerald-400 prose-pre:bg-black/40 prose-pre:p-3 prose-pre:rounded-lg prose-hr:border-white/20 prose-hr:my-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10">
                    {shareMessageId === message.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-white/50 mr-1">Share via:</span>
                        <button
                          onClick={() => shareToWhatsApp(message.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-full text-xs font-medium transition-colors"
                          data-testid={`share-whatsapp-${message.id}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => shareToFacebook(message.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-medium transition-colors"
                          data-testid={`share-facebook-${message.id}`}
                        >
                          <FaFacebook className="w-3.5 h-3.5" />
                          Facebook
                        </button>
                        <button
                          onClick={() => shareToEmail(message.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-full text-xs font-medium transition-colors"
                          data-testid={`share-email-${message.id}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </button>
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
                          data-testid={`share-copy-${message.id}`}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedMessageId === message.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => setShareMessageId(null)}
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white/50" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShareMessageId(message.id)}
                        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
                        data-testid={`share-button-${message.id}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start" data-testid="message-thinking">
            <div className="bg-white/10 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <img src={cyrusEmblem} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-xs font-medium text-white/60">CYRUS</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

