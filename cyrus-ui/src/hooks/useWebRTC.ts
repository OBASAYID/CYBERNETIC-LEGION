/**
 * useWebRTC — thin wrapper around PresenceContext for backward compatibility.
 *
 * SINGLE-ENGINE ARCHITECTURE (post-consolidation):
 * This hook no longer connects to the legacy /ws WebSocket via webRTCService.
 * All real-time communication flows through PresenceContext's Socket.IO
 * connection on /cyrus-io. This hook delegates every call action to
 * usePresence() so that existing consumers (CallDialog, etc.) continue to
 * work without modification.
 *
 * @deprecated Prefer usePresence() directly for new code.
 */

import { useCallback, useRef, useMemo } from "react";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import type { OnlineUser, ChatMessage } from "@/lib/webrtc-service";

/** Re-export for UI components (CallDialog, etc.) */
export type { OnlineUser } from "@/lib/webrtc-service";
export type CallType = "voice" | "video";

export type IncomingCallInfo = {
  from: string;
  callerName: string;
  callType: "voice" | "video";
};

export type ActiveCallInfo = {
  peerId: string;
  peerName: string;
  callType: "voice" | "video";
  status: "connecting" | "connected";
};

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "connecting";

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
  connectionQuality: ConnectionQuality;
  selectedUser: OnlineUser | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  /** Ref to attach to a local <video> element */
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref to attach to a remote <video> element (video calls) */
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref to attach to a hidden <audio> element for remote audio (all call types) */
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: (user: OnlineUser, type: "voice" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: (sendSignal?: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendMessage: (text: string) => void;
  setSelectedUser: (user: OnlineUser | null) => void;
}

/**
 * Thin wrapper around PresenceContext — delegates all call actions to the
 * single /cyrus-io Socket.IO engine. The legacy /ws webRTCService is NOT
 * connected here.
 *
 * @deprecated Prefer usePresence() directly for new code.
 */
export function useWebRTC(_options: UseWebRTCOptions): UseWebRTCReturn {
  console.log(
    "[useWebRTC] [SINGLE-ENGINE] Delegating to PresenceContext — webRTCService /ws is inactive"
  );

  const presence = usePresence();

  // Stable refs — callers may attach these to <video>/<audio> elements.
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // ─── Map PresenceContext state → legacy UseWebRTCReturn shape ─────────────

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

  const incomingCall = useMemo(() => {
    const ic = presence.incomingCall;
    if (!ic) return null;
    return {
      from: ic.callerId,
      callerName: ic.callerName,
      callType: (ic.callType === "video" ? "video" : "voice") as "voice" | "video",
    };
  }, [presence.incomingCall]);

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

  const connectionQuality = useMemo((): ConnectionQuality => {
    if (!activeCall) return "connecting";
    switch (activeCall.status) {
      case "connected": return "good";
      case "reconnecting": return "poor";
      default: return "connecting";
    }
  }, [activeCall]);

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

  // ─── Bridged actions ──────────────────────────────────────────────────────

  const startCall = useCallback(
    async (user: OnlineUser, type: "voice" | "video") => {
      console.log(
        "[useWebRTC] [SINGLE-ENGINE] startCall →",
        type,
        "to",
        user.name,
        "— routing through PresenceContext /cyrus-io"
      );
      presence.callUser(user.id, user.name, type === "video" ? "video" : "audio");
    },
    [presence]
  );

  const acceptCall = useCallback(async () => {
    console.log("[useWebRTC] [SINGLE-ENGINE] acceptCall — routing through PresenceContext /cyrus-io");
    presence.acceptCall();
  }, [presence]);

  const rejectCall = useCallback(() => {
    console.log("[useWebRTC] [SINGLE-ENGINE] rejectCall — routing through PresenceContext /cyrus-io");
    presence.declineCall();
  }, [presence]);

  const endCall = useCallback(
    (_sendSignal = true) => {
      console.log("[useWebRTC] [SINGLE-ENGINE] endCall — routing through PresenceContext /cyrus-io");
      presence.endCall();
    },
    [presence]
  );

  const toggleMute = useCallback(() => {
    presence.toggleMute();
  }, [presence]);

  const toggleVideo = useCallback(() => {
    presence.toggleVideo();
  }, [presence]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!activeCall?.peerId) return;
      presence.sendMessage(activeCall.peerId, text);
    },
    [presence, activeCall]
  );

  const setSelectedUser = useCallback((_user: OnlineUser | null) => {
    // PresenceContext manages peer selection internally via callUser().
    // No-op stub for backward compatibility.
  }, []);

  return {
    isConnected: presence.isConnected,
    isReconnecting: false,
    reconnectAttempt: 0,
    onlineUsers: mappedOnlineUsers,
    messages: [],
    isInCall,
    callType,
    isMuted: presence.mediaControls.isMuted,
    isVideoOff: !presence.mediaControls.isVideoEnabled,
    isCallConnecting,
    incomingCall,
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
  };
}
