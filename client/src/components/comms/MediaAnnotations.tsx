import { useState, useCallback } from "react";
import {
  MessageCircle,
  Highlighter,
  Pencil,
  Image,
  Clock,
  Send,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Film,
  Music,
} from "lucide-react";

export interface MediaAnnotation {
  id: string;
  userId: string;
  userName: string;
  type: "drawing" | "comment" | "highlight";
  data: {
    text?: string;
    color?: string;
    position?: { x: number; y: number };
    area?: { x: number; y: number; width: number; height: number };
  };
  timestamp: string;
}

export interface SharedMediaItem {
  mediaId: string;
  uploadedBy: string;
  uploaderName?: string;
  filename: string;
  type: "image" | "2d-design" | "3d-model" | "video" | "audio" | "document";
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  annotations: MediaAnnotation[];
  createdAt: string;
}

interface MediaAnnotationsProps {
  media: SharedMediaItem[];
  currentUserId: string;
  currentUserName: string;
  onAddAnnotation?: (
    mediaId: string,
    annotationType: MediaAnnotation["type"],
    annotationData: MediaAnnotation["data"]
  ) => void;
}

const mediaTypeIcons: Record<SharedMediaItem["type"], typeof Image> = {
  image: Image,
  "2d-design": Pencil,
  "3d-model": FileText,
  video: Film,
  audio: Music,
  document: FileText,
};

const annotationTypeConfig: Record<
  MediaAnnotation["type"],
  { icon: typeof MessageCircle; label: string; color: string }
> = {
  comment: {
    icon: MessageCircle,
    label: "Comment",
    color: "text-cyan-400",
  },
  highlight: {
    icon: Highlighter,
    label: "Highlight",
    color: "text-amber-400",
  },
  drawing: {
    icon: Pencil,
    label: "Drawing",
    color: "text-emerald-400",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

function AnnotationItem({ annotation }: { annotation: MediaAnnotation }) {
  const config = annotationTypeConfig[annotation.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-2.5 p-2 rounded-lg hover:bg-gray-800/30 transition-colors">
      <div
        className={`w-7 h-7 rounded-full bg-gray-800/60 flex items-center justify-center flex-shrink-0 ${config.color}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-300">
            {annotation.userName}
          </span>
          <span className="text-[10px] text-gray-600">
            {formatTime(annotation.timestamp)}
          </span>
        </div>
        {annotation.data.text && (
          <p className="text-xs text-gray-400 mt-0.5 break-words">
            {annotation.data.text}
          </p>
        )}
        {!annotation.data.text && (
          <p className="text-[11px] text-gray-600 italic mt-0.5">
            {config.label} annotation
          </p>
        )}
      </div>
    </div>
  );
}

function MediaCard({
  item,
  isSelected,
  onClick,
}: {
  item: SharedMediaItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const TypeIcon = mediaTypeIcons[item.type];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
        isSelected
          ? "bg-cyan-600/10 border border-cyan-700/30"
          : "hover:bg-gray-800/30 border border-transparent"
      }`}
    >
      <div className="w-12 h-12 rounded-lg bg-gray-800/60 flex items-center justify-center flex-shrink-0 border border-gray-700/30 overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <TypeIcon className="w-5 h-5 text-gray-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate">
          {item.filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-500">
            {formatFileSize(item.fileSize)}
          </span>
          {item.annotations.length > 0 && (
            <span className="text-[10px] text-cyan-500 flex items-center gap-0.5">
              <MessageCircle className="w-2.5 h-2.5" />
              {item.annotations.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function MediaAnnotations({
  media,
  currentUserId,
  currentUserName,
  onAddAnnotation,
}: MediaAnnotationsProps) {
  const [selectedMedia, setSelectedMedia] = useState<SharedMediaItem | null>(
    media.length > 0 ? media[0] : null
  );
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [annotationType, setAnnotationType] =
    useState<MediaAnnotation["type"]>("comment");

  const handleAddComment = useCallback(() => {
    if (!selectedMedia || !commentText.trim()) return;
    onAddAnnotation?.(selectedMedia.mediaId, annotationType, {
      text: commentText.trim(),
    });
    setCommentText("");
  }, [selectedMedia, commentText, annotationType, onAddAnnotation]);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center mb-4 border border-gray-700/40">
          <Image className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm font-medium">No shared media</p>
        <p className="text-gray-600 text-xs mt-1">
          Media shared during calls will appear here with annotations
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 flex-shrink-0 border-r border-gray-800/50 overflow-y-auto bg-gray-950/40">
        <div className="p-3 border-b border-gray-800/40">
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Shared Media
          </h4>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {media.length} item{media.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="p-1.5 space-y-0.5">
          {media.map((item) => (
            <MediaCard
              key={item.mediaId}
              item={item}
              isSelected={selectedMedia?.mediaId === item.mediaId}
              onClick={() => setSelectedMedia(item)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedMedia ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/40 bg-gray-900/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-white truncate">
                  {selectedMedia.filename}
                </span>
                <span className="text-[10px] text-gray-500 flex-shrink-0">
                  {formatFileSize(selectedMedia.fileSize)}
                </span>
              </div>
              <button
                onClick={() => setShowAnnotationSidebar(!showAnnotationSidebar)}
                className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
                title="Toggle annotations"
              >
                {showAnnotationSidebar ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 relative flex items-center justify-center bg-black/40 p-4">
                {selectedMedia.type === "image" ||
                selectedMedia.type === "2d-design" ? (
                  <img
                    src={selectedMedia.fileUrl}
                    alt={selectedMedia.filename}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : selectedMedia.type === "video" ? (
                  <video
                    src={selectedMedia.fileUrl}
                    controls
                    className="max-w-full max-h-full rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gray-800/60 flex items-center justify-center border border-gray-700/40">
                      {(() => {
                        const Icon = mediaTypeIcons[selectedMedia.type];
                        return <Icon className="w-10 h-10 text-gray-500" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        {selectedMedia.filename}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedMedia.mimeType}
                      </p>
                    </div>
                  </div>
                )}

                {selectedMedia.annotations
                  .filter((a) => a.type === "highlight" && a.data.area)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="absolute border-2 border-amber-400/60 bg-amber-400/10 rounded pointer-events-none"
                      style={{
                        left: `${a.data.area!.x}%`,
                        top: `${a.data.area!.y}%`,
                        width: `${a.data.area!.width}%`,
                        height: `${a.data.area!.height}%`,
                      }}
                    />
                  ))}
              </div>

              {showAnnotationSidebar && (
                <div className="w-64 flex-shrink-0 border-l border-gray-800/50 flex flex-col bg-gray-950/60">
                  <div className="p-3 border-b border-gray-800/40">
                    <h4 className="text-xs font-semibold text-gray-300">
                      Annotations
                    </h4>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {selectedMedia.annotations.length} annotation
                      {selectedMedia.annotations.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {selectedMedia.annotations.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-[11px] text-gray-600">
                          No annotations yet
                        </p>
                      </div>
                    ) : (
                      selectedMedia.annotations.map((annotation) => (
                        <AnnotationItem
                          key={annotation.id}
                          annotation={annotation}
                        />
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-800/40 space-y-2">
                    <div className="flex gap-1">
                      {(
                        Object.entries(annotationTypeConfig) as [
                          MediaAnnotation["type"],
                          (typeof annotationTypeConfig)[MediaAnnotation["type"]],
                        ][]
                      ).map(([type, cfg]) => {
                        const TypeIcon = cfg.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setAnnotationType(type)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                              annotationType === type
                                ? `bg-gray-800/80 ${cfg.color}`
                                : "text-gray-500 hover:text-gray-300"
                            }`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddComment()
                        }
                        placeholder={`Add ${annotationType}...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-600/50"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Select media to view
          </div>
        )}
      </div>
    </div>
  );
}
