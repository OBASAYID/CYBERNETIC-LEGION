import { useState, useCallback } from "react";
import {
  Radio,
  Camera,
  Monitor,
  Tv,
  Eye,
  Play,
  Square,
  Users,
  Signal,
  Plus,
  X,
  Wifi,
} from "lucide-react";

export interface LiveStream {
  streamId: string;
  streamName: string;
  sourceType: "drone" | "cctv" | "webcam" | "screen" | "rtsp";
  sourceUrl?: string;
  broadcasterId: string;
  broadcasterName?: string;
  viewers: { userId: string; joinedAt: string }[];
  status: "active" | "paused" | "ended";
  quality: "4K" | "1080p" | "720p" | "480p";
  startTime: string;
  endTime?: string;
}

interface LiveStreamPanelProps {
  streams: LiveStream[];
  currentUserId: string;
  onStartStream?: (data: {
    streamName: string;
    sourceType: LiveStream["sourceType"];
    sourceUrl?: string;
    quality: LiveStream["quality"];
  }) => void;
  onEndStream?: (streamId: string) => void;
  onJoinStream?: (streamId: string) => void;
  onLeaveStream?: (streamId: string) => void;
}

const sourceTypeConfig: Record<
  LiveStream["sourceType"],
  { icon: typeof Camera; label: string; color: string }
> = {
  drone: { icon: Radio, label: "Drone", color: "text-amber-400" },
  cctv: { icon: Tv, label: "CCTV", color: "text-red-400" },
  webcam: { icon: Camera, label: "Webcam", color: "text-emerald-400" },
  screen: { icon: Monitor, label: "Screen", color: "text-blue-400" },
  rtsp: { icon: Signal, label: "RTSP", color: "text-purple-400" },
};

const qualityColors: Record<string, string> = {
  "4K": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "1080p": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "720p": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "480p": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function StreamCard({
  stream,
  currentUserId,
  onEndStream,
  onJoinStream,
  onLeaveStream,
}: {
  stream: LiveStream;
  currentUserId: string;
  onEndStream?: (streamId: string) => void;
  onJoinStream?: (streamId: string) => void;
  onLeaveStream?: (streamId: string) => void;
}) {
  const [viewing, setViewing] = useState(false);
  const config = sourceTypeConfig[stream.sourceType];
  const Icon = config.icon;
  const isOwner = stream.broadcasterId === currentUserId;
  const isViewing = stream.viewers.some((v) => v.userId === currentUserId);
  const elapsed = Math.floor(
    (Date.now() - new Date(stream.startTime).getTime()) / 1000
  );
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const handleToggleView = useCallback(() => {
    if (viewing) {
      setViewing(false);
      onLeaveStream?.(stream.streamId);
    } else {
      setViewing(true);
      onJoinStream?.(stream.streamId);
    }
  }, [viewing, stream.streamId, onJoinStream, onLeaveStream]);

  return (
    <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 backdrop-blur-md overflow-hidden hover:border-cyan-800/40 transition-all">
      {viewing && (
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/90 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-800/80 flex items-center justify-center border border-gray-700/50">
              <Icon className={`w-8 h-8 ${config.color}`} />
            </div>
            <p className="text-xs text-gray-500 font-mono">
              {stream.sourceType === "rtsp"
                ? "Awaiting RTSP connection..."
                : "Stream preview"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400 font-mono uppercase">
                Live
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleView}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg bg-gray-800/80 flex items-center justify-center border border-gray-700/40 flex-shrink-0`}
            >
              <Icon className={`w-4.5 h-4.5 ${config.color}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {stream.streamName}
              </h4>
              <p className="text-[11px] text-gray-500 truncate">
                {stream.broadcasterName || stream.broadcasterId.substring(0, 12)}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${qualityColors[stream.quality]}`}
          >
            {stream.quality}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {stream.viewers.length}
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" />
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            <span
              className={`flex items-center gap-1 ${config.color} opacity-70`}
            >
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isOwner && !viewing && (
              <button
                onClick={handleToggleView}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 text-[11px] font-medium transition-colors"
              >
                <Play className="w-3 h-3" />
                Watch
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onEndStream?.(stream.streamId)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[11px] font-medium transition-colors"
              >
                <Square className="w-3 h-3" />
                End
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveStreamPanel({
  streams,
  currentUserId,
  onStartStream,
  onEndStream,
  onJoinStream,
  onLeaveStream,
}: LiveStreamPanelProps) {
  const [showNewStream, setShowNewStream] = useState(false);
  const [newStreamName, setNewStreamName] = useState("");
  const [newSourceType, setNewSourceType] =
    useState<LiveStream["sourceType"]>("webcam");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newQuality, setNewQuality] =
    useState<LiveStream["quality"]>("720p");

  const activeStreams = streams.filter((s) => s.status === "active");

  const handleCreateStream = useCallback(() => {
    if (!newStreamName.trim()) return;
    onStartStream?.({
      streamName: newStreamName.trim(),
      sourceType: newSourceType,
      sourceUrl: newSourceUrl.trim() || undefined,
      quality: newQuality,
    });
    setNewStreamName("");
    setNewSourceUrl("");
    setShowNewStream(false);
  }, [newStreamName, newSourceType, newSourceUrl, newQuality, onStartStream]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Live Streams
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {activeStreams.length} active stream
            {activeStreams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewStream(!showNewStream)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 text-xs font-medium transition-colors border border-cyan-600/20"
        >
          {showNewStream ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {showNewStream ? "Cancel" : "New Stream"}
        </button>
      </div>

      {showNewStream && (
        <div className="rounded-xl border border-cyan-800/30 bg-gray-900/60 backdrop-blur-md p-4 space-y-3">
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Start New Stream
          </h4>

          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">
              Stream Name
            </label>
            <input
              type="text"
              value={newStreamName}
              onChange={(e) => setNewStreamName(e.target.value)}
              placeholder="e.g. Drone Feed Alpha"
              className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-600/50"
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-400 mb-1.5 block">
              Source Type
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                Object.entries(sourceTypeConfig) as [
                  LiveStream["sourceType"],
                  (typeof sourceTypeConfig)[LiveStream["sourceType"]],
                ][]
              ).map(([type, cfg]) => {
                const TypeIcon = cfg.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewSourceType(type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition-all ${
                      newSourceType === type
                        ? `border-cyan-600/50 bg-cyan-600/10 ${cfg.color}`
                        : "border-gray-700/40 bg-gray-800/40 text-gray-500 hover:border-gray-600/50"
                    }`}
                  >
                    <TypeIcon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(newSourceType === "rtsp" || newSourceType === "cctv") && (
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">
                Source URL
              </label>
              <input
                type="text"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                placeholder="rtsp://camera-ip:554/stream"
                className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-600/50 font-mono"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-gray-400 mb-1.5 block">
              Quality
            </label>
            <div className="flex gap-2">
              {(["4K", "1080p", "720p", "480p"] as LiveStream["quality"][]).map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => setNewQuality(q)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                      newQuality === q
                        ? qualityColors[q]
                        : "border-gray-700/40 bg-gray-800/40 text-gray-500 hover:border-gray-600/50"
                    }`}
                  >
                    {q}
                  </button>
                )
              )}
            </div>
          </div>

          <button
            onClick={handleCreateStream}
            disabled={!newStreamName.trim()}
            className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Streaming
          </button>
        </div>
      )}

      {activeStreams.length === 0 && !showNewStream ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center mb-4 border border-gray-700/40">
            <Radio className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm font-medium">
            No active streams
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Start a new stream to broadcast drone, CCTV, or webcam feeds
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activeStreams.map((stream) => (
            <StreamCard
              key={stream.streamId}
              stream={stream}
              currentUserId={currentUserId}
              onEndStream={onEndStream}
              onJoinStream={onJoinStream}
              onLeaveStream={onLeaveStream}
            />
          ))}
        </div>
      )}

      <div className="pt-2">
        <h4 className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
          Supported Sources
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(sourceTypeConfig) as [
              LiveStream["sourceType"],
              (typeof sourceTypeConfig)[LiveStream["sourceType"]],
            ][]
          ).map(([type, cfg]) => {
            const TypeIcon = cfg.icon;
            return (
              <div
                key={type}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/30 border border-gray-800/30"
              >
                <TypeIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                <span className="text-[11px] text-gray-500">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
