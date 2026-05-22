/**
 * Global mesh link layer (/cyrus-comm-io) merged into Comms — one provider for the whole module.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { systemFetch } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "../../lib/comms-device-id";
import {
  attachLocalTracks,
  closeCyrusCommPeer,
  createCyrusCommPeerConnection,
  getCyrusCommUserMedia,
} from "../../lib/cyrus-comm-webrtc";

export type MeshOnlineRow = { userId: string; displayName: string; socketId: string };

export type MeshChatMsg = {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  ts: number;
};

async function fetchIceConfig(): Promise<RTCIceServer[]> {
  const res = await systemFetch("/api/cyrus-comm/config/webrtc");
  if (!res.ok) throw new Error(`webrtc config ${res.status}`);
  const data = (await res.json()) as { iceServers?: RTCIceServer[] };
  return data.iceServers?.length ? data.iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
}

type Ctx = {
  selfId: string;
  linkConnected: boolean;
  linkJoined: boolean;
  meshUsers: MeshOnlineRow[];
  meshPeerIds: Set<string>;
  inMeshCall: boolean;
  remoteMeshName: string;
  localMeshStream: MediaStream | null;
  remoteMeshStream: MediaStream | null;
  startMeshCall: (targetUserId: string, withVideo: boolean) => Promise<void>;
  endMeshCall: (notifyPeer?: boolean) => void;
  shareMeshLocation: boolean;
  setShareMeshLocation: (v: boolean) => void;
  meshLocationLines: string[];
  meshSelectedPeer: string | null;
  setMeshSelectedPeer: (id: string | null) => void;
  meshMessagesForPeer: (peerId: string) => MeshChatMsg[];
  sendMeshMessage: (text: string) => void;
  linkLog: string[];
};

const CommsP2PLayerContext = createContext<Ctx | null>(null);

export function useCommsP2PLayer(): Ctx {
  const x = useContext(CommsP2PLayerContext);
  if (!x) throw new Error("useCommsP2PLayer must be used within CommsP2PLayerProvider");
  return x;
}

export function CommsP2PLayerProvider({
  displayName,
  children,
}: {
  displayName: string;
  children: ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteIceRef = useRef<unknown[]>([]);
  const callIdRef = useRef<string | null>(null);
  const remotePeerRef = useRef<string | null>(null);

  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
  ]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState<MeshOnlineRow[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [messagesByPeer, setMessagesByPeer] = useState<Record<string, MeshChatMsg[]>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteName, setRemoteName] = useState("");
  const [inCall, setInCall] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [locLines, setLocLines] = useState<string[]>([]);
  const [shareLoc, setShareLoc] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);

  const selfId = getCommsDeviceId();

  const pushLog = useCallback((m: string) => {
    console.log("[MeshLink]", m);
    setLog((p) => [...p.slice(-40), m]);
  }, []);

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const q = pendingRemoteIceRef.current;
    pendingRemoteIceRef.current = [];
    for (const c of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c as RTCIceCandidateInit));
      } catch (e) {
        console.warn("[MeshLink] addIceCandidate", e);
      }
    }
  }, []);

  const teardownCall = useCallback((notifyPeer = false) => {
    const peer = remotePeerRef.current;
    const sock = socketRef.current;
    if (notifyPeer && peer && sock?.connected) {
      sock.emit("end-call", { peerUserId: peer });
    }
    closeCyrusCommPeer(pcRef.current);
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteName("");
    setInCall(false);
    remotePeerRef.current = null;
    callIdRef.current = null;
    pendingRemoteIceRef.current = [];
  }, []);

  const ensurePc = useCallback(
    (targetUserId: string, callId: string) => {
      if (pcRef.current) {
        closeCyrusCommPeer(pcRef.current);
        pcRef.current = null;
      }
      remotePeerRef.current = targetUserId;
      callIdRef.current = callId;
      const sock = socketRef.current;
      const pc = createCyrusCommPeerConnection(iceServers, {
        onLocalCandidate: (candidate) => {
          sock?.emit("ice-candidate", {
            targetUserId,
            callId,
            candidate: typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate,
          });
        },
        onRemoteTrack: (ev) => {
          const [ms] = ev.streams;
          if (ms) setRemoteStream(ms);
          else if (ev.track) setRemoteStream(new MediaStream([ev.track]));
        },
        onConnectionState: (s) => pushLog(`pc: ${s}`),
      });
      pcRef.current = pc;
      return pc;
    },
    [iceServers, pushLog],
  );

  const startOutgoing = useCallback(
    async (targetUserId: string, withVideo: boolean) => {
      const sock = socketRef.current;
      if (!sock?.connected || !selfId) return;
      const callId = crypto.randomUUID();
      const constraints: MediaStreamConstraints = withVideo
        ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { audio: true, video: false };
      const stream = await getCyrusCommUserMedia(constraints);
      if (!stream) {
        pushLog("No local media");
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setRemoteName(users.find((u) => u.userId === targetUserId)?.displayName || targetUserId);
      setInCall(true);
      const pc = ensurePc(targetUserId, callId);
      attachLocalTracks(pc, stream);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sock.emit("call-user", {
          targetUserId,
          callId,
          offer: { type: offer.type, sdp: offer.sdp },
          media: withVideo ? "video" : "audio",
        });
        pushLog(`mesh ${withVideo ? "video" : "audio"} → ${targetUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`mesh call error: ${e instanceof Error ? e.message : String(e)}`);
        teardownCall(false);
      }
    },
    [ensurePc, pushLog, selfId, teardownCall, users],
  );

  const handleIncoming = useCallback(
    async (payload: {
      callId: string;
      fromUserId: string;
      fromDisplayName?: string;
      offer: { type?: string; sdp?: string };
    }) => {
      if (pcRef.current) {
        pushLog("busy — ignoring mesh incoming");
        return;
      }
      const { callId, fromUserId, fromDisplayName, offer } = payload;
      setRemoteName(fromDisplayName || fromUserId);
      setInCall(true);
      const wantsVideo = typeof offer?.sdp === "string" && offer.sdp.includes("m=video");
      const constraints: MediaStreamConstraints = wantsVideo
        ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 } } }
        : { audio: true, video: false };
      const stream = await getCyrusCommUserMedia(constraints);
      if (!stream) {
        pushLog("no media for mesh incoming");
        setInCall(false);
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = ensurePc(fromUserId, callId);
      attachLocalTracks(pc, stream);
      const sock = socketRef.current;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer as RTCSessionDescriptionInit));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock?.emit("answer-call", {
          targetUserId: fromUserId,
          callId,
          answer: { type: answer.type, sdp: answer.sdp },
        });
        pushLog(`mesh answered ${fromUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`mesh answer failed: ${e instanceof Error ? e.message : String(e)}`);
        teardownCall(true);
      }
    },
    [ensurePc, flushPendingIce, pushLog, teardownCall],
  );

  const addRemoteIce = useCallback(async (candidate: unknown) => {
    const pc = pcRef.current;
    if (!pc || candidate == null) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
    } catch {
      pendingRemoteIceRef.current.push(candidate);
    }
  }, []);

  const handleIncomingRef = useRef(handleIncoming);
  handleIncomingRef.current = handleIncoming;
  const flushPendingIceRef = useRef(flushPendingIce);
  flushPendingIceRef.current = flushPendingIce;
  const addRemoteIceRef = useRef(addRemoteIce);
  addRemoteIceRef.current = addRemoteIce;
  const teardownCallRef = useRef(teardownCall);
  teardownCallRef.current = teardownCall;
  const pushLogRef = useRef(pushLog);
  pushLogRef.current = pushLog;
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ice = await fetchIceConfig();
        if (!cancelled) setIceServers(ice);
      } catch (e) {
        console.warn("[MeshLink] ICE fetch", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/cyrus-comm-io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      withCredentials: true,
      autoConnect: false,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketConnected(true);
      pushLogRef.current("mesh socket connected");
      const name = displayNameRef.current.trim() || selfIdRef.current;
      socket.emit(
        "join",
        { userId: selfIdRef.current, displayName: name },
        (ack: { ok?: boolean; users?: MeshOnlineRow[] }) => {
          if (ack?.ok) {
            setJoined(true);
            setUsers(ack.users || []);
            pushLogRef.current(`mesh joined ${selfIdRef.current}`);
          } else {
            pushLogRef.current("mesh join failed");
          }
        },
      );
    };

    const onDisc = () => {
      setSocketConnected(false);
      setJoined(false);
      teardownCallRef.current(false);
      pushLogRef.current("mesh socket disconnected");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisc);
    socket.on("users-updated", (p: { users: MeshOnlineRow[] }) => setUsers(p.users || []));
    socket.on("incoming-call", (p: Parameters<typeof handleIncoming>[0]) => void handleIncomingRef.current(p));
    socket.on(
      "call-answered",
      async (p: { answer: { type?: string; sdp?: string }; fromUserId: string; callId: string }) => {
        if (callIdRef.current !== p.callId || remotePeerRef.current !== p.fromUserId) return;
        const pc = pcRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(p.answer as RTCSessionDescriptionInit));
          await flushPendingIceRef.current(pc);
          pushLogRef.current("mesh remote answer OK");
        } catch (e) {
          pushLogRef.current(`mesh answer apply: ${e instanceof Error ? e.message : String(e)}`);
        }
      },
    );
    socket.on(
      "ice-candidate",
      (p: { candidate?: unknown; fromUserId: string; callId?: string }) => {
        if (callIdRef.current && p.callId && p.callId !== callIdRef.current) return;
        if (p.fromUserId !== remotePeerRef.current) return;
        void addRemoteIceRef.current(p.candidate);
      },
    );
    socket.on("call-ended", (p: { peerUserId: string; reason: string }) => {
      pushLogRef.current(`mesh call ended: ${p.reason}`);
      teardownCallRef.current(false);
    });
    socket.on("call-failed", (p: { reason: string }) => pushLogRef.current(`mesh failed: ${p.reason}`));
    socket.on("session-superseded", (p: { reason: string }) => {
      alert(p.reason);
      teardownCallRef.current(false);
      setJoined(false);
    });
    socket.on("receive-message", (msg: MeshChatMsg) => {
      const sid = selfIdRef.current;
      const other = msg.fromUserId === sid ? msg.toUserId : msg.fromUserId;
      setMessagesByPeer((prev) => {
        const cur = prev[other] || [];
        if (cur.some((x) => x.id === msg.id)) return prev;
        return { ...prev, [other]: [...cur, msg] };
      });
    });
    socket.on("location-updated", (p: { userId: string; displayName?: string; latitude: number; longitude: number }) => {
      setLocLines((prev) => [
        ...prev.slice(-40),
        `${p.displayName || p.userId}: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`,
      ]);
    });

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisc);
      socket.removeAllListeners();
      teardownCallRef.current(false);
      socket.disconnect();
      socketRef.current = null;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sock = socketRef.current;
    if (!sock?.connected || !joined) return;
    const name = displayName.trim() || selfId;
    sock.emit("join", { userId: selfId, displayName: name }, (ack: { ok?: boolean; users?: MeshOnlineRow[] }) => {
      if (ack?.ok) setUsers(ack.users || []);
    });
  }, [displayName, joined, selfId]);

  useEffect(() => {
    if (!selectedPeer || !socketRef.current?.connected) return;
    socketRef.current.emit(
      "fetch-messages",
      { withUserId: selectedPeer },
      (ack: { ok?: boolean; messages?: MeshChatMsg[] }) => {
        if (ack?.ok && Array.isArray(ack.messages)) {
          setMessagesByPeer((prev) => ({ ...prev, [selectedPeer]: ack.messages! }));
        }
      },
    );
  }, [selectedPeer]);

  useEffect(() => {
    const sock = socketRef.current;
    if (!shareLoc || !sock?.connected || !joined) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastEmitRef.current < 2000) return;
        lastEmitRef.current = now;
        const { latitude, longitude, accuracy } = pos.coords;
        sock.emit("location-update", { latitude, longitude, accuracy });
      },
      (err) => pushLog(`geo: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [shareLoc, joined, pushLog]);

  useEffect(() => {
    const id = selfId.trim();
    if (!id) return;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-User-Id": id,
      "X-Device-Id": id,
    };
    void systemFetch("/api/comms/user/location-share", {
      method: "POST",
      headers,
      body: JSON.stringify({ enabled: shareLoc }),
    }).catch(() => {});
  }, [shareLoc, selfId]);

  const sendMeshMessage = useCallback(
    (text: string) => {
      const peer = selectedPeer;
      if (!peer || !socketRef.current?.connected) return;
      const t = text.trim();
      if (!t) return;
      const optimistic: MeshChatMsg = {
        id: `local-${Date.now()}`,
        fromUserId: selfId,
        toUserId: peer,
        text: t,
        ts: Date.now(),
      };
      setMessagesByPeer((prev) => ({
        ...prev,
        [peer]: [...(prev[peer] || []), optimistic],
      }));
      socketRef.current.emit("send-message", { targetUserId: peer, text: t }, (ack: { ok?: boolean; id?: string }) => {
        if (ack?.ok && ack.id) {
          setMessagesByPeer((prev) => {
            const list = prev[peer] || [];
            return {
              ...prev,
              [peer]: list.map((m) => (m.id === optimistic.id ? { ...m, id: ack.id! } : m)),
            };
          });
        }
      });
    },
    [selectedPeer, selfId],
  );

  const meshUsers = useMemo(() => users.filter((u) => u.userId !== selfId), [users, selfId]);
  const meshPeerIds = useMemo(() => new Set(meshUsers.map((u) => u.userId)), [meshUsers]);

  const meshMessagesForPeer = useCallback(
    (peerId: string) => messagesByPeer[peerId] || [],
    [messagesByPeer],
  );

  const value = useMemo<Ctx>(
    () => ({
      selfId,
      linkConnected: socketConnected,
      linkJoined: joined,
      meshUsers,
      meshPeerIds,
      inMeshCall: inCall,
      remoteMeshName: remoteName,
      localMeshStream: localStream,
      remoteMeshStream: remoteStream,
      startMeshCall: startOutgoing,
      endMeshCall: teardownCall,
      shareMeshLocation: shareLoc,
      setShareMeshLocation: setShareLoc,
      meshLocationLines: locLines,
      meshSelectedPeer: selectedPeer,
      setMeshSelectedPeer: setSelectedPeer,
      meshMessagesForPeer,
      sendMeshMessage,
      linkLog: log,
    }),
    [
      selfId,
      socketConnected,
      joined,
      meshUsers,
      meshPeerIds,
      inCall,
      remoteName,
      localStream,
      remoteStream,
      startOutgoing,
      teardownCall,
      shareLoc,
      locLines,
      selectedPeer,
      meshMessagesForPeer,
      sendMeshMessage,
      log,
    ],
  );

  return <CommsP2PLayerContext.Provider value={value}>{children}</CommsP2PLayerContext.Provider>;
}
