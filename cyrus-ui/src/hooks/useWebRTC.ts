/**
 * useWebRTC — React hook wrapping webRTCService with proper audio/video handling.
 *
 * Key fixes for audio playback:
 * - Explicit audio: true constraint for all call types (voice and video)
 * - Remote audio tracks are explicitly enabled when received via ontrack
 * - Provides remoteStream state so consumers can attach it to an <audio> element
 * - Logs all track/stream lifecycle events for debugging
 * - Surfaces getUserMedia errors with user-friendly messages
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { webRTCService, type OnlineUser, type ChatMessage } from "@/lib/webrtc-service";
import { useToast } from "@/hooks/use-toast";

export interface UseWebRTCOptions {
  userId: string;
  userName: string;
  isAuthenticated: boolean;
}

export interface UseWebRTCReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  onlineUsers: OnlineUser[];
  messages: ChatMessage[];
  isInCall: boolean;
  callType: "voice" | "video" | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isCallConnecting: boolean;
  incomingCall: { from: string; callerName: string; callType: "voice" | "video" } | null;
  callDuration: number;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "connecting";
  selectedUser: OnlineUser | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  /** Ref to attach to a local <video> element */
  localVideoRef: React.RefObject<HTMLVideoElement>;
  /** Ref to attach to a remote <video> element (video calls) */
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  /** Ref to attach to a hidden <audio> element for remote audio (all call types) */
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  startCall: (user: OnlineUser, type: "voice" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (sendSignal?: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendMessage: (text: string) => void;
  setSelectedUser: (user: OnlineUser | null) => void;
}

export function useWebRTC({
  userId,
  userName,
  isAuthenticated,
}: UseWebRTCOptions): UseWebRTCReturn {
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallConnecting, setIsCallConnecting] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    callerName: string;
    callType: "voice" | "video";
  } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "fair" | "poor" | "connecting"
  >("connecting");
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Attach remote stream to audio/video elements whenever it changes ────────
  useEffect(() => {
    if (!remoteStream) return;

    const audioTracks = remoteStream.getAudioTracks();
    console.log(
      `[useWebRTC] Remote stream updated — audio tracks: ${audioTracks.length}, video tracks: ${remoteStream.getVideoTracks().length}`
    );

    // Ensure all remote audio tracks are enabled
    audioTracks.forEach((track) => {
      if (!track.enabled) {
        console.log("[useWebRTC] Enabling remote audio track:", track.id);
        track.enabled = true;
      }
    });

    // Attach to hidden <audio> element for reliable audio playback on all call types
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current
        .play()
        .then(() => {
          console.log("[useWebRTC] Remote audio element playing");
        })
        .catch((err) => {
          console.warn("[useWebRTC] Remote audio play() failed:", err);
        });
    } else {
      console.warn("[useWebRTC] remoteAudioRef not mounted — audio may not play");
    }

    // Also attach to remote video element for video calls
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current
        .play()
        .catch((err) => console.log("[useWebRTC] Remote video play() error:", err));
    }
  }, [remoteStream]);

  // ─── Attach local stream to local video element ───────────────────────────────
  useEffect(() => {
    if (!localStream) return;
    console.log("[useWebRTC] Local stream updated — tracks:", localStream.getTracks().length);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current
        .play()
        .catch((err) => console.log("[useWebRTC] Local video play() error:", err));
    }
  }, [localStream]);

  // ─── Call duration timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isInCall && !isCallConnecting) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isInCall, isCallConnecting]);

  // ─── Connect to signaling server and wire up all handlers ────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    console.log("[useWebRTC] Connecting as", userName, "(", userId, ")");

    webRTCService
      .connect(userId, userName)
      .then(() => {
        setIsConnected(true);
        setIsReconnecting(false);
        toast({
          title: "CYRUS COMMS Online",
          description: "Secure channel established — Ready for communication",
        });
      })
      .catch((error) => {
        console.error("[useWebRTC] Connection failed:", error);
        toast({
          title: "Connection Failed",
          description: "Could not establish secure channel",
          variant: "destructive",
        });
      });

    webRTCService.setOnUserList((users) => {
      setOnlineUsers(users.filter((u) => u.id !== userId));
    });

    webRTCService.setOnMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    webRTCService.setOnIncomingCall((data) => {
      console.log("[useWebRTC] Incoming call from:", data.callerName, "type:", data.callType);
      setIncomingCall(data);
      toast({
        title: "Incoming Transmission",
        description: `${data.callerName} requesting ${data.callType} link`,
      });
    });

    webRTCService.setOnCallResponse((data) => {
      if (data.accepted) {
        setIsCallConnecting(true);
        toast({
          title: "Link Accepted",
          description: "Establishing secure connection…",
        });
      } else {
        toast({
          title: "Link Declined",
          description: data.reason || "Connection request denied",
          variant: "destructive",
        });
        setIsInCall(false);
        setCallType(null);
        setIsCallConnecting(false);
      }
    });

    webRTCService.setOnCallEnd(() => {
      endCallInternal(false);
      toast({
        title: "Transmission Ended",
        description: "Secure channel closed",
      });
    });

    webRTCService.setOnRemoteStream((stream) => {
      console.log(
        "[useWebRTC] Remote stream received — audio tracks:",
        stream.getAudioTracks().length,
        "video tracks:",
        stream.getVideoTracks().length
      );

      // Ensure audio tracks are enabled
      stream.getAudioTracks().forEach((track) => {
        console.log(
          "[useWebRTC] Remote audio track:",
          track.id,
          "enabled:",
          track.enabled,
          "readyState:",
          track.readyState
        );
        track.enabled = true;
      });

      setRemoteStream(stream);
      setIsCallConnecting(false);
    });

    webRTCService.setOnLocalStream((stream) => {
      console.log("[useWebRTC] Local stream received — tracks:", stream.getTracks().length);
      setLocalStream(stream);
    });

    webRTCService.setOnConnectionQuality((quality) => {
      setConnectionQuality(quality);
    });

    webRTCService.setOnReconnecting((attempt) => {
      setIsReconnecting(true);
      setReconnectAttempt(attempt);
      toast({ title: "Reconnecting", description: `Attempt ${attempt}/10…` });
    });

    webRTCService.setOnReconnected(() => {
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setIsConnected(true);
      toast({ title: "Reconnected", description: "Secure channel restored" });
    });

    webRTCService.setOnDisconnected(() => {
      setIsConnected(false);
    });

    return () => {
      webRTCService.disconnect();
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, userName]);

  // ─── Internal call cleanup ────────────────────────────────────────────────────
  const endCallInternal = useCallback((sendSignal: boolean) => {
    webRTCService.endCall(sendSignal);
    setIsInCall(false);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsCallConnecting(false);
    setConnectionQuality("connecting");
    setLocalStream(null);
    setRemoteStream(null);

    // Detach streams from media elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.pause();
    }
  }, []);

  // ─── Public API ───────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (user: OnlineUser, type: "voice" | "video") => {
      console.log("[useWebRTC] Starting", type, "call to", user.name);
      setSelectedUser(user);
      setCallType(type);
      setIsInCall(true);
      setIsCallConnecting(true);
      setConnectionQuality("connecting");
      await webRTCService.startCall(user.id, user.name, type);
    },
    []
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log("[useWebRTC] Accepting", incomingCall.callType, "call from", incomingCall.callerName);
    setCallType(incomingCall.callType);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");

    const callerUser = onlineUsers.find((u) => u.id === incomingCall.from);
    setSelectedUser(
      callerUser ?? {
        id: incomingCall.from,
        name: incomingCall.callerName,
        deviceId: "unknown",
        status: "in_call",
        lastSeen: Date.now(),
      }
    );

    try {
      await webRTCService.acceptCall(incomingCall.from, incomingCall.callType);
    } catch (error) {
      console.error("[useWebRTC] Failed to accept call:", error);

      let description = "Could not access microphone";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          description = "Microphone permission denied — please allow access and try again";
        } else if (error.name === "NotFoundError") {
          description = "No microphone found — please connect one and try again";
        } else {
          description = error.message;
        }
      }

      toast({
        title: "Connection Failed",
        description,
        variant: "destructive",
      });
      setIsInCall(false);
      setCallType(null);
      setIsCallConnecting(false);
    }

    setIncomingCall(null);
  }, [incomingCall, onlineUsers, toast]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    console.log("[useWebRTC] Rejecting call from", incomingCall.callerName);
    webRTCService.rejectCall(incomingCall.from);
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(
    (sendSignal = true) => {
      console.log("[useWebRTC] Ending call, sendSignal:", sendSignal);
      endCallInternal(sendSignal);
    },
    [endCallInternal]
  );

  const toggleMute = useCallback(() => {
    const muted = webRTCService.toggleMute();
    console.log("[useWebRTC] Mute toggled — now muted:", muted);
    setIsMuted(muted);
  }, []);

  const toggleVideo = useCallback(() => {
    const off = webRTCService.toggleVideo();
    console.log("[useWebRTC] Video toggled — now off:", off);
    setIsVideoOff(off);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!selectedUser) return;
      webRTCService.sendTextMessage(selectedUser.id, text);
      setMessages((prev) => [
        ...prev,
        {
          from: userId,
          to: selectedUser.id,
          text,
          timestamp: Date.now(),
          isOwn: true,
        },
      ]);
    },
    [selectedUser, userId]
  );

  return {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    onlineUsers,
    messages,
    isInCall,
    callType,
    isMuted,
    isVideoOff,
    isCallConnecting,
    incomingCall,
    callDuration,
    connectionQuality,
    selectedUser,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
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
    sendMessage,
    setSelectedUser,
  };
}
