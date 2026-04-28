/**
 * useWebRTC — WebRTC hook connected to the Socket.IO signaling server at /cyrus-io.
 *
 * Supports both colon-style events (call:initiate, webrtc:offer, …) and the
 * legacy hyphenated events (call-user, webrtc-offer, …) so it works with the
 * existing PresenceContext-based server without any server changes.
 *
 * Usage:
 *   const rtc = useWebRTC({ userId: "alice", displayName: "Alice" });
 *   rtc.initiateCall("bob-id", "video");
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CallType = "audio" | "video";
export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended";

export interface WebRTCOptions {
  /** The local user's ID (must match what is registered with the signaling server). */
  userId: string;
  /** Human-readable display name shown to the remote peer. */
  displayName: string;
  /** Override the Socket.IO server URL (defaults to window.location.origin). */
  serverUrl?: string;
  /** STUN/TURN servers. Defaults to Google STUN. */
  iceServers?: RTCIceServer[];
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
  status: CallStatus;
}

export interface WebRTCState {
  isConnected: boolean;
  callStatus: CallStatus;
  incomingCall: IncomingCallInfo | null;
  activeCall: ActiveCallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDurationSeconds: number;
  error: string | null;
}

export interface WebRTCActions {
  /** Connect to the signaling server and register the user. */
  connect: () => void;
  /** Disconnect from the signaling server and clean up. */
  disconnect: () => void;
  /** Initiate a call to a remote user. */
  initiateCall: (targetUserId: string, callType: CallType) => void;
  /** Accept an incoming call. */
  acceptCall: () => void;
  /** Reject an incoming call. */
  rejectCall: () => void;
  /** End the active call. */
  endCall: () => void;
  /** Toggle microphone mute. */
  toggleMute: () => void;
  /** Toggle camera on/off. */
  toggleVideo: () => void;
  /** Expose the underlying socket for advanced use. */
  socketRef: React.MutableRefObject<Socket | null>;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWebRTC(options: WebRTCOptions): WebRTCState & WebRTCActions {
  const { userId, displayName, serverUrl, iceServers = DEFAULT_ICE_SERVERS } = options;

  // ── State ──────────────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const incomingCallRef = useRef<IncomingCallInfo | null>(null);
  const activeCallRef = useRef<ActiveCallInfo | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  // ── Cleanup helpers ────────────────────────────────────────────────────────

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopCallTimer();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallDurationSeconds(0);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, [stopCallTimer]);

  const resetCallState = useCallback(() => {
    cleanupMedia();
    setCallStatus("idle");
    setActiveCall(null);
    setIncomingCall(null);
    activeCallRef.current = null;
    incomingCallRef.current = null;
  }, [cleanupMedia]);

  // ── WebRTC media setup ─────────────────────────────────────────────────────

  const setupWebRTC = useCallback(async (
    roomId: string,
    callType: CallType,
    isInitiator: boolean,
    socket: Socket,
  ) => {
    try {
      // Clean up any previous session
      cleanupMedia();

      // Acquire local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: callType === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log("[useWebRTC] Remote track received:", event.track.kind);
        setRemoteStream(event.streams[0]);
        // Start call timer when remote media arrives
        setCallDurationSeconds(0);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => setCallDurationSeconds(s => s + 1), 1000);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket.connected) {
          // Emit both colon and hyphen variants
          socket.emit("webrtc:ice-candidate", { roomId, candidate: event.candidate });
          socket.emit("webrtc-ice-candidate", { roomId, candidate: event.candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[useWebRTC] ICE state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          setError("Call connection failed — ICE negotiation error");
          resetCallState();
        } else if (pc.iceConnectionState === "disconnected") {
          setError("Call connection lost");
          resetCallState();
        }
      };

      // ── Offer/Answer/ICE handlers (listen to both event styles) ─────────

      const handleOffer = async (data: { offer: RTCSessionDescriptionInit; roomId: string }) => {
        if (data.roomId !== roomId || !pcRef.current) return;
        console.log("[useWebRTC] Received offer");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        for (const c of pendingCandidatesRef.current) {
          await pcRef.current.addIceCandidate(c).catch(() => {});
        }
        pendingCandidatesRef.current = [];
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("webrtc:answer", { roomId, answer });
        socket.emit("webrtc-answer", { roomId, answer });
      };

      const handleAnswer = async (data: { answer: RTCSessionDescriptionInit; roomId: string }) => {
        if (data.roomId !== roomId || !pcRef.current) return;
        console.log("[useWebRTC] Received answer");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        for (const c of pendingCandidatesRef.current) {
          await pcRef.current.addIceCandidate(c).catch(() => {});
        }
        pendingCandidatesRef.current = [];
      };

      const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; roomId: string }) => {
        if (data.roomId !== roomId || !pcRef.current) return;
        const candidate = new RTCIceCandidate(data.candidate);
        if (pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(candidate).catch(() => {});
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      };

      socket.on("webrtc:offer", handleOffer);
      socket.on("webrtc-offer", handleOffer);
      socket.on("webrtc:answer", handleAnswer);
      socket.on("webrtc-answer", handleAnswer);
      socket.on("webrtc:ice-candidate", handleIceCandidate);
      socket.on("webrtc-ice-candidate", handleIceCandidate);

      // If we are the initiator, create and send the offer
      if (isInitiator) {
        console.log("[useWebRTC] Creating offer as initiator...");
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === "video",
        });
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { roomId, offer });
        socket.emit("webrtc-offer", { roomId, offer });
      }

      console.log(`[useWebRTC] Media setup complete — initiator: ${isInitiator}, type: ${callType}`);
    } catch (err: any) {
      console.error("[useWebRTC] Media setup failed:", err);
      setError(`Failed to access camera/microphone: ${err?.message ?? err}`);
      resetCallState();
    }
  }, [iceServers, cleanupMedia, resetCallState]);

  // ── Socket connection ──────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }

    const url = serverUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    console.log(`[useWebRTC] Connecting to ${url} (path: /cyrus-io)`);

    const socket = io(url, {
      path: "/cyrus-io",
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 60_000,
      withCredentials: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[useWebRTC] Connected — socket:", socket.id);
      const profileImageUrl = typeof localStorage !== "undefined"
        ? localStorage.getItem("cyrus-chat-avatar")
        : null;
      socket.emit("register", { userId, displayName, deviceId: userId, profileImageUrl });
    });

    socket.on("registered", (data: { userId: string; totalOnline: number }) => {
      console.log("[useWebRTC] Registered:", data);
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      console.log("[useWebRTC] Disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[useWebRTC] Connection error:", err.message);
      setError(`Signaling connection error: ${err.message}`);
    });

    // ── Incoming call (both event styles) ──────────────────────────────────

    const handleIncomingCall = (data: IncomingCallInfo) => {
      console.log("[useWebRTC] Incoming call from:", data.callerName, "type:", data.callType);
      setIncomingCall(data);
      incomingCallRef.current = data;
      setCallStatus("ringing");
    };
    socket.on("call:ring", handleIncomingCall);
    socket.on("incoming-call", handleIncomingCall);

    // ── Outgoing call ringing ──────────────────────────────────────────────

    const handleRinging = (data: { roomId: string; targetName: string; callType?: CallType }) => {
      console.log("[useWebRTC] Call ringing:", data.targetName);
      setCallStatus("ringing");
      setActiveCall(prev => prev ? { ...prev, status: "ringing" } : null);

      // Auto-cancel after 30 s if no answer
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        const current = activeCallRef.current;
        if (current && current.status === "ringing") {
          console.log("[useWebRTC] Call timeout — no answer");
          socket.emit("call:end", { roomId: data.roomId });
          socket.emit("end-call", { roomId: data.roomId });
          resetCallState();
        }
      }, 30_000);
    };
    socket.on("call:ringing", handleRinging);
    socket.on("call-ringing", handleRinging);

    // ── Call accepted (caller side) ────────────────────────────────────────

    const handleCallAccepted = (data: { roomId: string; peerName: string; peerId: string; callType?: CallType }) => {
      console.log("[useWebRTC] Call accepted by:", data.peerName);
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      const callType = data.callType ?? activeCallRef.current?.callType ?? "audio";
      const info: ActiveCallInfo = {
        roomId: data.roomId,
        peerId: data.peerId,
        peerName: data.peerName,
        callType,
        isInitiator: true,
        status: "connected",
      };
      setActiveCall(info);
      activeCallRef.current = info;
      setCallStatus("connected");
      setIncomingCall(null);
      incomingCallRef.current = null;
      setupWebRTC(data.roomId, callType, true, socket);
    };
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call-accepted", handleCallAccepted);

    // ── Call connected (callee side) ───────────────────────────────────────

    const handleCallConnected = (data: { roomId: string; peerName: string; peerId: string; isInitiator?: boolean; callType?: CallType }) => {
      console.log("[useWebRTC] Call connected:", data.peerName);
      const callType = data.callType ?? "audio";
      const info: ActiveCallInfo = {
        roomId: data.roomId,
        peerId: data.peerId,
        peerName: data.peerName,
        callType,
        isInitiator: data.isInitiator ?? false,
        status: "connected",
      };
      setActiveCall(info);
      activeCallRef.current = info;
      setCallStatus("connected");
      setIncomingCall(null);
      incomingCallRef.current = null;
      setupWebRTC(data.roomId, callType, false, socket);
    };
    socket.on("call:connected", handleCallConnected);
    socket.on("call-connected", handleCallConnected);

    // ── Call rejected / declined ───────────────────────────────────────────

    const handleCallRejected = () => {
      console.log("[useWebRTC] Call rejected");
      resetCallState();
    };
    socket.on("call:rejected", handleCallRejected);
    socket.on("call-declined", handleCallRejected);

    // ── Call ended ─────────────────────────────────────────────────────────

    const handleCallEnded = (data: { roomId: string; reason?: string }) => {
      console.log("[useWebRTC] Call ended:", data.reason ?? "normal");
      resetCallState();
    };
    socket.on("call:ended", handleCallEnded);
    socket.on("call-ended", handleCallEnded);

    // ── Call failed ────────────────────────────────────────────────────────

    const handleCallFailed = (data: { reason: string }) => {
      console.log("[useWebRTC] Call failed:", data.reason);
      setError(`Call failed: ${data.reason}`);
      resetCallState();
    };
    socket.on("call:failed", handleCallFailed);
    socket.on("call-failed", handleCallFailed);

  }, [userId, displayName, serverUrl, setupWebRTC, resetCallState]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    resetCallState();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, [resetCallState]);

  const initiateCall = useCallback((targetUserId: string, callType: CallType) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError("Not connected to signaling server");
      return;
    }
    console.log(`[useWebRTC] Initiating ${callType} call to ${targetUserId}`);
    setCallStatus("ringing");
    setActiveCall({
      roomId: "",
      peerId: targetUserId,
      peerName: targetUserId,
      callType,
      isInitiator: true,
      status: "ringing",
    });
    // Emit both colon and hyphen variants
    socket.emit("call:initiate", { targetUserId, callType });
    socket.emit("call-user", { targetUserId, callType });
  }, []);

  const acceptCall = useCallback(() => {
    const call = incomingCallRef.current;
    const socket = socketRef.current;
    if (!call) { setError("No incoming call to accept"); return; }
    if (!socket?.connected) { setError("Not connected"); return; }
    console.log("[useWebRTC] Accepting call, roomId:", call.roomId);
    socket.emit("call:accept", { roomId: call.roomId });
    socket.emit("accept-call", { roomId: call.roomId });
    setIncomingCall(null);
    incomingCallRef.current = null;
    setCallStatus("connecting");
  }, []);

  const rejectCall = useCallback(() => {
    const call = incomingCallRef.current;
    const socket = socketRef.current;
    if (!call) return;
    if (socket?.connected) {
      socket.emit("call:reject", { roomId: call.roomId });
      socket.emit("decline-call", { roomId: call.roomId });
    }
    setIncomingCall(null);
    incomingCallRef.current = null;
    setCallStatus("idle");
  }, []);

  const endCall = useCallback(() => {
    const call = activeCallRef.current;
    const socket = socketRef.current;
    if (call && socket?.connected) {
      socket.emit("call:end", { roomId: call.roomId });
      socket.emit("end-call", { roomId: call.roomId });
    }
    resetCallState();
  }, [resetCallState]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoEnabled(prev => !prev);
    }
  }, []);

  // ── Auto-connect on mount, cleanup on unmount ──────────────────────────────

  useEffect(() => {
    if (userId) connect();
    return () => {
      stopCallTimer();
      cleanupMedia();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    // State
    isConnected,
    callStatus,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDurationSeconds,
    error,
    // Actions
    connect,
    disconnect,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    socketRef,
  };
}
