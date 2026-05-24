import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  systemFetch,
  resolveCyrusWebSocketUrl,
  appendCommSignalingTokenToSearchParams,
} from "@shared/cyrus-api-client";
import {
  createPeerConnectionConfig,
  getOptimalVideoConstraints,
  getAudioConstraints,
  getCallQualityMetrics,
  applyBandwidthConstraints,
  AdaptiveBitrateController,
  AudioProcessor,
  ConnectionManager,
  detectNetworkType,
  CallQualityMetrics,
} from "../lib/webrtc-config";
import { acquireCommsUserMedia } from "../lib/comms-call-media";
import { applyCommsMediaFilters } from "../lib/comms-media-filters";
import { getCommsDeviceId, resolveCyrusIdentity } from "../lib/cyrus-identity";

function commsHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
  };
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  read: boolean;
  messageType?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueAt: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
}

export interface CallSession {
  roomId: string;
  peerId: string;
  type: "audio" | "video";
  status: "connecting" | "connected" | "reconnecting" | "ended" | "failed";
  qualityMetrics?: CallQualityMetrics;
  networkType?: string;
  qualityPreset?: string;
}

export interface CallControls {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  volume: number;
}

export interface OnlineUser {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  lastActivity: string;
}

export interface IncomingCall {
  callerId: string;
  callerName: string;
  roomId: string;
  callType: "audio" | "video";
}

export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  isFavorite: boolean;
  createdAt: string;
}

export function useComms() {
  const queryClient = useQueryClient();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callControls, setCallControls] = useState<CallControls>({
    isMuted: false,
    isVideoEnabled: true,
    isSpeakerOn: true,
    volume: 1,
  });
  const [qualityMetrics, setQualityMetrics] = useState<CallQualityMetrics | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const mediaPipelineDisposeRef = useRef<(() => void) | null>(null);
  const videoFilterDisposeRef = useRef<(() => void) | null>(null);
  const bitrateControllerRef = useRef<AdaptiveBitrateController | null>(null);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const qualityMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const presenceWsRef = useRef<WebSocket | null>(null);

  const messagesQuery = useQuery<Message[]>({
    queryKey: ["/api/comms/messages"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/messages", { headers: commsHeaders() });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: false,
  });

  const allUsersQuery = useQuery<
    {
      id: string;
      displayName: string;
      isOnline: boolean;
      lastSeen: string | null;
      status: string;
      profileImageUrl: string | null;
      onlineSince?: string | null;
      lastLocation?: {
        lat: number;
        lng: number;
        accuracy?: number | null;
        at: string;
      } | null;
      locationShareEnabled?: boolean;
    }[]
  >({
    queryKey: ["/api/comms/users/all", "includeSelf"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/users/all?includeSelf=1", { headers: commsHeaders() });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
  });

  const remindersQuery = useQuery<Reminder[]>({
    queryKey: ["/api/comms/reminders"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/reminders", { headers: commsHeaders() });
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
  });

  const newsQuery = useQuery<NewsItem[]>({
    queryKey: ["/api/comms/news"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/news");
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      recipientId,
      content,
    }: {
      recipientId: string;
      content: string;
    }) => {
      const res = await systemFetch("/api/comms/messages", {
        method: "POST",
        headers: commsHeaders(),
        body: JSON.stringify({ recipientId, content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/messages"] });
    },
  });

  const addReminder = useMutation({
    mutationFn: async (reminder: Omit<Reminder, "id" | "completed">) => {
      const res = await systemFetch("/api/comms/reminders", {
        method: "POST",
        headers: commsHeaders(),
        body: JSON.stringify(reminder),
      });
      if (!res.ok) throw new Error("Failed to add reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/reminders"] });
    },
  });

  const completeReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await systemFetch(`/api/comms/reminders/${id}/complete`, {
        method: "POST",
        headers: commsHeaders(),
      });
      if (!res.ok) throw new Error("Failed to complete reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/reminders"] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await systemFetch(`/api/comms/reminders/${id}`, {
        method: "DELETE",
        headers: commsHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/reminders"] });
    },
  });

  const startQualityMonitoring = useCallback(() => {
    if (qualityMonitorIntervalRef.current) {
      clearInterval(qualityMonitorIntervalRef.current);
    }

    qualityMonitorIntervalRef.current = setInterval(async () => {
      if (peerConnectionRef.current && peerConnectionRef.current.connectionState === "connected") {
        const metrics = await getCallQualityMetrics(peerConnectionRef.current);
        setQualityMetrics(metrics);
        setActiveCall((prev) =>
          prev ? { ...prev, qualityMetrics: metrics } : null
        );
      }
    }, 2000);
  }, []);

  const stopQualityMonitoring = useCallback(() => {
    if (qualityMonitorIntervalRef.current) {
      clearInterval(qualityMonitorIntervalRef.current);
      qualityMonitorIntervalRef.current = null;
    }
  }, []);

  const startCall = useCallback(
    async (peerId: string, type: "audio" | "video") => {
      const roomId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const networkType = detectNetworkType();

      try {
        const acquired = await acquireCommsUserMedia(type);
        mediaPipelineDisposeRef.current = acquired.disposeMediaPipeline;
        audioProcessorRef.current = acquired.audioProcessor;
        const stream = acquired.stream;

        setLocalStream(stream);

        const qRoom = new URLSearchParams();
        qRoom.set("room", roomId);
        appendCommSignalingTokenToSearchParams(qRoom);
        const ws = new WebSocket(resolveCyrusWebSocketUrl(`/ws?${qRoom.toString()}`));
        wsRef.current = ws;

        const pc = new RTCPeerConnection(createPeerConnectionConfig());
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (type === "video") {
          await applyBandwidthConstraints(pc, "high");
        }

        bitrateControllerRef.current = new AdaptiveBitrateController(
          pc,
          (preset, metrics) => {
            console.log(`[WebRTC] Quality adjusted to ${preset}`, metrics);
            setActiveCall((prev) =>
              prev ? { ...prev, qualityPreset: preset } : null
            );
          }
        );

        pc.ontrack = (event) => {
          console.log("[WebRTC] Remote track received:", event.track.kind);
          setRemoteStream(event.streams[0]);
          setActiveCall((prev) =>
            prev ? { ...prev, status: "connected" } : null
          );
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ice-candidate",
                roomId,
                payload: event.candidate,
              })
            );
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "connected") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "connected" } : null
            );
            bitrateControllerRef.current?.start();
            startQualityMonitoring();
          } else if (pc.iceConnectionState === "disconnected") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "reconnecting" } : null
            );
          } else if (pc.iceConnectionState === "failed") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "failed" } : null
            );
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("[WebRTC] Connection state:", pc.connectionState);
        };

        ws.onopen = async () => {
          console.log("[WebRTC] WebSocket connected, creating offer...");
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === "video",
          });
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "offer", roomId, payload: offer }));

          connectionManagerRef.current = new ConnectionManager(pc, ws, roomId, {
            onStateChange: (state) => {
              console.log("[WebRTC] Connection manager state:", state);
            },
            onReconnecting: () => {
              setActiveCall((prev) =>
                prev ? { ...prev, status: "reconnecting" } : null
              );
            },
            onReconnected: () => {
              setActiveCall((prev) =>
                prev ? { ...prev, status: "connected" } : null
              );
            },
            onFailed: () => {
              setActiveCall((prev) =>
                prev ? { ...prev, status: "failed" } : null
              );
            },
          });
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          console.log("[WebRTC] Received message:", msg.type);

          if (msg.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(candidate);
            }
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", roomId, payload: answer }));
          } else if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(candidate);
            }
            pendingCandidatesRef.current = [];
          } else if (msg.type === "ice-candidate") {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
            } else {
              pendingCandidatesRef.current.push(new RTCIceCandidate(msg.payload));
            }
          } else if (msg.type === "peer-joined") {
            console.log("[WebRTC] Peer joined the call");
          } else if (msg.type === "peer-left") {
            console.log("[WebRTC] Peer left the call");
            setRemoteStream(null);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebRTC] WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("[WebRTC] WebSocket closed");
        };

        setActiveCall({
          roomId,
          peerId,
          type,
          status: "connecting",
          networkType,
          qualityPreset: type === "video" ? "high" : "audioOnly",
        });

        return roomId;
      } catch (err) {
        console.error("[WebRTC] Failed to start call:", err);
        throw err;
      }
    },
    [startQualityMonitoring]
  );

  const initiateCallConnection = useCallback(
    async (roomId: string, type: "audio" | "video") => {
      const networkType = detectNetworkType();

      try {
        const acquired = await acquireCommsUserMedia(type);
        mediaPipelineDisposeRef.current = acquired.disposeMediaPipeline;
        audioProcessorRef.current = acquired.audioProcessor;
        const stream = acquired.stream;

        setLocalStream(stream);

        const qRoom = new URLSearchParams();
        qRoom.set("room", roomId);
        appendCommSignalingTokenToSearchParams(qRoom);
        const ws = new WebSocket(resolveCyrusWebSocketUrl(`/ws?${qRoom.toString()}`));
        wsRef.current = ws;

        const pc = new RTCPeerConnection(createPeerConnectionConfig());
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (type === "video") {
          await applyBandwidthConstraints(pc, "high");
        }

        bitrateControllerRef.current = new AdaptiveBitrateController(pc);

        pc.ontrack = (event) => {
          console.log("[WebRTC] Remote track received:", event.track.kind);
          setRemoteStream(event.streams[0]);
          setActiveCall((prev) =>
            prev ? { ...prev, status: "connected" } : null
          );
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ice-candidate",
                roomId,
                payload: event.candidate,
              })
            );
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "connected") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "connected" } : null
            );
            bitrateControllerRef.current?.start();
            startQualityMonitoring();
          } else if (pc.iceConnectionState === "disconnected") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "reconnecting" } : null
            );
          } else if (pc.iceConnectionState === "failed") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "failed" } : null
            );
          }
        };

        ws.onopen = async () => {
          console.log("[WebRTC] Connected as initiator, creating offer...");
          ws.send(JSON.stringify({ type: "join", roomId }));
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === "video",
          });
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "offer", roomId, payload: offer }));
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          console.log("[WebRTC] Initiator received:", msg.type);

          if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(candidate);
            }
            pendingCandidatesRef.current = [];
          } else if (msg.type === "ice-candidate") {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
            } else {
              pendingCandidatesRef.current.push(new RTCIceCandidate(msg.payload));
            }
          } else if (msg.type === "peer-joined") {
            console.log("[WebRTC] Peer joined the call");
          }
        };

        ws.onerror = (error) => {
          console.error("[WebRTC] WebSocket error:", error);
        };

        setActiveCall((prev) => prev ? {
          ...prev,
          roomId,
          status: "connecting",
          networkType,
          qualityPreset: type === "video" ? "high" : "audioOnly",
        } : null);
      } catch (err) {
        console.error("[WebRTC] Failed to initiate call connection:", err);
        throw err;
      }
    },
    [startQualityMonitoring]
  );

  const joinCall = useCallback(
    async (roomId: string, type: "audio" | "video") => {
      const networkType = detectNetworkType();

      try {
        const acquired = await acquireCommsUserMedia(type);
        mediaPipelineDisposeRef.current = acquired.disposeMediaPipeline;
        audioProcessorRef.current = acquired.audioProcessor;
        const stream = acquired.stream;

        setLocalStream(stream);

        const qRoom = new URLSearchParams();
        qRoom.set("room", roomId);
        appendCommSignalingTokenToSearchParams(qRoom);
        const ws = new WebSocket(resolveCyrusWebSocketUrl(`/ws?${qRoom.toString()}`));
        wsRef.current = ws;

        const pc = new RTCPeerConnection(createPeerConnectionConfig());
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (type === "video") {
          await applyBandwidthConstraints(pc, "high");
        }

        bitrateControllerRef.current = new AdaptiveBitrateController(pc);

        pc.ontrack = (event) => {
          console.log("[WebRTC] Remote track received:", event.track.kind);
          setRemoteStream(event.streams[0]);
          setActiveCall((prev) =>
            prev ? { ...prev, status: "connected" } : null
          );
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ice-candidate",
                roomId,
                payload: event.candidate,
              })
            );
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "connected") {
            setActiveCall((prev) =>
              prev ? { ...prev, status: "connected" } : null
            );
            bitrateControllerRef.current?.start();
            startQualityMonitoring();
          }
        };

        ws.onopen = () => {
          console.log("[WebRTC] Joined room:", roomId);
          ws.send(JSON.stringify({ type: "join", roomId }));
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", roomId, payload: answer }));
          } else if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          } else if (msg.type === "ice-candidate") {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
            } else {
              pendingCandidatesRef.current.push(new RTCIceCandidate(msg.payload));
            }
          }
        };

        setActiveCall({
          roomId,
          peerId: "joining",
          type,
          status: "connecting",
          networkType,
          qualityPreset: type === "video" ? "high" : "audioOnly",
        });
      } catch (err) {
        console.error("[WebRTC] Failed to join call:", err);
        throw err;
      }
    },
    [startQualityMonitoring]
  );

  const endCall = useCallback(() => {
    console.log("[WebRTC] Ending call...");

    stopQualityMonitoring();

    bitrateControllerRef.current?.stop();
    bitrateControllerRef.current = null;

    mediaPipelineDisposeRef.current?.();
    mediaPipelineDisposeRef.current = null;
    videoFilterDisposeRef.current?.();
    videoFilterDisposeRef.current = null;
    audioProcessorRef.current = null;

    connectionManagerRef.current = null;

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    pendingCandidatesRef.current = [];

    setRemoteStream(null);
    setActiveCall(null);
    setQualityMetrics(null);
    setCallControls({
      isMuted: false,
      isVideoEnabled: true,
      isSpeakerOn: true,
      volume: 1,
    });
  }, [localStream, stopQualityMonitoring]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCallControls((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setCallControls((prev) => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, [localStream]);

  const setVolume = useCallback((volume: number) => {
    audioProcessorRef.current?.setVolume(volume);
    setCallControls((prev) => ({ ...prev, volume }));
  }, []);

  const switchCamera = useCallback(async () => {
    if (!localStream || !peerConnectionRef.current) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = videoTrack.getConstraints();
    const currentFacing = (constraints as any).facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";

    try {
      const raw = await navigator.mediaDevices.getUserMedia({
        video: { ...getOptimalVideoConstraints(), facingMode: newFacing },
        audio: false,
      });
      const filtered = await applyCommsMediaFilters(raw, "video");
      videoFilterDisposeRef.current?.();
      videoFilterDisposeRef.current = filtered.disposeVideoEnhancer;

      const newVideoTrack = filtered.stream.getVideoTracks()[0];
      
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);
    } catch (err) {
      console.error("[WebRTC] Failed to switch camera:", err);
    }
  }, [localStream]);

  const getAudioLevel = useCallback((): number => {
    return audioProcessorRef.current?.getAudioLevel() || 0;
  }, []);

  const connectPresence = useCallback((displayName: string = "User") => {
    if (presenceWsRef.current?.readyState === WebSocket.OPEN) return;

    void (async () => {
      const identity = await resolveCyrusIdentity();
      const { deviceId, commsUserId: userId } = identity;

    const q = new URLSearchParams({
      userId,
      name: displayName,
      deviceId,
    });
    appendCommSignalingTokenToSearchParams(q);
    const ws = new WebSocket(resolveCyrusWebSocketUrl(`/ws?${q.toString()}`));
    presenceWsRef.current = ws;

    ws.onopen = () => {
      console.log("[Presence] Connected to presence server");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case "connected":
            console.log("[Presence] My user ID:", msg.userId, "| Total online:", msg.totalOnline);
            (ws as any)._myUserId = msg.userId;
            setMyUserId(msg.userId);
            break;

          case "presence-update":
            const allUsers = msg.users?.length || 0;
            // Filter out our own user using the userId from the WebSocket connection
            const currentUserId = (ws as any)._myUserId || userId;
            const otherUsers = msg.users.filter((u: OnlineUser) => u.id !== currentUserId);
            console.log(`[Presence] Total online: ${allUsers} | Other users visible: ${otherUsers.length}`);
            if (allUsers > 0) {
              console.log("[Presence] All users:", msg.users.map((u: OnlineUser) => `${u.displayName} (${u.id})`).join(", "));
            }
            setOnlineUsers(otherUsers);
            break;

          case "incoming-call":
            console.log("[Presence] Incoming call from:", msg.callerName);
            setIncomingCall({
              callerId: msg.callerId,
              callerName: msg.callerName,
              roomId: msg.roomId,
              callType: msg.callType,
            });
            break;

          case "call-accepted":
            console.log("[Presence] Call accepted, connecting as initiator...");
            initiateCallConnection(msg.roomId, activeCall?.type || "video");
            break;

          case "call-declined":
            console.log("[Presence] Call was declined");
            setActiveCall(null);
            break;

          case "call-ended":
            console.log("[Presence] Call ended by peer");
            endCall();
            break;

          case "call-failed":
            console.log("[Presence] Call failed:", msg.reason);
            setActiveCall((prev) => prev ? { ...prev, status: "failed" } : null);
            break;
        }
      } catch (err) {
        console.error("[Presence] Message parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("[Presence] Disconnected from presence server");
      setIsConnected(false);
      setTimeout(() => {
        if (presenceWsRef.current === ws) {
          connectPresence(displayName);
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error("[Presence] WebSocket error:", error);
    };
    })();
  }, [myUserId, activeCall?.type]);

  const callUser = useCallback(async (targetUserId: string, targetName: string, type: "audio" | "video") => {
    if (!presenceWsRef.current || presenceWsRef.current.readyState !== WebSocket.OPEN) {
      console.error("[Presence] Not connected to presence server");
      return;
    }

    const roomId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    presenceWsRef.current.send(JSON.stringify({
      type: "call-user",
      targetUserId,
      roomId,
      payload: { callType: type },
    }));

    setActiveCall({
      roomId,
      peerId: targetName,
      type,
      status: "connecting",
      networkType: detectNetworkType(),
    });
  }, []);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !presenceWsRef.current) return;

    presenceWsRef.current.send(JSON.stringify({
      type: "accept-call",
      roomId: incomingCall.roomId,
    }));

    await joinCall(incomingCall.roomId, incomingCall.callType);
    setIncomingCall(null);
  }, [incomingCall, joinCall]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall || !presenceWsRef.current) return;

    presenceWsRef.current.send(JSON.stringify({
      type: "decline-call",
      roomId: incomingCall.roomId,
      payload: { reason: "declined" },
    }));

    setIncomingCall(null);
  }, [incomingCall]);

  const contactsQuery = useQuery<Contact[]>({
    queryKey: ["/api/comms/contacts"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/contacts", {
        headers: { "X-Device-Id": getCommsDeviceId() },
      });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const addContact = useMutation({
    mutationFn: async (contact: { contactId: string; contactName: string; contactEmail?: string }) => {
      const res = await systemFetch("/api/comms/contacts", {
        method: "POST",
        headers: commsHeaders(),
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/contacts"] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const res = await systemFetch(`/api/comms/contacts/${id}`, { 
        method: "DELETE",
        headers: { "X-Device-Id": getCommsDeviceId() },
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comms/contacts"] });
    },
  });

  useEffect(() => {
    return () => {
      endCall();
      if (presenceWsRef.current) {
        presenceWsRef.current.close();
        presenceWsRef.current = null;
      }
    };
  }, [endCall]);

  return {
    messages: messagesQuery.data || [],
    reminders: remindersQuery.data || [],
    news: newsQuery.data || [],
    contacts: contactsQuery.data || [],
    allUsers: allUsersQuery.data || [],
    onlineUsers,
    incomingCall,
    myUserId,
    isConnected,
    activeCall,
    localStream,
    remoteStream,
    callControls,
    qualityMetrics,
    sendMessage,
    addReminder,
    completeReminder,
    deleteReminder,
    addContact,
    deleteContact,
    startCall,
    joinCall,
    endCall,
    callUser,
    acceptIncomingCall,
    declineIncomingCall,
    connectPresence,
    toggleMute,
    toggleVideo,
    setVolume,
    switchCamera,
    getAudioLevel,
    myDeviceId: getCommsDeviceId(),
    isLoading: messagesQuery.isLoading || remindersQuery.isLoading,
  };
}
