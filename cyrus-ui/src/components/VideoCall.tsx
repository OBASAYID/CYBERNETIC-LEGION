/**
 * VideoCall — full-screen video call interface.
 *
 * Features:
 *  - Remote video (full-screen)
 *  - Local video (picture-in-picture, bottom-right)
 *  - Connecting overlay with spinner
 *  - Mute, camera-toggle, end-call, fullscreen controls
 *  - Call duration timer and connection-quality badge
 */

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Radio,
  Shield,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ActiveCallInfo, ConnectionQuality } from "@/hooks/useWebRTC";

interface VideoCallProps {
  activeCall: ActiveCallInfo;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  connectionQuality: ConnectionQuality;
  callDuration: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QualityBadge({ quality }: { quality: ConnectionQuality }) {
  const map: Record<ConnectionQuality, { icon: React.ReactNode; label: string; cls: string }> = {
    excellent: { icon: <SignalHigh className="w-3 h-3" />, label: "EXCELLENT", cls: "text-green-400 border-green-500/40" },
    good: { icon: <SignalMedium className="w-3 h-3" />, label: "GOOD", cls: "text-green-400 border-green-500/40" },
    fair: { icon: <SignalMedium className="w-3 h-3" />, label: "FAIR", cls: "text-yellow-400 border-yellow-500/40" },
    poor: { icon: <SignalLow className="w-3 h-3" />, label: "POOR", cls: "text-red-400 border-red-500/40" },
    connecting: { icon: <Radio className="w-3 h-3 animate-pulse" />, label: "CONNECTING", cls: "text-blue-400 border-blue-500/40" },
  };
  const { icon, label, cls } = map[quality];
  return (
    <Badge variant="outline" className={`font-mono text-xs gap-1 ${cls} bg-black/50 backdrop-blur-sm`}>
      {icon}
      {label}
    </Badge>
  );
}

export function VideoCall({
  activeCall,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  connectionQuality,
  callDuration,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: VideoCallProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isConnecting = connectionQuality === "connecting";
  const initial = activeCall.peerName?.[0]?.toUpperCase() ?? "?";

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => console.warn("[VideoCall] Remote play error:", e));
    }
  }, [remoteStream]);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((e) => console.warn("[VideoCall] Local play error:", e));
    }
  }, [localStream]);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed z-[150] bg-slate-950 ${isFullscreen ? "inset-0" : "inset-0"}`}
      data-testid="video-call-container"
    >
      {/* Remote video — full background */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="video-remote"
      />

      {/* Connecting overlay */}
      {isConnecting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm z-10">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            <Radio className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="text-lg font-mono text-primary">ESTABLISHING SECURE LINK</p>
          <p className="text-sm text-muted-foreground mt-1">Encrypting connection…</p>
        </div>
      )}

      {/* No remote video placeholder */}
      {!remoteStream && !isConnecting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
          <Avatar className="w-32 h-32 border-4 border-primary/30 mb-4">
            <AvatarFallback className="text-5xl font-bold bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <p className="text-xl font-bold text-white">{activeCall.peerName}</p>
          <p className="text-sm text-muted-foreground mt-1 animate-pulse">Waiting for video…</p>
        </div>
      )}

      {/* Local video PIP */}
      <div className="absolute bottom-24 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-20">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
          data-testid="video-local"
        />
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <VideoOff className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent z-20">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs gap-1 bg-black/50 backdrop-blur-sm border-green-500/40 text-green-400">
            <Shield className="w-3 h-3" />
            ENCRYPTED
          </Badge>
          <QualityBadge quality={connectionQuality} />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-white text-base tabular-nums bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
            {formatDuration(callDuration)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20 border-0"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            data-testid="btn-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="rounded-full w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
            onClick={onToggleMute}
            data-testid="btn-toggle-mute"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Camera toggle */}
          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            className="rounded-full w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
            onClick={onToggleVideo}
            data-testid="btn-toggle-video"
            aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {/* End call */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-20 h-20 shadow-lg shadow-red-500/30"
            onClick={onEndCall}
            data-testid="btn-end-call"
            aria-label="End call"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
        </div>

        {/* Peer name */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
          <span className="text-white/80 text-sm">{activeCall.peerName}</span>
        </div>
      </div>
    </div>
  );
}
