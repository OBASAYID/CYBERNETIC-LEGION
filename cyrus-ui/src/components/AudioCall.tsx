/**
 * AudioCall — full-screen audio-only call interface.
 *
 * Shows the remote user's avatar, call duration, connection quality,
 * and mute / end-call controls.
 */

import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Signal, SignalHigh, SignalMedium, SignalLow, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ActiveCallInfo, ConnectionQuality } from "@/hooks/useWebRTC";

interface AudioCallProps {
  activeCall: ActiveCallInfo;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  connectionQuality: ConnectionQuality;
  callDuration: number;
  onToggleMute: () => void;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QualityIndicator({ quality }: { quality: ConnectionQuality }) {
  const map: Record<ConnectionQuality, { icon: React.ReactNode; label: string; color: string }> = {
    excellent: { icon: <SignalHigh className="w-4 h-4" />, label: "EXCELLENT", color: "text-green-400" },
    good: { icon: <SignalMedium className="w-4 h-4" />, label: "GOOD", color: "text-green-400" },
    fair: { icon: <SignalMedium className="w-4 h-4" />, label: "FAIR", color: "text-yellow-400" },
    poor: { icon: <SignalLow className="w-4 h-4" />, label: "POOR", color: "text-red-400" },
    connecting: { icon: <Radio className="w-4 h-4 animate-pulse" />, label: "CONNECTING", color: "text-blue-400" },
  };
  const { icon, label, color } = map[quality];
  return (
    <div className={`flex items-center gap-1.5 font-mono text-xs ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function AudioCall({
  activeCall,
  remoteStream,
  isMuted,
  connectionQuality,
  callDuration,
  onToggleMute,
  onEndCall,
}: AudioCallProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attach remote audio stream
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch((e) => console.warn("[AudioCall] Audio play error:", e));
    }
  }, [remoteStream]);

  const initial = activeCall.peerName?.[0]?.toUpperCase() ?? "?";
  const isConnecting = connectionQuality === "connecting";

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Hidden audio element for remote stream */}
      <audio ref={audioRef} autoPlay playsInline data-testid="audio-remote" />

      {/* Top status bar */}
      <div className="w-full flex items-center justify-between">
        <Badge variant="outline" className="font-mono text-xs gap-1.5 border-green-500/40 text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          ENCRYPTED
        </Badge>
        <QualityIndicator quality={connectionQuality} />
      </div>

      {/* Centre — avatar + name + status */}
      <div className="flex flex-col items-center gap-6">
        {/* Audio waveform decoration */}
        <div className="flex items-end gap-1 h-12 opacity-30">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary animate-pulse"
              style={{
                height: `${Math.random() * 40 + 8}px`,
                animationDelay: `${i * 0.08}s`,
                animationDuration: `${0.6 + Math.random() * 0.6}s`,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-primary/40">
            <AvatarFallback className="text-5xl font-bold bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          {!isConnecting && (
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-slate-900" />
          )}
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-white">{activeCall.peerName}</p>
          {isConnecting ? (
            <p className="text-sm text-primary animate-pulse mt-1">Connecting…</p>
          ) : (
            <p className="text-lg font-mono text-muted-foreground mt-1 tabular-nums">
              {formatDuration(callDuration)}
            </p>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center gap-6">
        <Button
          size="lg"
          variant={isMuted ? "destructive" : "secondary"}
          className="rounded-full w-16 h-16 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-0"
          onClick={onToggleMute}
          data-testid="btn-toggle-mute"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

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
    </div>
  );
}
