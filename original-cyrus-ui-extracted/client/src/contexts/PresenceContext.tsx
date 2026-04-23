import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import {
  createPeerConnectionConfig,
  getOptimalVideoConstraints,
  getAudioConstraints,
  getCallQualityMetrics,
  AudioProcessor,
  CallQualityMetrics,
} from "../lib/webrtc-config";

export interface OnlineUser {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  lastActivity?: string;
}

export interface IncomingCall {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: "audio" | "video";
}

export interface CallNotification {
  id: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
  timestamp: number;
}

export interface ActiveCallState {
  roomId: string;
  peerName: string;
  peerId: string;
  callType: "audio" | "video";
  isInitiator: boolean;
  status: "ringing" | "connected" | "ended";
}

export interface MediaCallControls {
  isMuted: boolean;
  isVideoEnabled: boolean;
}

interface PresenceContextType {
  isConnected: boolean;
  myUserId: string | null;
  onlineUsers: OnlineUser[];
  incomingCall: IncomingCall | null;
  activeCall: ActiveCallState | null;
  notifications: CallNotification[];
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaControls: MediaCallControls;
  callDuration: number;
  connectPresence: (displayName: string) => void;
  disconnectPresence: () => void;
  callUser: (targetUserId: string, targetName: string, type: "audio" | "video") => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendMessage: (targetUserId: string, message: string) => void;
  clearNotification: (id: string) => void;
  wsRef: React.MutableRefObject<Socket | null>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}

function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [notifications, setNotifications] = useState<CallNotification[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaControls, setMediaControls] = useState<MediaCallControls>({ isMuted: false, isVideoEnabled: true });
  const [callDuration, setCallDuration] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const addNotification = useCallback((type: CallNotification["type"], message: string) => {
    const notif: CallNotification = {
      id: generateNotificationId(),
      type,
      message,
      timestamp: Date.now(),
    };
    setNotifications(prev => [...prev.slice(-4), notif]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 5000);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const cleanupMedia = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.off('webrtc-offer');
      socketRef.current.off('webrtc-answer');
      socketRef.current.off('webrtc-ice-candidate');
    }
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setMediaControls({ isMuted: false, isVideoEnabled: true });
  }, []);

  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const setupWebRTCMedia = useCallback(async (
    roomId: string,
    callType: "audio" | "video",
    isInitiator: boolean,
    socket: Socket
  ) => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      pendingCandidatesRef.current = [];

      const videoConstraints = callType === "video" ? getOptimalVideoConstraints() : false;
      const audioConstraints = getAudioConstraints();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(createPeerConnectionConfig());
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log("[WebRTC-Presence] Remote track received:", event.track.kind);
        setRemoteStream(event.streams[0]);
        startCallTimer();
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socket.connected) {
          socket.emit('webrtc-ice-candidate', { roomId, candidate: event.candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC-Presence] ICE state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          addNotification("error", "Call connection failed");
        }
      };

      socket.on('webrtc-offer', async (data: { offer: any; roomId: string }) => {
        if (data.roomId !== roomId || !peerConnectionRef.current) return;
        console.log("[WebRTC-Presence] Received offer");
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc-answer', { roomId, answer });
      });

      socket.on('webrtc-answer', async (data: { answer: any; roomId: string }) => {
        if (data.roomId !== roomId || !peerConnectionRef.current) return;
        console.log("[WebRTC-Presence] Received answer");
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      });

      socket.on('webrtc-ice-candidate', async (data: { candidate: any; roomId: string }) => {
        if (data.roomId !== roomId || !peerConnectionRef.current) return;
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidatesRef.current.push(new RTCIceCandidate(data.candidate));
        }
      });

      if (isInitiator) {
        console.log("[WebRTC-Presence] Creating offer as initiator...");
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === "video",
        });
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { roomId, offer });
      }

      console.log(`[WebRTC-Presence] Media setup complete - initiator: ${isInitiator}, type: ${callType}`);
    } catch (err) {
      console.error("[WebRTC-Presence] Media setup failed:", err);
      addNotification("error", "Failed to access camera/microphone");
    }
  }, [addNotification, startCallTimer]);

  const connectPresence = useCallback((displayName: string = "User") => {
    console.log("[Presence] connectPresence called, displayName:", displayName);
    
    if (socketRef.current?.connected) {
      console.log("[Presence] Already connected, skipping");
      return;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const deviceId = localStorage.getItem('cyrus_device_id') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cyrus_device_id', deviceId);
    
    const userId = deviceId;
    currentUserIdRef.current = userId;

    console.log(`[Presence] Creating Socket.IO connection to ${window.location.origin}`);
    
    const socketUrl = window.location.origin;
    console.log(`[Presence] Connecting Socket.IO to: ${socketUrl} (polling transport)`);
    
    const socket = io(socketUrl, {
      path: '/cyrus-io',
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 60000,
      upgrade: false,
      forceNew: true,
      withCredentials: false,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("[Presence] CONNECTED - Socket ID:", socket.id);
      socket.emit('register', { userId, displayName, deviceId });
    });

    socket.on('registered', (data: { userId: string; totalOnline: number }) => {
      console.log("[Presence] Registered successfully:", data);
      setMyUserId(data.userId);
      setIsConnected(true);
      addNotification("success", `Connected as ${displayName}`);
    });

    socket.on('presence-update', (data: { users: OnlineUser[]; total: number }) => {
      const currentId = currentUserIdRef.current;
      const otherUsers = data.users.filter((u) => u.id !== currentId);
      console.log(`[Presence] Online: ${data.total} total, ${otherUsers.length} others`);
      setOnlineUsers(otherUsers);
    });

    socket.on('incoming-call', (data: IncomingCall) => {
      console.log("[Presence] *** INCOMING CALL ***", data);
      setIncomingCall(data);
      incomingCallRef.current = data;
      addNotification("info", `Incoming ${data.callType} call from ${data.callerName}`);
    });

    socket.on('call-ringing', (data: { roomId: string; targetName: string; callType?: "audio" | "video" }) => {
      console.log("[Presence] Call ringing:", data.targetName, "type:", data.callType);
      setActiveCall({
        roomId: data.roomId,
        peerName: data.targetName,
        peerId: "",
        callType: data.callType || "audio",
        isInitiator: true,
        status: "ringing",
      });
      addNotification("info", `Calling ${data.targetName}...`);
      
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        const currentCall = activeCallRef.current;
        if (currentCall && currentCall.status === "ringing") {
          console.log("[Presence] Call timeout - no answer after 30s");
          socket.emit('end-call', { roomId: data.roomId });
          setActiveCall(null);
          activeCallRef.current = null;
          cleanupMedia();
          addNotification("warning", `No answer from ${data.targetName}`);
        }
      }, 30000);
    });

    socket.on('call-accepted', (data: { roomId: string; peerName: string; peerId: string; callType?: "audio" | "video" }) => {
      console.log("[Presence] Call accepted by:", data.peerName, "type:", data.callType);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      const callType = data.callType || activeCallRef.current?.callType || "audio";
      setActiveCall(prev => prev ? {
        ...prev,
        peerId: data.peerId,
        peerName: data.peerName,
        callType,
        status: "connected",
      } : {
        roomId: data.roomId,
        peerName: data.peerName,
        peerId: data.peerId,
        callType,
        isInitiator: true,
        status: "connected",
      });
      setIncomingCall(null);
      incomingCallRef.current = null;
      addNotification("success", `Connected to ${data.peerName}`);
      setupWebRTCMedia(data.roomId, callType, true, socket);
    });

    socket.on('call-connected', (data: { roomId: string; peerName: string; peerId: string; isInitiator?: boolean; callType?: "audio" | "video" }) => {
      console.log("[Presence] Call connected:", data.peerName, "type:", data.callType);
      const callType = data.callType || "audio";
      setActiveCall({
        roomId: data.roomId,
        peerName: data.peerName,
        peerId: data.peerId,
        callType,
        isInitiator: data.isInitiator || false,
        status: "connected",
      });
      setIncomingCall(null);
      incomingCallRef.current = null;
      addNotification("success", `Connected to ${data.peerName}`);
      setupWebRTCMedia(data.roomId, callType, false, socket);
    });

    socket.on('call-declined', (data: { roomId: string }) => {
      console.log("[Presence] Call was declined");
      setActiveCall(null);
      activeCallRef.current = null;
      cleanupMedia();
      addNotification("warning", "Call was declined");
    });

    socket.on('call-ended', (data: { roomId: string; reason?: string }) => {
      console.log("[Presence] Call ended:", data.reason || "normal");
      setActiveCall(null);
      activeCallRef.current = null;
      setIncomingCall(null);
      incomingCallRef.current = null;
      cleanupMedia();
      addNotification("info", `Call ended${data.reason ? `: ${data.reason}` : ""}`);
    });

    socket.on('call-failed', (data: { reason: string }) => {
      console.log("[Presence] Call failed:", data.reason);
      setActiveCall(null);
      activeCallRef.current = null;
      setIncomingCall(null);
      incomingCallRef.current = null;
      cleanupMedia();
      addNotification("error", `Call failed: ${data.reason}`);
    });

    socket.on('new-message', (data: { senderId: string; senderName: string; message: string; timestamp: string }) => {
      console.log("[Presence] Message from:", data.senderName);
      addNotification("info", `Message from ${data.senderName}: ${data.message}`);
    });

    socket.on('disconnect', () => {
      console.log("[Presence] Disconnected");
      setIsConnected(false);
    });

    socket.on('reconnect', () => {
      console.log("[Presence] Reconnected");
      socket.emit('register', { userId, displayName, deviceId });
    });

    socket.on('connect_error', (error) => {
      console.error("[Presence] Connection error:", error.message);
    });

  }, [addNotification, setupWebRTCMedia, cleanupMedia]);

  const disconnectPresence = useCallback(() => {
    cleanupMedia();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setOnlineUsers([]);
    setMyUserId(null);
    setActiveCall(null);
    setIncomingCall(null);
    currentUserIdRef.current = null;
    incomingCallRef.current = null;
    activeCallRef.current = null;
  }, [cleanupMedia]);

  const callUser = useCallback((targetUserId: string, targetName: string, type: "audio" | "video") => {
    console.log(`[Presence] Initiating ${type} call to ${targetName} (${targetUserId})`);

    if (!socketRef.current?.connected) {
      console.error("[Presence] Socket not connected - cannot place call");
      addNotification("error", "Not connected. Please refresh the page.");
      return;
    }

    socketRef.current.emit('call-user', { targetUserId, callType: type });
    addNotification("info", `Calling ${targetName}...`);
  }, [addNotification]);

  const acceptCall = useCallback(() => {
    const call = incomingCallRef.current;
    console.log("[Presence] acceptCall triggered, call ref:", call);

    if (!call) {
      console.error("[Presence] No incoming call to accept");
      addNotification("error", "No incoming call found");
      return;
    }

    if (!socketRef.current?.connected) {
      console.error("[Presence] Socket not connected - cannot accept call");
      addNotification("error", "Connection lost. Please refresh.");
      return;
    }

    console.log("[Presence] Emitting accept-call for room:", call.roomId);
    socketRef.current.emit('accept-call', { roomId: call.roomId });
    
    setIncomingCall(null);
    incomingCallRef.current = null;
    addNotification("success", `Connecting to ${call.callerName}...`);
  }, [addNotification]);

  const declineCall = useCallback(() => {
    const call = incomingCallRef.current;
    console.log("[Presence] declineCall triggered, call ref:", call);

    if (!call) {
      console.error("[Presence] No incoming call to decline");
      return;
    }

    if (socketRef.current?.connected) {
      console.log("[Presence] Emitting decline-call for room:", call.roomId);
      socketRef.current.emit('decline-call', { roomId: call.roomId });
    }
    
    setIncomingCall(null);
    incomingCallRef.current = null;
    addNotification("info", "Call declined");
  }, [addNotification]);

  const endCall = useCallback(() => {
    const call = activeCallRef.current;
    console.log("[Presence] endCall triggered");

    if (call && socketRef.current?.connected) {
      socketRef.current.emit('end-call', { roomId: call.roomId });
    }

    cleanupMedia();
    setActiveCall(null);
    activeCallRef.current = null;
    addNotification("info", "Call ended");
  }, [addNotification, cleanupMedia]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => { track.enabled = !track.enabled; });
      setMediaControls(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => { track.enabled = !track.enabled; });
      setMediaControls(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, []);

  const sendMessage = useCallback((targetUserId: string, message: string) => {
    if (!socketRef.current?.connected) {
      console.error("[Presence] Socket not connected - cannot send message");
      addNotification("error", "Not connected");
      return;
    }

    socketRef.current.emit('send-message', {
      targetUserId,
      message,
      timestamp: new Date().toISOString(),
    });
    addNotification("success", "Message sent");
  }, [addNotification]);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [cleanupMedia]);

  return (
    <PresenceContext.Provider
      value={{
        isConnected,
        myUserId,
        onlineUsers,
        incomingCall,
        activeCall,
        notifications,
        localStream,
        remoteStream,
        mediaControls,
        callDuration,
        connectPresence,
        disconnectPresence,
        callUser,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        sendMessage,
        clearNotification,
        wsRef: socketRef as any,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
