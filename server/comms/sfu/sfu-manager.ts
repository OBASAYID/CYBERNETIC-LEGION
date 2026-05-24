/**
 * CYRUS SFU manager — mediasoup when native worker is available, else star relay.
 */
import fs from "node:fs";
import path from "node:path";
import type { CyrusSfuMode } from "../../../shared/comms/sfu-types.js";
import { getProductionIceServers, relayIsConfigured } from "../cyrus-comm-config.js";

export const GROUP_CALL_SFU_MAX = 20;

type MediasoupTypes = typeof import("mediasoup");

let sfuMode: CyrusSfuMode = "star";
let mediasoupLib: MediasoupTypes | null = null;
let worker: import("mediasoup").types.Worker | null = null;
let initError: string | null = null;
const routers = new Map<string, import("mediasoup").types.Router>();

type PeerState = {
  peerKey: string;
  userId: string;
  socketId: string;
  displayName: string;
  sendTransport?: import("mediasoup").types.WebRtcTransport;
  recvTransport?: import("mediasoup").types.WebRtcTransport;
  producers: Map<string, import("mediasoup").types.Producer>;
  consumers: Map<string, import("mediasoup").types.Consumer>;
};

const peersByRoom = new Map<string, Map<string, PeerState>>();

export function buildSfuPeerKey(userId: string, socketId: string): string {
  return `${userId}::${socketId}`;
}

function resolveWorkerBinPath(): string | null {
  const explicit = process.env.MEDIASOUP_WORKER_BIN?.trim();
  if (explicit && fs.existsSync(explicit)) return explicit;

  const releaseBin = path.join(
    process.cwd(),
    "node_modules",
    "mediasoup",
    "worker",
    "out",
    "Release",
    "mediasoup-worker",
  );
  if (fs.existsSync(releaseBin)) return releaseBin;
  return null;
}

export function getSfuMode(): CyrusSfuMode {
  return sfuMode;
}

export function getSfuStatus() {
  const rtcMin = Number(process.env.CYRUS_SFU_RTC_MIN_PORT || 40000);
  const rtcMax = Number(process.env.CYRUS_SFU_RTC_MAX_PORT || 49999);
  return {
    mode: sfuMode,
    mediasoupAvailable: mediasoupLib !== null && worker !== null,
    relayConfigured: relayIsConfigured(getProductionIceServers()),
    maxParticipants: GROUP_CALL_SFU_MAX,
    announcedIp: getAnnouncedIp() ?? null,
    rtcPortRange: { min: rtcMin, max: rtcMax },
    workerBin: resolveWorkerBinPath(),
    initError,
  };
}

export async function initCyrusSfu(): Promise<void> {
  initError = null;

  if (process.env.CYRUS_DISABLE_SFU === "true") {
    sfuMode = "star";
    console.log("[SFU] Disabled (CYRUS_DISABLE_SFU=true) — star relay for groups");
    return;
  }

  const workerBin = resolveWorkerBinPath();
  if (!workerBin && process.env.NODE_ENV !== "production") {
    console.log(
      "[SFU] mediasoup-worker binary not found — run: node scripts/install-mediasoup-worker.mjs",
    );
  }

  try {
    if (workerBin) {
      process.env.MEDIASOUP_WORKER_BIN = workerBin;
    }

    const mod = await import("mediasoup");
    mediasoupLib = mod;
    worker = await mod.createWorker({
      logLevel: "warn",
      rtcMinPort: Number(process.env.CYRUS_SFU_RTC_MIN_PORT || 40000),
      rtcMaxPort: Number(process.env.CYRUS_SFU_RTC_MAX_PORT || 49999),
    });
    worker.on("died", () => {
      console.error("[SFU] mediasoup worker died — falling back to star relay");
      worker = null;
      sfuMode = "star";
    });
    sfuMode = "mediasoup";
    console.log(`[SFU] mediasoup worker online — group calls use SFU (${workerBin || "bundled"})`);
  } catch (e) {
    sfuMode = "star";
    initError = e instanceof Error ? e.message : String(e);
    console.warn("[SFU] mediasoup unavailable — group calls use star relay:", initError);
  }
}

async function getOrCreateRouter(roomId: string): Promise<import("mediasoup").types.Router | null> {
  if (!mediasoupLib || !worker) return null;
  let router = routers.get(roomId);
  if (router) return router;

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
        parameters: { minptime: 10, useinbandfec: 1 },
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: { "x-google-start-bitrate": 1000 },
      },
      {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
          "packetization-mode": 1,
          "profile-level-id": "42e01f",
          "level-asymmetry-allowed": 1,
        },
      },
    ],
  });
  routers.set(roomId, router);
  if (!peersByRoom.has(roomId)) peersByRoom.set(roomId, new Map());
  return router;
}

function getAnnouncedIp(): string | undefined {
  const ip = process.env.CYRUS_SFU_ANNOUNCED_IP?.trim();
  if (ip) return ip;
  if (process.env.NODE_ENV !== "production") return "127.0.0.1";
  return undefined;
}

function getPeer(roomId: string, peerKey: string): PeerState | undefined {
  return peersByRoom.get(roomId)?.get(peerKey);
}

export async function sfuJoinRoom(input: {
  roomId: string;
  userId: string;
  socketId: string;
  displayName: string;
}): Promise<
  | { mode: "star"; hostPeerId: string }
  | {
      mode: "mediasoup";
      rtpCapabilities: import("mediasoup").types.RtpCapabilities;
    }
> {
  if (sfuMode !== "mediasoup" || !mediasoupLib) {
    return { mode: "star", hostPeerId: input.userId };
  }

  const router = await getOrCreateRouter(input.roomId);
  if (!router) return { mode: "star", hostPeerId: input.userId };

  const peerKey = buildSfuPeerKey(input.userId, input.socketId);
  const roomPeers = peersByRoom.get(input.roomId)!;
  roomPeers.set(peerKey, {
    peerKey,
    userId: input.userId,
    socketId: input.socketId,
    displayName: input.displayName,
    producers: new Map(),
    consumers: new Map(),
  });

  return { mode: "mediasoup", rtpCapabilities: router.rtpCapabilities };
}

export async function sfuCreateWebRtcTransport(
  roomId: string,
  peerKey: string,
  direction: "send" | "recv",
) {
  const router = routers.get(roomId);
  if (!router) throw new Error("SFU router not found");

  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: "0.0.0.0", announcedIp: getAnnouncedIp() }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 2_500_000,
  });

  const peer = getPeer(roomId, peerKey);
  if (!peer) throw new Error("SFU peer not found");
  if (direction === "send") peer.sendTransport = transport;
  else peer.recvTransport = transport;

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function sfuConnectTransport(
  roomId: string,
  peerKey: string,
  direction: "send" | "recv",
  dtlsParameters: import("mediasoup").types.DtlsParameters,
) {
  const peer = getPeer(roomId, peerKey);
  if (!peer) throw new Error("SFU peer not found");
  const transport = direction === "send" ? peer.sendTransport : peer.recvTransport;
  if (!transport) throw new Error("SFU transport not found");
  await transport.connect({ dtlsParameters });
}

export async function sfuProduce(
  roomId: string,
  peerKey: string,
  kind: import("mediasoup").types.MediaKind,
  rtpParameters: import("mediasoup").types.RtpParameters,
) {
  const peer = getPeer(roomId, peerKey);
  if (!peer?.sendTransport) throw new Error("Send transport missing");
  const producer = await peer.sendTransport.produce({ kind, rtpParameters });
  peer.producers.set(producer.id, producer);
  return { producerId: producer.id, peerId: peer.userId };
}

export async function sfuConsume(
  roomId: string,
  peerKey: string,
  producerId: string,
  rtpCapabilities: import("mediasoup").types.RtpCapabilities,
) {
  const router = routers.get(roomId);
  const peer = getPeer(roomId, peerKey);
  if (!router || !peer?.recvTransport) throw new Error("Cannot consume");

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error("Cannot consume producer");
  }

  const producerPeer = [...(peersByRoom.get(roomId)?.values() ?? [])].find((p) =>
    [...p.producers.values()].some((pr) => pr.id === producerId),
  );
  const producer = producerPeer?.producers.get(producerId);
  if (!producer) throw new Error("Producer not found");

  const consumer = await peer.recvTransport.consume({
    producerId,
    rtpCapabilities,
    paused: false,
  });
  peer.consumers.set(consumer.id, consumer);

  return {
    consumerId: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    producerPeerId: producerPeer?.userId,
  };
}

export async function sfuResumeConsumer(roomId: string, peerKey: string, consumerId: string) {
  const peer = getPeer(roomId, peerKey);
  const consumer = peer?.consumers.get(consumerId);
  if (!consumer) throw new Error("Consumer not found");
  await consumer.resume();
}

export function sfuListProducers(roomId: string, excludePeerKey: string) {
  const out: { producerId: string; peerId: string; kind: string }[] = [];
  const room = peersByRoom.get(roomId);
  if (!room) return out;
  for (const [peerKey, peer] of room) {
    if (peerKey === excludePeerKey) continue;
    for (const [producerId, producer] of peer.producers) {
      out.push({ producerId, peerId: peer.userId, kind: producer.kind });
    }
  }
  return out;
}

export function sfuLeaveRoom(roomId: string, userId: string, socketId?: string) {
  const room = peersByRoom.get(roomId);
  if (!room) return;

  const keysToRemove: string[] = [];
  for (const [key, peer] of room) {
    if (peer.userId !== userId) continue;
    if (socketId && peer.socketId !== socketId) continue;
    peer.sendTransport?.close();
    peer.recvTransport?.close();
    keysToRemove.push(key);
  }
  for (const key of keysToRemove) room.delete(key);

  if (room.size === 0) {
    peersByRoom.delete(roomId);
    routers.get(roomId)?.close();
    routers.delete(roomId);
  }
}

export function resolveGroupSfuMode(): CyrusSfuMode {
  return sfuMode === "mediasoup" ? "mediasoup" : "star";
}
