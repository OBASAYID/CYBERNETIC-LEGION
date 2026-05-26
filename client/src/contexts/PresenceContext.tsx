import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { getCommsDeviceId, resolveCyrusIdentity } from "../lib/cyrus-identity";
import {
  resolveCyrusSocketIoOrigin,
  appendCommSignalingTokenToSearchParams,
} from "@shared/cyrus-api-client";
import {
  getCallQualityMetrics,
  AdaptiveBitrateController,
  isRelayOnlyTestMode,
  getCyrusCommsNetworkMode,
  applyPreferredCodecsToPeerConnection,
  applyCommsSenderTuning,
  resetOutboundBitrateTracker,
  SDP_NEGOTIATION_OPTIONS,
  isLikelyCrossNetworkPath,
} from "../lib/webrtc-config";
import {
  acquireCommsUserMedia,
  getInitialQualityPreset,
  presetToCallQualityLabel,
  tuneCommsPeerConnection,
} from "../lib/comms-call-media";
import { AudioProcessor } from "../lib/webrtc-config";
import type { CallSessionStatus } from "@shared/calls/call-session-types";
import { isIcePathLive } from "@shared/calls/call-session-types";
import { fetchCyrusCommRtcConfiguration } from "../realtime/fetch-rtc-config";
import { CYRUS_ICE_RESTART_VERIFY_MS } from "../realtime/ice-recovery-policy";
import { addIceCandidateSafe, toIceCandidateInit } from "../realtime/webrtc-ice-utils";
import type { CallDiagnosticsSnapshot } from "../realtime/webrtc-diagnostics-types";
import {
  createEmptyReliabilityReport,
  createDefaultTransportDiagnostics,
} from "../realtime/webrtc-diagnostics-types";
import { WebRtcDiagnosticsSession } from "../realtime/webrtc-diagnostics-session";
import { RtcRecoveryManager } from "../realtime/rtc-recovery-manager";
import { RtcNegotiationCoordinator } from "../realtime/rtc-negotiation-coordinator";
import { computeCommsQualityScores } from "../realtime/comms-quality-engine";
import { classifyRtcFailures } from "../realtime/rtc-failure-classifier";
import { resumeCyrusAudioPipeline } from "../realtime/audio-context-recovery";
import { buildPresenceSendMessagePayload } from "../lib/comms-outbound";
import {
  enqueueOutboundMessage,
  flushOutboundQueue,
} from "../lib/comms-offline-queue";

export type { CallDiagnosticsSnapshot } from "../realtime/webrtc-diagnostics-types";

export interface OnlineUser {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  lastActivity?: string;
  /** Profile photo URL from Cyrus chat (may be null) */
  profileImageUrl?: string | null;
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
  /** Single source of truth for call UI + WebRTC lifecycle */
  status: CallSessionStatus;
}

export interface MediaCallControls {
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export type ChatOutboundPayload = {
  message: string;
  messageType?: "text" | "emoji" | "media" | "file" | "cad-3d" | "voice-note" | "location" | "system";
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  voiceDurationSeconds?: number;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
};

interface PresenceContextType {
  isConnected: boolean;
  myUserId: string | null;
  /** Live socket count from server (includes this device). */
  presenceTotal: number;
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
  /** `conversationId` is a peer user id or `group_*` group thread id. */
  sendChatMessage: (conversationId: string, payload: ChatOutboundPayload) => void;
  clearNotification: (id: string) => void;
  wsRef: React.MutableRefObject<Socket | null>;
  callDiagnostics: CallDiagnosticsSnapshot | null;
  /** Remote `<video>` play() outcome for autoplay-policy diagnostics */
  reportRemoteMediaPlayback: (autoplayBlocked: boolean) => void;
  /** User or tooling: retry AudioContext + remote stream reattach (silent audio / blocked autoplay). */
  recoverCallMedia: () => Promise<void>;
  isScreenSharing: boolean;
  screenShareStream: MediaStream | null;
  remoteScreenSharerName: string | null;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  sendCallChatMessage: (payload: ChatOutboundPayload) => void;
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
  const [presenceTotal, setPresenceTotal] = useState(0);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [notifications, setNotifications] = useState<CallNotification[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaControls, setMediaControls] = useState<MediaCallControls>({ isMuted: false, isVideoEnabled: true });
  const [callDuration, setCallDuration] = useState(0);
  const [callDiagnostics, setCallDiagnostics] = useState<CallDiagnosticsSnapshot | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Invalidates in-flight setupWebRTCMedia when a new call starts or teardown runs. */
  const webrtcSessionGenerationRef = useRef(0);
  /** Answerer: SDP may arrive before the peer connection exists. */
  const pendingRemoteOfferRef = useRef<{ offer: RTCSessionDescriptionInit; roomId: string } | null>(null);
  /** Serialize offer/createOffer to avoid negotiation glints (single-flight). */
  const negotiationBusyRef = useRef(false);
  const abrControllerRef = useRef<AdaptiveBitrateController | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const mediaPipelineDisposeRef = useRef<(() => void) | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [remoteScreenSharerName, setRemoteScreenSharerName] = useState<string | null>(null);
  const iceRestartAttemptsRef = useRef(0);
  const iceRestartVerifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ignore spurious ICE "disconnected" before we have ever reached a live path. */
  const mediaWasLiveRef = useRef(false);
  const webrtcDiagSessionRef = useRef<WebRtcDiagnosticsSession | null>(null);
  const recoveryManagerRef = useRef(new RtcRecoveryManager());
  const negotiationCoordinatorRef = useRef(new RtcNegotiationCoordinator());
  const displayNameRef = useRef("User");
  const identityRef = useRef<Awaited<ReturnType<typeof resolveCyrusIdentity>> | null>(null);
  const presenceRegisteredOnceRef = useRef(false);

  const emitPresenceRegister = useCallback((socket: Socket) => {
    const identity = identityRef.current;
    if (!identity) return;
    const profileImageUrl = localStorage.getItem("cyrus-chat-avatar");
    socket.emit("register", {
      userId: identity.commsUserId,
      displayName: displayNameRef.current,
      deviceId: identity.deviceId,
      profileImageUrl: profileImageUrl || null,
    });
  }, []);

  const refreshIdentityAndRegister = useCallback(
    async (socket: Socket, forceAccount = true) => {
      const identity = await resolveCyrusIdentity(forceAccount);
      identityRef.current = identity;
      currentUserIdRef.current = identity.commsUserId;
      emitPresenceRegister(socket);
    },
    [emitPresenceRegister],
  );

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
    webrtcSessionGenerationRef.current += 1;
    pendingRemoteOfferRef.current = null;
    negotiationBusyRef.current = false;
    mediaWasLiveRef.current = false;
    iceRestartAttemptsRef.current = 0;
    if (iceRestartVerifyTimerRef.current) {
      clearTimeout(iceRestartVerifyTimerRef.current);
      iceRestartVerifyTimerRef.current = null;
    }
    if (abrControllerRef.current) {
      abrControllerRef.current.stop();
      abrControllerRef.current = null;
    }
    mediaPipelineDisposeRef.current?.();
    mediaPipelineDisposeRef.current = null;
    audioProcessorRef.current = null;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenShareStream(null);
    setRemoteScreenSharerName(null);
    savedCameraTrackRef.current = null;
    setIsScreenSharing(false);
    webrtcDiagSessionRef.current?.dispose();
    webrtcDiagSessionRef.current = null;
    recoveryManagerRef.current.reset();
    negotiationCoordinatorRef.current.reset();
    setCallDiagnostics(null);
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
      try {
        peerConnectionRef.current.getSenders().forEach((s) => {
          try {
            void s.replaceTrack(null);
          } catch {
            /* ignore */
          }
        });
      } catch {
        /* ignore */
      }
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.onnegotiationneeded = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners("webrtc-offer");
      socketRef.current.removeAllListeners("webrtc-answer");
      socketRef.current.removeAllListeners("webrtc-ice-candidate");
    }
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = new MediaStream();
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

  const setupWebRTCMedia = useCallback(
    async (roomId: string, callType: "audio" | "video", isInitiator: boolean, socket: Socket) => {
      const sessionGen = ++webrtcSessionGenerationRef.current;
      const alive = () => sessionGen === webrtcSessionGenerationRef.current;

      const promoteMediaConnected = () => {
        if (!alive()) return;
        mediaWasLiveRef.current = true;
        setActiveCall((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          if (prev.status === "connected") return prev;
          return { ...prev, status: "connected" as CallSessionStatus };
        });
        startCallTimer();
        const pcNow = peerConnectionRef.current;
        if (!pcNow || abrControllerRef.current) return;
        void tuneCommsPeerConnection(pcNow, callType, (preset) => {
          if (!alive() || !socket.connected) return;
          socket.emit("update-call-quality", {
            roomId,
            quality: presetToCallQualityLabel(preset),
          });
        }).then((ctl) => {
          if (!alive() || peerConnectionRef.current !== pcNow) {
            ctl.stop();
            return;
          }
          abrControllerRef.current = ctl;
          ctl.start();
          socket.emit("update-call-quality", {
            roomId,
            quality: presetToCallQualityLabel(getInitialQualityPreset(callType, getCyrusCommsNetworkMode())),
          });
        });
      };

      const flushIce = async () => {
        const p = peerConnectionRef.current;
        if (!p) return;
        for (const c of pendingCandidatesRef.current) {
          await addIceCandidateSafe(p, c);
        }
        pendingCandidatesRef.current = [];
      };

      try {
        iceRestartAttemptsRef.current = 0;
        recoveryManagerRef.current.reset();
        negotiationCoordinatorRef.current.reset();
        if (iceRestartVerifyTimerRef.current) {
          clearTimeout(iceRestartVerifyTimerRef.current);
          iceRestartVerifyTimerRef.current = null;
        }
        const prevDiag = webrtcDiagSessionRef.current;
        const prevPc = peerConnectionRef.current;
        if (prevDiag && prevPc && prevPc.connectionState !== "closed") {
          prevDiag.logZombieCleanup(prevPc.connectionState);
        }
        prevDiag?.dispose();
        webrtcDiagSessionRef.current = null;
        if (peerConnectionRef.current) {
          peerConnectionRef.current.ontrack = null;
          peerConnectionRef.current.onicecandidate = null;
          peerConnectionRef.current.oniceconnectionstatechange = null;
          peerConnectionRef.current.onconnectionstatechange = null;
          peerConnectionRef.current.onnegotiationneeded = null;
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }
        socket.removeAllListeners("webrtc-offer");
        socket.removeAllListeners("webrtc-answer");
        socket.removeAllListeners("webrtc-ice-candidate");
        pendingCandidatesRef.current = [];
        pendingRemoteOfferRef.current = null;
        negotiationBusyRef.current = false;
        remoteStreamRef.current = new MediaStream();

        setActiveCall((prev) =>
          prev && prev.roomId === roomId ? { ...prev, status: "negotiating" } : prev
        );

        if (!isInitiator) {
          socket.on("webrtc-offer", (data: { offer: RTCSessionDescriptionInit; roomId: string }) => {
            void negotiationCoordinatorRef.current.runExclusive(async () => {
              try {
                if (data.roomId !== roomId || !alive() || isInitiator) return;
                const p = peerConnectionRef.current;
                if (!p) {
                  pendingRemoteOfferRef.current = { offer: data.offer, roomId: data.roomId };
                  if (typeof localStorage !== "undefined" && localStorage.getItem("cyrus-call-debug") === "1") {
                    console.log("[CYRUS-Call] Buffered offer (PC not ready)");
                  }
                  return;
                }
                if (p.signalingState === "have-local-offer") {
                  webrtcDiagSessionRef.current?.recordRecoveryAction("glare_inbound_offer_while_have_local_offer");
                }
                const diag = webrtcDiagSessionRef.current;
                diag?.setNegotiationLocked(true, "remote_offer");
                try {
                  try {
                    await p.setRemoteDescription(new RTCSessionDescription(data.offer));
                    diag?.logSdpFlow("setRemoteOffer", true);
                  } catch (e) {
                    diag?.logSdpFlow("setRemoteOffer", false, { error: String(e) });
                    throw e;
                  }
                  await flushIce();
                  negotiationBusyRef.current = true;
                  try {
                    const answer = await p.createAnswer(SDP_NEGOTIATION_OPTIONS.answer);
                    diag?.logSdpFlow("createAnswer", true);
                    await p.setLocalDescription(answer);
                    diag?.logSdpFlow("setLocalAnswer", true);
                    if (alive() && socket.connected) socket.emit("webrtc-answer", { roomId, answer });
                  } catch (e) {
                    diag?.logSdpFlow("createAnswer", false, { error: String(e) });
                    throw e;
                  } finally {
                    negotiationBusyRef.current = false;
                  }
                } finally {
                  diag?.setNegotiationLocked(false);
                }
              } catch (e) {
                console.warn("[WebRTC-Presence] webrtc-offer handler failed:", e);
              }
            });
          });
        }

        const rtcConfig = await fetchCyrusCommRtcConfiguration({
          forceRelay: isLikelyCrossNetworkPath(),
        });
        if (!alive()) return;

        const networkMode = getCyrusCommsNetworkMode();
        try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          if (!devs.some((d) => d.kind === "audioinput")) {
            addNotification("warning", "No microphone detected — check device permissions.");
          }
        } catch {
          /* ignore */
        }

        let stream: MediaStream;
        try {
          const acquired = await acquireCommsUserMedia(callType, networkMode);
          if (!alive()) {
            acquired.stream.getTracks().forEach((t) => t.stop());
            acquired.disposeMediaPipeline();
            return;
          }
          mediaPipelineDisposeRef.current = acquired.disposeMediaPipeline;
          audioProcessorRef.current = acquired.audioProcessor;
          stream = acquired.stream;
        } catch (mediaErr) {
          console.error("[WebRTC-Presence] getUserMedia failed:", mediaErr);
          addNotification("error", "Microphone/camera access denied or unavailable.");
          throw mediaErr;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;
        resetOutboundBitrateTracker(pc);

        const diagSession = new WebRtcDiagnosticsSession(pc, roomId);
        diagSession.attach();
        webrtcDiagSessionRef.current = diagSession;
        void diagSession.probeAudioContext();

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
          diagSession.logAddTrack(track);
        });
        applyPreferredCodecsToPeerConnection(pc);
        void applyCommsSenderTuning(pc, callType);

        pc.onnegotiationneeded = () => {
          webrtcDiagSessionRef.current?.logNegotiationNeeded();
        };

        const applyPendingOfferIfAny = async () => {
          const pending = pendingRemoteOfferRef.current;
          const p = peerConnectionRef.current;
          const diag = webrtcDiagSessionRef.current;
          if (!pending || pending.roomId !== roomId || !p) return;
          pendingRemoteOfferRef.current = null;
          await negotiationCoordinatorRef.current.runExclusive(async () => {
            diag?.setNegotiationLocked(true, "buffered_remote_offer");
            try {
              try {
                await p.setRemoteDescription(new RTCSessionDescription(pending.offer));
                diag?.logSdpFlow("setRemoteOffer", true, { buffered: true });
              } catch (e) {
                diag?.logSdpFlow("setRemoteOffer", false, { error: String(e), buffered: true });
                throw e;
              }
              await flushIce();
              negotiationBusyRef.current = true;
              try {
                const answer = await p.createAnswer(SDP_NEGOTIATION_OPTIONS.answer);
                diag?.logSdpFlow("createAnswer", true, { buffered: true });
                await p.setLocalDescription(answer);
                diag?.logSdpFlow("setLocalAnswer", true, { buffered: true });
                if (alive() && socket.connected) socket.emit("webrtc-answer", { roomId, answer });
              } finally {
                negotiationBusyRef.current = false;
              }
            } finally {
              diag?.setNegotiationLocked(false);
            }
          });
        };

        pc.ontrack = (event) => {
          webrtcDiagSessionRef.current?.logOnTrack(event);
          const inbound = remoteStreamRef.current;
          const alreadyPresent = inbound.getTracks().some((t) => t.id === event.track.id);
          if (!alreadyPresent) inbound.addTrack(event.track);
          setRemoteStream(new MediaStream(inbound.getTracks()));
          if (event.track.kind === "audio" && event.track.readyState === "live") {
            promoteMediaConnected();
          }
          if (callType === "video" && event.track.kind === "video" && event.track.readyState === "live") {
            promoteMediaConnected();
          }
        };

        pc.onicecandidate = (event) => {
          const diag = webrtcDiagSessionRef.current;
          if (event.candidate) {
            const plain =
              typeof event.candidate.toJSON === "function"
                ? event.candidate.toJSON()
                : event.candidate;
            diag?.logIceCandidate("local", plain);
            if (socket.connected && alive()) {
              socket.emit("webrtc-ice-candidate", { roomId, candidate: plain });
            }
          } else {
            diag?.logIceCandidate("local", { candidate: "" });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (!alive()) return;
          recoveryManagerRef.current.onIceStateChange(pc.iceConnectionState, Date.now());
          const maxAttempts = recoveryManagerRef.current.maxRestartAttempts();
          if (isIcePathLive(pc.iceConnectionState)) {
            iceRestartAttemptsRef.current = 0;
            if (iceRestartVerifyTimerRef.current) {
              clearTimeout(iceRestartVerifyTimerRef.current);
              iceRestartVerifyTimerRef.current = null;
            }
            promoteMediaConnected();
          }
          if (
            pc.iceConnectionState === "disconnected" &&
            mediaWasLiveRef.current &&
            iceRestartAttemptsRef.current < maxAttempts
          ) {
            iceRestartAttemptsRef.current += 1;
            recoveryManagerRef.current.recordManualRestart();
            webrtcDiagSessionRef.current?.logReconnectAttempt(
              iceRestartAttemptsRef.current,
              maxAttempts
            );
            setActiveCall((prev) =>
              prev && prev.roomId === roomId ? { ...prev, status: "reconnecting" } : prev
            );
            addNotification("warning", `Recovering media (${iceRestartAttemptsRef.current}/${maxAttempts})…`);
            try {
              pc.restartIce();
            } catch (e) {
              console.warn("[WebRTC-Presence] restartIce error:", e);
            }
            if (iceRestartVerifyTimerRef.current) clearTimeout(iceRestartVerifyTimerRef.current);
            iceRestartVerifyTimerRef.current = setTimeout(() => {
              if (!alive() || peerConnectionRef.current !== pc) return;
              if (isIcePathLive(pc.iceConnectionState)) return;
              if (iceRestartAttemptsRef.current >= maxAttempts) {
                webrtcDiagSessionRef.current?.logReconnectExhausted();
                addNotification("error", "Media path lost after reconnect attempts.");
                if (socket.connected) socket.emit("end-call", { roomId });
                cleanupMedia();
                setActiveCall(null);
                activeCallRef.current = null;
              }
            }, CYRUS_ICE_RESTART_VERIFY_MS);
          }
          if (pc.iceConnectionState === "failed") {
            webrtcDiagSessionRef.current?.recordTurnFailure(
              isRelayOnlyTestMode()
                ? "ICE failed during relay-only test — verify TURN is reachable and credentials."
                : "ICE connectionState failed (handler)"
            );
            addNotification("error", "Media path failed (ICE). Try relay mode or check TURN.");
            if (socket.connected) socket.emit("end-call", { roomId });
            cleanupMedia();
            setActiveCall(null);
            activeCallRef.current = null;
          }
        };

        pc.onconnectionstatechange = () => {
          if (!alive()) return;
          if (pc.connectionState === "connected") {
            promoteMediaConnected();
          }
          if (pc.connectionState === "failed") {
            webrtcDiagSessionRef.current?.recordNegotiationFailure("RTCPeerConnection connectionState failed");
            addNotification("error", "Call transport failed");
            if (socket.connected) socket.emit("end-call", { roomId });
            cleanupMedia();
            setActiveCall(null);
            activeCallRef.current = null;
          }
        };

        socket.on("webrtc-answer", (data: { answer: RTCSessionDescriptionInit; roomId: string }) => {
          void negotiationCoordinatorRef.current.runExclusive(async () => {
            try {
              if (data.roomId !== roomId || !peerConnectionRef.current || !alive()) return;
              if (!isInitiator) return;
              const diag = webrtcDiagSessionRef.current;
              const p = peerConnectionRef.current;
              diag?.setNegotiationLocked(true, "webrtc_answer");
              try {
                await p.setRemoteDescription(new RTCSessionDescription(data.answer));
                diag?.logSdpFlow("setRemoteAnswer", true);
                await flushIce();
              } catch (e) {
                diag?.logSdpFlow("setRemoteAnswer", false, { error: String(e) });
                throw e;
              } finally {
                diag?.setNegotiationLocked(false);
              }
            } catch (e) {
              console.warn("[WebRTC-Presence] webrtc-answer handler failed:", e);
            }
          });
        });

        socket.on("webrtc-ice-candidate", async (data: { candidate: unknown; roomId: string }) => {
          try {
            if (data.roomId !== roomId || !peerConnectionRef.current || !alive()) return;
            const p = peerConnectionRef.current;
            webrtcDiagSessionRef.current?.logIceCandidate("remote", data.candidate);
            if (p.remoteDescription) {
              await addIceCandidateSafe(p, data.candidate);
            } else {
              const init = toIceCandidateInit(data.candidate);
              if (init) pendingCandidatesRef.current.push(init);
            }
          } catch (e) {
            console.warn("[WebRTC-Presence] webrtc-ice-candidate handler failed:", e);
          }
        });

        await applyPendingOfferIfAny();
        if (!alive()) return;

        if (isInitiator) {
          if (negotiationBusyRef.current) {
            console.warn("[WebRTC-Presence] createOffer skipped: negotiation still busy");
          } else {
            negotiationBusyRef.current = true;
            webrtcDiagSessionRef.current?.setNegotiationLocked(true, "createOffer");
            try {
              await negotiationCoordinatorRef.current.runExclusive(async () => {
                let offer: RTCSessionDescriptionInit | undefined;
                try {
                  offer = await pc.createOffer(SDP_NEGOTIATION_OPTIONS.offer);
                  webrtcDiagSessionRef.current?.logSdpFlow("createOffer", true);
                } catch (e) {
                  webrtcDiagSessionRef.current?.logSdpFlow("createOffer", false, { error: String(e) });
                  offer = undefined;
                }
                if (offer !== undefined) {
                  try {
                    await pc.setLocalDescription(offer);
                    webrtcDiagSessionRef.current?.logSdpFlow("setLocalOffer", true);
                    if (alive() && socket.connected) socket.emit("webrtc-offer", { roomId, offer });
                  } catch (e2) {
                    webrtcDiagSessionRef.current?.logSdpFlow("setLocalOffer", false, { error: String(e2) });
                  }
                }
              });
            } finally {
              negotiationBusyRef.current = false;
              webrtcDiagSessionRef.current?.setNegotiationLocked(false);
            }
          }
        }
      } catch (err) {
        console.error("[WebRTC-Presence] Media setup failed:", err);
        webrtcDiagSessionRef.current?.recordNegotiationFailure(
          `Media setup failed: ${err instanceof Error ? err.message : String(err)}`
        );
        addNotification("error", "Failed to access camera/microphone or start call");
        if (alive()) {
          setActiveCall((prev) =>
            prev && prev.roomId === roomId ? { ...prev, status: "failed" } : prev
          );
        }
      }
    },
    [addNotification, startCallTimer, cleanupMedia]
  );

  const connectPresence = useCallback((displayName: string = "User") => {
    console.log("[Presence] connectPresence called, displayName:", displayName);
    displayNameRef.current = displayName;

    const existing = socketRef.current;
    if (existing?.connected) {
      console.log("[Presence] Already connected — refreshing identity + re-register");
      void refreshIdentityAndRegister(existing, true);
      return;
    }
    if (existing && !existing.disconnected) {
      console.log("[Presence] Socket connect in progress — skipping duplicate connectPresence");
      return;
    }

    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
      socketRef.current = null;
    }

    void (async () => {
      const identity = await resolveCyrusIdentity(true);
      identityRef.current = identity;
      const { deviceId, commsUserId: userId } = identity;
      currentUserIdRef.current = userId;

      const socketUrl = resolveCyrusSocketIoOrigin();
      console.log(
        `[Presence] Connecting Socket.IO to: ${socketUrl} (account=${identity.accountUserId ?? "anon"}, device=${deviceId})`,
      );

      const wsEnv = String(import.meta.env.VITE_RTC_SIGNALING_WS || "").trim().toLowerCase();
      const websocketOnly = wsEnv === "only";
      const pollingOnly = wsEnv === "false" || wsEnv === "polling";
      const transports: ("websocket" | "polling")[] = pollingOnly
        ? ["polling"]
        : websocketOnly
          ? ["websocket"]
          : ["polling", "websocket"];
      const allowUpgrade = !pollingOnly;
      const socketQuery: Record<string, string> = {};
      const q = new URLSearchParams();
      appendCommSignalingTokenToSearchParams(q);
      q.forEach((value, key) => {
        socketQuery[key] = value;
      });

      const socket = io(socketUrl, {
        path: "/cyrus-io",
        transports,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        timeout: 60_000,
        upgrade: allowUpgrade,
        forceNew: true,
        withCredentials: true,
        autoConnect: true,
        query: Object.keys(socketQuery).length ? socketQuery : undefined,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[Presence] CONNECTED - Socket ID:", socket.id);
        setIsConnected(true);
        emitPresenceRegister(socket);
      });

      socket.on("registered", (data: { userId: string; totalOnline: number }) => {
        console.log("[Presence] Registered successfully:", data);
        setMyUserId(data.userId);
        currentUserIdRef.current = data.userId;
        setPresenceTotal(data.totalOnline);
        setIsConnected(true);
        const { sent, remaining } = flushOutboundQueue((_conversationId, body) => {
          socket.emit("send-message", body);
        });
        if (sent > 0) {
          addNotification("success", `Delivered ${sent} queued message${sent === 1 ? "" : "s"}`);
        }
        if (remaining > 0) {
          addNotification("warning", `${remaining} message(s) still queued`);
        }
        if (!presenceRegisteredOnceRef.current) {
          presenceRegisteredOnceRef.current = true;
          addNotification("success", `Connected as ${displayNameRef.current}`);
        }
      });

    socket.on('presence-update', (data: { users: OnlineUser[]; total: number }) => {
      const currentId = currentUserIdRef.current;
      const otherUsers = data.users.filter((u) => u.id !== currentId);
      console.log(`[Presence] Online: ${data.total} total, ${otherUsers.length} others`);
      setPresenceTotal(data.total);
      setOnlineUsers(otherUsers);
      if (socket.connected) setIsConnected(true);
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
        status: "connecting",
      } : {
        roomId: data.roomId,
        peerName: data.peerName,
        peerId: data.peerId,
        callType,
        isInitiator: true,
        status: "connecting",
      });
      setIncomingCall(null);
      incomingCallRef.current = null;
      addNotification("success", `Connecting to ${data.peerName}…`);
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
        status: "connecting",
      });
      setIncomingCall(null);
      incomingCallRef.current = null;
      addNotification("success", `Connecting to ${data.peerName}…`);
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

    socket.on(
      "screen-share-started",
      (data: { roomId: string; userId: string; displayName?: string }) => {
        if (activeCallRef.current?.roomId !== data.roomId) return;
        if (data.userId === currentUserIdRef.current) return;
        setRemoteScreenSharerName(data.displayName || "Participant");
      },
    );

    socket.on("screen-share-stopped", (data: { roomId: string; userId: string }) => {
      if (activeCallRef.current?.roomId !== data.roomId) return;
      if (data.userId === currentUserIdRef.current) return;
      setRemoteScreenSharerName(null);
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
      setIsConnected(true);
      void refreshIdentityAndRegister(socket, true);
    });

    socket.on('connect_error', (error) => {
      console.error("[Presence] Connection error:", error.message);
      setIsConnected(false);
    });

    socket.on('force-logout', (data: { type: string; message: string }) => {
      console.warn("[Presence] FORCE_LOGOUT received:", data.message);
      // Clear all local auth state so the user is fully signed out
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to the root — the app will show the login screen
      window.location.href = "/";
    });

    })();
  }, [addNotification, setupWebRTCMedia, cleanupMedia, emitPresenceRegister, refreshIdentityAndRegister]);

  const disconnectPresence = useCallback(() => {
    cleanupMedia();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setPresenceTotal(0);
    setOnlineUsers([]);
    setMyUserId(null);
    setActiveCall(null);
    setIncomingCall(null);
    currentUserIdRef.current = null;
    incomingCallRef.current = null;
    activeCallRef.current = null;
    identityRef.current = null;
    presenceRegisteredOnceRef.current = false;
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
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        webrtcDiagSessionRef.current?.logLocalTrackControl(
          track.enabled ? "enable" : "disable",
          "audio",
          track.id
        );
      });
      setMediaControls(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        webrtcDiagSessionRef.current?.logLocalTrackControl(
          track.enabled ? "enable" : "disable",
          "video",
          track.id
        );
      });
      setMediaControls(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, []);

  const sendChatMessage = useCallback((conversationId: string, payload: ChatOutboundPayload) => {
    if (!socketRef.current?.connected) {
      enqueueOutboundMessage(conversationId, payload);
      addNotification("warning", "Reconnecting — message queued for delivery");
      return;
    }
    socketRef.current.emit(
      "send-message",
      buildPresenceSendMessagePayload(conversationId, payload),
    );
  }, [addNotification]);

  const sendMessage = useCallback(
    (targetUserId: string, message: string) => {
      sendChatMessage(targetUserId, { message, messageType: "text" });
    },
    [sendChatMessage],
  );

  const reportRemoteMediaPlayback = useCallback((autoplayBlocked: boolean) => {
    webrtcDiagSessionRef.current?.reportRemotePlayback(autoplayBlocked);
    if (autoplayBlocked) {
      void resumeCyrusAudioPipeline();
      window.setTimeout(() => {
        const ms = remoteStreamRef.current;
        if (!ms || ms.getTracks().length === 0) return;
        webrtcDiagSessionRef.current?.recordRecoveryAction("remote_stream_reattach_playback_retry");
        setRemoteStream(new MediaStream(ms.getTracks()));
      }, 400);
    }
  }, []);

  const recoverCallMedia = useCallback(async () => {
    const ok = await resumeCyrusAudioPipeline();
    webrtcDiagSessionRef.current?.recordRecoveryAction("user_recover_call_media", {
      audioPipeline: ok,
    });
    const ms = remoteStreamRef.current;
    if (ms?.getTracks().length) {
      setRemoteStream(new MediaStream(ms.getTracks()));
    }
    addNotification(
      "info",
      ok
        ? "CYRUS retried audio playback and reattached remote media."
        : "Remote stream reattached — use in-call controls or tap the video if audio is still silent."
    );
  }, [addNotification]);

  const sendCallChatMessage = useCallback((payload: ChatOutboundPayload) => {
    const call = activeCallRef.current;
    const uid = currentUserIdRef.current;
    if (!call || !uid || !socketRef.current?.connected) return;
    socketRef.current.emit("call-chat-message", {
      roomId: call.roomId,
      message: payload.message,
      messageType: payload.messageType || "text",
      fileUrl: payload.fileUrl,
      fileName: payload.fileName,
      fileMimeType: payload.fileMimeType,
      timestamp: payload.timestamp || new Date().toISOString(),
    });
  }, []);

  const stopScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const call = activeCallRef.current;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenShareStream(null);
    const videoSender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (videoSender && savedCameraTrackRef.current) {
      try {
        await videoSender.replaceTrack(savedCameraTrackRef.current);
      } catch (e) {
        console.warn("[Presence] restore camera track failed:", e);
      }
    }
    savedCameraTrackRef.current = null;
    setIsScreenSharing(false);
    if (call && socketRef.current?.connected) {
      socketRef.current.emit("screen-share-stop", { roomId: call.roomId });
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const call = activeCallRef.current;
    if (!pc || !call || !socketRef.current?.connected) {
      addNotification("error", "Connect a call before sharing your screen.");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 24, max: 30 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
        },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        screenStream.getTracks().forEach((t) => t.stop());
        return;
      }
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender?.track) {
        savedCameraTrackRef.current = videoSender.track;
        await videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, screenStream);
      }
      screenTrack.onended = () => {
        void stopScreenShare();
      };
      screenStreamRef.current = screenStream;
      setScreenShareStream(screenStream);
      setIsScreenSharing(true);
      setMediaControls((prev) => ({ ...prev, isVideoEnabled: true }));
      socketRef.current.emit("screen-share-start", { roomId: call.roomId });
      addNotification("success", "Screen sharing started");
    } catch (err) {
      console.warn("[Presence] screen share failed:", err);
      addNotification("warning", "Screen share cancelled or blocked by the browser.");
    }
  }, [addNotification, stopScreenShare]);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [cleanupMedia]);

  useEffect(() => {
    if (!activeCall || activeCall.status === "failed") {
      setCallDiagnostics(null);
      return;
    }
    const tick = async () => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const m = await getCallQualityMetrics(pc);
        const session = webrtcDiagSessionRef.current;
        const call = activeCallRef.current;
        if (session) {
          const snap = await session.composeSnapshot(m, abrControllerRef.current?.getCurrentPreset());
          setCallDiagnostics(snap);

          const rec = recoveryManagerRef.current;
          rec.onIceStateChange(pc.iceConnectionState, Date.now());
          const res = rec.tick({
            now: Date.now(),
            iceState: pc.iceConnectionState,
            packetLossPct: snap.packetLossRate,
            bitrateKbps: snap.bitrateKbps,
            isVideoCall: call?.callType === "video",
            mediaWasLive: mediaWasLiveRef.current,
            remoteStalled: snap.remoteStalled,
          });
          const maxA = rec.maxRestartAttempts();
          if (res.action === "ice_restart") {
            if (iceRestartAttemptsRef.current >= maxA) return;
            iceRestartAttemptsRef.current += 1;
            session.recordRecoveryAction("auto_ice_restart", { reason: res.reason });
            webrtcDiagSessionRef.current?.logReconnectAttempt(iceRestartAttemptsRef.current, maxA);
            setActiveCall((prev) =>
              prev && prev.roomId === call?.roomId ? { ...prev, status: "reconnecting" } : prev
            );
            addNotification("warning", `Auto-recovering (${res.reason})…`);
            try {
              pc.restartIce();
            } catch (e) {
              console.warn("[WebRTC-Presence] auto restartIce error:", e);
            }
            if (iceRestartVerifyTimerRef.current) clearTimeout(iceRestartVerifyTimerRef.current);
            const rid = call?.roomId;
            iceRestartVerifyTimerRef.current = setTimeout(() => {
              if (peerConnectionRef.current !== pc) return;
              if (isIcePathLive(pc.iceConnectionState)) return;
              if (iceRestartAttemptsRef.current >= maxA && rid && socketRef.current?.connected) {
                webrtcDiagSessionRef.current?.logReconnectExhausted();
                socketRef.current.emit("end-call", { roomId: rid });
                cleanupMedia();
                setActiveCall(null);
                activeCallRef.current = null;
              }
            }, CYRUS_ICE_RESTART_VERIFY_MS);
          } else if (res.action === "force_relay_restart" || res.action === "escalate_relay_preference") {
            session.recordRecoveryAction("relay_escalation", { reason: res.reason });
            addNotification("info", "Switching to relay path for clearer audio…");
            try {
              localStorage.setItem("cyrus-force-relay", "true");
            } catch {
              /* ignore */
            }
            if (iceRestartAttemptsRef.current >= maxA) return;
            iceRestartAttemptsRef.current += 1;
            try {
              await pc.restartIce();
              const offer = await pc.createOffer(SDP_NEGOTIATION_OPTIONS.iceRestart);
              await pc.setLocalDescription(offer);
              if (socketRef.current?.connected && call?.roomId) {
                socketRef.current.emit("webrtc-offer", { roomId: call.roomId, offer });
              }
            } catch (e) {
              console.warn("[WebRTC-Presence] relay restart failed:", e);
            }
          }
          return;
        }
        const rtt = Math.round((m.roundTripTime || 0) * 1000);
        const jitter = Math.round((m.jitter || 0) * 1000);
        const loss = m.packetLossRate;
        const bitrate = Math.round((m.bitrate / 1000) * 10) / 10;
        const basePartial = {
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          signalingState: pc.signalingState,
          iceGatheringState: pc.iceGatheringState,
          qualityScore: m.qualityScore,
          rttMs: rtt,
          packetLossRate: loss,
          jitterMs: jitter,
          bitrateKbps: bitrate,
          abrPreset: abrControllerRef.current?.getCurrentPreset(),
          localCandidateTypes: [] as string[],
          remoteCandidateTypes: [] as string[],
          relayCandidateSeen: false,
          relayActive: false,
          relayOnlyTestMode: isRelayOnlyTestMode(),
          turnWarning: null,
          remoteTracks: [] as CallDiagnosticsSnapshot["remoteTracks"],
          remotePlaybackBlocked: false,
          remoteStalled: false,
          audioFlatlineSuspected: false,
          videoBlackScreenSuspected: false,
          audioContextSuspended: null as boolean | null,
          negotiationInProgress: false,
          reliabilityReport: createEmptyReliabilityReport(),
          structuredLogTail: [] as CallDiagnosticsSnapshot["structuredLogTail"],
          transport: createDefaultTransportDiagnostics(),
          recoveryActions: [] as string[],
          rtcTimeline: [] as CallDiagnosticsSnapshot["rtcTimeline"],
          bitrateHistory: [] as number[],
          lossHistory: [] as number[],
          qualityScores: computeCommsQualityScores({
            rttMs: rtt,
            jitterMs: jitter,
            packetLossPct: loss,
            bitrateKbps: bitrate,
            iceLive: isIcePathLive(pc.iceConnectionState),
            relayActive: false,
            remoteStalled: false,
            remotePlaybackBlocked: false,
            reconnectCount: 0,
            negotiationFailures: 0,
            audioFlatlineSuspected: false,
            videoBlackScreenSuspected: false,
          }),
          failureHints: [] as string[],
          activeCodecs: {} as CallDiagnosticsSnapshot["activeCodecs"],
          networkMode: getCyrusCommsNetworkMode(),
          relayEscalationActive: false,
        };
        setCallDiagnostics({
          ...basePartial,
          failureHints: classifyRtcFailures(basePartial as CallDiagnosticsSnapshot),
        });
      } catch {
        /* stats may fail during teardown */
      }
    };
    void tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [activeCall?.roomId, activeCall?.status, addNotification, cleanupMedia]);

  return (
    <PresenceContext.Provider
      value={{
        isConnected,
        myUserId,
        presenceTotal,
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
        sendChatMessage,
        clearNotification,
        wsRef: socketRef as any,
        callDiagnostics,
        reportRemoteMediaPlayback,
        recoverCallMedia,
        isScreenSharing,
        screenShareStream,
        remoteScreenSharerName,
        startScreenShare,
        stopScreenShare,
        sendCallChatMessage,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
