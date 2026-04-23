import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  Users,
  ChevronDown,
  Wifi,
  WifiOff,
  Phone,
  X,
  Move,
  MapPin,
  Smile,
  Signal,
} from "lucide-react";
import { InCallChat } from "./InCallChat";
import { ScreenShareView } from "./ScreenShareView";
import { FloatingReactions, Reaction } from "./FloatingReactions";

export interface CallParticipant {
  id: string;
  displayName: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  audioLevel?: number;
  connectionQuality?: "excellent" | "good" | "fair" | "poor";
}

interface CallViewProps {
  roomId: string;
  callType: "audio" | "video";
  participants: CallParticipant[];
  localStream: MediaStream | null;
  currentUserId: string;
  currentUserName: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  callQuality?: "HD" | "SD" | "Low";
  isScreenSharing?: boolean;
  screenShareStream?: MediaStream | null;
  screenSharerName?: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onSendChatMessage?: (message: string) => void;
  onSendReaction?: (emoji: string, x: number, y: number) => void;
  onShareLocation?: () => void;
  chatMessages?: { senderId: string; senderName: string; message: string; timestamp: string }[];
  reactions?: Reaction[];
  socketRef?: React.MutableRefObject<any>;
}

interface IncomingCallOverlayProps {
  callerName: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
  isGroup?: boolean;
  groupName?: string;
}

export function IncomingCallOverlay({
  callerName,
  callType,
  onAccept,
  onDecline,
  isGroup,
  groupName,
}: IncomingCallOverlayProps) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="relative">
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-cyan-500/30 transition-transform duration-700 ${pulse ? "scale-110" : "scale-100"}`}
          >
            {callerName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
            {callType === "video" ? (
              <Video className="w-4 h-4 text-cyan-400" />
            ) : (
              <Phone className="w-4 h-4 text-cyan-400" />
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">
            {isGroup ? groupName || "Group Call" : callerName}
          </h2>
          <p className="text-sm text-gray-400">
            Incoming {callType} call{isGroup ? ` from ${callerName}` : ""}...
          </p>
        </div>

        <div className="flex items-center gap-8 mt-4">
          <button
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-600/30 transition-all active:scale-95"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-600/30 transition-all active:scale-95 animate-pulse"
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
        </div>

        <div className="flex gap-4 text-xs text-gray-500 mt-2">
          <span>Decline</span>
          <span>Accept</span>
        </div>
      </div>
    </div>
  );
}

function ParticipantVideo({
  participant,
  isSelf,
  gridSize,
}: {
  participant: CallParticipant;
  isSelf?: boolean;
  gridSize: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const qualityColor =
    participant.connectionQuality === "excellent"
      ? "text-emerald-400"
      : participant.connectionQuality === "good"
        ? "text-cyan-400"
        : participant.connectionQuality === "fair"
          ? "text-yellow-400"
          : "text-red-400";

  const qualityIcon =
    participant.connectionQuality === "poor" ? (
      <WifiOff className={`w-3.5 h-3.5 ${qualityColor}`} />
    ) : (
      <Wifi className={`w-3.5 h-3.5 ${qualityColor}`} />
    );

  const showVideo = participant.isVideoEnabled !== false && participant.stream;

  return (
    <div className="relative bg-gray-900/80 rounded-2xl overflow-hidden border border-gray-800/50 group">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center text-white text-2xl font-bold border border-cyan-500/20">
            {participant.displayName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          {participant.audioLevel !== undefined && participant.audioLevel > 0.1 && (
            <div className="mt-3 flex gap-[2px] items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full transition-all duration-150"
                  style={{
                    height: `${4 + (participant.audioLevel || 0) * 20 * (1 + Math.random() * 0.5)}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white truncate max-w-[120px]">
              {isSelf ? "You" : participant.displayName}
            </span>
            {participant.isMuted && (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          {participant.connectionQuality && (
            <div className="flex items-center gap-1">{qualityIcon}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCallDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  return "grid-cols-3 grid-rows-2";
}

export function CallView({
  roomId,
  callType,
  participants,
  localStream,
  currentUserId,
  currentUserName,
  isMuted,
  isVideoEnabled,
  callDuration,
  callQuality,
  isScreenSharing,
  screenShareStream,
  screenSharerName,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onStartScreenShare,
  onStopScreenShare,
  onSendChatMessage,
  onSendReaction,
  onShareLocation,
  chatMessages = [],
  reactions = [],
  socketRef,
}: CallViewProps) {
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handlePipMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: pipPosition.x,
        originY: pipPosition.y,
      };
    },
    [pipPosition]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPipPosition({
        x: Math.max(0, dragRef.current.originX + dx),
        y: Math.max(0, dragRef.current.originY + dy),
      });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  const allParticipants: CallParticipant[] = [
    ...participants,
  ];

  const totalCount = allParticipants.length;
  const gridClass = getGridClass(totalCount);

  const isLocalScreenSharing = isScreenSharing && screenShareStream;

  return (
    <div className="fixed inset-0 z-[90] bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-white">
            {callType === "video" ? "Video" : "Audio"} Call
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {formatCallDuration(callDuration)}
          </span>
          {callQuality && (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              callQuality === "HD" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
              callQuality === "SD" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
              "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
              <Signal className="w-3 h-3 inline mr-1" />
              {callQuality}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParticipants((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showParticipants ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}
          >
            <Users className="w-4 h-4" />
            <span>{totalCount}</span>
          </button>
          <button
            onClick={() => setShowChat((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showChat ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white hover:bg-gray-800/60"}`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={onEndCall}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative p-3">
          <FloatingReactions
            reactions={reactions}
            onSendReaction={onSendReaction}
            showReactionBar={false}
          />
          {isLocalScreenSharing || (isScreenSharing && screenShareStream) ? (
            <div className="w-full h-full flex flex-col">
              <ScreenShareView
                stream={screenShareStream!}
                sharerName={screenSharerName || ""}
                isLocal={!!isLocalScreenSharing}
                onStopSharing={onStopScreenShare}
              />
              <div className="flex gap-2 mt-2 overflow-x-auto py-1">
                {allParticipants.map((p) => (
                  <div key={p.id} className="w-32 h-24 flex-shrink-0">
                    <ParticipantVideo
                      participant={p}
                      isSelf={p.id === currentUserId}
                      gridSize={totalCount}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid ${gridClass} gap-2 h-full`}>
              {allParticipants.map((p) => (
                <ParticipantVideo
                  key={p.id}
                  participant={p}
                  isSelf={p.id === currentUserId}
                  gridSize={totalCount}
                />
              ))}
            </div>
          )}

          {localStream && totalCount > 1 && (
            <div
              className="absolute w-36 h-28 rounded-xl overflow-hidden border-2 border-gray-700/60 shadow-2xl cursor-grab active:cursor-grabbing z-10"
              style={{ bottom: `${pipPosition.y}px`, right: `${pipPosition.x}px` }}
              onMouseDown={handlePipMouseDown}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1">
                <Move className="w-3 h-3 text-white/50" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-0.5">
                <span className="text-[10px] text-white">You</span>
              </div>
            </div>
          )}
        </div>

        {showParticipants && (
          <div className="w-64 bg-gray-900/90 border-l border-gray-800/50 backdrop-blur-md overflow-y-auto">
            <div className="p-3 border-b border-gray-800/40">
              <h3 className="text-sm font-semibold text-white">
                Participants ({totalCount})
              </h3>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {currentUserName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">You</p>
                </div>
                <div className="flex items-center gap-1">
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </div>
              {participants
                .filter((p) => p.id !== currentUserId)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/60 to-blue-600/60 flex items-center justify-center text-white text-xs font-bold">
                      {p.displayName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {p.displayName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.isMuted ? (
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {p.connectionQuality && (
                        <Wifi
                          className={`w-3.5 h-3.5 ${p.connectionQuality === "excellent" || p.connectionQuality === "good" ? "text-emerald-400" : p.connectionQuality === "fair" ? "text-yellow-400" : "text-red-400"}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {showChat && (
          <InCallChat
            roomId={roomId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            messages={chatMessages}
            onSendMessage={onSendChatMessage}
            onClose={() => setShowChat(false)}
            socketRef={socketRef}
          />
        )}
      </div>

      {showReactions && onSendReaction && (
        <div className="flex justify-center pb-1 bg-gray-900/60">
          <FloatingReactions
            reactions={[]}
            onSendReaction={onSendReaction}
            showReactionBar={true}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-gray-900/80 border-t border-gray-800/40 backdrop-blur-md">
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20" : "bg-gray-700/80 hover:bg-gray-600/80"}`}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>

        {callType === "video" && (
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!isVideoEnabled ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20" : "bg-gray-700/80 hover:bg-gray-600/80"}`}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 text-white" />
            )}
          </button>
        )}

        {onStartScreenShare && (
          <button
            onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? "bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/20" : "bg-gray-700/80 hover:bg-gray-600/80"}`}
          >
            <Monitor className="w-5 h-5 text-white" />
          </button>
        )}

        <button
          onClick={() => setShowChat((p) => !p)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showChat ? "bg-cyan-600 hover:bg-cyan-500" : "bg-gray-700/80 hover:bg-gray-600/80"}`}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>

        {onSendReaction && (
          <button
            onClick={() => setShowReactions((p) => !p)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showReactions ? "bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20" : "bg-gray-700/80 hover:bg-gray-600/80"}`}
          >
            <Smile className="w-5 h-5 text-white" />
          </button>
        )}

        {onShareLocation && (
          <button
            onClick={onShareLocation}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-gray-700/80 hover:bg-gray-600/80"
            title="Share live location"
          >
            <MapPin className="w-5 h-5 text-white" />
          </button>
        )}

        <button
          onClick={onEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-600/30 transition-all active:scale-95"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
