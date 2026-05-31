/**
 * Smoke test: comms media upload HTTP + socket message with fileUrl + in-call chat relay.
 */
import { io as createSocket, type Socket } from "socket.io-client";
import { spawn, type ChildProcess } from "node:child_process";
import { Buffer } from "node:buffer";

const PORT = Number(process.env.TEST_PORT || 39891);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ACCESS_CODE = process.env.USER_ACCESS_CODE || "170392";

/** Minimal 1x1 PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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
      body: JSON.stringify({ username: "MediaSmoke", code: ACCESS_CODE }),
    });
    if (!loginRes.ok) throw new Error(`login HTTP ${loginRes.status}`);
    const loginJson = (await loginRes.json()) as { sessionToken?: string };
    const authHeaders: Record<string, string> = loginJson.sessionToken
      ? { Authorization: `Bearer ${loginJson.sessionToken}` }
      : {};

    const userA = "media-smoke-a";
    const userB = "media-smoke-b";
    const deviceA = "device-media-a";
    const deviceB = "device-media-b";

    // ── 1. Direct upload HTTP ─────────────────────────────────────────────
    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "smoke.png");

    const uploadRes = await fetch(`${BASE_URL}/api/comms/upload`, {
      method: "POST",
      body: form,
      headers: {
        ...authHeaders,
        "X-User-Id": userA,
        "X-Device-Id": deviceA,
      },
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`upload HTTP ${uploadRes.status}: ${err}`);
    }
    const uploadJson = (await uploadRes.json()) as { fileUrl?: string; success?: boolean };
    if (!uploadJson.fileUrl) throw new Error("upload response missing fileUrl");

    const mediaRes = await fetch(`${BASE_URL}${uploadJson.fileUrl}`, {
      headers: authHeaders,
    });
    if (!mediaRes.ok) throw new Error(`media GET HTTP ${mediaRes.status}`);
    const mediaBytes = Buffer.from(await mediaRes.arrayBuffer());
    if (mediaBytes.length < 10) throw new Error("media file too small after serve");

    // ── 2. Socket direct message with media ───────────────────────────────
    const socketA = await connectUser({
      userId: userA,
      displayName: "Media Smoke A",
      deviceId: deviceA,
    });
    const socketB = await connectUser({
      userId: userB,
      displayName: "Media Smoke B",
      deviceId: deviceB,
    });
    sockets.push(socketA, socketB);

    const mediaMessagePromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for new-message")), 15_000);
      socketB.once("new-message", (data: { fileUrl?: string; messageType?: string; senderId?: string }) => {
        clearTimeout(timer);
        if (data.senderId !== userA) {
          reject(new Error(`unexpected sender ${data.senderId}`));
          return;
        }
        if (!data.fileUrl) {
          reject(new Error("new-message missing fileUrl"));
          return;
        }
        if (data.messageType !== "media") {
          reject(new Error(`expected messageType media, got ${data.messageType}`));
          return;
        }
        resolve();
      });
    });

    socketA.emit("send-message", {
      targetUserId: userB,
      message: " ",
      messageType: "media",
      fileUrl: uploadJson.fileUrl,
      fileName: "smoke.png",
      fileMimeType: "image/png",
      fileSizeBytes: TINY_PNG.length,
      timestamp: new Date().toISOString(),
      clientMessageId: `cm_smoke_${Date.now()}`,
    });

    await mediaMessagePromise;

    // ── 3. In-call chat media relay ───────────────────────────────────────
    const roomId = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for incoming-call")), 10_000);
      socketB.once("incoming-call", (data: { roomId: string }) => {
        clearTimeout(timer);
        resolve(data.roomId);
      });
      socketA.emit("call-user", {
        targetUserId: userB,
        callType: "audio",
        callTxnId: `txn_${Date.now()}`,
      });
    });

    socketA.emit("join-call-room", { roomId });
    socketB.emit("join-call-room", { roomId });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for call-accepted")), 10_000);
      socketA.once("call-accepted", () => {
        clearTimeout(timer);
        resolve();
      });
      socketB.emit("accept-call", { roomId, callTxnId: `txn_b_${Date.now()}` });
    });

    await wait(400);

    const callChatPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout waiting for call-chat-message")), 10_000);
      socketB.once(
        "call-chat-message",
        (data: { fileUrl?: string; messageType?: string; roomId?: string }) => {
          clearTimeout(timer);
          if (data.roomId !== roomId) {
            reject(new Error("call-chat roomId mismatch"));
            return;
          }
          if (!data.fileUrl || (data.messageType !== "file" && data.messageType !== "media")) {
            reject(new Error(`call-chat media payload incomplete: ${data.messageType}`));
            return;
          }
          resolve();
        },
      );
    });

    socketA.emit("call-chat-message", {
      roomId,
      message: "📎 smoke.txt",
      messageType: "file",
      fileUrl: uploadJson.fileUrl,
      fileName: "smoke.png",
      fileMimeType: "image/png",
      timestamp: new Date().toISOString(),
    });

    await callChatPromise;

    console.log(
      `OK: comms media upload smoke passed (upload=${uploadJson.fileUrl}, direct+incall relay verified)`,
    );
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
