/**
 * Lightweight P2P call shell — same CYRUS call graphics, minimal route bundle.
 * Transmission/signaling: PresenceContext + sealed WebRTC (server-blind relay).
 */
import { useCallback, useMemo, useState } from "react";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { CallView } from "../../../client/src/components/comms/CallView";
import {
  COMMS_THEME,
  CommsIncomingCallOverlay,
} from "@/components/comms/comms-call-chrome";

export default function CommsCallPage() {
  const displayName =
    (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) ||
    "CYRUS OPERATOR";

  const {
    myUserId,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    callDuration,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    mediaControls,
    wsRef,
    isScreenSharing,
    screenShareStream,
    remoteScreenSharerName,
    startScreenShare,
    stopScreenShare,
    sendCallChatMessage,
    recoverCallMedia,
    reportRemoteMediaPlayback,
    callChatMessages,
  } = usePresence();

  const myId = useMemo(() => {
    if (myUserId) return myUserId;
    try {
      return localStorage.getItem("cyrus_comms_user_id") || "local-operator";
    } catch {
      return "local-operator";
    }
  }, [myUserId]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const handleToggleMute = useCallback(() => {
    toggleMute();
    setIsMuted((v) => !v);
  }, [toggleMute]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    setIsVideoOff((v) => !v);
  }, [toggleVideo]);

  return (
    <div className="fixed inset-0 z-[80] text-white" style={{ background: COMMS_THEME.bg }}>
      {incomingCall && !activeCall && (
        <CommsIncomingCallOverlay
          call={{
            callerName: incomingCall.callerName,
            callType: incomingCall.callType,
          }}
          onAccept={() => acceptCall()}
          onDecline={() => declineCall()}
        />
      )}

      {activeCall && (
        <CallView
          roomId={activeCall.roomId}
          callType={activeCall.callType}
          participants={[
            {
              id: activeCall.peerId || "remote-peer",
              displayName: activeCall.peerName,
              stream: remoteStream ?? undefined,
              isMuted: false,
              isVideoEnabled: activeCall.callType === "video",
            },
          ]}
          localStream={localStream ?? null}
          remoteStream={remoteStream ?? null}
          currentUserId={myUserId ?? myId}
          currentUserName={displayName}
          isMuted={isMuted}
          isVideoEnabled={!isVideoOff && (mediaControls?.isVideoEnabled ?? true)}
          callDuration={callDuration}
          mediaEstablishing={activeCall.status !== "connected"}
          onEndCall={endCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          isScreenSharing={isScreenSharing}
          screenShareStream={screenShareStream ?? null}
          screenSharerName={remoteScreenSharerName ?? undefined}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onSendChatMessage={(msg: string) =>
            sendCallChatMessage({ message: msg, messageType: "text" })
          }
          chatMessages={callChatMessages}
          onRemotePlaybackDiagnostics={({ blocked }) => reportRemoteMediaPlayback(blocked)}
          onRecoverMedia={() => void recoverCallMedia()}
          socketRef={wsRef}
        />
      )}

      {activeCall && activeCall.status === "connected" && !remoteStream?.getTracks().length && (
        <button
          type="button"
          className="fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[11px] font-semibold text-amber-100"
          onClick={() => void recoverCallMedia()}
        >
          No remote audio? Tap to recover media
        </button>
      )}
    </div>
  );
}
