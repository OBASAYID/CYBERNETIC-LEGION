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
  Paperclip,
  Sparkles,
  Circle,
  Loader2,
} from "lucide-react";
import type { CallSessionStatus } from "@shared/calls/call-session-types";
import type { CommsCallQualityLabel } from "../../realtime/comms-quality-engine";
import { COMMS_MEDIA_FILE_ACCEPT } from "../../lib/comms-media-upload";
import {
  attachMediaStreamToAudio,
  attachMediaStreamToVideo,
  extractAudioOnlyStream,
} from "../../lib/comms-video-playback";
import { InCallChat } from "./InCallChat";
import { ScreenShareView } from "./ScreenShareView";
import { FloatingReactions, Reaction } from "./FloatingReactions";
import {
  cycleCommsMediaFilterMode,
  getCommsMediaFilterLabel,
  getCommsMediaFilterMode,
  type CommsMediaFilterMode,
} from "../../lib/comms-media-filters";

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
  /** True while ICE/DTLS or remote tracks are still coming up (avoid “connected but silent” UX). */
  mediaEstablishing?: boolean;
  /** Call session phase from Presence (connecting → connected → reconnecting). */
  sessionStatus?: CallSessionStatus;
  /** Composite link quality from call diagnostics. */
  connectionLabel?: CommsCallQualityLabel;
  isScreenSharing?: boolean;
  screenShareStream?: MediaStream | null;
  screenSharerName?: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onSendChatMessage?: (message: string) => void;
  /** Dedicated remote MediaStream (P2P) — main stage uses video tracks from this, not localStream. */
  remoteStream?: MediaStream | null;
  onSendCallMedia?: (file: File, caption: string) => Promise<void>;
  onSendReaction?: (emoji: string, x: number, y: number) => void;
  onShareLocation?: () => void;
  chatMessages?: { senderId: string; senderName: string; message: string; timestamp: string }[];
  reactions?: Reaction[];
  socketRef?: React.MutableRefObject<any>;
  /** Fires when remote media `play()` is blocked (autoplay policy). */
  onRemotePlaybackDiagnostics?: (detail: { blocked: boolean; scope: "remote_video" }) => void;
  onRecoverMedia?: () => void;
  isRecording?: boolean;
  isRecordingUploading?: boolean;
  recordingDurationSec?: number;
  remoteRecordingActive?: boolean;
  remoteRecordingBy?: string;
  onToggleRecording?: () => void;
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
            type="button"
            data-testid="comms-accept-call"
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-600/30 transition-all active:scale-95 animate-pulse"
            aria-label="Accept call"
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

function RemoteAudioSink({
  stream,
  onPlaybackBlocked,
}: {
  stream: MediaStream | null | undefined;
  onPlaybackBlocked?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const attach = () => {
      void attachMediaStreamToAudio(el, extractAudioOnlyStream(stream ?? null), {
        volume: 1,
        onPlaybackBlocked,
      });
    };

    attach();
    const ms = stream ?? null;
    if (!ms) return;
    ms.onaddtrack = () => attach();
    return () => {
      ms.onaddtrack = null;
    };
  }, [stream, onPlaybackBlocked]);

  return <audio ref={audioRef} autoPlay playsInline data-cyrus-remote-call="1" className="sr-only" aria-hidden />;
}

function ParticipantVideo({
  participant,
  isSelf,
  gridSize,
  onRemotePlaybackDiagnostics,
}: {
  participant: CallParticipant;
  isSelf?: boolean;
  gridSize: number;
  onRemotePlaybackDiagnostics?: (detail: { blocked: boolean; scope: "remote_video" }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    void attachMediaStreamToVideo(videoRef.current, participant.stream ?? null, {
      muted: !!isSelf,
      volume: 1,
      onPlaybackStarted: () => {
        if (!isSelf) onRemotePlaybackDiagnostics?.({ blocked: false, scope: "remote_video" });
      },
      onPlaybackBlocked: () => {
        if (!isSelf) onRemotePlaybackDiagnostics?.({ blocked: true, scope: "remote_video" });
      },
    });
  }, [participant.stream, isSelf, onRemotePlaybackDiagnostics]);

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
          muted
          className="h-full w-full object-cover [transform:translateZ(0)]"
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

function connectionLabelClasses(label?: CommsCallQualityLabel): string {
  switch (label) {
    case "Excellent":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/35";
    case "Good":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/35";
    case "Poor":
      return "bg-amber-500/20 text-amber-200 border-amber-500/35";
    case "Critical":
      return "bg-red-500/20 text-red-300 border-red-500/35";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  }
}

/** Remote tile should bind video tracks only — never reuse the local camera stream. */
function videoOnlyStream(stream: MediaStream | null | undefined): MediaStream | null {
  if (!stream) return null;
  const tracks = stream.getVideoTracks().filter((t) => t.readyState !== "ended");
  return tracks.length ? new MediaStream(tracks) : null;
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
  mediaEstablishing = false,
  sessionStatus,
  connectionLabel,
  isScreenSharing,
  screenShareStream,
  screenSharerName,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onStartScreenShare,
  onStopScreenShare,
  onSendChatMessage,
  remoteStream: remoteStreamProp,
  onSendCallMedia,
  onSendReaction,
  onShareLocation,
  chatMessages = [],
  reactions = [],
  socketRef,
  onRemotePlaybackDiagnostics,
  onRecoverMedia,
  isRecording = false,
  isRecordingUploading = false,
  recordingDurationSec = 0,
  remoteRecordingActive = false,
  remoteRecordingBy,
  onToggleRecording,
}: CallViewProps) {
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaFilterMode, setMediaFilterMode] = useState<CommsMediaFilterMode>(getCommsMediaFilterMode);
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteMainRef = useRef<HTMLVideoElement>(null);
  const callMediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const syncMode = () => setMediaFilterMode(getCommsMediaFilterMode());
    window.addEventListener("cyrus-media-filters-changed", syncMode);
    return () => window.removeEventListener("cyrus-media-filters-changed", syncMode);
  }, []);

  const handleCallMediaPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !onSendCallMedia) return;
      setShowChat(true);
      setMediaUploading(true);
      try {
        await onSendCallMedia(file, "");
      } finally {
        setMediaUploading(false);
      }
    },
    [onSendCallMedia],
  );

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
  const remoteParticipant = participants.find((p) => p.id !== currentUserId);
  const remoteMediaStream = remoteParticipant?.stream ?? remoteStreamProp ?? null;
  const remoteAudioStream = remoteMediaStream;
  const remoteVideoStream = videoOnlyStream(remoteMediaStream);
  const remoteDisplayName = remoteParticipant?.displayName ?? "Participant";
  const isOneToOne = participants.filter((p) => p.id !== currentUserId).length <= 1;
  /** macOS/Safari: play remote audio on the main <video> when video tracks exist. */
  const playRemoteAudioOnMainVideo = isOneToOne && Boolean(remoteVideoStream);
  const isReconnecting = sessionStatus === "reconnecting";
  const isImmersiveOneToOne =
    isOneToOne && !isLocalScreenSharing && !(isScreenSharing && screenShareStream);

  const handleRemotePlaybackBlocked = useCallback(() => {
    setRemoteAudioBlocked(true);
    onRemotePlaybackDiagnostics?.({ blocked: true, scope: "remote_video" });
  }, [onRemotePlaybackDiagnostics]);

  const handleRemotePlaybackStarted = useCallback(() => {
    setRemoteAudioBlocked(false);
    onRemotePlaybackDiagnostics?.({ blocked: false, scope: "remote_video" });
  }, [onRemotePlaybackDiagnostics]);

  useEffect(() => {
    if (!isOneToOne) return;
    void attachMediaStreamToVideo(remoteMainRef.current, remoteMediaStream, {
      muted: !playRemoteAudioOnMainVideo,
      volume: 1,
      onPlaybackStarted: handleRemotePlaybackStarted,
      onPlaybackBlocked: handleRemotePlaybackBlocked,
    });
  }, [
    isOneToOne,
    remoteMediaStream,
    playRemoteAudioOnMainVideo,
    handleRemotePlaybackStarted,
    handleRemotePlaybackBlocked,
  ]);

  const statusPill = (
    <>
      <div
        className={`w-2 h-2 rounded-full ${
          isReconnecting ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"
        }`}
      />
      <span className="text-sm font-medium text-white">
        {isReconnecting
          ? "Reconnecting"
          : `${callType === "video" ? "Video" : "Audio"} Call`}
      </span>
      <span className="text-xs text-gray-300/90 font-mono tabular-nums">
        {formatCallDuration(callDuration)}
      </span>
      {(connectionLabel || callQuality) && (
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            connectionLabel
              ? connectionLabelClasses(connectionLabel)
              : callQuality === "HD"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : callQuality === "SD"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          <Signal className="w-3 h-3 inline mr-1" />
          {connectionLabel ?? callQuality}
        </span>
      )}
      {mediaFilterMode !== "off" && (
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            mediaFilterMode === "studio"
              ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
          }`}
        >
          <Sparkles className="w-3 h-3 inline mr-1" />
          {getCommsMediaFilterLabel(mediaFilterMode)}
        </span>
      )}
      {(isRecording || isRecordingUploading) && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/15 text-rose-200 animate-pulse">
          <Circle className="w-3 h-3 inline mr-1 fill-rose-400 text-rose-400" />
          {isRecordingUploading ? "Saving…" : `REC ${formatCallDuration(recordingDurationSec)}`}
        </span>
      )}
      {!isRecording && !isRecordingUploading && remoteRecordingActive && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200/90">
          <Circle className="w-3 h-3 inline mr-1 fill-rose-400/80 text-rose-400/80" />
          {remoteRecordingBy ? `${remoteRecordingBy} recording` : "Recording active"}
        </span>
      )}
      {mediaEstablishing && !isReconnecting && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-200">
          Connecting…
        </span>
      )}
    </>
  );

  const headerBar = (
    <div
      className={
        isImmersiveOneToOne
          ? "absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none [&_button]:pointer-events-auto"
          : "flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800/40 backdrop-blur-md"
      }
    >
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">{statusPill}</div>
      <div className="flex items-center gap-2 shrink-0">
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
        {!isImmersiveOneToOne && (
          <button
            onClick={onEndCall}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gray-950 relative">
      {!playRemoteAudioOnMainVideo && (
        <RemoteAudioSink stream={remoteAudioStream} onPlaybackBlocked={handleRemotePlaybackBlocked} />
      )}
      {!isImmersiveOneToOne && headerBar}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isImmersiveOneToOne && headerBar}
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
                      onRemotePlaybackDiagnostics={onRemotePlaybackDiagnostics}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : isOneToOne ? (
            <div className="absolute inset-0 bg-black">
              {remoteVideoStream ? (
                <video
                  ref={remoteMainRef}
                  autoPlay
                  playsInline
                  muted={!playRemoteAudioOnMainVideo}
                  data-cyrus-remote-call="1"
                  className="absolute inset-0 h-full w-full object-contain sm:object-cover [transform:translateZ(0)]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-cyan-500/20 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 text-3xl font-bold text-white">
                    {remoteDisplayName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <p className="mt-4 text-base font-medium text-white/85">{remoteDisplayName}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {callType === "audio"
                      ? mediaEstablishing
                        ? "Connecting audio…"
                        : "Voice call active"
                      : mediaEstablishing
                        ? "Connecting video…"
                        : "Waiting for remote camera…"}
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute bottom-4 left-4 z-[5] rounded-lg bg-black/55 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-sm font-medium text-white">{remoteDisplayName}</span>
              </div>
              {remoteAudioBlocked && (
                <button
                  type="button"
                  className="absolute left-1/2 top-1/2 z-[15] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/50 bg-amber-500/20 px-5 py-2.5 text-sm font-semibold text-amber-100 shadow-lg backdrop-blur-sm"
                  onClick={() => {
                    void (async () => {
                      onRecoverMedia?.();
                      try {
                        await remoteMainRef.current?.play();
                      } catch {
                        /* retry via recover */
                      }
                    })();
                  }}
                >
                  Tap to enable sound
                </button>
              )}
              {isReconnecting && (
                <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/25 bg-black/65 px-8 py-6 shadow-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                    <p className="text-sm font-semibold text-white">Reconnecting…</p>
                    <p className="text-xs text-gray-400">Restoring your media connection</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`grid ${gridClass} gap-2 h-full`}>
              {allParticipants.map((p) => (
                <ParticipantVideo
                  key={p.id}
                  participant={{
                    ...p,
                    stream: p.id === currentUserId ? p.stream : videoOnlyStream(p.stream) ?? p.stream,
                  }}
                  isSelf={p.id === currentUserId}
                  gridSize={totalCount}
                  onRemotePlaybackDiagnostics={onRemotePlaybackDiagnostics}
                />
              ))}
            </div>
          )}

          {localStream && callType === "video" && isOneToOne && (
            <div
              className="absolute z-20 w-40 max-w-[36vw] overflow-hidden rounded-xl border-2 border-white/25 shadow-2xl cursor-grab active:cursor-grabbing"
              style={{
                aspectRatio: "4 / 3",
                bottom: `${pipPosition.y + (isImmersiveOneToOne ? 88 : 12)}px`,
                right: `${pipPosition.x + 12}px`,
              }}
              onMouseDown={handlePipMouseDown}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                data-cyrus-local-pip="1"
                className="h-full w-full object-cover"
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
            onSendMedia={onSendCallMedia}
            onClose={() => setShowChat(false)}
            socketRef={socketRef}
          />
        )}
      </div>

      {showReactions && onSendReaction && (
        <div className={`flex justify-center pb-1 ${isImmersiveOneToOne ? "absolute bottom-28 left-0 right-0 z-30" : "bg-gray-900/60"}`}>
          <FloatingReactions
            reactions={[]}
            onSendReaction={onSendReaction}
            showReactionBar={true}
          />
        </div>
      )}

      <div
        className={
          isImmersiveOneToOne
            ? "absolute bottom-5 left-1/2 z-30 -translate-x-1/2"
            : "shrink-0 w-full"
        }
      >
        <div
          className={
            isImmersiveOneToOne
              ? "flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 shadow-2xl"
              : "flex items-center justify-center gap-3 px-4 py-4 bg-gray-900/80 border-t border-gray-800/40 backdrop-blur-md"
          }
        >
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

        {onSendCallMedia ? (
          <>
            <input
              ref={callMediaInputRef}
              type="file"
              accept={COMMS_MEDIA_FILE_ACCEPT}
              className="hidden"
              onChange={(e) => void handleCallMediaPick(e)}
            />
            <button
              type="button"
              disabled={mediaUploading}
              onClick={() => callMediaInputRef.current?.click()}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                mediaUploading ? "bg-cyan-600/80" : "bg-gray-700/80 hover:bg-gray-600/80"
              } disabled:opacity-50`}
              title="Share photo or file"
            >
              <Paperclip className="w-5 h-5 text-white" />
            </button>
          </>
        ) : null}

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

        <button
          type="button"
          onClick={() => setMediaFilterMode(cycleCommsMediaFilterMode())}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            mediaFilterMode === "off"
              ? "bg-gray-700/80 hover:bg-gray-600/80"
              : mediaFilterMode === "studio"
                ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/20"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
          }`}
          title={`${getCommsMediaFilterLabel(mediaFilterMode)} — tap to cycle (applies on next call)`}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>

        {onToggleRecording && (
          <button
            type="button"
            disabled={isRecordingUploading}
            onClick={onToggleRecording}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 animate-pulse"
                : isRecordingUploading
                  ? "bg-rose-600/60"
                  : "bg-gray-700/80 hover:bg-gray-600/80"
            } disabled:opacity-50`}
            title={
              isRecordingUploading
                ? "Saving recording…"
                : isRecording
                  ? "Stop recording"
                  : "Record call"
            }
          >
            <Circle
              className={`w-5 h-5 ${isRecording ? "fill-white text-white" : "text-white"}`}
            />
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
          type="button"
          data-testid="comms-end-call"
          onClick={onEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-600/30 transition-all active:scale-95"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
        </div>
      </div>
    </div>
  );
}
