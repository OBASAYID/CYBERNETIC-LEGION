import React, { useCallback, useEffect, useRef, useState } from "react";
import { createCyrusSocket, fetchWebRtcConfig } from "./socket.js";
import {
  attachLocalTracks,
  closePeerConnection,
  createPeerConnection,
  getUserMediaSafe,
} from "./webrtc.js";
import { LoginBar } from "./components/LoginBar.jsx";
import { UserList } from "./components/UserList.jsx";
import { ChatPanel } from "./components/ChatPanel.jsx";
import { VideoViews } from "./components/VideoViews.jsx";
import { CallControls } from "./components/CallControls.jsx";
import { LocationTracker } from "./components/LocationTracker.jsx";

function useStableSocketRef() {
  const ref = useRef(null);
  if (!ref.current) ref.current = createCyrusSocket();
  return ref;
}

export default function App() {
  const socketRef = useStableSocketRef();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingRemoteIceRef = useRef([]);
  const callIdRef = useRef(null);
  const remotePeerRef = useRef(null);

  const [iceServers, setIceServers] = useState([{ urls: "stun:stun.l.google.com:19302" }]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selfId, setSelfId] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [messagesByPeer, setMessagesByPeer] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteName, setRemoteName] = useState("");
  const [inCall, setInCall] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = useCallback((m) => {
    console.log("[app]", m);
    setLog((prev) => [...prev.slice(-30), m]);
  }, []);

  const flushPendingIce = useCallback(async (pc) => {
    const q = pendingRemoteIceRef.current;
    pendingRemoteIceRef.current = [];
    for (const c of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("[app] addIceCandidate deferred fail", e);
      }
    }
  }, []);

  const teardownCall = useCallback(
    (notifyPeer) => {
      const peer = remotePeerRef.current;
      if (notifyPeer && peer && socketRef.current?.connected) {
        socketRef.current.emit("end-call", { peerUserId: peer });
      }
      closePeerConnection(pcRef.current);
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
    [socketRef],
  );

  const ensurePeerConnection = useCallback(
    (targetUserId, callId) => {
      if (pcRef.current) {
        pushLog("Replacing existing peer connection");
        closePeerConnection(pcRef.current);
        pcRef.current = null;
      }
      remotePeerRef.current = targetUserId;
      callIdRef.current = callId;

      const pc = createPeerConnection(iceServers, {
        onLocalCandidate: (candidate) => {
          socketRef.current?.emit("ice-candidate", {
            targetUserId,
            callId,
            candidate: candidate.toJSON ? candidate.toJSON() : candidate,
          });
        },
        onRemoteTrack: (ev) => {
          const [stream] = ev.streams;
          if (stream) {
            setRemoteStream(stream);
          } else if (ev.track) {
            const ms = new MediaStream([ev.track]);
            setRemoteStream(ms);
          }
        },
        onConnectionState: (state) => pushLog(`pc state: ${state}`),
      });
      pcRef.current = pc;
      return pc;
    },
    [iceServers, pushLog, socketRef],
  );

  const startOutgoingCall = useCallback(
    async (targetUserId, withVideo) => {
      if (!socketRef.current?.connected || !selfId) return;
      const callId = crypto.randomUUID();
      const constraints = withVideo
        ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { audio: true, video: false };

      const stream = await getUserMediaSafe(constraints);
      if (!stream) {
        pushLog("No local media — cannot place call");
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setRemoteName(users.find((u) => u.userId === targetUserId)?.displayName || targetUserId);
      setInCall(true);

      const pc = ensurePeerConnection(targetUserId, callId);
      attachLocalTracks(pc, stream);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("call-user", {
          targetUserId,
          callId,
          offer: { type: offer.type, sdp: offer.sdp },
          media: withVideo ? "video" : "audio",
        });
        pushLog(`outgoing ${withVideo ? "video" : "audio"} call → ${targetUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`call failed: ${e.message}`);
        teardownCall(false);
      }
    },
    [ensurePeerConnection, pushLog, selfId, socketRef, teardownCall, users],
  );

  const handleIncomingCall = useCallback(
    async ({ callId, fromUserId, fromDisplayName, offer }) => {
      if (pcRef.current) {
        pushLog("busy — ignoring incoming call");
        return;
      }
      setRemoteName(fromDisplayName || fromUserId);
      setInCall(true);

      const wantsVideo = typeof offer?.sdp === "string" && offer.sdp.includes("m=video");
      const constraints = wantsVideo
        ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 } } }
        : { audio: true, video: false };

      const stream = await getUserMediaSafe(constraints);
      if (!stream) {
        pushLog("No media for incoming call");
        setInCall(false);
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = ensurePeerConnection(fromUserId, callId);
      attachLocalTracks(pc, stream);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("answer-call", {
          targetUserId: fromUserId,
          callId,
          answer: { type: answer.type, sdp: answer.sdp },
        });
        pushLog(`answered call from ${fromUserId}`);
      } catch (e) {
        console.error(e);
        pushLog(`answer error: ${e.message}`);
        teardownCall(true);
      }
    },
    [ensurePeerConnection, flushPendingIce, pushLog, socketRef, teardownCall],
  );

  const addRemoteIce = useCallback(
    async (candidate) => {
      const pc = pcRef.current;
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        pendingRemoteIceRef.current.push(candidate);
      }
    },
    [],
  );

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => {
      setSocketConnected(true);
      pushLog("socket connected");
    };
    const onDisconnect = () => {
      setSocketConnected(false);
      setJoined(false);
      pushLog("socket disconnected");
      teardownCall(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("users-updated", ({ users: u }) => setUsers(u || []));
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", async ({ answer, fromUserId, callId }) => {
      if (callIdRef.current !== callId || fromUserId !== remotePeerRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(pc);
        pushLog("remote answer applied");
      } catch (e) {
        console.error(e);
        pushLog(`setRemote answer failed: ${e.message}`);
      }
    });
    socket.on("ice-candidate", ({ candidate, fromUserId, callId }) => {
      if (callIdRef.current && callId !== callIdRef.current) return;
      if (fromUserId !== remotePeerRef.current) return;
      void addRemoteIce(candidate);
    });
    socket.on("call-ended", ({ peerUserId, reason }) => {
      pushLog(`call ended (${reason}) from ${peerUserId}`);
      teardownCall(false);
    });
    socket.on("call-failed", ({ reason }) => pushLog(`call failed: ${reason}`));
    socket.on("session-superseded", ({ reason }) => {
      alert(reason);
      teardownCall(false);
      setJoined(false);
    });
    socket.on("receive-message", (msg) => {
      const other = msg.fromUserId === selfId ? msg.toUserId : msg.fromUserId;
      setMessagesByPeer((prev) => {
        const cur = prev[other] || [];
        if (cur.some((x) => x.id === msg.id)) return prev;
        return { ...prev, [other]: [...cur, msg] };
      });
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("users-updated");
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
      socket.off("call-failed");
      socket.off("session-superseded");
      socket.off("receive-message");
    };
  }, [addRemoteIce, flushPendingIce, handleIncomingCall, pushLog, selfId, socketRef, teardownCall]);

  const onJoin = async (userId, displayName) => {
    try {
      const cfg = await fetchWebRtcConfig();
      if (cfg.iceServers?.length) setIceServers(cfg.iceServers);
    } catch (e) {
      console.warn("using default ICE", e);
    }

    const socket = socketRef.current;
    if (!socket.connected) {
      socket.connect();
      await new Promise((resolve) => {
        if (socket.connected) resolve();
        else socket.once("connect", resolve);
      });
    }

    socket.emit("join", { userId, displayName }, (ack) => {
      if (ack?.ok) {
        setSelfId(userId);
        setJoined(true);
        setUsers(ack.users || []);
        pushLog(`joined as ${userId}`);
      } else {
        pushLog(`join failed: ${ack?.error || "unknown"}`);
      }
    });
  };

  useEffect(() => {
    if (!joined || !selectedPeer || !socketRef.current) return;
    socketRef.current.emit("fetch-messages", { withUserId: selectedPeer }, (ack) => {
      if (ack?.ok && Array.isArray(ack.messages)) {
        setMessagesByPeer((prev) => ({ ...prev, [selectedPeer]: ack.messages }));
      }
    });
  }, [joined, selectedPeer, socketRef]);

  const sendChat = (text) => {
    if (!selectedPeer || !socketRef.current?.connected) return;
    const msg = { id: `local-${Date.now()}`, fromUserId: selfId, toUserId: selectedPeer, text, ts: Date.now() };
    setMessagesByPeer((prev) => ({
      ...prev,
      [selectedPeer]: [...(prev[selectedPeer] || []), msg],
    }));
    socketRef.current.emit("send-message", { targetUserId: selectedPeer, text }, (ack) => {
      if (ack?.ok && ack.id) {
        setMessagesByPeer((prev) => {
          const list = prev[selectedPeer] || [];
          return {
            ...prev,
            [selectedPeer]: list.map((m) => (m.id === msg.id ? { ...m, id: ack.id } : m)),
          };
        });
      }
    });
  };

  const selectedLabel = users.find((u) => u.userId === selectedPeer)?.displayName;

  return (
    <div className="app-shell">
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e0f2fe" }}>CYRUS Comm</h1>
        <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: 14 }}>
          WebRTC + Socket.IO — foundation for global / satellite-ready real-time comms
        </p>
      </header>

      <div className="status-bar">
        Socket:{" "}
        <span className={socketConnected ? "ok" : "warn"}>{socketConnected ? "connected" : "offline"}</span>
        {joined ? (
          <>
            {" · "}
            <span className="ok">in session</span>
          </>
        ) : null}
      </div>

      <LoginBar connected={joined} onJoin={onJoin} />

      <UserList
        users={users}
        selfId={selfId}
        selectedId={selectedPeer}
        onSelect={setSelectedPeer}
        onCallAudio={(id) => void startOutgoingCall(id, false)}
        onCallVideo={(id) => void startOutgoingCall(id, true)}
        inCall={inCall}
      />

      <VideoViews localStream={localStream} remoteStream={remoteStream} remoteName={remoteName} />
      <CallControls visible={inCall} onHangup={() => teardownCall(true)} />

      <ChatPanel
        peerId={selectedPeer}
        peerLabel={selectedLabel}
        messages={selectedPeer ? messagesByPeer[selectedPeer] || [] : []}
        onSend={sendChat}
        disabled={!joined || !selectedPeer}
      />

      <LocationTracker socket={socketRef.current} userId={selfId} enabled={joined} />

      <div className="panel">
        <h2>Debug log</h2>
        <pre className="loc-debug">{log.join("\n")}</pre>
      </div>
    </div>
  );
}
