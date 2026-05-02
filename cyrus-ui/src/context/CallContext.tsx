/**
 * CallContext — React context that provides global call state and a persistent
 * hidden <audio> element for remote audio playback.
 *
 * The hidden <audio> element is rendered at the top of the component tree so it
 * persists across route changes and is never accidentally unmounted during a call.
 * It has autoPlay, playsInline, and is explicitly NOT muted so the user can hear
 * the remote party.
 *
 * Usage:
 *   Wrap your app (or the authenticated portion) with <CallProvider>.
 *   Consume call state via useCallContext().
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { webRTCService, type OnlineUser, type ChatMessage } from "@/lib/webrtc-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingCall {
  from: string;
  callerName: string;
  callType: "voice" | "video";
}

export interface CallContextValue {
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
  incomingCall: IncomingCall | null;
  callDuration: number;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "connecting";
  selectedUser: OnlineUser | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  /** Ref to the persistent hidden <audio> element for remote audio */
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  /** Ref to attach to a local <video> element in the call UI */
  localVideoRef: React.RefObject<HTMLVideoElement>;
  /** Ref to attach to a remote <video> element in the call UI */
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  connectUser: (userId: string, userName: string) => Promise<void>;
  startCall: (user: OnlineUser, type: "voice" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (sendSignal?: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendMessage: (to: string, text: string) => void;
  setSelectedUser: (user: OnlineUser | null) => void;
  dismissIncomingCall: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used inside <CallProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
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
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "fair" | "poor" | "connecting"
  >("connecting");
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Persistent media element refs
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Attach remote stream to audio element whenever it changes ──────────────
  useEffect(() => {
    if (!remoteStream) return;

    const audioTracks = remoteStream.getAudioTracks();
    const videoTracks = remoteStream.getVideoTracks();
    console.log(
      `[CallContext] Remote stream updated — audio: ${audioTracks.length} track(s), video: ${videoTracks.length} track(s)`
    );

    // Ensure all remote audio tracks are enabled
    audioTracks.forEach((track) => {
      console.log(
        "[CallContext] Remote audio track:",
        track.id,
        "| enabled:",
        track.enabled,
        "| readyState:",
        track.readyState
      );
      if (!track.enabled) {
        track.enabled = true;
        console.log("[CallContext] Enabled remote audio track:", track.id);
      }
    });

    // Attach to the persistent hidden <audio> element — this works for BOTH
    // voice and video calls and is the primary audio playback path.
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      console.log("[CallContext] Attaching remote stream to audio element");
      remoteAudioRef.current
        .play()
        .then(() => {
          console.log("[CallContext] Remote audio element is playing ✓");
        })
        .catch((err) => {
          console.warn(
            "[CallContext] Remote audio play() failed (autoplay policy?):",
            err.message
          );
        });
    } else {
      console.warn("[CallContext] remoteAudioRef is null — audio element not mounted yet");
    }

    // Also attach to the remote video element for video calls
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current
        .play()
        .catch((err) => console.log("[CallContext] Remote video play() error:", err.message));
    }
  }, [remoteStream]);

  // ─── Attach local stream to local video element ─────────────────────────────
  useEffect(() => {
    if (!localStream) return;
    console.log("[CallContext] Local stream updated — tracks:", localStream.getTracks().length);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current
        .play()
        .catch((err) => console.log("[CallContext] Local video play() error:", err.message));
    }
  }, [localStream]);

  // ─── Call duration timer ────────────────────────────────────────────────────
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

  // ─── Internal cleanup ───────────────────────────────────────────────────────
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

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.pause();
      console.log("[CallContext] Remote audio element stopped");
    }
  }, []);

  // ─── Public API ─────────────────────────────────────────────────────────────

  const connectUser = useCallback(async (userId: string, userName: string) => {
    setCurrentUserId(userId);

    webRTCService.setOnUserList((users) => {
      setOnlineUsers(users.filter((u) => u.id !== userId));
    });

    webRTCService.setOnMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    webRTCService.setOnIncomingCall((data) => {
      console.log("[CallContext] Incoming call from:", data.callerName, "type:", data.callType);
      setIncomingCall(data);
    });

    webRTCService.setOnCallResponse((data) => {
      if (data.accepted) {
        setIsCallConnecting(true);
      } else {
        setIsInCall(false);
        setCallType(null);
        setIsCallConnecting(false);
      }
    });

    webRTCService.setOnCallEnd(() => {
      endCallInternal(false);
    });

    webRTCService.setOnRemoteStream((stream) => {
      console.log(
        "[CallContext] Remote stream received — audio tracks:",
        stream.getAudioTracks().length,
        "video tracks:",
        stream.getVideoTracks().length
      );

      // Enable all audio tracks immediately
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
        console.log("[CallContext] Remote audio track enabled:", track.id);
      });

      setRemoteStream(stream);
      setIsCallConnecting(false);
    });

    webRTCService.setOnLocalStream((stream) => {
      console.log("[CallContext] Local stream received");
      setLocalStream(stream);
    });

    webRTCService.setOnConnectionQuality((quality) => {
      setConnectionQuality(quality);
    });

    webRTCService.setOnReconnecting((attempt) => {
      setIsReconnecting(true);
      setReconnectAttempt(attempt);
    });

    webRTCService.setOnReconnected(() => {
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setIsConnected(true);
    });

    webRTCService.setOnDisconnected(() => {
      setIsConnected(false);
    });

    await webRTCService.connect(userId, userName);
    setIsConnected(true);
  }, [endCallInternal]);

  const startCall = useCallback(async (user: OnlineUser, type: "voice" | "video") => {
    console.log("[CallContext] Starting", type, "call to", user.name);
    setSelectedUser(user);
    setCallType(type);
    setIsInCall(true);
    setIsCallConnecting(true);
    setConnectionQuality("connecting");
    await webRTCService.startCall(user.id, user.name, type);
  }, []);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log("[CallContext] Accepting", incomingCall.callType, "call from", incomingCall.callerName);
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
      console.error("[CallContext] Failed to accept call:", error);
      setIsInCall(false);
      setCallType(null);
      setIsCallConnecting(false);
    }

    setIncomingCall(null);
  }, [incomingCall, onlineUsers]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    webRTCService.rejectCall(incomingCall.from);
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(
    (sendSignal = true) => {
      endCallInternal(sendSignal);
    },
    [endCallInternal]
  );

  const toggleMute = useCallback(() => {
    const muted = webRTCService.toggleMute();
    setIsMuted(muted);
  }, []);

  const toggleVideo = useCallback(() => {
    const off = webRTCService.toggleVideo();
    setIsVideoOff(off);
  }, []);

  const sendMessage = useCallback(
    (to: string, text: string) => {
      webRTCService.sendTextMessage(to, text);
      setMessages((prev) => [
        ...prev,
        {
          from: currentUserId ?? "",
          to,
          text,
          timestamp: Date.now(),
          isOwn: true,
        },
      ]);
    },
    [currentUserId]
  );

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // ─── Context value ──────────────────────────────────────────────────────────
  const value: CallContextValue = {
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
    remoteStream,
    localStream,
    remoteAudioRef,
    localVideoRef,
    remoteVideoRef,
    connectUser,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    sendMessage,
    setSelectedUser,
    dismissIncomingCall,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {/*
       * Persistent hidden <audio> element for remote audio playback.
       *
       * This element lives at the top of the component tree so it is NEVER
       * unmounted during a call (e.g. when navigating between routes).
       *
       * Critical attributes:
       *   autoPlay    — starts playing as soon as srcObject is set
       *   playsInline — required on iOS to prevent fullscreen takeover
       *   muted={false} — explicitly NOT muted (default is false, but we
       *                   set it explicitly to make the intent clear)
       *
       * The element is visually hidden but NOT display:none, because some
       * browsers pause media elements that are display:none.
       */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: "fixed",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden="true"
        data-testid="audio-remote"
      />
    </CallContext.Provider>
  );
}
