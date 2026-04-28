/**
 * useWebRTC — React hook that manages WebRTC peer connections over the
 * Socket.IO signaling channel (`/cyrus-io`).
 *
 * Supports:
 *  - Initiating and receiving audio/video calls
 *  - ICE candidate exchange for NAT traversal (STUN + TURN)
 *  - Offer / answer flow
 *  - Mute, camera-toggle, end-call controls
 *  - Connection-quality monitoring via RTCPeerConnection stats
 *  - Graceful reconnection and error handling
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallType = "audio" | "video";
export type CallStatus =
  | "idle"
  | "ringing-out"   // we initiated, waiting for recipient
  | "ringing-in"    // incoming call, waiting for our answer
  | "connecting"    // accepted, WebRTC handshake in progress
  | "connected"     // media flowing
  | "ended";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "connecting";

export interface OnlineUser {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  status: "online" | "busy" | "away" | "offline";
  profileImageUrl?: string | null;
}

export interface IncomingCallInfo {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: CallType;
}

export interface ActiveCallInfo {
  roomId: string;
  peerId: string;
  peerName: string;
  callType: CallType;
  isInitiator: boolean;
}

export interface UseWebRTCOptions {
  userId: string;
  displayName: string;
  deviceId?: string;
  /** Socket.IO server path — defaults to `/cyrus-io` */
  signalingPath?: string;
  onError?: (msg: string) => void;
}

// ---------------------------------------------------------------------------
// ICE server configuration
// Multiple STUN servers for redundancy; TURN servers for restrictive NAT.
// ---------------------------------------------------------------------------

const ICE_SERVERS: RTCIceServer[] = [
  // Google STUN
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Twilio STUN
  { urls: "stun:global.stun.twilio.com:3478" },
  // Open-relay TURN (free tier — replace with a dedicated TURN server for
  // production deployments behind symmetric NAT / corporate firewalls).
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// ---------------------------------------------------------------------------
// Media helpers
// ---------------------------------------------------------------------------

async function getLocalMedia(callType: CallType): Promise<MediaStream> {
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (callType === "audio") {
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
  }

  // Video call — try high quality first, fall back progressively
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: videoConstraints,
    });
  } catch {
    // Fallback: lower resolution
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
      });
    } catch {
      // Last resort: audio only
      console.warn("[useWebRTC] Video unavailable, falling back to audio-only");
      return navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
    }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebRTC(options: UseWebRTCOptions) {
  const { userId, displayName, deviceId = "unknown", signalingPath = "/cyrus-io" } = options;
  const { toast } = useToast();

  // Socket
  const socketRef = useRef<Socket | null>(null);

  // WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Cleanup helpers
  // -------------------------------------------------------------------------

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const closePeerConnection = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    remoteStreamRef.current = null;
    setRemoteStream(null);
    pendingCandidatesRef.current = [];
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallDuration(0);
  }, []);

  const resetCallState = useCallback(() => {
    stopLocalStream();
    closePeerConnection();
    stopCallTimer();
    setCallStatus("idle");
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setConnectionQuality("connecting");
  }, [stopLocalStream, closePeerConnection, stopCallTimer]);

  // -------------------------------------------------------------------------
  // Stats monitoring
  // -------------------------------------------------------------------------

  const startStatsMonitoring = useCallback(() => {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);

    statsTimerRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let jitter = 0;
        let rtt = 0;

        stats.forEach((report) => {
          if (report.type === "inbound-rtp") {
            packetsLost = report.packetsLost ?? 0;
            jitter = report.jitter ?? 0;
          }
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            rtt = report.currentRoundTripTime ?? 0;
          }
        });

        let quality: ConnectionQuality = "excellent";
        if (rtt > 0.3 || packetsLost > 50 || jitter > 0.05) quality = "poor";
        else if (rtt > 0.15 || packetsLost > 20 || jitter > 0.03) quality = "fair";
        else if (rtt > 0.08 || packetsLost > 5 || jitter > 0.01) quality = "good";

        setConnectionQuality(quality);
      } catch {
        // Non-fatal — stats may not be available yet
      }
    }, 2000);
  }, []);

  // -------------------------------------------------------------------------
  // Peer connection factory
  // -------------------------------------------------------------------------

  const createPeerConnection = useCallback(
    (roomId: string, peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const candidatePayload = {
            roomId,
            candidate: e.candidate.toJSON(),
            targetPeerId: peerId,
          };
          socketRef.current?.emit("webrtc:ice-candidate", candidatePayload);
          socketRef.current?.emit("webrtc-ice-candidate", candidatePayload);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[useWebRTC] ICE state:", state);

        if (state === "connected" || state === "completed") {
          setConnectionQuality("excellent");
          startStatsMonitoring();
        } else if (state === "checking") {
          setConnectionQuality("connecting");
        } else if (state === "disconnected") {
          setConnectionQuality("poor");
        } else if (state === "failed") {
          // Attempt ICE restart
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[useWebRTC] Connection state:", state);

        if (state === "connected") {
          setCallStatus("connected");
          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        } else if (state === "failed" || state === "closed") {
          setTimeout(() => {
            if (
              pcRef.current &&
              (pcRef.current.connectionState === "failed" ||
                pcRef.current.connectionState === "closed")
            ) {
              toast({
                title: "Call Disconnected",
                description: "The connection was lost. Please try again.",
                variant: "destructive",
              });
              resetCallState();
            }
          }, 3000);
        }
      };

      pc.ontrack = (e) => {
        console.log("[useWebRTC] Remote track received:", e.track.kind);
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(e.track);
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      };

      return pc;
    },
    [startStatsMonitoring, resetCallState, toast],
  );

  // -------------------------------------------------------------------------
  // Socket.IO event handlers
  // -------------------------------------------------------------------------

  const handleIncomingCall = useCallback(
    (data: { callerId: string; callerName: string; roomId: string; callType: CallType }) => {
      console.log("[useWebRTC] Incoming call from:", data.callerName);
      setIncomingCall(data);
      setCallStatus("ringing-in");
    },
    [],
  );

  const handleCallAccepted = useCallback(
    async (data: { roomId: string; peerName: string; peerId: string; callType: CallType }) => {
      console.log("[useWebRTC] Call accepted by:", data.peerName);
      setCallStatus("connecting");

      const callType = data.callType ?? activeCall?.callType ?? "audio";

      try {
        const stream = await getLocalMedia(callType);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection(data.roomId, data.peerId);
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === "video",
        });
        await pc.setLocalDescription(offer);

        socketRef.current?.emit("webrtc:offer", {
          roomId: data.roomId,
          offer,
          targetPeerId: data.peerId,
        });
        socketRef.current?.emit("webrtc-offer", {
          roomId: data.roomId,
          offer,
          targetPeerId: data.peerId,
        });

        setActiveCall({
          roomId: data.roomId,
          peerId: data.peerId,
          peerName: data.peerName,
          callType,
          isInitiator: true,
        });
      } catch (err) {
        console.error("[useWebRTC] Failed to initiate WebRTC after accept:", err);
        toast({
          title: "Call Failed",
          description: "Could not access camera/microphone.",
          variant: "destructive",
        });
        resetCallState();
      }
    },
    [activeCall, createPeerConnection, resetCallState, toast],
  );

  const handleCallConnected = useCallback(
    async (data: {
      roomId: string;
      peerName: string;
      peerId: string;
      isInitiator: boolean;
      callType: CallType;
    }) => {
      console.log("[useWebRTC] Call connected, isInitiator:", data.isInitiator);
      setCallStatus("connecting");

      if (!data.isInitiator) {
        // We are the callee — set up media and wait for offer
        try {
          const stream = await getLocalMedia(data.callType);
          localStreamRef.current = stream;
          setLocalStream(stream);

          const pc = createPeerConnection(data.roomId, data.peerId);
          pcRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));

          setActiveCall({
            roomId: data.roomId,
            peerId: data.peerId,
            peerName: data.peerName,
            callType: data.callType,
            isInitiator: false,
          });
        } catch (err) {
          console.error("[useWebRTC] Failed to set up media for callee:", err);
          toast({
            title: "Call Failed",
            description: "Could not access camera/microphone.",
            variant: "destructive",
          });
          resetCallState();
        }
      }
    },
    [createPeerConnection, resetCallState, toast],
  );

  const handleWebRTCOffer = useCallback(
    async (data: { offer: RTCSessionDescriptionInit; roomId: string; fromPeerId: string }) => {
      console.log("[useWebRTC] Received WebRTC offer");
      const pc = pcRef.current;
      if (!pc) {
        console.warn("[useWebRTC] No peer connection for offer");
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Drain queued candidates
        for (const c of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            // Ignore stale candidates
          }
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit("webrtc:answer", {
          roomId: data.roomId,
          answer,
          targetPeerId: data.fromPeerId,
        });
        socketRef.current?.emit("webrtc-answer", {
          roomId: data.roomId,
          answer,
          targetPeerId: data.fromPeerId,
        });
      } catch (err) {
        console.error("[useWebRTC] Failed to handle offer:", err);
      }
    },
    [],
  );

  const handleWebRTCAnswer = useCallback(
    async (data: { answer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log("[useWebRTC] Received WebRTC answer");
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

        // Drain queued candidates
        for (const c of pendingCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            // Ignore stale candidates
          }
        }
        pendingCandidatesRef.current = [];
      } catch (err) {
        console.error("[useWebRTC] Failed to handle answer:", err);
      }
    },
    [],
  );

  const handleICECandidate = useCallback(
    async (data: { candidate: RTCIceCandidateInit; roomId: string }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("[useWebRTC] Failed to add ICE candidate:", err);
      }
    },
    [],
  );

  const handleCallEnded = useCallback(
    (data: { roomId: string; userId?: string }) => {
      console.log("[useWebRTC] Call ended by remote:", data);
      toast({ title: "Call Ended", description: "The other party ended the call." });
      resetCallState();
    },
    [resetCallState, toast],
  );

  const handleCallDeclined = useCallback(
    (data: { roomId: string }) => {
      console.log("[useWebRTC] Call declined:", data);
      toast({ title: "Call Declined", description: "The recipient declined your call." });
      resetCallState();
    },
    [resetCallState, toast],
  );

  const handleCallFailed = useCallback(
    (data: { reason: string }) => {
      const messages: Record<string, string> = {
        "user-offline": "The user is offline or unavailable.",
        "not-registered": "You are not registered on the signaling server.",
        "caller-disconnected": "The caller disconnected before you could answer.",
        "call-not-found": "The call session could not be found.",
      };
      toast({
        title: "Call Failed",
        description: messages[data.reason] ?? "An unknown error occurred.",
        variant: "destructive",
      });
      resetCallState();
    },
    [resetCallState, toast],
  );

  // -------------------------------------------------------------------------
  // Socket.IO connection lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!userId) return;

    const socket = io(window.location.origin, {
      path: signalingPath,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useWebRTC] Socket connected:", socket.id);
      setIsConnected(true);
      socket.emit("register", { userId, displayName, deviceId });
    });

    socket.on("disconnect", () => {
      console.log("[useWebRTC] Socket disconnected");
      setIsConnected(false);
    });

    socket.on("presence-update", (data: { users: OnlineUser[] }) => {
      setOnlineUsers(data.users.filter((u) => u.id !== userId));
    });

    // Legacy hyphenated events (existing call-user / accept-call flow)
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-connected", handleCallConnected);
    socket.on("webrtc-offer", handleWebRTCOffer);
    socket.on("webrtc-answer", handleWebRTCAnswer);
    socket.on("webrtc-ice-candidate", handleICECandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-declined", handleCallDeclined);
    socket.on("call-failed", handleCallFailed);
    socket.on("call-ringing", (data: { roomId: string; targetName: string; callType: CallType }) => {
      console.log("[useWebRTC] Call ringing for:", data.targetName);
      setCallStatus("ringing-out");
    });

    // Namespaced events (call:* / webrtc:* — new canonical event names)
    socket.on("call:ring", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:connected", handleCallConnected);
    socket.on("webrtc:offer", handleWebRTCOffer);
    socket.on("webrtc:answer", handleWebRTCAnswer);
    socket.on("webrtc:ice-candidate", handleICECandidate);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallDeclined);
    socket.on("call:failed", handleCallFailed);
    socket.on("call:ringing", (data: { roomId: string; targetName: string; callType: CallType }) => {
      console.log("[useWebRTC] call:ringing for:", data.targetName);
      setCallStatus("ringing-out");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("presence-update");
      // Legacy
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-connected");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("call-ended");
      socket.off("call-declined");
      socket.off("call-failed");
      socket.off("call-ringing");
      // Namespaced
      socket.off("call:ring");
      socket.off("call:accepted");
      socket.off("call:connected");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("call:ended");
      socket.off("call:rejected");
      socket.off("call:failed");
      socket.off("call:ringing");
      socket.disconnect();
      resetCallState();
    };
  }, [
    userId,
    displayName,
    deviceId,
    signalingPath,
    handleIncomingCall,
    handleCallAccepted,
    handleCallConnected,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleICECandidate,
    handleCallEnded,
    handleCallDeclined,
    handleCallFailed,
    resetCallState,
  ]);

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Initiate a call to another user. */
  const startCall = useCallback(
    (targetUserId: string, callType: CallType) => {
      if (!socketRef.current?.connected) {
        toast({ title: "Not Connected", description: "Signaling server unavailable.", variant: "destructive" });
        return;
      }
      if (callStatus !== "idle") {
        toast({ title: "Already in a call", variant: "destructive" });
        return;
      }

      setCallStatus("ringing-out");
      // Store call type so handleCallAccepted can use it
      setActiveCall({ roomId: "", peerId: targetUserId, peerName: "", callType, isInitiator: true });

      // Emit both the new namespaced event and the legacy event for compatibility
      socketRef.current.emit("call:initiate", { targetUserId, callType });
      socketRef.current.emit("call-user", { targetUserId, callType });
    },
    [callStatus, toast],
  );

  /** Accept an incoming call. */
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    socketRef.current?.emit("call:accept", { roomId: incomingCall.roomId });
    socketRef.current?.emit("accept-call", { roomId: incomingCall.roomId });
    setIncomingCall(null);
    setCallStatus("connecting");
  }, [incomingCall]);

  /** Reject an incoming call. */
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    socketRef.current?.emit("call:reject", { roomId: incomingCall.roomId });
    socketRef.current?.emit("decline-call", { roomId: incomingCall.roomId });
    setIncomingCall(null);
    setCallStatus("idle");
  }, [incomingCall]);

  /** End the active call. */
  const endCall = useCallback(() => {
    if (activeCall?.roomId) {
      socketRef.current?.emit("call:end", { roomId: activeCall.roomId });
      socketRef.current?.emit("end-call", { roomId: activeCall.roomId });
    }
    resetCallState();
  }, [activeCall, resetCallState]);

  /** Toggle microphone mute. Returns new muted state. */
  const toggleMute = useCallback((): boolean => {
    const stream = localStreamRef.current;
    if (!stream) return false;
    const tracks = stream.getAudioTracks();
    if (!tracks.length) return false;
    const nowEnabled = tracks[0].enabled;
    tracks.forEach((t) => { t.enabled = !nowEnabled; });
    const muted = nowEnabled; // was enabled → now muted
    setIsMuted(muted);
    return muted;
  }, []);

  /** Toggle camera on/off. Returns new off state. */
  const toggleVideo = useCallback((): boolean => {
    const stream = localStreamRef.current;
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    if (!tracks.length) return false;
    const nowEnabled = tracks[0].enabled;
    tracks.forEach((t) => { t.enabled = !nowEnabled; });
    const off = nowEnabled; // was enabled → now off
    setIsVideoOff(off);
    return off;
  }, []);

  return {
    // Connection
    isConnected,
    onlineUsers,

    // Call state
    callStatus,
    activeCall,
    incomingCall,
    isMuted,
    isVideoOff,
    connectionQuality,
    callDuration,

    // Media streams
    localStream,
    remoteStream,

    // Actions
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
