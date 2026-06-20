#!/usr/bin/env node
/**
 * Debug repro: two Socket.IO clients place a video call and exchange minimal WebRTC signals.
 * Writes server-side debug NDJSON via relayWebRtcPayload instrumentation.
 */
import { io } from "socket.io-client";

const ORIGIN = process.env.CYRUS_DEBUG_ORIGIN || "http://127.0.0.1:3105";
const CODE = process.env.USER_ACCESS_CODE || "874344";

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(username) {
  const res = await fetch(`${ORIGIN}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, code: CODE }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const body = await res.json();
  return body.sessionToken || "";
}

function connectSocket(label, userId, displayName, deviceId) {
  return new Promise((resolve, reject) => {
    const socket = io(ORIGIN, {
      path: "/cyrus-io",
      transports: ["polling"],
      query: { deviceId },
    });
    const t = setTimeout(() => reject(new Error(`${label} connect timeout`)), 15000);
    socket.on("connect", () => {
      socket.emit("register", { userId, displayName, deviceId });
    });
    socket.on("registered", () => {
      clearTimeout(t);
      console.log(`[${label}] registered ${displayName}`);
      resolve(socket);
    });
    socket.on("connect_error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function main() {
  await login("debug_caller_a");
  await login("debug_caller_b");

  const callerId = "debug_caller_a";
  const calleeId = "debug_caller_b";
  const caller = await connectSocket("caller", callerId, "Debug Caller", "dev_caller");
  const callee = await connectSocket("callee", calleeId, "Debug Callee", "dev_callee");

  await wait(500);

  let roomId = "";
  let offerReceived = false;

  callee.on("incoming-call", (data) => {
    console.log("[callee] incoming-call", data.roomId, data.callType);
    roomId = data.roomId;
    callee.emit("accept-call", { roomId, callTxnId: `txn_${Date.now()}`, clientSeq: 1 });
    callee.emit("join-call-room", { roomId });
  });

  callee.on("webrtc-offer", (data) => {
    console.log("[callee] webrtc-offer", data.roomId, Boolean(data.offer));
    offerReceived = true;
    const answer = {
      type: "answer",
      sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TURTP/RTP/SAVPF 111\r\na=recvonly\r\nm=video 9 UDP/TURTP/RTP/SAVPF 96\r\na=recvonly\r\n",
    };
    callee.emit("webrtc-answer", { roomId: data.roomId, answer, targetPeerId: data.fromPeerId });
  });

  caller.on("call-accepted", (data) => {
    console.log("[caller] call-accepted", data.roomId);
    roomId = data.roomId;
    caller.emit("join-call-room", { roomId });
    const offer = {
      type: "offer",
      sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TURTP/RTP/SAVPF 111\r\na=sendrecv\r\nm=video 9 UDP/TURTP/RTP/SAVPF 96\r\na=sendrecv\r\n",
    };
    caller.emit("webrtc-offer", { roomId, offer, targetPeerId: data.peerId });
  });

  caller.emit("call-user", { targetUserId: calleeId, callType: "video", callTxnId: `txn_${Date.now()}`, clientSeq: 1 });

  await wait(3000);

  console.log("[debug-p2p-call] roomId=", roomId, "offerReceived=", offerReceived);
  caller.disconnect();
  callee.disconnect();
  await wait(300);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
