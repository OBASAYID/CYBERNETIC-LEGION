/**
 * CallContext — Provides a global WebRTC call state to the entire app.
 *
 * Wrap authenticated routes with <CallProvider> to enable:
 *  - Incoming call notifications (ring overlay)
 *  - Active call overlay (audio/video)
 *  - Access to call controls from any component via useCall()
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useWebRTC, type WebRTCOptions, type CallType, type IncomingCallInfo, type ActiveCallInfo } from "@/hooks/useWebRTC";

// ── Context type ──────────────────────────────────────────────────────────────

interface CallContextValue {
  isConnected: boolean;
  callStatus: string;
  incomingCall: IncomingCallInfo | null;
  activeCall: ActiveCallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDurationSeconds: number;
  error: string | null;
  initiateCall: (targetUserId: string, callType: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface CallProviderProps {
  children: ReactNode;
  userId: string;
  displayName: string;
}

export function CallProvider({ children, userId, displayName }: CallProviderProps) {
  const webRTCOptions: WebRTCOptions = { userId, displayName };
  const rtc = useWebRTC(webRTCOptions);

  const value: CallContextValue = {
    isConnected: rtc.isConnected,
    callStatus: rtc.callStatus,
    incomingCall: rtc.incomingCall,
    activeCall: rtc.activeCall,
    localStream: rtc.localStream,
    remoteStream: rtc.remoteStream,
    isMuted: rtc.isMuted,
    isVideoEnabled: rtc.isVideoEnabled,
    callDurationSeconds: rtc.callDurationSeconds,
    error: rtc.error,
    initiateCall: rtc.initiateCall,
    acceptCall: rtc.acceptCall,
    rejectCall: rtc.rejectCall,
    endCall: rtc.endCall,
    toggleMute: rtc.toggleMute,
    toggleVideo: rtc.toggleVideo,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* Global overlays rendered at the root so they appear above all content */}
      <IncomingCallOverlay />
      <ActiveCallOverlay />
    </CallContext.Provider>
  );
}

// ── Incoming call overlay ─────────────────────────────────────────────────────

function IncomingCallOverlay() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  if (!incomingCall) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="w-80 rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl text-center space-y-4">
        {/* Animated ring indicator */}
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 rounded-full border-4 border-cyan-400/40 animate-ping" />
          <span className="relative flex h-full w-full items-center justify-center rounded-full bg-cyan-500/20 text-4xl">
            {incomingCall.callType === "video" ? "📹" : "📞"}
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400/70">
            Incoming {incomingCall.callType} call
          </p>
          <p className="mt-1 text-xl font-semibold text-white">{incomingCall.callerName}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={rejectCall}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={acceptCall}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Active call overlay ───────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function ActiveCallOverlay() {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDurationSeconds,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall || activeCall.status === "ended") return null;

  const isVideo = activeCall.callType === "video";

  return (
    <div className="fixed bottom-4 right-4 z-[9998] w-72 rounded-2xl border border-cyan-500/30 bg-slate-900 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80">
        <div>
          <p className="text-xs text-cyan-400/70 uppercase tracking-widest">
            {activeCall.status === "ringing" ? "Calling…" : isVideo ? "Video call" : "Audio call"}
          </p>
          <p className="text-sm font-semibold text-white">{activeCall.peerName}</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {formatDuration(callDurationSeconds)}
        </span>
      </div>

      {/* Video area (only for video calls) */}
      {isVideo && (
        <div className="relative bg-black aspect-video">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          {/* Local video (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-2 right-2 h-16 w-24 rounded-lg object-cover border border-white/20"
          />
        </div>
      )}

      {/* Audio-only avatar */}
      {!isVideo && (
        <div className="flex items-center justify-center py-6 bg-slate-800/40">
          <div className="h-16 w-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-3xl">
            📞
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-around px-4 py-3 bg-slate-800/60">
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          className={`rounded-full p-3 text-sm transition-colors ${
            isMuted ? "bg-red-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          {isMuted ? "🔇" : "🎤"}
        </button>

        {isVideo && (
          <button
            onClick={toggleVideo}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            className={`rounded-full p-3 text-sm transition-colors ${
              !isVideoEnabled ? "bg-red-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            {isVideoEnabled ? "📹" : "🚫"}
          </button>
        )}

        <button
          onClick={endCall}
          title="End call"
          className="rounded-full bg-red-600 p-3 text-sm text-white hover:bg-red-700 transition-colors"
        >
          📵
        </button>
      </div>
    </div>
  );
}
