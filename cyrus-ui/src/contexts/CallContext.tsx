/**
 * CallContext — provides global call state and actions to the entire app.
 *
 * SINGLE-ENGINE ARCHITECTURE (post-consolidation):
 * All real-time communication — presence, call signaling, SDP offer/answer,
 * ICE candidates, and media — flows exclusively through PresenceContext's
 * Socket.IO connection on /cyrus-io.
 *
 * The legacy webRTCService (/ws WebSocket) is NO LONGER connected here.
 * CallProvider is now a thin bridge that reads from usePresence() and
 * re-exposes the same surface that VideoCall / AudioCall / CallNotification
 * components expect, so those components need no changes.
 *
 * Wrap the authenticated section with <CallProvider> so that:
 *  - Incoming call notifications appear on any page
 *  - Active call overlays (VideoCall / AudioCall) render above all content
 *  - Any component can initiate a call via `useCallContext()`
 */

import { createContext, useContext, useMemo, useRef, useEffect, type ReactNode } from "react";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { CallNotification } from "@/components/CallNotification";
import { VideoCall } from "@/components/VideoCall";
import { AudioCall } from "@/components/AudioCall";
import type { ActiveCallInfo, ConnectionQuality, IncomingCallInfo } from "@/hooks/useWebRTC";

export type { ActiveCallInfo, ConnectionQuality, IncomingCallInfo } from "@/hooks/useWebRTC";

// Re-export OnlineUser / ChatMessage shapes from webrtc-service for backward
// compatibility with any component that imports them from CallContext.
export type { OnlineUser, ChatMessage } from "@/lib/webrtc-service";

// ─── Bridged context value ────────────────────────────────────────────────────

/**
 * The shape exposed by useCallContext() — a subset of PresenceContext mapped
 * to the legacy field names that VideoCall / AudioCall / CallNotification use.
 */
export interface CallContextValue {
  isConnected: boolean;
  onlineUsers: import("@/lib/webrtc-service").OnlineUser[];
  isInCall: boolean;
  callType: "voice" | "video" | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isCallConnecting: boolean;
  incomingCall: IncomingCallInfo | null;
  callDuration: number;
  connectionQuality: ConnectionQuality;
  selectedUser: import("@/lib/webrtc-service").OnlineUser | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: (user: import("@/lib/webrtc-service").OnlineUser, type: "voice" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (sendSignal?: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendMessage: (text: string) => void;
  setSelectedUser: (user: import("@/lib/webrtc-service").OnlineUser | null) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCallContext must be used inside <CallProvider>");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface CallProviderProps {
  children: ReactNode;
  /** @deprecated No longer used — PresenceContext manages its own connection. */
  webRTCOptions?: unknown;
}

export function CallProvider({ children }: CallProviderProps) {
  const presence = usePresence();

  // Stable refs for media elements — kept here so VideoCall / AudioCall can
  // attach streams without needing to own the elements themselves.
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // ─── Attach remote stream to audio element for reliable playback ────────────
  useEffect(() => {
    const stream = presence.remoteStream;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    console.log(
      `[CallContext/Presence] Remote stream updated — audio: ${audioTracks.length}, video: ${stream.getVideoTracks().length}`
    );

    audioTracks.forEach((track) => {
      if (!track.enabled) {
        track.enabled = true;
        console.log("[CallContext/Presence] Enabled remote audio track:", track.id);
      }
    });

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current
        .play()
        .then(() => console.log("[CallContext/Presence] Remote audio element playing ✓"))
        .catch((err) => console.warn("[CallContext/Presence] Remote audio play() failed:", err));
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current
        .play()
        .catch((err) => console.log("[CallContext/Presence] Remote video play() error:", err));
    }
  }, [presence.remoteStream]);

  // ─── Attach local stream to local video element ─────────────────────────────
  useEffect(() => {
    const stream = presence.localStream;
    if (!stream) return;
    console.log("[CallContext/Presence] Local stream updated — tracks:", stream.getTracks().length);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current
        .play()
        .catch((err) => console.log("[CallContext/Presence] Local video play() error:", err));
    }
  }, [presence.localStream]);

  // ─── Map PresenceContext state → legacy CallContext shape ────────────────────

  // Map PresenceContext's OnlineUser (displayName) → legacy OnlineUser (name)
  const mappedOnlineUsers = useMemo(
    () =>
      presence.onlineUsers.map((u) => ({
        id: u.id,
        name: u.displayName,
        deviceId: u.deviceId,
        status: (u.inCall ? "in_call" : "online") as "online" | "busy" | "in_call",
        lastSeen: Date.now(),
        profileImageUrl: u.profileImageUrl,
      })),
    [presence.onlineUsers]
  );

  // Derive isInCall / callType / isCallConnecting from activeCall
  const activeCall = presence.activeCall;
  const isInCall = activeCall !== null;
  const callType = activeCall
    ? activeCall.callType === "video"
      ? "video"
      : "voice"
    : null;
  const isCallConnecting =
    activeCall !== null &&
    (activeCall.status === "connecting" ||
      activeCall.status === "negotiating" ||
      activeCall.status === "ringing");

  // Map PresenceContext's incomingCall → legacy IncomingCallInfo
  const incomingCallInfo = useMemo((): IncomingCallInfo | null => {
    const ic = presence.incomingCall;
    if (!ic) return null;
    return {
      from: ic.callerId,
      callerName: ic.callerName,
      callType: ic.callType === "video" ? "video" : "voice",
    };
  }, [presence.incomingCall]);

  // Derive selectedUser from activeCall
  const selectedUser = useMemo(() => {
    if (!activeCall) return null;
    return {
      id: activeCall.peerId,
      name: activeCall.peerName,
      deviceId: "unknown",
      status: "in_call" as const,
      lastSeen: Date.now(),
    };
  }, [activeCall]);

  // Map connection quality from activeCall.status
  const connectionQuality = useMemo((): ConnectionQuality => {
    if (!activeCall) return "connecting";
    switch (activeCall.status) {
      case "connected":
        return "good";
      case "reconnecting":
        return "poor";
      case "connecting":
      case "negotiating":
      case "ringing":
        return "connecting";
      default:
        return "connecting";
    }
  }, [activeCall]);

  // ─── Bridged actions ─────────────────────────────────────────────────────────

  const startCall = useMemo(
    () =>
      async (user: import("@/lib/webrtc-service").OnlineUser, type: "voice" | "video") => {
        console.log(
          "[CallContext/Presence] [SINGLE-ENGINE] startCall →",
          type,
          "to",
          user.name,
          "— routing through PresenceContext /cyrus-io"
        );
        presence.callUser(user.id, user.name, type === "video" ? "video" : "audio");
      },
    [presence]
  );

  const acceptCall = useMemo(
    () => async () => {
      console.log("[CallContext/Presence] [SINGLE-ENGINE] acceptCall — routing through PresenceContext /cyrus-io");
      presence.acceptCall();
    },
    [presence]
  );

  const rejectCall = useMemo(
    () => () => {
      console.log("[CallContext/Presence] [SINGLE-ENGINE] rejectCall — routing through PresenceContext /cyrus-io");
      presence.declineCall();
    },
    [presence]
  );

  const endCall = useMemo(
    () =>
      (_sendSignal = true) => {
        console.log("[CallContext/Presence] [SINGLE-ENGINE] endCall — routing through PresenceContext /cyrus-io");
        presence.endCall();
      },
    [presence]
  );

  const toggleMute = useMemo(
    () => () => {
      presence.toggleMute();
    },
    [presence]
  );

  const toggleVideo = useMemo(
    () => () => {
      presence.toggleVideo();
    },
    [presence]
  );

  const sendMessage = useMemo(
    () => (text: string) => {
      if (!activeCall?.peerId) return;
      presence.sendMessage(activeCall.peerId, text);
    },
    [presence, activeCall]
  );

  const setSelectedUser = useMemo(
    () => (_user: import("@/lib/webrtc-service").OnlineUser | null) => {
      // PresenceContext manages peer selection internally via callUser().
      // This is a no-op stub for backward compatibility.
    },
    []
  );

  // ─── Build context value ─────────────────────────────────────────────────────

  const value = useMemo(
    (): CallContextValue => ({
      isConnected: presence.isConnected,
      onlineUsers: mappedOnlineUsers,
      isInCall,
      callType,
      isMuted: presence.mediaControls.isMuted,
      isVideoOff: !presence.mediaControls.isVideoEnabled,
      isCallConnecting,
      incomingCall: incomingCallInfo,
      callDuration: presence.callDuration,
      connectionQuality,
      selectedUser,
      localStream: presence.localStream,
      remoteStream: presence.remoteStream,
      localVideoRef,
      remoteVideoRef,
      remoteAudioRef,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      sendMessage,
      setSelectedUser,
    }),
    [
      presence.isConnected,
      presence.mediaControls,
      presence.callDuration,
      presence.localStream,
      presence.remoteStream,
      mappedOnlineUsers,
      isInCall,
      callType,
      isCallConnecting,
      incomingCallInfo,
      connectionQuality,
      selectedUser,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      sendMessage,
      setSelectedUser,
    ]
  );

  // ─── Derive overlay state ────────────────────────────────────────────────────

  const activeCallOverlay = useMemo((): ActiveCallInfo | null => {
    if (!isInCall || !selectedUser || !callType) return null;
    return {
      peerId: selectedUser.id,
      peerName: selectedUser.name,
      callType,
      status: isCallConnecting ? "connecting" : "connected",
    };
  }, [isInCall, selectedUser, callType, isCallConnecting]);

  const incomingForNotification = useMemo((): IncomingCallInfo | null => {
    if (!incomingCallInfo || isInCall) return null;
    return incomingCallInfo;
  }, [incomingCallInfo, isInCall]);

  return (
    <CallContext.Provider value={value}>
      {children}

      {/*
       * Persistent hidden <audio> element for remote audio playback.
       * Lives at the top of the tree so it is never unmounted during a call.
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
        data-testid="audio-remote-presence"
      />

      {incomingForNotification && (
        <CallNotification
          call={incomingForNotification}
          onAccept={() => void acceptCall()}
          onReject={rejectCall}
        />
      )}

      {activeCallOverlay && activeCallOverlay.callType === "video" && (
        <VideoCall
          activeCall={activeCallOverlay}
          localStream={presence.localStream}
          remoteStream={presence.remoteStream}
          isMuted={presence.mediaControls.isMuted}
          isVideoOff={!presence.mediaControls.isVideoEnabled}
          connectionQuality={connectionQuality}
          callDuration={presence.callDuration}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}

      {activeCallOverlay && activeCallOverlay.callType === "voice" && (
        <AudioCall
          activeCall={activeCallOverlay}
          remoteStream={presence.remoteStream}
          isMuted={presence.mediaControls.isMuted}
          connectionQuality={connectionQuality}
          callDuration={presence.callDuration}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  );
}
