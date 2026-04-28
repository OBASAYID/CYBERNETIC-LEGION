/**
 * CallContext — provides global call state and actions to the entire app.
 *
 * Wrap the app (or the authenticated section) with <CallProvider> so that:
 *  - Incoming call notifications appear on any page
 *  - Active call overlays (VideoCall / AudioCall) render above all content
 *  - Any component can initiate a call via `useCallContext()`
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useWebRTC, type UseWebRTCOptions } from "@/hooks/useWebRTC";
import { CallNotification } from "@/components/CallNotification";
import { VideoCall } from "@/components/VideoCall";
import { AudioCall } from "@/components/AudioCall";

// Re-export types for convenience
export type {
  CallType,
  CallStatus,
  ConnectionQuality,
  OnlineUser,
  IncomingCallInfo,
  ActiveCallInfo,
} from "@/hooks/useWebRTC";

type WebRTCReturn = ReturnType<typeof useWebRTC>;

const CallContext = createContext<WebRTCReturn | null>(null);

export function useCallContext(): WebRTCReturn {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCallContext must be used inside <CallProvider>");
  }
  return ctx;
}

interface CallProviderProps {
  children: ReactNode;
  webRTCOptions: UseWebRTCOptions;
}

/**
 * CallProvider
 *
 * Mount once at the top of the authenticated app tree.
 * Renders incoming-call notifications and active-call overlays automatically.
 *
 * @example
 * ```tsx
 * <CallProvider webRTCOptions={{ userId, displayName }}>
 *   <AppRoutes />
 * </CallProvider>
 * ```
 */
export function CallProvider({ children, webRTCOptions }: CallProviderProps) {
  const webRTC = useWebRTC(webRTCOptions);

  const {
    callStatus,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    connectionQuality,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = webRTC;

  const isInActiveCall = callStatus === "connecting" || callStatus === "connected";

  return (
    <CallContext.Provider value={webRTC}>
      {children}

      {/* Incoming call notification — floats above all content */}
      {incomingCall && callStatus === "ringing-in" && (
        <CallNotification
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active call overlay */}
      {isInActiveCall && activeCall && (
        activeCall.callType === "video" ? (
          <VideoCall
            activeCall={activeCall}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            connectionQuality={connectionQuality}
            callDuration={callDuration}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onEndCall={endCall}
          />
        ) : (
          <AudioCall
            activeCall={activeCall}
            remoteStream={remoteStream}
            isMuted={isMuted}
            connectionQuality={connectionQuality}
            callDuration={callDuration}
            onToggleMute={toggleMute}
            onEndCall={endCall}
          />
        )
      )}
    </CallContext.Provider>
  );
}
