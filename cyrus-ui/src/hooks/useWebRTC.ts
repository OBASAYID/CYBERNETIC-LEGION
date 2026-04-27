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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
