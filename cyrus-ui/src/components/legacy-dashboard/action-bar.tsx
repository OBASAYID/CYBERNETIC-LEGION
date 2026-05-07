import {
  Camera,
  CameraOff,
  FileDown,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Paperclip,
  Phone,
  Send,
  Shield,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { BiometricVerification } from "@/components/biometric-verification";
import { CommunicationPanel } from "@/components/communication-panel";
import { setSessionToken } from "@/lib/auth-storage";

type UploadedFile = {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  url: string;
  isImage?: boolean;
  isVideo?: boolean;
};

type PendingAttachment = { file: File; preview: string; type: string } | null;

export function LegacyActionBar({
  isContinuousListening,
  cameraActive,
  isRecording,
  showFileUpload,
  showBiometric,
  showCommunication,
  savedPhotosCount,
  isThinking,
  pendingAttachment,
  inputText,
  isListening,
  chatFileInputRef,
  onToggleContinuousListening,
  onToggleCamera,
  onToggleFileUpload,
  onToggleBiometric,
  onToggleCommunication,
  onOpenGallery,
  onExportConversation,
  onClearChatHistory,
  onStartRecording,
  onStopRecording,
  onFileSelect,
  onAnalyzeFile,
  onInputChange,
  onFileInputChange,
  onRemoveAttachment,
  onSend,
  onMessage,
}: {
  isContinuousListening: boolean;
  cameraActive: boolean;
  isRecording: boolean;
  showFileUpload: boolean;
  showBiometric: boolean;
  showCommunication: boolean;
  savedPhotosCount: number;
  isThinking: boolean;
  pendingAttachment: PendingAttachment;
  inputText: string;
  isListening: boolean;
  chatFileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleContinuousListening: () => void;
  onToggleCamera: () => void;
  onToggleFileUpload: () => void;
  onToggleBiometric: () => void;
  onToggleCommunication: () => void;
  onOpenGallery: () => void;
  onExportConversation: () => void;
  onClearChatHistory: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileSelect: (file: UploadedFile) => void;
  onAnalyzeFile: (file: UploadedFile) => void;
  onInputChange: (value: string) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
  onMessage: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-black border-t border-white/5">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={onToggleContinuousListening}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
              isContinuousListening
                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            data-testid="button-continuous-mic"
          >
            {isContinuousListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            <span className="text-[10px] font-medium">{isContinuousListening ? "On" : "Mic"}</span>
          </button>

          <button
            onClick={onToggleCamera}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
              cameraActive ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            data-testid="button-camera"
          >
            {cameraActive ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
            <span className="text-[10px] font-medium">{cameraActive ? "Stop" : "Camera"}</span>
          </button>

          {cameraActive && (
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
                isRecording ? "bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse" : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
              data-testid="button-record-video"
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              <span className="text-[10px] font-medium">{isRecording ? "Stop" : "Record"}</span>
            </button>
          )}

          <button
            onClick={onToggleFileUpload}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
              showFileUpload ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            data-testid="button-file-upload"
          >
            <Upload className="w-6 h-6" />
            <span className="text-[10px] font-medium">Upload</span>
          </button>

          <button
            onClick={onToggleBiometric}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
              showBiometric ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            data-testid="button-biometric"
          >
            <Shield className="w-6 h-6" />
            <span className="text-[10px] font-medium">Security</span>
          </button>

          <button
            onClick={onToggleCommunication}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 min-w-[64px] ${
              showCommunication ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            data-testid="button-communication"
          >
            <Phone className="w-6 h-6" />
            <span className="text-[10px] font-medium">Comms</span>
          </button>

          {savedPhotosCount > 0 && (
            <button
              onClick={onOpenGallery}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/10 text-white/70 hover:bg-white/15 transition-all duration-200 min-w-[64px]"
              data-testid="button-gallery"
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{savedPhotosCount}</span>
            </button>
          )}

          <button
            onClick={onExportConversation}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/10 text-white/70 hover:bg-white/15 transition-all duration-200 min-w-[64px]"
            data-testid="button-export"
          >
            <FileDown className="w-6 h-6" />
            <span className="text-[10px] font-medium">Export</span>
          </button>

          <button
            onClick={onClearChatHistory}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/10 text-red-400 hover:bg-red-500/20 transition-all duration-200 min-w-[64px]"
            data-testid="button-clear-chat"
          >
            <Trash2 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Clear</span>
          </button>
        </div>
      </div>

      {showFileUpload && (
        <div className="max-w-2xl mx-auto mb-4 bg-white/5 rounded-2xl p-4">
          <FileUpload compact onFileSelect={onFileSelect} onAnalyze={onAnalyzeFile} />
        </div>
      )}

      {showBiometric && (
        <div className="max-w-xl mx-auto mb-4 bg-white/5 rounded-2xl p-4">
          <BiometricVerification
            mode="both"
            onVerified={(result) => {
              if (result.verified && result.operator) {
                onMessage();
              }
            }}
            onSessionToken={(token) => {
              setSessionToken(token);
            }}
          />
        </div>
      )}

      {showCommunication && (
        <div className="max-w-2xl mx-auto mb-4 bg-white/5 rounded-2xl p-4">
          <CommunicationPanel
            operatorName={localStorage.getItem("cyrus_operator_name") || "Operator"}
            operatorId={localStorage.getItem("cyrus_operator_id") || `user-${Date.now()}`}
            isAuthenticated={true}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {pendingAttachment && (
          <div className="mb-3 bg-white/10 rounded-xl p-3 flex items-center gap-3">
            {pendingAttachment.type === "image" ? (
              <img src={pendingAttachment.preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {pendingAttachment.type === "video" ? (
                  <video
                    src={pendingAttachment.preview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-blue-400" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{pendingAttachment.file.name}</p>
              <p className="text-white/50 text-xs">{(pendingAttachment.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={onRemoveAttachment}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              data-testid="button-remove-attachment"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={chatFileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            onChange={onFileInputChange}
            className="hidden"
            data-testid="input-file-hidden"
          />

          <button
            onClick={() => chatFileInputRef.current?.click()}
            className="p-3.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-all duration-200"
            data-testid="button-attach-file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder={pendingAttachment ? "Add a caption..." : isContinuousListening ? "Listening..." : "Message CYRUS"}
              className="w-full px-5 py-3.5 bg-white/10 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all text-[15px]"
              disabled={isThinking}
              data-testid="input-message"
            />
            {isContinuousListening && isListening && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <button
            onClick={onSend}
            disabled={(!inputText.trim() && !pendingAttachment) || isThinking}
            className="p-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-full transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:shadow-none"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

