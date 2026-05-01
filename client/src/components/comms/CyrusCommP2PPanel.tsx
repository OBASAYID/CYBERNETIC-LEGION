/**
 * CYRUS Comm P2P layer: second Socket.IO (/cyrus-comm-io) + WebRTC offer/answer,
 * DM chat, live location — same origin as Command Center (systemFetch + credentials).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { systemFetch } from "@shared/cyrus-api-client";
import { getCommsDeviceId } from "../../lib/comms-device-id";
import {
  attachLocalTracks,
  closeCyrusCommPeer,
  createCyrusCommPeerConnection,
  getCyrusCommUserMedia,
} from "../../lib/cyrus-comm-webrtc";
import { Phone, Radio, MapPin, Satellite } from "lucide-react";

type OnlineRow = { userId: string; displayName: string; socketId: string };
type ChatMsg = { id: string; fromUserId: string; toUserId: string; text: string; ts: number };

async function fetchIceConfig(): Promise<RTCIceServer[]> {
  const res = await systemFetch("/api/cyrus-comm/config/webrtc");
  if (!res.ok) throw new Error(`webrtc config ${res.status}`);
  const data = (await res.json()) as { iceServers?: RTCIceServer[] };
  return data.iceServers?.length ? data.iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
}

export function CyrusCommP2PPanel({ displayName }: { displayName: string }) {
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
  const [users, setUsers] = useState<OnlineRow[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [messagesByPeer, setMessagesByPeer] = useState<Record<string, ChatMsg[]>>({});
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
  const localVidRef = useRef<HTMLVideoElement>(null);
  const remoteVidRef = useRef<HTMLVideoElement>(null);

  const pushLog = useCallback((m: string) => {
    console.log("[CyrusComm]", m);
    setLog((p) => [...p.slice(-25), m]);
  }, []);

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const q = pendingRemoteIceRef.current;
    pendingRemoteIceRef.current = [];
    for (const c of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c as RTCIceCandidateInit));
      } catch (e) {
        console.warn("[CyrusComm] addIceCandidate", e);
      }
    }
  }, []);

  const teardownCall = useCallback(
    (notifyPeer: boolean) => {
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
    },
    [],
  );

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
        pushLog(`outgoing ${withVideo ? "video" : "audio"} → ${targetUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`call error: ${e instanceof Error ? e.message : String(e)}`);
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
        pushLog("busy — ignoring incoming");
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
        pushLog("no media for incoming");
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
        pushLog(`answered ${fromUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`answer failed: ${e instanceof Error ? e.message : String(e)}`);
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
    if (localVidRef.current) localVidRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVidRef.current) remoteVidRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ice = await fetchIceConfig();
        if (!cancelled) setIceServers(ice);
      } catch (e) {
        console.warn("[CyrusComm] ICE fetch", e);
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
      pushLogRef.current("P2P socket connected");
      const name = displayNameRef.current.trim() || selfIdRef.current;
      socket.emit(
        "join",
        { userId: selfIdRef.current, displayName: name },
        (ack: { ok?: boolean; users?: OnlineRow[] }) => {
          if (ack?.ok) {
            setJoined(true);
            setUsers(ack.users || []);
            pushLogRef.current(`P2P joined as ${selfIdRef.current}`);
          } else {
            pushLogRef.current("P2P join failed");
          }
        },
      );
    };

    const onDisc = () => {
      setSocketConnected(false);
      setJoined(false);
      teardownCallRef.current(false);
      pushLogRef.current("P2P socket disconnected");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisc);
    socket.on("users-updated", (p: { users: OnlineRow[] }) => setUsers(p.users || []));
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
          pushLogRef.current("remote answer OK");
        } catch (e) {
          pushLogRef.current(`answer apply failed: ${e instanceof Error ? e.message : String(e)}`);
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
      pushLogRef.current(`call ended: ${p.reason}`);
      teardownCallRef.current(false);
    });
    socket.on("call-failed", (p: { reason: string }) => pushLogRef.current(`call failed: ${p.reason}`));
    socket.on("session-superseded", (p: { reason: string }) => {
      alert(p.reason);
      teardownCallRef.current(false);
      setJoined(false);
    });
    socket.on("receive-message", (msg: ChatMsg & { fromDisplayName?: string }) => {
      const sid = selfIdRef.current;
      const other = msg.fromUserId === sid ? msg.toUserId : msg.fromUserId;
      setMessagesByPeer((prev) => {
        const cur = prev[other] || [];
        if (cur.some((x) => x.id === msg.id)) return prev;
        return { ...prev, [other]: [...cur, msg] };
      });
    });
    socket.on("location-updated", (p: { userId: string; displayName?: string; latitude: number; longitude: number }) => {
      setLocLines((prev) =>
        [
          ...prev.slice(-35),
          `${p.displayName || p.userId}: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`,
        ],
      );
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
    // Mount once; handler refs stay current. displayName updates re-emit join in separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sock = socketRef.current;
    if (!sock?.connected || !joined) return;
    const name = displayName.trim() || selfId;
    sock.emit("join", { userId: selfId, displayName: name }, (ack: { ok?: boolean; users?: OnlineRow[] }) => {
      if (ack?.ok) setUsers(ack.users || []);
    });
  }, [displayName, joined, selfId]);

  useEffect(() => {
    if (!selectedPeer || !socketRef.current?.connected) return;
    socketRef.current.emit(
      "fetch-messages",
      { withUserId: selectedPeer },
      (ack: { ok?: boolean; messages?: ChatMsg[] }) => {
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

  const sendChat = (text: string) => {
    if (!selectedPeer || !socketRef.current?.connected) return;
    const t = text.trim();
    if (!t) return;
    const optimistic: ChatMsg = {
      id: `local-${Date.now()}`,
      fromUserId: selfId,
      toUserId: selectedPeer,
      text: t,
      ts: Date.now(),
    };
    setMessagesByPeer((prev) => ({
      ...prev,
      [selectedPeer]: [...(prev[selectedPeer] || []), optimistic],
    }));
    socketRef.current.emit("send-message", { targetUserId: selectedPeer, text: t }, (ack: { ok?: boolean; id?: string }) => {
      if (ack?.ok && ack.id) {
        setMessagesByPeer((prev) => {
          const list = prev[selectedPeer!] || [];
          return {
            ...prev,
            [selectedPeer!]: list.map((m) => (m.id === optimistic.id ? { ...m, id: ack.id! } : m)),
          };
        });
      }
    });
  };

  const others = users.filter((u) => u.userId !== selfId);
  const peerLabel = users.find((u) => u.userId === selectedPeer)?.displayName;

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="rounded-xl border border-sky-500/35 bg-sky-950/25 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-sky-200/85">
          <Satellite className="h-4 w-4 text-sky-300" />
          CYRUS Comm P2P
          <span className="text-white/35">·</span>
          <span className="font-normal normal-case tracking-normal text-white/60">
            /cyrus-comm-io + WebRTC (parallel to main /cyrus-io presence)
          </span>
        </div>
        <p className="mt-2 text-xs text-white/55">
          Socket:{" "}
          <span className={socketConnected ? "text-emerald-400" : "text-amber-400"}>
            {socketConnected ? "connected" : "offline"}
          </span>
          {" · "}
          Layer:{" "}
          <span className={joined ? "text-emerald-400" : "text-white/45"}>{joined ? "joined" : "pending"}</span>
          {" · "}
          User <span className="text-cyan-200/90">{selfId}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
            <Radio className="h-4 w-4" />
            Online (P2P registry)
          </h3>
          {others.length === 0 ? (
            <p className="text-sm text-white/45">Open Comms in another browser with a different device profile.</p>
          ) : (
            <ul className="space-y-2">
              {others.map((u) => (
                <li
                  key={u.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/40 px-2 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPeer(u.userId)}
                    className={`min-w-0 flex-1 truncate text-left text-sm ${
                      selectedPeer === u.userId ? "text-cyan-300" : "text-white/85"
                    }`}
                  >
                    <span className="font-medium">{u.displayName}</span>
                    <span className="ml-2 text-xs text-white/40">{u.userId}</span>
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={inCall}
                      onClick={() => void startOutgoing(u.userId, false)}
                      className="rounded-lg border border-white/15 bg-slate-900/60 px-2 py-1 text-[11px] text-white/80 hover:border-cyan-500/40 disabled:opacity-40"
                    >
                      Voice
                    </button>
                    <button
                      type="button"
                      disabled={inCall}
                      onClick={() => void startOutgoing(u.userId, true)}
                      className="rounded-lg border border-cyan-500/35 bg-cyan-600/25 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-600/35 disabled:opacity-40"
                    >
                      Video
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
            <Phone className="h-4 w-4" />
            Media
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video ref={localVidRef} className="h-full w-full object-cover" autoPlay playsInline muted />
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px]">Local</span>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <video ref={remoteVidRef} className="h-full w-full object-cover" autoPlay playsInline />
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px]">
                {remoteName || "Remote"}
              </span>
            </div>
          </div>
          {inCall ? (
            <button
              type="button"
              onClick={() => teardownCall(true)}
              className="mt-3 w-full rounded-lg border border-red-500/40 bg-red-600/25 py-2 text-sm font-medium text-red-100 hover:bg-red-600/40"
            >
              End P2P call
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-200/80">P2P chat</h3>
        {!selectedPeer ? (
          <p className="text-sm text-white/45">Select a user from the list.</p>
        ) : (
          <>
            <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 text-xs">
              {(messagesByPeer[selectedPeer] || []).map((m) => (
                <div key={m.id} className="mb-1 border-b border-white/5 pb-1 last:border-0">
                  <span className="text-white/40">
                    {new Date(m.ts).toLocaleTimeString()} {m.fromUserId === selfId ? "You" : peerLabel || m.fromUserId}
                  </span>
                  <div className="text-white/90">{m.text}</div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const t = String(fd.get("t") || "");
                e.currentTarget.reset();
                sendChat(t);
              }}
            >
              <input name="t" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-2 py-1.5 text-sm text-white" placeholder="Message…" />
              <button type="submit" className="rounded-lg bg-cyan-600/40 px-3 py-1.5 text-sm text-cyan-50">
                Send
              </button>
            </form>
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
          <MapPin className="h-4 w-4" />
          Live location (P2P broadcast)
        </h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={shareLoc} onChange={(e) => setShareLoc(e.target.checked)} />
          Share my position (throttled)
        </label>
        <pre className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-white/50">
          {locLines.join("\n")}
        </pre>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/45">Debug</h3>
        <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-white/55">{log.join("\n")}</pre>
      </div>
    </div>
  );
}
