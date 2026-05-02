/**
 * CallContext — provides global call state and actions to the entire app.
 *
 * Wrap the app (or the authenticated section) with <CallProvider> so that:
 *  - Incoming call notifications appear on any page
 *  - Active call overlays (VideoCall / AudioCall) render above all content
 *  - Any component can initiate a call via `useCallContext()`
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWebRTC, type UseWebRTCOptions } from "@/hooks/useWebRTC";
import { CallNotification } from "@/components/CallNotification";
import { VideoCall } from "@/components/VideoCall";
import { AudioCall } from "@/components/AudioCall";
import type { ActiveCallInfo, ConnectionQuality, IncomingCallInfo } from "@/hooks/useWebRTC";

export type { ActiveCallInfo, ConnectionQuality, IncomingCallInfo, UseWebRTCOptions } from "@/hooks/useWebRTC";
export type { OnlineUser, ChatMessage } from "@/lib/webrtc-service";

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

function buildActiveCall(w: WebRTCReturn): ActiveCallInfo | null {
  if (!w.isInCall || !w.selectedUser || !w.callType) return null;
  return {
    peerId: w.selectedUser.id,
    peerName: w.selectedUser.name,
    callType: w.callType,
    status: w.isCallConnecting ? "connecting" : "connected",
  };
}

function incomingForNotification(w: WebRTCReturn): IncomingCallInfo | null {
  if (!w.incomingCall || w.isInCall) return null;
  return {
    from: w.incomingCall.from,
    callerName: w.incomingCall.callerName,
    callType: w.incomingCall.callType,
  };
}

export function CallProvider({ children, webRTCOptions }: CallProviderProps) {
  const webRTC = useWebRTC(webRTCOptions);
  const activeCall = useMemo(() => buildActiveCall(webRTC), [webRTC]);
  const incoming = useMemo(() => incomingForNotification(webRTC), [webRTC]);

  return (
    <CallContext.Provider value={webRTC}>
      {children}

      {incoming && (
        <CallNotification
          call={incoming}
          onAccept={() => void webRTC.acceptCall()}
          onReject={webRTC.rejectCall}
        />
      )}

      {activeCall && activeCall.callType === "video" && (
        <VideoCall
          activeCall={activeCall}
          localStream={webRTC.localStream}
          remoteStream={webRTC.remoteStream}
          isMuted={webRTC.isMuted}
          isVideoOff={webRTC.isVideoOff}
          connectionQuality={webRTC.connectionQuality as ConnectionQuality}
          callDuration={webRTC.callDuration}
          onToggleMute={webRTC.toggleMute}
          onToggleVideo={webRTC.toggleVideo}
          onEndCall={webRTC.endCall}
        />
      )}

      {activeCall && activeCall.callType === "voice" && (
        <AudioCall
          activeCall={activeCall}
          remoteStream={webRTC.remoteStream}
          isMuted={webRTC.isMuted}
          connectionQuality={webRTC.connectionQuality as ConnectionQuality}
          callDuration={webRTC.callDuration}
          onToggleMute={webRTC.toggleMute}
          onEndCall={webRTC.endCall}
        />
      )}
    </CallContext.Provider>
  );
}
