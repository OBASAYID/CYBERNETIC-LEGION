/**
 * Cross-check P2P call signaling relay (plaintext SDP/ICE path — default integration).
 */
import { io as createSocket, type Socket } from "socket.io-client";
import { spawn, type ChildProcess } from "node:child_process";

const PORT = Number(process.env.TEST_PORT || 39890);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ACCESS_CODE = process.env.USER_ACCESS_CODE || "170392";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/health/ready`);
      if (res.ok) return;
    } catch {
      /* booting */
    }
    await wait(1_000);
  }
  throw new Error("Timeout waiting for /health/ready");
}

async function connectUser(opts: {
  userId: string;
  displayName: string;
  deviceId: string;
}): Promise<Socket> {
  const socket = createSocket(BASE_URL, {
    path: "/cyrus-io",
    transports: ["polling", "websocket"],
    withCredentials: true,
    reconnection: false,
    forceNew: true,
  });

  await new Promise<void>((resolve, reject) => {
    const onErr = (e: Error) => reject(e);
    socket.on("connect_error", onErr);
    socket.on("connect", () => {
      socket.emit("register", {
        userId: opts.userId,
        displayName: opts.displayName,
        deviceId: opts.deviceId,
        resumeFromSeq: 0,
      });
    });
    socket.once("registered", () => {
      socket.off("connect_error", onErr);
      resolve();
    });
  });

  return socket;
}

async function main(): Promise<void> {
  let server: ChildProcess | null = null;
  const sockets: Socket[] = [];

  const cleanup = async () => {
    for (const s of sockets) s.disconnect();
    if (server?.pid) {
      server.kill("SIGTERM");
      await wait(400);
      if (!server.killed) server.kill("SIGKILL");
    }
  };

  try {
    server = spawn("npx", ["tsx", "server/index.ts"], {
      env: {
        ...process.env,
        PORT: String(PORT),
        CYRUS_LIVE_PORT: String(PORT),
        CYRUS_SINGLE_ORIGIN: "1",
        CYRUS_UI_ROOT: "cyrus-ui",
        NODE_ENV: "development",
        TMPDIR: "/tmp",
        USER_ACCESS_CODE: ACCESS_CODE,
        ADMIN_ACCESS_CODE: process.env.ADMIN_ACCESS_CODE || "71580019",
      },
      stdio: "pipe",
    });

    await waitForReady();

    const loginRes = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "WebRtcSmoke", code: ACCESS_CODE }),
    });
    if (!loginRes.ok) throw new Error(`login HTTP ${loginRes.status}`);
    const loginJson = (await loginRes.json()) as { sessionToken?: string };
    const token = loginJson.sessionToken || "";

    const rtcRes = await fetch(`${BASE_URL}/api/cyrus-comm/config/webrtc`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!rtcRes.ok) throw new Error(`webrtc config HTTP ${rtcRes.status}`);
    const rtc = (await rtcRes.json()) as { iceTransportPolicy?: string; relayConfigured?: boolean };
    if (rtc.iceTransportPolicy === "relay" && !rtc.relayConfigured) {
      throw new Error("Misconfigured: relay policy without relayConfigured");
    }

    const caller = await connectUser({
      userId: "sig-smoke-caller",
      displayName: "Caller",
      deviceId: "sig-dev-a",
    });
    const callee = await connectUser({
      userId: "sig-smoke-callee",
      displayName: "Callee",
      deviceId: "sig-dev-b",
    });
    sockets.push(caller, callee);

    const roomId = await new Promise<string>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("incoming-call timeout")), 15_000);
      callee.once("incoming-call", (data: { roomId: string }) => {
        clearTimeout(t);
        resolve(data.roomId);
      });
      caller.emit("call-user", {
        targetUserId: "sig-smoke-callee",
        callType: "video",
        callTxnId: `txn_${Date.now()}`,
        clientSeq: 1,
      });
    });

    callee.emit("join-call-room", { roomId });
    caller.emit("join-call-room", { roomId });

    const accepted = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("call-accepted timeout")), 10_000);
      caller.once("call-accepted", () => {
        clearTimeout(t);
        resolve();
      });
      callee.emit("accept-call", { roomId, callTxnId: `txn_acc_${Date.now()}`, clientSeq: 1 });
    });
    await accepted;

    const testOffer = { type: "offer" as const, sdp: "v=0\r\no=smoke 0 0 IN IP4 127.0.0.1\r\n" };
    const relayedOffer = new Promise<{ fromPeerId?: string; offer?: unknown; sealed?: unknown }>(
      (resolve, reject) => {
        const t = setTimeout(() => reject(new Error("webrtc-offer relay timeout")), 10_000);
        const onOffer = (data: { fromPeerId?: string; offer?: unknown; sealed?: unknown }) => {
          clearTimeout(t);
          callee.off("webrtc-offer", onOffer);
          callee.off("webrtc:offer", onOffer);
          resolve(data);
        };
        callee.on("webrtc-offer", onOffer);
        callee.on("webrtc:offer", onOffer);
      },
    );

    caller.emit("webrtc-offer", {
      roomId,
      targetPeerId: "sig-smoke-callee",
      offer: testOffer,
    });

    const got = await relayedOffer;
    if (got.fromPeerId !== "sig-smoke-caller") {
      throw new Error(`Expected fromPeerId sig-smoke-caller, got ${got.fromPeerId}`);
    }
    if (!got.offer || (got.offer as { sdp?: string }).sdp !== testOffer.sdp) {
      throw new Error("Plaintext offer not relayed intact");
    }
    if (got.sealed) {
      throw new Error("Unexpected sealed payload with default integration (sealed should be off)");
    }

    const testCandidate = { candidate: "candidate:smoke 1 udp 2122260223 127.0.0.1 54321 typ host", sdpMid: "0", sdpMLineIndex: 0 };
    const relayedIce = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("webrtc-ice relay timeout")), 10_000);
      callee.once("webrtc-ice-candidate", (data: { candidate?: unknown; fromPeerId?: string }) => {
        clearTimeout(t);
        if (data.fromPeerId !== "sig-smoke-caller") {
          reject(new Error("ICE fromPeerId mismatch"));
          return;
        }
        const c = data.candidate as { candidate?: string };
        if (c?.candidate !== testCandidate.candidate) {
          reject(new Error("ICE candidate not relayed intact"));
          return;
        }
        resolve();
      });
    });

    caller.emit("webrtc-ice-candidate", {
      roomId,
      targetPeerId: "sig-smoke-callee",
      candidate: testCandidate,
    });
    await relayedIce;

    caller.emit("end-call", { roomId, callTxnId: `txn_end_${Date.now()}`, clientSeq: 2 });
    await wait(300);

    console.log("OK: webrtc signaling smoke passed (call setup + plaintext offer/ICE relay)");
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
