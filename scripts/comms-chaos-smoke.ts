import { io as createSocket, type Socket } from "socket.io-client";
import { spawn, type ChildProcess } from "node:child_process";

type RuntimeMetrics = {
  chaosInjections?: number;
  iceRestartAttempts?: number;
  iceRestartSucceeded?: number;
  relayRestartAttempts?: number;
  recoveryLatencySamples?: number;
  reconnectUnder2s?: number;
  reconnect2to5s?: number;
  reconnect5to10s?: number;
  reconnectOver10s?: number;
};

const PORT = Number(process.env.TEST_PORT || 39889);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_URL = `${BASE_URL}/health/ready`;
const ACCESS_CODE = process.env.USER_ACCESS_CODE || "170392";
const CHAOS_CYCLES = Math.max(1, Number(process.env.CYRUS_COMMS_CHAOS_CYCLES || 1));
const RECONNECT_DELAY_MS = Math.max(0, Number(process.env.CYRUS_COMMS_RECONNECT_DELAY_MS || 300));
const EXPECTED_RECONNECT_BUCKET = process.env.CYRUS_COMMS_EXPECT_RECONNECT_BUCKET || "under2s";
const RECONNECT_DELAY_PLAN_MS = (process.env.CYRUS_COMMS_RECONNECT_DELAY_PLAN_MS || "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((n) => Number.isFinite(n) && n >= 0);

type ReconnectBucket = "under2s" | "2to5s" | "5to10s" | "over10s";

function bucketForReconnectDelay(delayMs: number): ReconnectBucket {
  if (delayMs < 2000) return "under2s";
  if (delayMs < 5000) return "2to5s";
  if (delayMs < 10000) return "5to10s";
  return "over10s";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(READY_URL, { method: "GET" });
      if (res.ok) return;
    } catch {
      // startup in progress
    }
    await wait(1_000);
  }
  throw new Error(`Timeout waiting for ${READY_URL}`);
}

async function loginAndGetToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "CommsChaosSmoke", code: ACCESS_CODE }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed: HTTP ${res.status} ${body}`);
  }
  const json = (await res.json()) as { sessionToken?: string };
  if (!json.sessionToken) {
    throw new Error("Login response missing sessionToken");
  }
  return json.sessionToken;
}

async function connectAndRegister(opts: {
  userId: string;
  displayName: string;
  deviceId: string;
}): Promise<Socket> {
  const socket = createSocket(BASE_URL, {
    path: "/cyrus-io",
    transports: ["polling", "websocket"],
    withCredentials: true,
    timeout: 30_000,
    reconnection: false,
    forceNew: true,
  });

  await new Promise<void>((resolve, reject) => {
    const onConnectError = (err: Error) => reject(err);
    const onRegistered = () => {
      socket.off("connect_error", onConnectError);
      resolve();
    };

    socket.on("connect_error", onConnectError);
    socket.on("registered", onRegistered);
    socket.on("connect", () => {
      socket.emit("register", {
        userId: opts.userId,
        displayName: opts.displayName,
        deviceId: opts.deviceId,
        resumeFromSeq: 0,
      });
    });
  });

  return socket;
}

function emitWithSeq(
  socket: Socket,
  seqRef: { value: number },
  event: string,
  payload: Record<string, unknown>,
): void {
  seqRef.value += 1;
  socket.emit(event, { ...payload, clientSeq: seqRef.value });
}

async function main(): Promise<void> {
  let server: ChildProcess | null = null;
  const sockets: Socket[] = [];

  const cleanup = async () => {
    for (const s of sockets) {
      try {
        s.disconnect();
      } catch {
        // ignore
      }
    }
    if (server?.pid) {
      server.kill("SIGTERM");
      await wait(500);
      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }
  };

  process.on("SIGINT", () => void cleanup().then(() => process.exit(130)));
  process.on("SIGTERM", () => void cleanup().then(() => process.exit(143)));

  try {
    server = spawn("npx", ["tsx", "server/index.ts"], {
      env: {
        ...process.env,
        PORT: String(PORT),
        CYRUS_LIVE_PORT: String(PORT),
        CYRUS_SINGLE_ORIGIN: "1",
        CYRUS_UI_ROOT: process.env.CYRUS_UI_ROOT || "cyrus-ui",
        NODE_ENV: process.env.NODE_ENV || "development",
        TMPDIR: process.env.TMPDIR || "/tmp",
        USER_ACCESS_CODE: ACCESS_CODE,
        ADMIN_ACCESS_CODE: process.env.ADMIN_ACCESS_CODE || "71580019",
        CYRUS_ENABLE_COMMS_CHAOS: "1",
      },
      stdio: "inherit",
    });

    await waitForReady();
    const token = await loginAndGetToken();

    const seqA = { value: 0 };
    const seqB = { value: 0 };
    const reconnectBucketExpectations: Record<ReconnectBucket, number> = {
      under2s: 0,
      "2to5s": 0,
      "5to10s": 0,
      over10s: 0,
    };

    let socketA = await connectAndRegister({
      userId: "chaos-user-a",
      displayName: "Chaos User A",
      deviceId: "chaos-dev-a",
    });
    const socketB = await connectAndRegister({
      userId: "chaos-user-b",
      displayName: "Chaos User B",
      deviceId: "chaos-dev-b",
    });
    sockets.push(socketA, socketB);

    const runChaosCycle = async (cycle: number): Promise<void> => {
      const reconnectDelayMs =
        RECONNECT_DELAY_PLAN_MS.length > 0
          ? RECONNECT_DELAY_PLAN_MS[(cycle - 1) % RECONNECT_DELAY_PLAN_MS.length]
          : RECONNECT_DELAY_MS;
      const expectedBucket: ReconnectBucket =
        EXPECTED_RECONNECT_BUCKET === "auto"
          ? bucketForReconnectDelay(reconnectDelayMs)
          : (EXPECTED_RECONNECT_BUCKET as ReconnectBucket);
      reconnectBucketExpectations[expectedBucket] += 1;

      const incoming = await new Promise<{ roomId: string }>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Timed out waiting for incoming-call")), 20_000);
        socketB.once("incoming-call", (data: { roomId: string }) => {
          clearTimeout(timeoutId);
          resolve({ roomId: data.roomId });
        });
        emitWithSeq(socketA, seqA, "call-user", {
          targetUserId: "chaos-user-b",
          callType: "audio",
          callTxnId: `txn_${Date.now()}_cycle_${cycle}_call_user`,
        });
      });
      emitWithSeq(socketB, seqB, "accept-call", {
        roomId: incoming.roomId,
        callTxnId: `txn_${Date.now()}_cycle_${cycle}_accept`,
      });
      await wait(800);

      emitWithSeq(socketA, seqA, "comms-chaos", { mode: "force_qos_critical", roomId: incoming.roomId });
      await wait(120);
      emitWithSeq(socketA, seqA, "comms-chaos", { mode: "force_relay_restart", roomId: incoming.roomId });
      await wait(120);
      emitWithSeq(socketA, seqA, "comms-chaos", { mode: "force_call_drop", roomId: incoming.roomId });
      await wait(120);

      emitWithSeq(socketA, seqA, "comms-telemetry", {
        eventType: "ice_restart",
        outcome: "attempt",
        roomId: incoming.roomId,
        reason: `smoke_cycle_${cycle}_attempt`,
      });
      emitWithSeq(socketA, seqA, "comms-telemetry", {
        eventType: "ice_restart",
        outcome: "success",
        roomId: incoming.roomId,
        latencyMs: 820,
        reason: `smoke_cycle_${cycle}_success`,
      });
      emitWithSeq(socketA, seqA, "comms-telemetry", {
        eventType: "relay_restart",
        outcome: "attempt",
        roomId: incoming.roomId,
        reason: `smoke_cycle_${cycle}_relay_attempt`,
      });
      emitWithSeq(socketA, seqA, "comms-telemetry", {
        eventType: "relay_restart",
        outcome: "success",
        roomId: incoming.roomId,
        latencyMs: 1430,
        reason: `smoke_cycle_${cycle}_relay_success`,
      });
      await wait(600);

      // Reconnect bucket smoke: configurable delay to target specific reconnect SLO bucket.
      socketA.disconnect();
      await wait(reconnectDelayMs);
      socketA = await connectAndRegister({
        userId: "chaos-user-a",
        displayName: "Chaos User A",
        deviceId: "chaos-dev-a",
      });
      sockets.push(socketA);
      await wait(500);
    };

    for (let i = 1; i <= CHAOS_CYCLES; i += 1) {
      await runChaosCycle(i);
    }

    await wait(1_200);

    const runtimeRes = await fetch(`${BASE_URL}/api/comms/runtime-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!runtimeRes.ok) {
      throw new Error(`runtime-metrics failed with HTTP ${runtimeRes.status}`);
    }
    const runtimeJson = (await runtimeRes.json()) as { runtime?: RuntimeMetrics };
    const runtime = runtimeJson.runtime || {};

    const assertCounter = (name: keyof RuntimeMetrics, min: number) => {
      const got = Number(runtime[name] || 0);
      if (got < min) {
        throw new Error(`Expected runtime.${String(name)} >= ${min}, got ${got}`);
      }
    };

    assertCounter("chaosInjections", 3 * CHAOS_CYCLES);
    assertCounter("iceRestartAttempts", CHAOS_CYCLES);
    assertCounter("iceRestartSucceeded", CHAOS_CYCLES);
    assertCounter("relayRestartAttempts", CHAOS_CYCLES);
    assertCounter("recoveryLatencySamples", 2 * CHAOS_CYCLES);
    if (reconnectBucketExpectations.under2s > 0) {
      assertCounter("reconnectUnder2s", reconnectBucketExpectations.under2s);
    }
    if (reconnectBucketExpectations["2to5s"] > 0) {
      assertCounter("reconnect2to5s", reconnectBucketExpectations["2to5s"]);
    }
    if (reconnectBucketExpectations["5to10s"] > 0) {
      assertCounter("reconnect5to10s", reconnectBucketExpectations["5to10s"]);
    }
    if (reconnectBucketExpectations.over10s > 0) {
      assertCounter("reconnectOver10s", reconnectBucketExpectations.over10s);
    }

    const promRes = await fetch(`${BASE_URL}/api/comms/metrics/prometheus`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!promRes.ok) {
      throw new Error(`prometheus metrics failed with HTTP ${promRes.status}`);
    }
    const promText = await promRes.text();
    const required = [
      "cyrus_comms_ice_restart_attempts_total",
      "cyrus_comms_ice_restart_succeeded_total",
      "cyrus_comms_relay_restart_attempts_total",
      "cyrus_comms_recovery_latency_avg_ms",
      "cyrus_comms_chaos_injections_total",
    ];
    for (const metricName of required) {
      if (!promText.includes(metricName)) {
        throw new Error(`Prometheus output missing ${metricName}`);
      }
    }

    console.log(
      `OK: comms chaos smoke passed (cycles=${CHAOS_CYCLES}, reconnectDelayMs=${RECONNECT_DELAY_MS}, reconnectDelayPlan=${RECONNECT_DELAY_PLAN_MS.join("|") || "none"}, expectedBucket=${EXPECTED_RECONNECT_BUCKET})`,
    );
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
