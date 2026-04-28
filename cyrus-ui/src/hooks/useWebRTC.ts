/**
 * useWebRTC – React hook for voice/video calls via the WebRTC service.
 *
 * Wraps webRTCService with React state so components can reactively render
 * call status, connection quality, ICE diagnostics, and media streams.
 *
 * Features:
 *  • Multi-provider TURN coverage (Metered, Twilio, Numb fallback)
 *  • ICE candidate pool of 50 for fast gathering
 *  • 20-second ICE gathering timeout with diagnostic logging
 *  • 30-second WebRTC handshake timeout with auto-cleanup
 *  • ICE restart on disconnection (up to 3 attempts)
 *  • Mobile network detection → TCP/TLS TURN priority + reduced video
 *  • mDNS candidate filtering (no local IP leaks)
 *  • Adaptive connection quality reporting
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { webRTCService, type CallState, type ConnectionStats } from "@/lib/webrtc-service";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IceConnectionPhase =
  | "idle"
  | "gathering"
  | "checking"
  | "connected"
  | "completed"
  | "disconnected"
  | "failed"
  | "closed";

export interface WebRTCDiagnostics {
  /** Current ICE connection phase */
  icePhase: IceConnectionPhase;
  /** Number of ICE restart attempts made in the current call */
  iceRestartCount: number;
  /** Whether ICE candidate gathering has completed */
  gatheringComplete: boolean;
  /** Whether the peer connection is fully established */
  connectionEstablished: boolean;
  /** Timestamp (ms) when the call was connected, or null */
  connectedAt: number | null;
  /** Last error message, if any */
  lastError: string | null;
}

export interface UseWebRTCReturn {
  // ── Call state ────────────────────────────────────────────────────────
  isInCall: boolean;
  callType: "voice" | "video" | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  connectionQuality: CallState["connectionQuality"];

  // ── Streams ───────────────────────────────────────────────────────────
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // ── Diagnostics ───────────────────────────────────────────────────────
  diagnostics: WebRTCDiagnostics;

  // ── Signaling state ───────────────────────────────────────────────────
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;

  // ── Actions ───────────────────────────────────────────────────────────
  connect: (userId: string, userName: string) => Promise<void>;
  disconnect: () => void;
  startCall: (targetUserId: string, targetUserName: string, type: "voice" | "video") => Promise<void>;
  acceptCall: (callerId: string, type: "voice" | "video") => Promise<void>;
  rejectCall: (callerId: string, reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebRTC(): UseWebRTCReturn {
  const { toast } = useToast();

  // ── Signaling state ─────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ── Call state ──────────────────────────────────────────────────────────
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<CallState["connectionQuality"]>("connecting");

  // ── Streams ─────────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // ── Diagnostics ─────────────────────────────────────────────────────────
  const [diagnostics, setDiagnostics] = useState<WebRTCDiagnostics>({
    icePhase: "idle",
    iceRestartCount: 0,
    gatheringComplete: false,
    connectionEstablished: false,
    connectedAt: null,
    lastError: null,
  });

  // ── Internal refs ────────────────────────────────────────────────────────
  const callDurationTimer = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<number | null>(null);

  // ── Duration timer ───────────────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    callStartTime.current = Date.now();
    callDurationTimer.current = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (callDurationTimer.current) {
      clearInterval(callDurationTimer.current);
      callDurationTimer.current = null;
    }
    callStartTime.current = null;
    setCallDuration(0);
  }, []);

  // ── Reset call state ─────────────────────────────────────────────────────
  const resetCallState = useCallback(() => {
    setIsInCall(false);
    setCallType(null);
    setRemoteUserId(null);
    setRemoteUserName(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionQuality("connecting");
    setDiagnostics((prev) => ({
      ...prev,
      icePhase: "idle",
      iceRestartCount: 0,
      gatheringComplete: false,
      connectionEstablished: false,
      connectedAt: null,
    }));
    stopDurationTimer();
  }, [stopDurationTimer]);

  // ── Wire up service event handlers ───────────────────────────────────────
  useEffect(() => {
    // Signaling connectivity
    webRTCService.setOnReconnecting((attempt) => {
      setIsReconnecting(true);
      setReconnectAttempt(attempt);
      toast({
        title: "Reconnecting…",
        description: `Attempt ${attempt} – restoring signaling connection`,
        variant: "destructive",
      });
    });

    webRTCService.setOnReconnected(() => {
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setIsConnected(true);
      toast({ title: "Reconnected", description: "Signaling connection restored" });
    });

    webRTCService.setOnDisconnected(() => {
      setIsConnected(false);
    });

    // Media streams
    webRTCService.setOnLocalStream((stream) => {
      setLocalStream(stream);
    });

    webRTCService.setOnRemoteStream((stream) => {
      setRemoteStream(stream);
      // Remote stream arriving means the media path is up
      setDiagnostics((prev) => ({
        ...prev,
        connectionEstablished: true,
        connectedAt: prev.connectedAt ?? Date.now(),
      }));
      startDurationTimer();
    });

    // Connection quality (driven by ICE state + stats monitoring)
    webRTCService.setOnConnectionQuality((quality) => {
      setConnectionQuality(quality);

      // Map quality events to ICE phase diagnostics
      setDiagnostics((prev) => {
        let icePhase = prev.icePhase;
        let connectionEstablished = prev.connectionEstablished;
        let connectedAt = prev.connectedAt;
        let iceRestartCount = prev.iceRestartCount;

        if (quality === "connecting") {
          icePhase = "checking";
        } else if (quality === "excellent" || quality === "good") {
          icePhase = "connected";
          connectionEstablished = true;
          connectedAt = connectedAt ?? Date.now();
        } else if (quality === "poor") {
          icePhase = "disconnected";
          iceRestartCount = iceRestartCount + 1;
        }

        return { ...prev, icePhase, connectionEstablished, connectedAt, iceRestartCount };
      });
    });

    // Call lifecycle
    webRTCService.setOnCallEnd(() => {
      toast({ title: "Call ended" });
      resetCallState();
    });

    return () => {
      // Handlers are replaced on next mount; no explicit teardown needed
    };
  }, [toast, startDurationTimer, resetCallState]);

  // ── Public actions ───────────────────────────────────────────────────────

  const connect = useCallback(
    async (userId: string, userName: string) => {
      try {
        await webRTCService.connect(userId, userName);
        setIsConnected(true);
        setIsReconnecting(false);
      } catch (err) {
        console.error("[useWebRTC] connect failed:", err);
        setDiagnostics((prev) => ({
          ...prev,
          lastError: err instanceof Error ? err.message : String(err),
        }));
        toast({
          title: "Connection failed",
          description: "Could not connect to signaling server. Check your network.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  const disconnect = useCallback(() => {
    webRTCService.disconnect();
    setIsConnected(false);
    resetCallState();
  }, [resetCallState]);

  const startCall = useCallback(
    async (targetUserId: string, targetUserName: string, type: "voice" | "video") => {
      try {
        setIsInCall(true);
        setCallType(type);
        setRemoteUserId(targetUserId);
        setRemoteUserName(targetUserName);
        setDiagnostics((prev) => ({
          ...prev,
          icePhase: "gathering",
          gatheringComplete: false,
          connectionEstablished: false,
          connectedAt: null,
          lastError: null,
          iceRestartCount: 0,
        }));

        await webRTCService.startCall(targetUserId, targetUserName, type);
      } catch (err) {
        console.error("[useWebRTC] startCall failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        setDiagnostics((prev) => ({ ...prev, lastError: msg, icePhase: "failed" }));
        toast({
          title: "Call failed",
          description: msg,
          variant: "destructive",
        });
        resetCallState();
        throw err;
      }
    },
    [toast, resetCallState]
  );

  const acceptCall = useCallback(
    async (callerId: string, type: "voice" | "video") => {
      try {
        setIsInCall(true);
        setCallType(type);
        setRemoteUserId(callerId);
        setDiagnostics((prev) => ({
          ...prev,
          icePhase: "gathering",
          gatheringComplete: false,
          connectionEstablished: false,
          connectedAt: null,
          lastError: null,
          iceRestartCount: 0,
        }));

        await webRTCService.acceptCall(callerId, type);
      } catch (err) {
        console.error("[useWebRTC] acceptCall failed:", err);
        const msg = err instanceof Error ? err.message : String(err);
        setDiagnostics((prev) => ({ ...prev, lastError: msg, icePhase: "failed" }));
        toast({
          title: "Could not accept call",
          description: msg,
          variant: "destructive",
        });
        resetCallState();
        throw err;
      }
    },
    [toast, resetCallState]
  );

  const rejectCall = useCallback(
    (callerId: string, reason = "Call declined") => {
      webRTCService.rejectCall(callerId, reason);
    },
    []
  );

  const endCall = useCallback(() => {
    webRTCService.endCall(true);
    resetCallState();
  }, [resetCallState]);

  const toggleMute = useCallback(() => {
    const nowMuted = webRTCService.toggleMute();
    setIsMuted(nowMuted);
  }, []);

  const toggleVideo = useCallback(() => {
    const nowOff = webRTCService.toggleVideo();
    setIsVideoOff(nowOff);
  }, []);

  return {
    // Call state
    isInCall,
    callType,
    remoteUserId,
    remoteUserName,
    isMuted,
    isVideoOff,
    callDuration,
    connectionQuality,
    // Streams
    localStream,
    remoteStream,
    // Diagnostics
    diagnostics,
    // Signaling
    isConnected,
    isReconnecting,
    reconnectAttempt,
    // Actions
    connect,
    disconnect,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
