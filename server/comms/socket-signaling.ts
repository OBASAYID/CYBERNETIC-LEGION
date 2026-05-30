import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createCyrusCorsOriginAccess } from "../cors-trusted.js";
import { resolveGroupSfuMode, sfuLeaveRoom } from "./sfu/sfu-manager.js";
import { registerSfuSocketHandlers } from "./sfu/register-sfu-handlers.js";
import { db } from "../db.js";
import { onlineUsers, directMessages, groupChats, callSessions, callMessages, liveStreams, sharedMedia, calls, callLogs } from "../../shared/models/comms";
import { eq, ilike, sql } from "drizzle-orm";
import { commsIntelligence } from "./comms-intelligence.js";
import { gwaEngine } from "./gwa-engine.js";
import {
  flushPendingForUser,
  persistChatMessage,
  queueForOfflineRecipient,
} from "./delivery-hub.js";
import {
  deleteActiveCallState,
  deletePendingCallState,
  getActiveCallState,
  getActiveCallStateForUser,
  getPendingCallState,
  listActiveCallStates,
  setActiveCallState,
  setPendingCallState,
} from "./distributed-call-state.js";
import {
  appendCommsUserEvent,
  readCommsUserEventsSince,
} from "./distributed-event-log.js";
import {
  initCommsFanout,
  publishCommsFanout,
} from "./distributed-socket-fanout.js";

interface User {
  id: string;
  socketId: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  currentRoomId?: string;
  status?: "online" | "busy" | "away";
  /** Cyrus chat profile photo URL (served from /api/comms/media/...) */
  profileImageUrl?: string | null;
}

interface PendingCall {
  callerId: string;
  callerName: string;
  targetId: string;
  roomId: string;
  callType: "audio" | "video";
  timestamp: Date;
}

interface GroupRoom {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
}

interface ActiveCall {
  roomId: string;
  participants: string[];
  callType: "audio" | "video";
  startedAt: Date;
  screenSharingBy?: string;
  hostPeerId: string;
  sfuMode?: "mediasoup" | "star" | "p2p";
}

type QosSample = {
  roomId: string;
  rttMs?: number;
  jitterMs?: number;
  packetLossRate?: number;
  bitrateKbps?: number;
  quality?: string;
};

type MessageType = "text" | "emoji" | "media" | "file" | "cad-3d" | "voice-note" | "location" | "system";

interface EnhancedMessage {
  targetUserId?: string;
  groupId?: string;
  message: string;
  messageType: MessageType;
  clientMessageId?: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  /** For messageType "voice-note" */
  voiceDurationSeconds?: number;
  latitude?: number;
  longitude?: number;
  replyToId?: string;
}

const users = new Map<string, User>();
const pendingCalls = new Map<string, PendingCall>();
const groupRooms = new Map<string, GroupRoom>();
const activeCalls = new Map<string, ActiveCall>();
const recentMessageAcks = new Map<
  string,
  {
    id: string;
    recipientId?: string;
    groupId?: string;
    message: string;
    messageType: MessageType;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSizeBytes?: number;
    voiceDurationSeconds?: number;
    latitude?: number;
    longitude?: number;
    clientMessageId?: string;
    storedAt: number;
  }
>();
const processingMessageAcks = new Set<string>();
const qosByRoomAndUser = new Map<string, QosSample & { userId: string; updatedAt: number }>();
const qosLastSampleAt = new Map<string, number>();
const qosActionStateByRoomUser = new Map<
  string,
  {
    lastAction?: "reduce_video" | "force_relay_restart";
    lastActionAt?: number;
    degradedStreak: number;
    criticalStreak: number;
    updatedAt: number;
  }
>();
const roomQosProfiles = new Map<
  string,
  {
    ewmaRtt: number;
    ewmaJitter: number;
    ewmaLoss: number;
    ewmaBitrate: number;
    sampleCount: number;
    updatedAt: number;
  }
>();
const recentCallTransactions = new Map<string, number>();
const userLastDisconnectAt = new Map<string, number>();
const pendingCallTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const knownDeviceIdsByUser = new Map<string, Set<string>>();
const runtimeMetrics = {
  qosSamplesReceived: 0,
  qosSamplesRejectedInvalid: 0,
  qosSamplesRateLimited: 0,
  qosActionsIssued: 0,
  degradedSamples: 0,
  criticalSamples: 0,
  callSetupStarted: 0,
  callSetupSucceeded: 0,
  callSetupFailed: 0,
  sessionRehydrates: 0,
  reconnectUnder2s: 0,
  reconnect2to5s: 0,
  reconnect5to10s: 0,
  reconnectOver10s: 0,
  iceRestartAttempts: 0,
  iceRestartSucceeded: 0,
  iceRestartFailed: 0,
  relayRestartAttempts: 0,
  relayRestartSucceeded: 0,
  relayRestartFailed: 0,
  recoveryLatencySamples: 0,
  recoveryLatencyTotalMs: 0,
  recoveryLatencyUnder1s: 0,
  recoveryLatency1to2s: 0,
  recoveryLatency2to5s: 0,
  recoveryLatencyOver5s: 0,
  chaosInjections: 0,
  pendingCallTimeouts: 0,
  activeCallDriftReconciles: 0,
  activeCallDriftPruned: 0,
  signalingInvalidPayloadRejected: 0,
  signalingEventRateLimited: 0,
  qosAdaptiveDegradedSamples: 0,
  qosAdaptiveCriticalSamples: 0,
  qosActionsSuppressedCooldown: 0,
  qosActionsSuppressedHysteresis: 0,
  commsFanoutPublished: 0,
  commsFanoutReceived: 0,
  commsFanoutDelivered: 0,
  messageSentEvents: 0,
  messageDeliveryAcksReceived: 0,
  messageDeliveryAcksSent: 0,
  webrtcRelayOffer: 0,
  webrtcRelayAnswer: 0,
  webrtcRelayIce: 0,
  webrtcRelayIceRestart: 0,
  webrtcRelayFallbackRoom: 0,
};

function toPendingCallState(call: PendingCall) {
  return {
    callerId: call.callerId,
    callerName: call.callerName,
    targetId: call.targetId,
    roomId: call.roomId,
    callType: call.callType,
    timestamp: call.timestamp.toISOString(),
  } as const;
}

function fromPendingCallState(state: Awaited<ReturnType<typeof getPendingCallState>>): PendingCall | null {
  if (!state) return null;
  return {
    callerId: state.callerId,
    callerName: state.callerName,
    targetId: state.targetId,
    roomId: state.roomId,
    callType: state.callType,
    timestamp: new Date(state.timestamp),
  };
}

function toActiveCallState(call: ActiveCall) {
  return {
    roomId: call.roomId,
    participants: call.participants,
    callType: call.callType,
    startedAt: call.startedAt.toISOString(),
    screenSharingBy: call.screenSharingBy,
    hostPeerId: call.hostPeerId,
    sfuMode: call.sfuMode,
  } as const;
}

/** Max users in a group call (enforced in signaling). */
const GROUP_CALL_MAX_PARTICIPANTS = 20;

let ioInstance: SocketIOServer | null = null;
const RECENT_ACK_TTL_MS = 2 * 60 * 1000;
const CALL_TXN_TTL_MS = 10 * 60 * 1000;
const QOS_SAMPLE_MIN_INTERVAL_MS = 750;
const PENDING_CALL_TIMEOUT_MS = 35_000;
const ACTIVE_CALL_RECONCILE_INTERVAL_MS = 45_000;
const ACTIVE_CALL_EMPTY_GRACE_MS = 45_000;
const QOS_ACTION_COOLDOWN_MS = {
  reduce_video: 8_000,
  force_relay_restart: 15_000,
} as const;
const QOS_HYSTERESIS_DEGRADED_STREAK = 2;
const COMMS_CHAOS_ENABLED = process.env.CYRUS_ENABLE_COMMS_CHAOS === "1";

async function emitToCallRoom(
  io: SocketIOServer,
  roomId: string,
  event: string,
  payload: Record<string, unknown>,
  excludeUserId?: string,
): Promise<void> {
  const activeCall = await loadActiveCall(roomId);
  if (activeCall?.participants?.length) {
    for (const pid of activeCall.participants) {
      if (excludeUserId && pid === excludeUserId) continue;
      emitToCommsUser(io, pid, event, payload);
    }
    return;
  }
  io.to(roomId).emit(event, payload);
}

function presenceMapKey(commsUserId: string, deviceId: string): string {
  return `${commsUserId}::${deviceId}`;
}

/** Find any online socket row for a comms user id (account or device). */
function findUserByCommsId(commsUserId: string): User | undefined {
  const direct = users.get(commsUserId);
  if (direct) return direct;
  for (const u of users.values()) {
    if (u.id === commsUserId) return u;
  }
  return undefined;
}

function findUsersByCommsId(commsUserId: string): User[] {
  const out: User[] = [];
  for (const u of users.values()) {
    if (u.id === commsUserId) out.push(u);
  }
  return out;
}

function commsUserRoom(commsUserId: string): string {
  return `comms_user:${commsUserId}`;
}

function emitToCommsUser(io: SocketIOServer, commsUserId: string, event: string, payload: unknown): number {
  io.to(commsUserRoom(commsUserId)).emit(event, payload);
  return findUsersByCommsId(commsUserId).length;
}

async function resolveRelayTargetPeerId(
  roomId: string,
  fromPeerId: string,
  explicitTargetPeerId?: string,
): Promise<string | undefined> {
  if (explicitTargetPeerId) return explicitTargetPeerId;
  const activeCall = await loadActiveCall(roomId);
  if (!activeCall?.participants?.length) return undefined;
  const peerId = activeCall.participants.find((id) => id !== fromPeerId);
  return peerId;
}

/** Opaque WebRTC relay — forwards sealed + legacy fields without inspecting SDP/ICE. */
async function relayWebRtcPayload(
  io: SocketIOServer,
  socket: Socket,
  data: {
    roomId: string;
    targetPeerId?: string;
    offer?: unknown;
    answer?: unknown;
    candidate?: unknown;
    sealed?: unknown;
  },
  eventNames: readonly string[],
  bumpMetric?: () => void,
): Promise<void> {
  const fromPeerId = (socket as any).userId;
  const targetPeerId = await resolveRelayTargetPeerId(data.roomId, fromPeerId, data.targetPeerId);
  bumpMetric?.();
  const payload = {
    roomId: data.roomId,
    fromPeerId,
    offer: data.offer,
    answer: data.answer,
    candidate: data.candidate,
    sealed: data.sealed,
  };
  if (targetPeerId) {
    for (const evt of eventNames) {
      emitToCommsUser(io, targetPeerId, evt, payload);
    }
    return;
  }
  runtimeMetrics.webrtcRelayFallbackRoom += 1;
  for (const evt of eventNames) {
    socket.to(data.roomId).emit(evt, payload);
  }
}

function getSocketUser(socket: Socket): User | undefined {
  const key = (socket as any).presenceKey as string | undefined;
  if (key) return users.get(key);
  const uid = (socket as any).userId as string | undefined;
  return uid ? findUserByCommsId(uid) : undefined;
}

function buildMessageAckKey(senderId: string, clientMessageId?: string): string | null {
  if (!clientMessageId || !clientMessageId.trim()) return null;
  return `${senderId}::${clientMessageId.trim()}`;
}

function pruneRecentMessageAcks(): void {
  const now = Date.now();
  for (const [key, value] of recentMessageAcks.entries()) {
    if (now - value.storedAt > RECENT_ACK_TTL_MS) {
      recentMessageAcks.delete(key);
    }
  }
}

function classifyQos(sample: QosSample): "healthy" | "degraded" | "critical" {
  const rtt = Number(sample.rttMs || 0);
  const jitter = Number(sample.jitterMs || 0);
  const loss = Number(sample.packetLossRate || 0);
  if (rtt >= 900 || jitter >= 180 || loss >= 18) return "critical";
  if (rtt >= 450 || jitter >= 80 || loss >= 8) return "degraded";
  return "healthy";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRoomQosProfile(roomId: string) {
  return roomQosProfiles.get(roomId);
}

function updateRoomQosProfile(roomId: string, sample: QosSample, updatedAt: number): void {
  const alpha = 0.2;
  const rtt = Math.max(0, Number(sample.rttMs || 0));
  const jitter = Math.max(0, Number(sample.jitterMs || 0));
  const loss = Math.max(0, Number(sample.packetLossRate || 0));
  const bitrate = Math.max(0, Number(sample.bitrateKbps || 0));
  const current = roomQosProfiles.get(roomId);
  if (!current) {
    roomQosProfiles.set(roomId, {
      ewmaRtt: rtt,
      ewmaJitter: jitter,
      ewmaLoss: loss,
      ewmaBitrate: bitrate,
      sampleCount: 1,
      updatedAt,
    });
    return;
  }
  current.ewmaRtt = alpha * rtt + (1 - alpha) * current.ewmaRtt;
  current.ewmaJitter = alpha * jitter + (1 - alpha) * current.ewmaJitter;
  current.ewmaLoss = alpha * loss + (1 - alpha) * current.ewmaLoss;
  current.ewmaBitrate = alpha * bitrate + (1 - alpha) * current.ewmaBitrate;
  current.sampleCount += 1;
  current.updatedAt = updatedAt;
}

function classifyQosAdaptive(
  roomId: string,
  sample: QosSample,
): {
  qosClass: "healthy" | "degraded" | "critical";
  thresholds: {
    degradedRttMs: number;
    criticalRttMs: number;
    degradedJitterMs: number;
    criticalJitterMs: number;
    degradedLossPct: number;
    criticalLossPct: number;
  };
} {
  const profile = getRoomQosProfile(roomId);
  const rtt = Number(sample.rttMs || 0);
  const jitter = Number(sample.jitterMs || 0);
  const loss = Number(sample.packetLossRate || 0);

  if (!profile || profile.sampleCount < 6) {
    const qosClass = classifyQos(sample);
    return {
      qosClass,
      thresholds: {
        degradedRttMs: 450,
        criticalRttMs: 900,
        degradedJitterMs: 80,
        criticalJitterMs: 180,
        degradedLossPct: 8,
        criticalLossPct: 18,
      },
    };
  }

  const degradedRttMs = clamp(Math.max(450, profile.ewmaRtt * 1.6), 350, 1200);
  const criticalRttMs = clamp(Math.max(900, profile.ewmaRtt * 2.4), 650, 1800);
  const degradedJitterMs = clamp(Math.max(80, profile.ewmaJitter * 1.7), 60, 300);
  const criticalJitterMs = clamp(Math.max(180, profile.ewmaJitter * 2.6), 120, 600);
  const degradedLossPct = clamp(Math.max(8, profile.ewmaLoss * 1.8), 5, 25);
  const criticalLossPct = clamp(Math.max(18, profile.ewmaLoss * 2.8), 12, 40);

  if (rtt >= 1500 || jitter >= 350 || loss >= 35) {
    return {
      qosClass: "critical",
      thresholds: {
        degradedRttMs,
        criticalRttMs,
        degradedJitterMs,
        criticalJitterMs,
        degradedLossPct,
        criticalLossPct,
      },
    };
  }

  if (rtt >= criticalRttMs || jitter >= criticalJitterMs || loss >= criticalLossPct) {
    return {
      qosClass: "critical",
      thresholds: {
        degradedRttMs,
        criticalRttMs,
        degradedJitterMs,
        criticalJitterMs,
        degradedLossPct,
        criticalLossPct,
      },
    };
  }
  if (rtt >= degradedRttMs || jitter >= degradedJitterMs || loss >= degradedLossPct) {
    return {
      qosClass: "degraded",
      thresholds: {
        degradedRttMs,
        criticalRttMs,
        degradedJitterMs,
        criticalJitterMs,
        degradedLossPct,
        criticalLossPct,
      },
    };
  }
  return {
    qosClass: "healthy",
    thresholds: {
      degradedRttMs,
      criticalRttMs,
      degradedJitterMs,
      criticalJitterMs,
      degradedLossPct,
      criticalLossPct,
    },
  };
}

function shouldProcessCallTxn(userId: string, txnId?: string): boolean {
  if (!txnId || !txnId.trim()) return true;
  const key = `${userId}::${txnId.trim()}`;
  const now = Date.now();
  const existing = recentCallTransactions.get(key);
  if (existing && now - existing < CALL_TXN_TTL_MS) {
    return false;
  }
  recentCallTransactions.set(key, now);
  return true;
}

function pruneRecentCallTransactions(): void {
  const now = Date.now();
  for (const [key, ts] of recentCallTransactions.entries()) {
    if (now - ts > CALL_TXN_TTL_MS) {
      recentCallTransactions.delete(key);
    }
  }
}

function isFiniteInRange(value: unknown, min: number, max: number): boolean {
  if (value === undefined || value === null) return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

function isReasonableId(value: unknown, maxLen = 160): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > maxLen) return false;
  return !/[\u0000-\u001F\u007F]/.test(trimmed);
}

function allowSocketEventRate(
  socket: Socket,
  eventName: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bag = ((socket.data as any).__eventRateBag ||= new Map<
    string,
    number[]
  >()) as Map<string, number[]>;
  const list = bag.get(eventName) || [];
  const kept = list.filter((ts) => now - ts <= windowMs);
  if (kept.length >= limit) return false;
  kept.push(now);
  bag.set(eventName, kept);
  return true;
}

function recordRecoveryLatency(latencyMs?: number): void {
  const ms = Number(latencyMs);
  if (!Number.isFinite(ms) || ms < 0) return;
  runtimeMetrics.recoveryLatencySamples += 1;
  runtimeMetrics.recoveryLatencyTotalMs += ms;
  if (ms < 1000) runtimeMetrics.recoveryLatencyUnder1s += 1;
  else if (ms < 2000) runtimeMetrics.recoveryLatency1to2s += 1;
  else if (ms < 5000) runtimeMetrics.recoveryLatency2to5s += 1;
  else runtimeMetrics.recoveryLatencyOver5s += 1;
}

export function getCommsRuntimeMetrics() {
  const recoveryLatencyAvgMs =
    runtimeMetrics.recoveryLatencySamples > 0
      ? runtimeMetrics.recoveryLatencyTotalMs / runtimeMetrics.recoveryLatencySamples
      : 0;
  return {
    ...runtimeMetrics,
    recoveryLatencyAvgMs,
    qosTrackedPeers: qosByRoomAndUser.size,
    qosRoomProfilesTracked: roomQosProfiles.size,
    qosActionStateTracked: qosActionStateByRoomUser.size,
  };
}

function toCommsEnvelope(evt: { seq: number; type: string; payload: Record<string, unknown>; ts: number }) {
  return {
    version: "1.0",
    eventId: `evt_${evt.seq}_${evt.ts}`,
    seq: evt.seq,
    type: evt.type,
    payload: evt.payload,
    ts: evt.ts,
  };
}

async function emitUserEventByCommsId(
  io: SocketIOServer,
  commsUserId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const evt = await appendCommsUserEvent(commsUserId, eventType, payload);
  const envelope = toCommsEnvelope(evt);
  io.to(commsUserRoom(commsUserId)).emit(eventType, payload);
  io.to(commsUserRoom(commsUserId)).emit("comms:event", envelope);
  const fanoutOk = await publishCommsFanout(commsUserId, eventType, payload, envelope);
  if (fanoutOk) {
    runtimeMetrics.commsFanoutPublished += 1;
  }
}

async function savePendingCall(roomId: string, call: PendingCall): Promise<void> {
  pendingCalls.set(roomId, call);
  await setPendingCallState(roomId, toPendingCallState(call));
}

async function loadPendingCall(roomId: string): Promise<PendingCall | undefined> {
  const local = pendingCalls.get(roomId);
  if (local) return local;
  const distributed = fromPendingCallState(await getPendingCallState(roomId));
  if (distributed) {
    pendingCalls.set(roomId, distributed);
    return distributed;
  }
  return undefined;
}

async function clearPendingCall(roomId: string): Promise<void> {
  const timer = pendingCallTimeouts.get(roomId);
  if (timer) {
    clearTimeout(timer);
    pendingCallTimeouts.delete(roomId);
  }
  pendingCalls.delete(roomId);
  await deletePendingCallState(roomId);
}

function schedulePendingCallTimeout(
  io: SocketIOServer,
  roomId: string,
  callerId: string,
  targetId: string,
): void {
  const existing = pendingCallTimeouts.get(roomId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    const pending = await loadPendingCall(roomId);
    if (!pending) return;
    runtimeMetrics.pendingCallTimeouts += 1;
    runtimeMetrics.callSetupFailed += 1;
    await clearPendingCall(roomId);

    const caller = findUserByCommsId(callerId);
    if (caller) {
      caller.inCall = false;
      caller.currentRoomId = undefined;
      await emitUserEventByCommsId(io, callerId, "call-failed", {
        reason: "timeout-no-answer",
        roomId,
      });
    }
    await emitUserEventByCommsId(io, targetId, "call-missed", {
      roomId,
      callerId,
    });
    emitPresenceUpdate();
  }, PENDING_CALL_TIMEOUT_MS);
  if ((timer as any).unref) (timer as any).unref();
  pendingCallTimeouts.set(roomId, timer);
}

async function saveActiveCall(roomId: string, call: ActiveCall): Promise<void> {
  activeCalls.set(roomId, call);
  await setActiveCallState(roomId, toActiveCallState(call));
}

async function loadActiveCall(roomId: string): Promise<ActiveCall | undefined> {
  const local = activeCalls.get(roomId);
  if (local) return local;
  const distributed = await getActiveCallState(roomId);
  if (!distributed) return undefined;
  const restored: ActiveCall = {
    roomId: distributed.roomId,
    participants: distributed.participants,
    callType: distributed.callType,
    startedAt: new Date(distributed.startedAt),
    screenSharingBy: distributed.screenSharingBy,
    hostPeerId: distributed.hostPeerId,
    sfuMode: distributed.sfuMode,
  };
  activeCalls.set(roomId, restored);
  return restored;
}

async function clearActiveCall(roomId: string): Promise<void> {
  activeCalls.delete(roomId);
  await deleteActiveCallState(roomId);
}

function emitPresenceUpdate() {
  if (!ioInstance) return;
  // One row per comms user id (multi-device may register several sockets under the same account).
  const byCommsId = new Map<string, User>();
  for (const u of users.values()) {
    byCommsId.set(u.id, u);
  }
  const userList = Array.from(byCommsId.values()).map((u) => ({
    id: u.id,
    displayName: u.displayName,
    deviceId: u.deviceId,
    inCall: u.inCall,
    status: u.status || "online",
    profileImageUrl: u.profileImageUrl ?? null,
  }));
  ioInstance.emit("presence-update", { users: userList, total: userList.length });
}

/** After HTTP avatar upload: sync in-memory presence + broadcast. */
export function refreshCommsUserAvatar(userId: string, profileImageUrl: string | null) {
  for (const u of users.values()) {
    if (u.id === userId) u.profileImageUrl = profileImageUrl;
  }
  emitPresenceUpdate();
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function getSocketUsers(): User[] {
  return Array.from(users.values());
}

/** Comms user ids with at least one live `/cyrus-io` socket (any device). */
export function getLiveCommsUserIds(): Set<string> {
  return new Set(Array.from(users.values()).map((u) => u.id));
}

export function getActiveCalls(): ActiveCall[] {
  return Array.from(activeCalls.values());
}

export function getGroupRooms(): GroupRoom[] {
  return Array.from(groupRooms.values());
}

/**
 * Emit a FORCE_LOGOUT event to every active Socket.IO connection belonging to
 * the given userId, then disconnect those sockets.  Called by the
 * /api/logout-all endpoint so all devices are kicked in real-time.
 */
export function broadcastForceLogout(userId: string): void {
  if (!ioInstance) return;
  for (const [, user] of users) {
    if (user.id === userId) {
      const socket = ioInstance.sockets.sockets.get(user.socketId);
      if (socket) {
        socket.emit("force-logout", {
          type: "FORCE_LOGOUT",
          message: "Logged out from all devices",
        });
        socket.disconnect(true);
      }
    }
  }
}

export function initSocketSignaling(server: HttpServer) {
  const allowWebSocket = process.env.CYRUS_COMM_SOCKET_WS !== "false";
  const io = new SocketIOServer(server, {
    cors: {
      origin: createCyrusCorsOriginAccess(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/cyrus-io",
    transports: allowWebSocket ? ["websocket", "polling"] : ["polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 60000,
    maxHttpBufferSize: 1e6,
    allowUpgrades: allowWebSocket,
  });

  ioInstance = io;

  void initCommsFanout(`socksig_${process.pid}`, (message) => {
    runtimeMetrics.commsFanoutReceived += 1;
    const targetCount = findUsersByCommsId(message.userId).length;
    if (!targetCount) return;
    io.to(commsUserRoom(message.userId)).emit(message.eventType, message.payload);
    if (message.commsEvent) {
      io.to(commsUserRoom(message.userId)).emit("comms:event", message.commsEvent);
    }
    runtimeMetrics.commsFanoutDelivered += targetCount;
  });

  registerSfuSocketHandlers(io);

  console.log("[Socket.IO] Signaling server initialized");

  const ensurePresenceSchema = async () => {
    try {
      // Create online_users table if it doesn't exist yet (some deployments may not have run migrations)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS online_users (
          id varchar PRIMARY KEY,
          display_name varchar,
          email varchar,
          profile_image_url varchar,
          last_seen timestamp DEFAULT now(),
          is_online boolean DEFAULT true,
          socket_id varchar,
          status varchar(32) DEFAULT 'online',
          current_call_id varchar,
          current_conference_id varchar,
          device_info jsonb,
          network_latency_ms varchar DEFAULT '0',
          connection_quality varchar DEFAULT '1.0'
        )
      `);
      // Some deployments created online_users without status; self-heal before presence updates.
      await db.execute(sql`ALTER TABLE online_users ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'online'`);
      await db.execute(sql`
        UPDATE online_users
        SET status = CASE WHEN is_online THEN 'online' ELSE 'offline' END
        WHERE status IS NULL
      `);
      await db.execute(
        sql`ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS file_mime_type varchar(128)`
      );
    } catch (err) {
      console.error("[Socket.IO] Failed to ensure presence schema:", err);
    }

    // Ensure calls and call_logs tables exist (created via raw DDL so the
    // server is self-healing even without a migration runner).
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS calls (
          id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          caller_id   varchar NOT NULL,
          caller_name varchar,
          recipient_id varchar NOT NULL,
          recipient_name varchar,
          room_id     varchar NOT NULL,
          call_type   varchar NOT NULL DEFAULT 'audio',
          status      varchar NOT NULL DEFAULT 'ringing',
          start_time  timestamp DEFAULT now(),
          end_time    timestamp,
          duration_seconds integer,
          peak_quality varchar,
          network_type varchar,
          created_at  timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS call_logs (
          id         varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id    varchar NOT NULL,
          user_id    varchar NOT NULL,
          event      varchar NOT NULL,
          metadata   jsonb DEFAULT '{}',
          created_at timestamp NOT NULL DEFAULT now()
        )
      `);
      console.log("[Socket.IO] calls / call_logs tables ensured");
    } catch (err) {
      console.error("[Socket.IO] Failed to ensure calls schema:", err);
    }
  };

  (async () => {
    await ensurePresenceSchema();
    try {
      await db.update(onlineUsers)
        .set({ isOnline: false, status: "offline" })
        .where(eq(onlineUsers.isOnline, true));
      console.log("[Socket.IO] Cleared stale online statuses on startup");
    } catch (err) {
      console.error("[Socket.IO] Failed to clear stale statuses:", err);
    }
  })();

  setInterval(async () => {
    try {
      const connectedCommsIds = getLiveCommsUserIds();
      const allOnline = await db.select().from(onlineUsers).where(eq(onlineUsers.isOnline, true));
      for (const record of allOnline) {
        if (record.id !== "cyrus-001" && !connectedCommsIds.has(record.id)) {
          await db
            .update(onlineUsers)
            .set({ isOnline: false, status: "offline" })
            .where(eq(onlineUsers.id, record.id));
        }
      }
    } catch {
      /* non-fatal */
    }
  }, 60000);

  setInterval(() => {
    const now = Date.now();
    for (const [key, sample] of qosByRoomAndUser.entries()) {
      if (now - sample.updatedAt > 5 * 60 * 1000) {
        qosByRoomAndUser.delete(key);
      }
    }
    for (const [key, ts] of qosLastSampleAt.entries()) {
      if (now - ts > 5 * 60 * 1000) {
        qosLastSampleAt.delete(key);
      }
    }
    for (const [roomId, profile] of roomQosProfiles.entries()) {
      if (now - profile.updatedAt > 15 * 60 * 1000) {
        roomQosProfiles.delete(roomId);
      }
    }
    for (const [key, state] of qosActionStateByRoomUser.entries()) {
      if (now - state.updatedAt > 10 * 60 * 1000) {
        qosActionStateByRoomUser.delete(key);
      }
    }
    pruneRecentCallTransactions();
  }, 60_000);

  setInterval(async () => {
    try {
      const now = Date.now();
      const liveCommsIds = getLiveCommsUserIds();
      const distributedCalls = await listActiveCallStates();
      for (const call of distributedCalls) {
        const participants = Array.from(new Set((call.participants || []).filter(Boolean)));
        const onlineParticipants = participants.filter((id) => liveCommsIds.has(id));
        const startedAtMs = Number(new Date(call.startedAt).getTime()) || 0;
        const ageMs = startedAtMs > 0 ? now - startedAtMs : 0;

        if (onlineParticipants.length === 0) {
          if (ageMs >= ACTIVE_CALL_EMPTY_GRACE_MS) {
            await clearActiveCall(call.roomId);
            runtimeMetrics.activeCallDriftPruned += 1;
          }
          continue;
        }

        if (onlineParticipants.length !== participants.length) {
          const reconciled: ActiveCall = {
            roomId: call.roomId,
            participants: onlineParticipants,
            callType: call.callType,
            startedAt: startedAtMs > 0 ? new Date(startedAtMs) : new Date(),
            screenSharingBy:
              call.screenSharingBy && onlineParticipants.includes(call.screenSharingBy)
                ? call.screenSharingBy
                : undefined,
            hostPeerId: onlineParticipants.includes(call.hostPeerId)
              ? call.hostPeerId
              : onlineParticipants[0],
            sfuMode: call.sfuMode,
          };
          await saveActiveCall(call.roomId, reconciled);
          runtimeMetrics.activeCallDriftReconciles += 1;
        }
      }
    } catch {
      /* non-fatal */
    }
  }, ACTIVE_CALL_RECONCILE_INTERVAL_MS);

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    socket.use((packet, next) => {
      const payload = packet?.[1];
      if (payload && typeof payload === "object" && typeof (payload as any).clientSeq === "number") {
        const nextSeq = Number((payload as any).clientSeq);
        const lastSeq = Number((socket.data as any).lastClientSeq || 0);
        if (Number.isFinite(nextSeq) && nextSeq > lastSeq) {
          (socket.data as any).lastClientSeq = nextSeq;
        } else if (Number.isFinite(nextSeq) && nextSeq <= lastSeq) {
          return;
        }
      }
      next();
    });

    socket.on("register", async (data: {
      userId: string;
      displayName: string;
      deviceId: string;
      profileImageUrl?: string | null;
      resumeFromSeq?: number;
    }) => {
      const { displayName, deviceId } = data;
      const commsUserId = data.userId || deviceId;
      const mapKey = presenceMapKey(commsUserId, deviceId);

      let dbAvatar: string | null | undefined;
      try {
        const [existing] = await db.select({ profileImageUrl: onlineUsers.profileImageUrl }).from(onlineUsers).where(eq(onlineUsers.id, commsUserId)).limit(1);
        dbAvatar = existing?.profileImageUrl ?? null;
      } catch { /* table missing etc. */ }

      const profileImageUrl = (data.profileImageUrl ?? dbAvatar) || null;

      const user: User = {
        id: commsUserId,
        socketId: socket.id,
        displayName,
        deviceId,
        inCall: false,
        status: "online",
        profileImageUrl,
      };

      users.set(mapKey, user);
      (socket as any).userId = commsUserId;
      (socket as any).presenceKey = mapKey;
      socket.join(commsUserRoom(commsUserId));
      const knownDevices = knownDeviceIdsByUser.get(commsUserId) || new Set<string>();
      knownDevices.add(deviceId);
      knownDeviceIdsByUser.set(commsUserId, knownDevices);

      console.log(`[Socket.IO] User registered: ${displayName} (${commsUserId} @ ${deviceId}) - Total: ${users.size}`);

      const disconnectedAt = userLastDisconnectAt.get(commsUserId);
      if (typeof disconnectedAt === "number" && disconnectedAt > 0) {
        const delta = Date.now() - disconnectedAt;
        if (delta < 2000) runtimeMetrics.reconnectUnder2s += 1;
        else if (delta < 5000) runtimeMetrics.reconnect2to5s += 1;
        else if (delta < 10000) runtimeMetrics.reconnect5to10s += 1;
        else runtimeMetrics.reconnectOver10s += 1;
        userLastDisconnectAt.delete(commsUserId);
      }

      try {
        await db.insert(onlineUsers).values({
          id: commsUserId,
          displayName,
          email: null,
          profileImageUrl: profileImageUrl || null,
          lastSeen: new Date(),
          isOnline: true,
          socketId: socket.id,
          status: "online",
        }).onConflictDoUpdate({
          target: onlineUsers.id,
          set: {
            displayName,
            lastSeen: new Date(),
            isOnline: true,
            socketId: socket.id,
            status: "online",
          },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist user:", err);
      }

      socket.emit("registered", { userId: commsUserId, totalOnline: users.size });

      const deliveredMessageIds = new Set<string>();
      let delivered = flushPendingForUser(mapKey, (payload) => {
        if (payload?.id && deliveredMessageIds.has(payload.id)) return;
        if (payload?.id) deliveredMessageIds.add(payload.id);
        socket.emit("new-message", payload);
      });
      delivered += flushPendingForUser(commsUserId, (payload) => {
        if (payload?.id && deliveredMessageIds.has(payload.id)) return;
        if (payload?.id) deliveredMessageIds.add(payload.id);
        socket.emit("new-message", payload);
      });
      if (delivered > 0) {
        console.log(`[Socket.IO] Delivered ${delivered} pending message(s) to ${displayName}`);
      }

      const resumeFromSeq =
        typeof data.resumeFromSeq === "number" && Number.isFinite(data.resumeFromSeq)
          ? Math.max(0, data.resumeFromSeq)
          : 0;
      if (resumeFromSeq > 0) {
        const replay = await readCommsUserEventsSince(commsUserId, resumeFromSeq, 200);
        if (replay.length > 0) {
          socket.emit("session-events-replay", { events: replay });
        }
      }

      let rehydrateCall = await getActiveCallStateForUser(commsUserId);
      if (!rehydrateCall) {
        const distributedActive = await listActiveCallStates();
        rehydrateCall = distributedActive.find((c) => c.participants.includes(commsUserId)) || null;
      }
      if (rehydrateCall) {
        const peerId = rehydrateCall.participants.find((id) => id !== commsUserId) || null;
        const peer = peerId ? findUserByCommsId(peerId) : undefined;
        runtimeMetrics.sessionRehydrates += 1;
        socket.emit("call-state-rehydrate", {
          roomId: rehydrateCall.roomId,
          callType: rehydrateCall.callType,
          participants: rehydrateCall.participants,
          peerId,
          peerName: peer?.displayName || "Participant",
          isInitiator: rehydrateCall.hostPeerId === commsUserId,
          needsMediaRecovery: true,
        });
      }

      emitPresenceUpdate();
    });

    socket.on("session-resync", async (data: { sinceSeq?: number }) => {
      if (!allowSocketEventRate(socket, "session-resync", 10, 60_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      const userId = (socket as any).userId as string | undefined;
      if (!userId) return;
      const sinceSeq =
        typeof data?.sinceSeq === "number" && Number.isFinite(data.sinceSeq)
          ? Math.max(0, data.sinceSeq)
          : 0;
      const replay = await readCommsUserEventsSince(userId, sinceSeq, 200);
      socket.emit("session-events-replay", { events: replay });
    });

    socket.on("call-user", async (data: { targetUserId: string; callType: "audio" | "video"; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "call-user", 8, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.targetUserId) || (data.callType !== "audio" && data.callType !== "video")) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const callerId = (socket as any).userId;
      if (!shouldProcessCallTxn(callerId, data.callTxnId)) return;
      const caller = getSocketUser(socket) || findUserByCommsId(callerId);
      runtimeMetrics.callSetupStarted += 1;

      if (!caller) {
        socket.emit("call-failed", { reason: "not-registered" });
        return;
      }

      const target = findUserByCommsId(data.targetUserId);

      if (!target) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call-failed", { reason: "user-offline" });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const pendingCall: PendingCall = {
        callerId,
        callerName: caller.displayName,
        targetId: data.targetUserId,
        roomId,
        callType: data.callType,
        timestamp: new Date(),
      };

      await savePendingCall(roomId, pendingCall);
      schedulePendingCallTimeout(io, roomId, callerId, data.targetUserId);
      caller.inCall = true;
      caller.currentRoomId = roomId;
      socket.join(roomId);

      console.log(`[Socket.IO] Call: ${caller.displayName} -> ${target.displayName} (${data.callType}) Room: ${roomId}`);

      await emitUserEventByCommsId(io, data.targetUserId, "incoming-call", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });

      const ringingEvt = await appendCommsUserEvent(callerId, "call-ringing", {
        roomId,
        targetName: target.displayName,
        callType: data.callType,
      });
      socket.emit("call-ringing", { roomId, targetName: target.displayName, callType: data.callType });
      socket.emit("comms:event", toCommsEnvelope(ringingEvt));

      emitPresenceUpdate();
    });

    socket.on("accept-call", async (data: { roomId: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "accept-call", 12, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId;
      if (!shouldProcessCallTxn(userId, data.callTxnId)) return;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const pendingCall = await loadPendingCall(data.roomId);

      if (!pendingCall || !user) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call-failed", { reason: "call-not-found" });
        return;
      }

      const caller = findUserByCommsId(pendingCall.callerId);

      if (!caller) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call-failed", { reason: "caller-disconnected" });
        await clearPendingCall(data.roomId);
        return;
      }

      user.inCall = true;
      user.currentRoomId = data.roomId;

      // Join every device socket for both participants so room-based fallbacks
      // cannot miss a peer when users have multiple active devices.
      await io.in(commsUserRoom(pendingCall.callerId)).socketsJoin(data.roomId);
      await io.in(commsUserRoom(userId)).socketsJoin(data.roomId);
      socket.join(data.roomId);

      const activeCall: ActiveCall = {
        roomId: data.roomId,
        participants: [pendingCall.callerId, userId],
        callType: pendingCall.callType,
        startedAt: new Date(),
        hostPeerId: pendingCall.callerId,
        sfuMode: "p2p",
      };
      await saveActiveCall(data.roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: data.roomId,
          type: "p2p",
          participants: [
            { userId: pendingCall.callerId, displayName: caller.displayName, joinedAt: new Date().toISOString() },
            { userId, displayName: user.displayName, joinedAt: new Date().toISOString() },
          ],
          mediaConfig: { audio: true, video: pendingCall.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist call session:", err);
      }

      console.log(`[Socket.IO] Call accepted: ${caller.displayName} <-> ${user.displayName} (room: ${data.roomId})`);

      // WebRTC handshake watchdog: if neither peer emits a successful ICE
      // diagnostic within 30 seconds, log a warning so operators can
      // investigate TURN server availability for this region/network.
      const HANDSHAKE_WATCHDOG_MS = 30_000;
      const handshakeWatchdog = setTimeout(() => {
        const call = activeCalls.get(data.roomId);
        if (call && call.participants.length >= 2) {
          console.warn(
            `[Socket.IO] WebRTC handshake watchdog: room ${data.roomId} still active after ` +
            `${HANDSHAKE_WATCHDOG_MS / 1000}s – participants may be experiencing ICE issues. ` +
            "Check TURN server reachability for involved clients."
          );
        }
      }, HANDSHAKE_WATCHDOG_MS);
      // Ensure the timer doesn't prevent process exit
      if (handshakeWatchdog.unref) handshakeWatchdog.unref();

      const callType = pendingCall.callType;
      runtimeMetrics.callSetupSucceeded += 1;

      await emitUserEventByCommsId(io, pendingCall.callerId, "call-accepted", {
        roomId: data.roomId,
        peerName: user.displayName,
        peerId: userId,
        callType,
      });

      const connectedEvt = await appendCommsUserEvent(userId, "call-connected", {
        roomId: data.roomId,
        peerName: caller.displayName,
        peerId: caller.id,
        isInitiator: false,
        callType,
      });
      socket.emit("call-connected", {
        roomId: data.roomId,
        peerName: caller.displayName,
        peerId: caller.id,
        isInitiator: false,
        callType,
      });
      socket.emit("comms:event", toCommsEnvelope(connectedEvt));

      try {
        commsIntelligence.trackInteraction(userId, 'call_started', pendingCall.callerId, { callType, roomId: data.roomId });
        commsIntelligence.trackInteraction(pendingCall.callerId, 'call_started', userId, { callType, roomId: data.roomId });
      } catch (_) { }

      await clearPendingCall(data.roomId);
      emitPresenceUpdate();
    });

    socket.on("decline-call", async (data: { roomId: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "decline-call", 12, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId as string | undefined;
      if (userId && !shouldProcessCallTxn(userId, data.callTxnId)) return;
      const pendingCall = await loadPendingCall(data.roomId);

      if (pendingCall) {
        const caller = findUserByCommsId(pendingCall.callerId);

        if (caller) {
          caller.inCall = false;
          caller.currentRoomId = undefined;
          await emitUserEventByCommsId(io, pendingCall.callerId, "call-declined", { roomId: data.roomId });
        }

        await clearPendingCall(data.roomId);
        emitPresenceUpdate();
      }
    });

    // ── WebRTC signaling relay ──────────────────────────────────────────────
    // All webrtc-* events are pure relay: the server forwards them to the
    // correct peer without inspecting the SDP/ICE payload.  This keeps the
    // signaling server media-agnostic and allows the client to handle all
    // ICE negotiation logic (restart, timeout, fallback) independently.

    socket.on("webrtc-offer", async (data: { roomId: string; offer?: any; targetPeerId?: string; sealed?: unknown }) => {
      console.log(`[Socket.IO] WebRTC offer relay: ${(socket as any).userId} → ${data.targetPeerId || data.roomId}`);
      await relayWebRtcPayload(io, socket, data, ["webrtc-offer"], () => {
        runtimeMetrics.webrtcRelayOffer += 1;
      });
    });

    socket.on("webrtc-answer", async (data: { roomId: string; answer?: any; targetPeerId?: string; sealed?: unknown }) => {
      console.log(`[Socket.IO] WebRTC answer relay: ${(socket as any).userId} → ${data.targetPeerId || data.roomId}`);
      await relayWebRtcPayload(io, socket, data, ["webrtc-answer"], () => {
        runtimeMetrics.webrtcRelayAnswer += 1;
      });
    });

    socket.on("webrtc-ice-candidate", async (data: { roomId: string; candidate?: any; targetPeerId?: string; sealed?: unknown }) => {
      await relayWebRtcPayload(io, socket, data, ["webrtc-ice-candidate"], () => {
        runtimeMetrics.webrtcRelayIce += 1;
      });
    });

    const relayCryptoHandshake = async (
      data: { roomId: string; targetPeerId?: string; handshake?: unknown },
      eventNames: readonly string[],
    ) => {
      const fromPeerId = (socket as any).userId;
      const targetPeerId = await resolveRelayTargetPeerId(data.roomId, fromPeerId, data.targetPeerId);
      const payload = { roomId: data.roomId, fromPeerId, handshake: data.handshake, targetPeerId: data.targetPeerId };
      if (targetPeerId) {
        for (const evt of eventNames) {
          emitToCommsUser(io, targetPeerId, evt, payload);
        }
        return;
      }
      runtimeMetrics.webrtcRelayFallbackRoom += 1;
      for (const evt of eventNames) {
        socket.to(data.roomId).emit(evt, payload);
      }
    };

    socket.on("webrtc-crypto-handshake", async (data: { roomId: string; targetPeerId?: string; handshake?: unknown }) => {
      await relayCryptoHandshake(data, ["webrtc-crypto-handshake", "webrtc:crypto-handshake"]);
    });

    socket.on("webrtc:crypto-handshake", async (data: { roomId: string; targetPeerId?: string; handshake?: unknown }) => {
      await relayCryptoHandshake(data, ["webrtc-crypto-handshake", "webrtc:crypto-handshake"]);
    });

    // ── ICE restart relay ───────────────────────────────────────────────────
    // When a client detects ICE failure it sends an ice-restart offer.
    // The server relays it to the peer so the non-initiator can respond
    // with a new answer, re-establishing the media path without hanging up.
    socket.on("webrtc-ice-restart", async (data: { roomId: string; offer: any; targetPeerId?: string }) => {
      const fromPeerId = (socket as any).userId;
      const targetPeerId = await resolveRelayTargetPeerId(data.roomId, fromPeerId, data.targetPeerId);
      runtimeMetrics.webrtcRelayIceRestart += 1;
      console.log(`[Socket.IO] ICE restart relay: ${fromPeerId} → ${targetPeerId || data.roomId}`);

      if (targetPeerId) {
        emitToCommsUser(io, targetPeerId, "webrtc-ice-restart", {
          offer: data.offer,
          roomId: data.roomId,
          fromPeerId,
        });
      } else {
        runtimeMetrics.webrtcRelayFallbackRoom += 1;
        socket.to(data.roomId).emit("webrtc-ice-restart", { offer: data.offer, roomId: data.roomId, fromPeerId });
      }
    });

    // ── ICE diagnostic events ───────────────────────────────────────────────
    // Clients emit ice-diagnostic when gathering times out or ICE fails.
    // The server logs these for operator visibility without blocking the call.
    socket.on("ice-diagnostic", (data: {
      event: string;
      roomId?: string;
      timeoutMs?: number;
      iceGatheringState?: string;
      iceConnectionState?: string;
      connectionState?: string;
      restartAttempt?: number;
    }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      console.warn(
        `[Socket.IO] ICE diagnostic from ${user?.displayName || userId}: ` +
        `event=${data.event} iceGathering=${data.iceGatheringState} ` +
        `iceConnection=${data.iceConnectionState} connection=${data.connectionState} ` +
        `room=${data.roomId || "n/a"} restartAttempt=${data.restartAttempt ?? 0}`
      );
    });

    socket.on("comms-telemetry", async (data: {
      eventType?: string;
      outcome?: "attempt" | "success" | "failed";
      roomId?: string;
      latencyMs?: number;
      reason?: string;
    }) => {
      const userId = (socket as any).userId as string | undefined;
      if (!userId || !data?.eventType) return;
      const eventType = String(data.eventType);
      const outcome = data.outcome || "attempt";

      if (eventType === "ice_restart") {
        if (outcome === "attempt") runtimeMetrics.iceRestartAttempts += 1;
        if (outcome === "success") {
          runtimeMetrics.iceRestartSucceeded += 1;
          recordRecoveryLatency(data.latencyMs);
        }
        if (outcome === "failed") runtimeMetrics.iceRestartFailed += 1;
      } else if (eventType === "relay_restart") {
        if (outcome === "attempt") runtimeMetrics.relayRestartAttempts += 1;
        if (outcome === "success") {
          runtimeMetrics.relayRestartSucceeded += 1;
          recordRecoveryLatency(data.latencyMs);
        }
        if (outcome === "failed") runtimeMetrics.relayRestartFailed += 1;
      } else if (eventType === "recovery_latency") {
        recordRecoveryLatency(data.latencyMs);
      }

      await appendCommsUserEvent(userId, "comms-telemetry", {
        eventType,
        outcome,
        roomId: data.roomId,
        latencyMs: data.latencyMs,
        reason: data.reason,
      });
    });

    socket.on("comms-chaos", async (data: { mode?: string; roomId?: string; targetUserId?: string }) => {
      if (!COMMS_CHAOS_ENABLED) return;
      const userId = (socket as any).userId as string | undefined;
      if (!userId || !data?.mode) return;

      runtimeMetrics.chaosInjections += 1;
      const mode = String(data.mode);
      const roomId = data.roomId;

      if (mode === "force_qos_critical" && roomId) {
        socket.emit("qos-action", {
          roomId,
          action: "force_relay_restart",
          reason: "chaos_force_qos_critical",
        });
        return;
      }

      if (mode === "force_relay_restart" && roomId) {
        socket.emit("qos-action", {
          roomId,
          action: "force_relay_restart",
          reason: "chaos_force_relay_restart",
        });
        return;
      }

      if (mode === "force_call_drop" && roomId) {
        await clearActiveCall(roomId);
        io.to(roomId).emit("call-ended", {
          roomId,
          userId: "chaos-engine",
          reason: "chaos_force_call_drop",
        });
      }
    });

    socket.on("qos-sample", async (data: QosSample) => {
      const userId = (socket as any).userId as string | undefined;
      if (!userId || !data?.roomId) return;
      if (!isReasonableId(data.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }

      const qosKey = `${data.roomId}::${userId}`;
      const now = Date.now();
      const lastAt = qosLastSampleAt.get(qosKey) || 0;
      if (now - lastAt < QOS_SAMPLE_MIN_INTERVAL_MS) {
        runtimeMetrics.qosSamplesRateLimited += 1;
        return;
      }
      qosLastSampleAt.set(qosKey, now);

      if (
        !isFiniteInRange(data.rttMs, 0, 60_000) ||
        !isFiniteInRange(data.jitterMs, 0, 5_000) ||
        !isFiniteInRange(data.packetLossRate, 0, 100) ||
        !isFiniteInRange(data.bitrateKbps, 0, 200_000)
      ) {
        runtimeMetrics.qosSamplesRejectedInvalid += 1;
        return;
      }

      runtimeMetrics.qosSamplesReceived += 1;

      const sample = {
        ...data,
        userId,
        updatedAt: now,
      };
      qosByRoomAndUser.set(qosKey, sample);

      const adaptive = classifyQosAdaptive(data.roomId, sample);
      const qosClass = adaptive.qosClass;
      updateRoomQosProfile(data.roomId, sample, now);
      const actionStateKey = `${data.roomId}::${userId}`;
      const actionState =
        qosActionStateByRoomUser.get(actionStateKey) || {
          degradedStreak: 0,
          criticalStreak: 0,
          updatedAt: now,
        };
      actionState.updatedAt = now;
      if (qosClass === "healthy") {
        actionState.degradedStreak = 0;
        actionState.criticalStreak = 0;
      } else if (qosClass === "critical") {
        actionState.criticalStreak += 1;
        actionState.degradedStreak = 0;
      } else {
        actionState.degradedStreak += 1;
        actionState.criticalStreak = 0;
      }
      qosActionStateByRoomUser.set(actionStateKey, actionState);
      if (qosClass === "degraded") runtimeMetrics.degradedSamples += 1;
      if (qosClass === "critical") runtimeMetrics.criticalSamples += 1;
      if (qosClass === "degraded") runtimeMetrics.qosAdaptiveDegradedSamples += 1;
      if (qosClass === "critical") runtimeMetrics.qosAdaptiveCriticalSamples += 1;
      if (qosClass === "healthy") return;

      if (
        qosClass === "degraded" &&
        actionState.degradedStreak < QOS_HYSTERESIS_DEGRADED_STREAK
      ) {
        runtimeMetrics.qosActionsSuppressedHysteresis += 1;
        return;
      }

      const action: "reduce_video" | "force_relay_restart" =
        qosClass === "critical" ? "force_relay_restart" : "reduce_video";
      const actionPayload = {
        roomId: data.roomId,
        action,
        reason:
          qosClass === "critical"
            ? "critical_network_degradation_adaptive"
            : "degraded_network_conditions_adaptive",
        policy: adaptive.thresholds,
      };
      const cooldownMs = QOS_ACTION_COOLDOWN_MS[action];
      if (
        actionState.lastAction === actionPayload.action &&
        actionState.lastActionAt &&
        now - actionState.lastActionAt < cooldownMs
      ) {
        runtimeMetrics.qosActionsSuppressedCooldown += 1;
        return;
      }
      actionState.lastAction = action;
      actionState.lastActionAt = now;
      qosActionStateByRoomUser.set(actionStateKey, actionState);
      runtimeMetrics.qosActionsIssued += 1;
      const evt = await appendCommsUserEvent(userId, "qos-action", actionPayload);
      socket.emit("qos-action", actionPayload);
      socket.emit("comms:event", toCommsEnvelope(evt));
    });

    socket.on("end-call", async (data: { roomId: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "end-call", 20, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId;
      if (!shouldProcessCallTxn(userId, data.callTxnId)) return;
      const user = getSocketUser(socket) || findUserByCommsId(userId);

      if (user) {
        user.inCall = false;
        user.currentRoomId = undefined;
      }

      const activeCall = await loadActiveCall(data.roomId);
      if (activeCall) {
        activeCall.participants = activeCall.participants.filter(p => p !== userId);
        if (activeCall.participants.length === 0) {
          await clearActiveCall(data.roomId);
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
          try {
            await db.update(callSessions)
              .set({ endTime: now, durationSeconds })
              .where(eq(callSessions.callId, data.roomId));
          } catch (err) {
            console.error("[Socket.IO] Failed to update call session end:", err);
          }
        } else if (activeCall.participants.length >= 1) {
          await saveActiveCall(data.roomId, activeCall);
          socket.to(data.roomId).emit("peer-left", { roomId: data.roomId, peerId: userId });
        }
        if (activeCall.screenSharingBy === userId) {
          activeCall.screenSharingBy = undefined;
          io.to(data.roomId).emit("screen-share-stopped", { userId });
        }
      }

      try {
        sfuLeaveRoom(data.roomId, userId, socket.id);
      } catch {
        /* optional SFU */
      }

      const roomEmpty = !activeCall || activeCall.participants.length === 0;
      if (roomEmpty) {
        socket.to(data.roomId).emit("call-ended", { roomId: data.roomId, userId });
        if (activeCall?.participants?.length) {
          for (const participantId of activeCall.participants) {
            await appendCommsUserEvent(participantId, "call-ended", {
              roomId: data.roomId,
              userId,
            });
          }
        }
      }
      socket.leave(data.roomId);

      try {
        const duration = activeCall ? Math.floor((Date.now() - activeCall.startedAt.getTime()) / 1000) : 0;
        commsIntelligence.trackInteraction(userId, 'call_ended', undefined, { duration, roomId: data.roomId });
      } catch (_) { }

      emitPresenceUpdate();
    });

    socket.on("send-message", async (data: EnhancedMessage) => {
      const senderId = (socket as any).userId;
      const sender = getSocketUser(socket) || findUserByCommsId(senderId);

      if (!sender) return;

      const messageType = (data.messageType || "text") as MessageType;
      const ackKey = buildMessageAckKey(senderId, data.clientMessageId);
      pruneRecentMessageAcks();
      if (ackKey) {
        if (processingMessageAcks.has(ackKey)) {
          return;
        }
        const cachedAck = recentMessageAcks.get(ackKey);
        if (cachedAck) {
          const ackEvt = await appendCommsUserEvent(senderId, "message-sent", cachedAck);
          socket.emit("message-sent", cachedAck);
          socket.emit("comms:event", toCommsEnvelope(ackEvt));
          return;
        }
        processingMessageAcks.add(ackKey);
      }

      try {
        const outgoingPayload = await persistChatMessage({
          senderId,
          senderName: sender.displayName,
          data: {
            targetUserId: data.targetUserId,
            groupId: data.groupId,
            message: data.message,
            messageType,
            timestamp: data.timestamp,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileMimeType: data.fileMimeType,
            fileSizeBytes: data.fileSizeBytes,
            voiceDurationSeconds: data.voiceDurationSeconds,
            latitude: data.latitude,
            longitude: data.longitude,
            replyToId: data.replyToId,
          },
        });

        if (data.groupId) {
          const room = groupRooms.get(data.groupId);
          if (room) {
            socket.to(`group_${data.groupId}`).emit("new-message", outgoingPayload);
          }
        } else if (data.targetUserId) {
          const targets = findUsersByCommsId(data.targetUserId);
          if (targets.length > 0) {
            await emitUserEventByCommsId(io, data.targetUserId, "new-message", outgoingPayload as Record<string, unknown>);
          } else {
            const knownDevices = knownDeviceIdsByUser.get(data.targetUserId);
            if (knownDevices && knownDevices.size > 0) {
              for (const deviceId of knownDevices) {
                queueForOfflineRecipient(presenceMapKey(data.targetUserId, deviceId), outgoingPayload);
              }
            }
            queueForOfflineRecipient(data.targetUserId, outgoingPayload);
          }
        }

        const messageSentPayload = {
          id: outgoingPayload.id,
          recipientId: data.targetUserId,
          groupId: data.groupId,
          message: data.message,
          messageType,
          timestamp: data.timestamp,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMimeType: data.fileMimeType,
          fileSizeBytes: data.fileSizeBytes,
          voiceDurationSeconds: data.voiceDurationSeconds,
          latitude: data.latitude,
          longitude: data.longitude,
          clientMessageId: data.clientMessageId,
        };
        const sentEvt = await appendCommsUserEvent(senderId, "message-sent", messageSentPayload);
        socket.emit("message-sent", messageSentPayload);
        socket.emit("comms:event", toCommsEnvelope(sentEvt));
        runtimeMetrics.messageSentEvents += 1;
        if (ackKey) {
          recentMessageAcks.set(ackKey, {
            id: outgoingPayload.id,
            recipientId: data.targetUserId,
            groupId: data.groupId,
            message: data.message,
            messageType,
            timestamp: data.timestamp,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileMimeType: data.fileMimeType,
            fileSizeBytes: data.fileSizeBytes,
            voiceDurationSeconds: data.voiceDurationSeconds,
            latitude: data.latitude,
            longitude: data.longitude,
            clientMessageId: data.clientMessageId,
            storedAt: Date.now(),
          });
        }

        try {
          commsIntelligence.trackInteraction(senderId, 'message_sent', data.targetUserId || undefined, {
            content: data.message,
            contentLength: data.message?.length || 0,
            channelType: data.groupId ? 'group' : 'direct',
            messageType,
            groupId: data.groupId,
          });
          if (data.groupId && data.message) {
            gwaEngine.recordGroupMessage(data.groupId, senderId, data.message, messageType);
          }
        } catch (_) { }
      } finally {
        if (ackKey) {
          processingMessageAcks.delete(ackKey);
        }
      }
    });

    socket.on(
      "message-delivered",
      async (data: { messageId?: string; senderId?: string; recipientId?: string }) => {
        if (!allowSocketEventRate(socket, "message-delivered", 90, 15_000)) {
          runtimeMetrics.signalingEventRateLimited += 1;
          return;
        }
        const recipientId = (socket as any).userId as string | undefined;
        if (!recipientId || !isReasonableId(data?.messageId) || !isReasonableId(data?.senderId)) {
          runtimeMetrics.signalingInvalidPayloadRejected += 1;
          return;
        }
        runtimeMetrics.messageDeliveryAcksReceived += 1;
        const payload = {
          messageId: data.messageId!,
          senderId: data.senderId!,
          recipientId,
          deliveredAt: new Date().toISOString(),
        };
        await emitUserEventByCommsId(io, data.senderId!, "message-delivered", payload);
        runtimeMetrics.messageDeliveryAcksSent += 1;
      },
    );

    socket.on("create-group", async (data: { name: string; members: string[] }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const allMembers = Array.from(new Set([userId, ...data.members]));

      const room: GroupRoom = {
        id: groupId,
        name: data.name,
        createdBy: userId,
        members: allMembers,
        createdAt: new Date(),
      };

      groupRooms.set(groupId, room);

      try {
        await db.insert(groupChats).values({
          id: groupId,
          name: data.name,
          createdBy: userId,
          members: allMembers,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group:", err);
      }

      for (const memberId of allMembers) {
        const member = findUserByCommsId(memberId);
        if (member) {
          const memberSocket = io.sockets.sockets.get(member.socketId);
          memberSocket?.join(`group_${groupId}`);
          io.to(member.socketId).emit("group-created", {
            groupId,
            name: data.name,
            members: allMembers,
            createdBy: userId,
            createdByName: user.displayName,
          });
        }
      }

      console.log(`[Socket.IO] Group created: ${data.name} (${groupId}) by ${user.displayName} with ${allMembers.length} members`);
    });

    socket.on("join-group", (data: { groupId: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const room = groupRooms.get(data.groupId);

      if (!user || !room) {
        socket.emit("group-error", { reason: "group-not-found" });
        return;
      }

      if (!room.members.includes(userId)) {
        room.members.push(userId);
      }

      socket.join(`group_${data.groupId}`);
      socket.to(`group_${data.groupId}`).emit("group-member-joined", {
        groupId: data.groupId,
        userId,
        displayName: user.displayName,
        members: room.members,
      });

      socket.emit("group-joined", {
        groupId: data.groupId,
        name: room.name,
        members: room.members,
      });
    });

    socket.on("leave-group", (data: { groupId: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const room = groupRooms.get(data.groupId);

      if (!room) return;

      room.members = room.members.filter(m => m !== userId);
      socket.leave(`group_${data.groupId}`);

      socket.to(`group_${data.groupId}`).emit("group-member-left", {
        groupId: data.groupId,
        userId,
        displayName: user?.displayName,
        members: room.members,
      });

      if (room.members.length === 0) {
        groupRooms.delete(data.groupId);
      }
    });

    socket.on("group-call", async (data: { groupId: string; callType: "audio" | "video" }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const room = groupRooms.get(data.groupId);

      if (!user || !room) {
        socket.emit("call-failed", { reason: "group-not-found" });
        return;
      }

      if (room.members.length > GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "too-many-participants", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      const roomId = `gcall_${data.groupId}_${Date.now()}`;

      const activeCall: ActiveCall = {
        roomId,
        participants: [userId],
        callType: data.callType,
        startedAt: new Date(),
        hostPeerId: userId,
        sfuMode: resolveGroupSfuMode(),
      };
      await saveActiveCall(roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: roomId,
          type: "group",
          participants: [{ userId, displayName: user.displayName, joinedAt: new Date().toISOString() }],
          mediaConfig: { audio: true, video: data.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
          metadata: { groupId: data.groupId, groupName: room.name },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group call session:", err);
      }

      user.inCall = true;
      user.currentRoomId = roomId;
      socket.join(roomId);

      for (const memberId of room.members) {
        if (memberId === userId) continue;
        const member = findUserByCommsId(memberId);
        if (member && !member.inCall) {
          io.to(member.socketId).emit("incoming-group-call", {
            callerId: userId,
            callerName: user.displayName,
            groupId: data.groupId,
            groupName: room.name,
            roomId,
            callType: data.callType,
            participants: activeCall.participants,
          });
        }
      }

      socket.emit("group-call-started", {
        roomId,
        groupId: data.groupId,
        callType: data.callType,
        participants: activeCall.participants,
        hostPeerId: activeCall.hostPeerId,
        sfuMode: activeCall.sfuMode,
      });

      console.log(`[Socket.IO] Group call started: ${room.name} by ${user.displayName} (${data.callType})`);
      emitPresenceUpdate();
    });

    socket.on("create-group-call", async (data: {
      participantIds: string[];
      callType: "audio" | "video";
      groupName?: string;
      roomId?: string;
    }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const allParticipants = Array.from(new Set([userId, ...data.participantIds]));
      if (allParticipants.length > GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "too-many-participants", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      const requestedRoomId = typeof data.roomId === "string" ? data.roomId.trim() : "";
      const requestedExisting = requestedRoomId ? await loadActiveCall(requestedRoomId) : undefined;
      const roomId =
        requestedRoomId && !requestedExisting
          ? requestedRoomId
          : `gcall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const activeCall: ActiveCall = {
        roomId,
        participants: [userId],
        callType: data.callType || "video",
        startedAt: new Date(),
        hostPeerId: userId,
        sfuMode: resolveGroupSfuMode(),
      };
      await saveActiveCall(roomId, activeCall);

      try {
        await db.insert(callSessions).values({
          callId: roomId,
          type: "group",
          participants: [{ userId, displayName: user.displayName, joinedAt: new Date().toISOString() }],
          mediaConfig: { audio: true, video: data.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
          metadata: { groupName: data.groupName || "Group Call" },
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist group call session:", err);
      }

      user.inCall = true;
      user.currentRoomId = roomId;
      socket.join(roomId);

      for (const participantId of data.participantIds) {
        if (participantId === userId) continue;
        const member = findUserByCommsId(participantId);
        if (member && !member.inCall) {
          io.to(member.socketId).emit("incoming-group-call", {
            callerId: userId,
            callerName: user.displayName,
            groupName: data.groupName || "Group Call",
            roomId,
            callType: data.callType || "video",
            participants: allParticipants,
          });
        }
      }

      socket.emit("group-call-created", {
        roomId,
        callType: data.callType,
        participants: allParticipants,
        hostPeerId: activeCall.hostPeerId,
        sfuMode: activeCall.sfuMode,
      });
      console.log(`[Socket.IO] Group call created by ${user.displayName} with ${allParticipants.length} participants`);
      emitPresenceUpdate();
    });

    socket.on("join-group-call", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const activeCall = await loadActiveCall(data.roomId);

      if (!user || !activeCall) {
        socket.emit("call-failed", { reason: "call-not-found" });
        return;
      }

      if (activeCall.participants.length >= GROUP_CALL_MAX_PARTICIPANTS) {
        socket.emit("call-failed", { reason: "call-full", max: GROUP_CALL_MAX_PARTICIPANTS });
        return;
      }

      user.inCall = true;
      user.currentRoomId = data.roomId;
      activeCall.participants.push(userId);
      await saveActiveCall(data.roomId, activeCall);

      socket.join(data.roomId);

      socket.to(data.roomId).emit("peer-joined", {
        roomId: data.roomId,
        peerId: userId,
        peerName: user.displayName,
        participants: activeCall.participants,
      });

      socket.emit("group-call-joined", {
        roomId: data.roomId,
        participants: activeCall.participants,
        callType: activeCall.callType,
        existingPeers: activeCall.participants.filter(p => p !== userId),
        hostPeerId: activeCall.hostPeerId,
        sfuMode: activeCall.sfuMode,
      });

      emitPresenceUpdate();
    });

    socket.on("typing-start", (data: { targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const payload = { userId, displayName: user.displayName };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("typing-start", { ...payload, groupId: data.groupId });
      } else if (data.targetUserId) {
        const target = findUserByCommsId(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("typing-start", payload);
        }
      }
    });

    socket.on("typing-stop", (data: { targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const payload = { userId, displayName: user.displayName };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("typing-stop", { ...payload, groupId: data.groupId });
      } else if (data.targetUserId) {
        const target = findUserByCommsId(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("typing-stop", payload);
        }
      }
    });

    socket.on("join-call-room", async (data: { roomId?: string }) => {
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      socket.join(data!.roomId!);
    });

    socket.on("screen-share-start", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const activeCall = await loadActiveCall(data.roomId);

      if (activeCall) {
        activeCall.screenSharingBy = userId;
        await saveActiveCall(data.roomId, activeCall);
      }

      const payload = {
        roomId: data.roomId,
        userId,
        displayName: (getSocketUser(socket) || findUserByCommsId(userId))?.displayName,
      };
      await emitToCallRoom(io, data.roomId, "screen-share-started", payload, userId);
    });

    socket.on("screen-share-stop", async (data: { roomId: string }) => {
      const userId = (socket as any).userId;
      const activeCall = await loadActiveCall(data.roomId);

      if (activeCall && activeCall.screenSharingBy === userId) {
        activeCall.screenSharingBy = undefined;
        await saveActiveCall(data.roomId, activeCall);
      }

      await emitToCallRoom(io, data.roomId, "screen-share-stopped", {
        roomId: data.roomId,
        userId,
      });
    });

    socket.on("call-chat-message", async (data: {
      roomId: string;
      message: string;
      timestamp: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileMimeType?: string;
    }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const msgType = data.messageType || "text";
      const mediaUrls = data.fileUrl ? [data.fileUrl] : [];

      try {
        await db.insert(callMessages).values({
          callSessionId: data.roomId,
          userId,
          userName: user.displayName,
          content: data.message,
          messageType: msgType,
          mediaUrls,
          isPrivate: false,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist call message:", err);
      }

      const chatPayload = {
        senderId: userId,
        senderName: user.displayName,
        message: data.message,
        messageType: msgType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        timestamp: data.timestamp,
        roomId: data.roomId,
      };

      await emitToCallRoom(io, data.roomId, "call-chat-message", chatPayload);
    });

    socket.on("send-private-message", async (data: { roomId: string; message: string; privateRecipients: string[]; mediaUrls?: string[]; messageType?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const msgType = data.messageType || "text";

      try {
        await db.insert(callMessages).values({
          callSessionId: data.roomId,
          userId,
          userName: user.displayName,
          content: data.message,
          mediaUrls: data.mediaUrls || [],
          messageType: msgType,
          isPrivate: true,
          privateRecipients: data.privateRecipients,
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist private call message:", err);
      }

      for (const recipientId of data.privateRecipients) {
        const target = findUserByCommsId(recipientId);
        if (target) {
          io.to(target.socketId).emit("private-message-received", {
            senderId: userId,
            senderName: user.displayName,
            message: data.message,
            mediaUrls: data.mediaUrls,
            messageType: msgType,
            roomId: data.roomId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    socket.on("send-reaction", (data: { roomId: string; emoji: string; x: number; y: number }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      io.to(data.roomId).emit("reaction-received", {
        userId,
        displayName: user.displayName,
        emoji: data.emoji,
        x: data.x,
        y: data.y,
        timestamp: new Date().toISOString(),
      });

      try { commsIntelligence.trackInteraction(userId, 'reaction_sent', undefined, { emoji: data.emoji }); } catch (_) { }
    });

    socket.on("share-location", async (data: { roomId: string; latitude: number; longitude: number }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const activeCall = await loadActiveCall(data.roomId);
      if (!activeCall) return;

      io.to(data.roomId).emit("location-update", {
        userId,
        displayName: user.displayName,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("start-live-stream", async (data: { streamName: string; sourceType: string; sourceUrl?: string; roomId?: string; quality?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        await db.insert(liveStreams).values({
          streamId,
          streamName: data.streamName,
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl || null,
          broadcasterId: userId,
          broadcasterName: user.displayName,
          viewers: [],
          status: "active",
          quality: data.quality || "720p",
          callSessionId: data.roomId || null,
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] Failed to persist live stream:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("live-stream-started", {
          streamId,
          streamName: data.streamName,
          sourceType: data.sourceType,
          broadcasterId: userId,
          broadcasterName: user.displayName,
          quality: data.quality || "720p",
        });
      }

      socket.emit("stream-created", { streamId, streamName: data.streamName });
      console.log(`[Socket.IO] Live stream started: ${data.streamName} by ${user.displayName}`);
    });

    socket.on("end-live-stream", async (data: { streamId: string; roomId?: string }) => {
      const userId = (socket as any).userId;

      try {
        await db.update(liveStreams)
          .set({ status: "ended", endTime: new Date() })
          .where(eq(liveStreams.streamId, data.streamId));
      } catch (err) {
        console.error("[Socket.IO] Failed to end live stream:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("live-stream-ended", { streamId: data.streamId, endedBy: userId });
      }

      io.emit("stream-ended", { streamId: data.streamId });
      console.log(`[Socket.IO] Live stream ended: ${data.streamId}`);
    });

    socket.on("join-live-stream", async (data: { streamId: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      socket.join(`stream_${data.streamId}`);

      try {
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.streamId, data.streamId));
        if (stream) {
          const viewers = (stream.viewers as Array<{ userId: string; joinedAt: string }>) || [];
          if (!viewers.find((v: { userId: string }) => v.userId === userId)) {
            viewers.push({ userId, joinedAt: new Date().toISOString() });
            await db.update(liveStreams)
              .set({ viewers })
              .where(eq(liveStreams.streamId, data.streamId));
          }
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to track stream viewer:", err);
      }

      io.to(`stream_${data.streamId}`).emit("stream-viewer-joined", {
        streamId: data.streamId,
        userId,
        displayName: user.displayName,
      });
    });

    socket.on("leave-live-stream", async (data: { streamId: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);

      socket.leave(`stream_${data.streamId}`);

      try {
        const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.streamId, data.streamId));
        if (stream) {
          const viewers = ((stream.viewers as Array<{ userId: string }>) || []).filter((v: { userId: string }) => v.userId !== userId);
          await db.update(liveStreams)
            .set({ viewers })
            .where(eq(liveStreams.streamId, data.streamId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to remove stream viewer:", err);
      }

      io.to(`stream_${data.streamId}`).emit("stream-viewer-left", {
        streamId: data.streamId,
        userId,
        displayName: user?.displayName,
      });
    });

    socket.on("annotate-media", async (data: { mediaId: string; annotationType: string; annotationData: any; roomId?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      const annotation = {
        userId,
        displayName: user.displayName,
        type: data.annotationType,
        data: data.annotationData,
        timestamp: new Date().toISOString(),
      };

      try {
        const [media] = await db.select().from(sharedMedia).where(eq(sharedMedia.mediaId, data.mediaId));
        if (media) {
          const annotations = (media.annotations as any[]) || [];
          annotations.push(annotation);
          await db.update(sharedMedia)
            .set({ annotations })
            .where(eq(sharedMedia.mediaId, data.mediaId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to persist media annotation:", err);
      }

      if (data.roomId) {
        io.to(data.roomId).emit("media-annotated", {
          mediaId: data.mediaId,
          annotation,
        });
      }
    });

    socket.on("send-voice-note", (data: { roomId: string; audioData: string; duration: number }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      io.to(data.roomId).emit("voice-note-received", {
        userId,
        displayName: user.displayName,
        audioData: data.audioData,
        duration: data.duration,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("update-call-quality", async (data: { roomId: string; quality: "HD" | "SD" | "Low" }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      try {
        await db.update(callSessions)
          .set({ quality: data.quality })
          .where(eq(callSessions.callId, data.roomId));
      } catch (err) {
        console.error("[Socket.IO] Failed to update call quality:", err);
      }

      io.to(data.roomId).emit("call-quality-updated", {
        roomId: data.roomId,
        userId,
        displayName: user.displayName,
        quality: data.quality,
      });
    });

    socket.on(
      "session-recording-state",
      (data: { roomId: string; isRecording: boolean; userId?: string; displayName?: string }) => {
        const userId = (socket as any).userId;
        const user = getSocketUser(socket) || findUserByCommsId(userId);
        if (!data?.roomId) return;
        io.to(data.roomId).emit("session-recording-state", {
          roomId: data.roomId,
          isRecording: Boolean(data.isRecording),
          userId: data.userId || userId,
          displayName: data.displayName || user?.displayName,
        });
      },
    );

    socket.on("message-read", async (data: { messageIds: string[]; readBy: string }) => {
      const userId = (socket as any).userId;

      try {
        for (const msgId of data.messageIds) {
          await db.update(directMessages)
            .set({ isRead: true, readAt: new Date() })
            .where(eq(directMessages.id, msgId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to mark messages as read:", err);
      }

      if (data.readBy) {
        const target = findUserByCommsId(data.readBy);
        if (target) {
          io.to(target.socketId).emit("messages-read", {
            messageIds: data.messageIds,
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      }
    });

    socket.on("message-reaction", async (data: { messageId: string; emoji: string; targetUserId?: string; groupId?: string }) => {
      const userId = (socket as any).userId;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      if (!user) return;

      try {
        const [msg] = await db.select().from(directMessages).where(eq(directMessages.id, data.messageId));
        if (msg) {
          const reactions = (msg.reactions as Record<string, string[]>) || {};
          if (!reactions[data.emoji]) {
            reactions[data.emoji] = [];
          }
          const idx = reactions[data.emoji].indexOf(userId);
          if (idx >= 0) {
            reactions[data.emoji].splice(idx, 1);
            if (reactions[data.emoji].length === 0) {
              delete reactions[data.emoji];
            }
          } else {
            reactions[data.emoji].push(userId);
          }
          await db.update(directMessages)
            .set({ reactions })
            .where(eq(directMessages.id, data.messageId));
        }
      } catch (err) {
        console.error("[Socket.IO] Failed to update reaction:", err);
      }

      const reactionPayload = {
        messageId: data.messageId,
        emoji: data.emoji,
        userId,
        displayName: user.displayName,
      };

      if (data.groupId) {
        socket.to(`group_${data.groupId}`).emit("message-reaction", reactionPayload);
      } else if (data.targetUserId) {
        const target = findUserByCommsId(data.targetUserId);
        if (target) {
          io.to(target.socketId).emit("message-reaction", reactionPayload);
        }
      }

      socket.emit("message-reaction", reactionPayload);
    });

    socket.on("search-users", async (data: { query: string }) => {
      const userId = (socket as any).userId;
      try {
        const results = await db.select().from(onlineUsers)
          .where(ilike(onlineUsers.displayName, `%${data.query}%`));

        const enriched = results.map((u) => {
          const live = findUserByCommsId(u.id);
          return {
            id: u.id,
            displayName: u.displayName,
            isOnline: !!live || u.isOnline,
            status: live
              ? live.inCall
                ? "in_call"
                : live.status || "online"
              : u.isOnline
                ? "online"
                : "offline",
            inCall: live?.inCall || false,
            lastSeen: u.lastSeen,
          };
        });

        socket.emit("search-results", { query: data.query, users: enriched });
      } catch (err) {
        console.error("[Socket.IO] User search failed:", err);
        socket.emit("search-results", { query: data.query, users: [] });
      }
    });

    socket.on("get-user-list", () => {
      const userList = Array.from(users.values()).map((u) => ({
        id: u.id,
        displayName: u.displayName,
        deviceId: u.deviceId,
        inCall: u.inCall,
        status: u.status || "online",
      }));
      socket.emit("user-list", { users: userList, total: userList.length });
    });

    // ── Colon-style event aliases (call:initiate, call:accept, etc.) ─────────
    // These mirror the hyphenated events above so that both the legacy
    // PresenceContext and the new useWebRTC hook can share the same server.

    // -----------------------------------------------------------------------
    // Namespaced call events (call:* / webrtc:*)
    // These are the canonical event names used by the useWebRTC hook and the
    // new call components.  They delegate to the same in-memory state as the
    // legacy hyphenated events above so both naming conventions work.
    // -----------------------------------------------------------------------

    /** call:initiate — caller requests a call to targetUserId */
    socket.on("call:initiate", async (data: { targetUserId: string; callType: "audio" | "video"; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "call:initiate", 8, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.targetUserId) || (data.callType !== "audio" && data.callType !== "video")) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const callerId = (socket as any).userId;
      if (!shouldProcessCallTxn(callerId, data.callTxnId)) return;
      runtimeMetrics.callSetupStarted += 1;
      const caller = getSocketUser(socket) || findUserByCommsId(callerId);
      if (!caller) { socket.emit("call:failed", { reason: "not-registered" }); return; }

      const target = findUserByCommsId(data.targetUserId);
      if (!target) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call:failed", { reason: "user-offline" });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pendingCall: PendingCall = {
        callerId,
        callerName: caller.displayName,
        targetId: data.targetUserId,
        roomId,
        callType: data.callType,
        timestamp: new Date(),
      };
      await savePendingCall(roomId, pendingCall);
      schedulePendingCallTimeout(io, roomId, callerId, data.targetUserId);
      caller.inCall = true;
      caller.currentRoomId = roomId;

      // Persist to calls table
      try {
        await db.insert(calls).values({
          callerId,
          callerName: caller.displayName,
          recipientId: data.targetUserId,
          recipientName: target.displayName,
          roomId,
          callType: data.callType,
          status: "ringing",
          startTime: new Date(),
        });
        await db.insert(callLogs).values({ callId: roomId, userId: callerId, event: "initiated", metadata: { callType: data.callType } });
      } catch (err) {
        console.error("[Socket.IO] call:initiate persist error:", err);
      }

      // Notify recipient
      emitToCommsUser(io, data.targetUserId, "call:ring", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });
      // Also emit legacy event for backward compat
      emitToCommsUser(io, data.targetUserId, "incoming-call", {
        callerId,
        callerName: caller.displayName,
        roomId,
        callType: data.callType,
      });

      socket.emit("call:ringing", { roomId, targetName: target.displayName, callType: data.callType });
      socket.emit("call-ringing", { roomId, targetName: target.displayName, callType: data.callType });
      console.log(`[Socket.IO] call:initiate ${caller.displayName} -> ${target.displayName} (${data.callType}) room:${roomId}`);
      emitPresenceUpdate();
    });

    /** call:accept — recipient accepts the call */
    socket.on("call:accept", async (data: { roomId: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "call:accept", 12, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId;
      if (!shouldProcessCallTxn(userId, data.callTxnId)) return;
      const user = getSocketUser(socket) || findUserByCommsId(userId);
      const pendingCall = await loadPendingCall(data.roomId);
      if (!pendingCall || !user) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call:failed", { reason: "call-not-found" });
        return;
      }

      const caller = findUserByCommsId(pendingCall.callerId);
      if (!caller) {
        runtimeMetrics.callSetupFailed += 1;
        socket.emit("call:failed", { reason: "caller-disconnected" });
        await clearPendingCall(data.roomId);
        return;
      }

      user.inCall = true;
      user.currentRoomId = data.roomId;

      // Join every device socket for both participants so room-based fallbacks
      // cannot miss a peer when users have multiple active devices.
      await io.in(commsUserRoom(pendingCall.callerId)).socketsJoin(data.roomId);
      await io.in(commsUserRoom(userId)).socketsJoin(data.roomId);
      socket.join(data.roomId);

      const activeCall: ActiveCall = {
        roomId: data.roomId,
        participants: [pendingCall.callerId, userId],
        callType: pendingCall.callType,
        startedAt: new Date(),
        hostPeerId: pendingCall.callerId,
        sfuMode: "p2p",
      };
      await saveActiveCall(data.roomId, activeCall);

      try {
        await db.update(calls).set({ status: "connected" }).where(eq(calls.roomId, data.roomId));
        await db.insert(callLogs).values({ callId: data.roomId, userId, event: "accepted" });
        await db.insert(callSessions).values({
          callId: data.roomId,
          type: "p2p",
          participants: [
            { userId: pendingCall.callerId, displayName: caller.displayName, joinedAt: new Date().toISOString() },
            { userId, displayName: user.displayName, joinedAt: new Date().toISOString() },
          ],
          mediaConfig: { audio: true, video: pendingCall.callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
        });
      } catch (err) {
        console.error("[Socket.IO] call:accept persist error:", err);
      }

      const callType = pendingCall.callType;
      runtimeMetrics.callSetupSucceeded += 1;
      // Emit both colon and hyphen variants for full compat
      emitToCommsUser(io, pendingCall.callerId, "call:accepted", { roomId: data.roomId, peerName: user.displayName, peerId: userId, callType });
      emitToCommsUser(io, pendingCall.callerId, "call-accepted", { roomId: data.roomId, peerName: user.displayName, peerId: userId, callType });
      socket.emit("call:connected", { roomId: data.roomId, peerName: caller.displayName, peerId: caller.id, isInitiator: false, callType });
      socket.emit("call-connected", { roomId: data.roomId, peerName: caller.displayName, peerId: caller.id, isInitiator: false, callType });

      await clearPendingCall(data.roomId);
      console.log(`[Socket.IO] call:accept ${caller.displayName} <-> ${user.displayName}`);
      emitPresenceUpdate();
    });

    /** call:reject — recipient rejects the call */
    socket.on("call:reject", async (data: { roomId: string; reason?: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "call:reject", 12, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId;
      if (!shouldProcessCallTxn(userId, data.callTxnId)) return;
      const pendingCall = await loadPendingCall(data.roomId);

      if (pendingCall) {
        const caller = findUserByCommsId(pendingCall.callerId);
        if (caller) {
          caller.inCall = false;
          caller.currentRoomId = undefined;
          emitToCommsUser(io, pendingCall.callerId, "call:rejected", { roomId: data.roomId, reason: data.reason ?? "declined" });
          emitToCommsUser(io, pendingCall.callerId, "call-declined", { roomId: data.roomId });
        }
        await clearPendingCall(data.roomId);

        try {
          await db.update(calls).set({ status: "rejected", endTime: new Date() }).where(eq(calls.roomId, data.roomId));
          await db.insert(callLogs).values({ callId: data.roomId, userId, event: "rejected", metadata: { reason: data.reason } });
        } catch (err) {
          console.error("[Socket.IO] call:reject persist error:", err);
        }

        emitPresenceUpdate();
      }
    });

    /** call:end — either party ends the active call */
    socket.on("call:end", async (data: { roomId: string; callTxnId?: string }) => {
      if (!allowSocketEventRate(socket, "call:end", 20, 15_000)) {
        runtimeMetrics.signalingEventRateLimited += 1;
        return;
      }
      if (!isReasonableId(data?.roomId)) {
        runtimeMetrics.signalingInvalidPayloadRejected += 1;
        return;
      }
      const userId = (socket as any).userId;
      if (!shouldProcessCallTxn(userId, data.callTxnId)) return;
      const user = getSocketUser(socket) || findUserByCommsId(userId);

      if (user) { user.inCall = false; user.currentRoomId = undefined; }

      const activeCall = await loadActiveCall(data.roomId);
      if (activeCall) {
        activeCall.participants = activeCall.participants.filter(p => p !== userId);
        if (activeCall.participants.length === 0) {
          await clearActiveCall(data.roomId);
          const now = new Date();
          const durationSeconds = Math.floor((now.getTime() - activeCall.startedAt.getTime()) / 1000);
          try {
            await db.update(calls).set({ status: "ended", endTime: now, durationSeconds }).where(eq(calls.roomId, data.roomId));
            await db.update(callSessions).set({ endTime: now, durationSeconds }).where(eq(callSessions.callId, data.roomId));
            await db.insert(callLogs).values({ callId: data.roomId, userId, event: "ended", metadata: { durationSeconds } });
          } catch (err) {
            console.error("[Socket.IO] call:end persist error:", err);
          }
        } else {
          await saveActiveCall(data.roomId, activeCall);
        }
      }

      socket.to(data.roomId).emit("call:ended", { roomId: data.roomId, userId });
      socket.to(data.roomId).emit("call-ended", { roomId: data.roomId, userId });
      socket.leave(data.roomId);
      console.log(`[Socket.IO] call:end room:${data.roomId} by ${user?.displayName ?? userId}`);
      emitPresenceUpdate();
    });

    /** webrtc:offer — forward SDP offer to the target peer */
    socket.on("webrtc:offer", async (data: { roomId: string; offer?: any; targetPeerId?: string; sealed?: unknown }) => {
      await relayWebRtcPayload(io, socket, data, ["webrtc:offer", "webrtc-offer"], () => {
        runtimeMetrics.webrtcRelayOffer += 1;
      });
    });

    /** webrtc:answer — forward SDP answer to the target peer */
    socket.on("webrtc:answer", async (data: { roomId: string; answer?: any; targetPeerId?: string; sealed?: unknown }) => {
      await relayWebRtcPayload(io, socket, data, ["webrtc:answer", "webrtc-answer"], () => {
        runtimeMetrics.webrtcRelayAnswer += 1;
      });
    });

    /** webrtc:ice-candidate — forward ICE candidate to the target peer */
    socket.on("webrtc:ice-candidate", async (data: { roomId: string; candidate?: any; targetPeerId?: string; sealed?: unknown }) => {
      await relayWebRtcPayload(io, socket, data, ["webrtc:ice-candidate", "webrtc-ice-candidate"], () => {
        runtimeMetrics.webrtcRelayIce += 1;
      });
    });

    socket.on("disconnect", async () => {
      const userId = (socket as any).userId as string | undefined;
      const presenceKey = (socket as any).presenceKey as string | undefined;

      if (userId) {
        const user = getSocketUser(socket);

        if (user?.currentRoomId) {
          socket.to(user.currentRoomId).emit("call-ended", { roomId: user.currentRoomId, reason: "peer-disconnected", userId });

          const activeCall = await loadActiveCall(user.currentRoomId);
          if (activeCall) {
            activeCall.participants = activeCall.participants.filter(p => p !== userId);
            if (activeCall.participants.length === 0) {
              await clearActiveCall(user.currentRoomId);
            } else {
              await saveActiveCall(user.currentRoomId, activeCall);
              socket.to(user.currentRoomId).emit("peer-left", {
                roomId: user.currentRoomId,
                peerId: userId,
                peerName: user.displayName,
                participants: activeCall.participants,
              });
            }
          }
        }

        for (const [groupId, room] of groupRooms) {
          if (room.members.includes(userId)) {
            socket.to(`group_${groupId}`).emit("group-member-offline", {
              groupId,
              userId,
              displayName: user?.displayName,
            });
          }
        }

        if (presenceKey) users.delete(presenceKey);
        else users.delete(userId);
        for (const key of qosByRoomAndUser.keys()) {
          if (key.endsWith(`::${userId}`)) {
            qosByRoomAndUser.delete(key);
          }
        }
        for (const key of qosActionStateByRoomUser.keys()) {
          if (key.endsWith(`::${userId}`)) {
            qosActionStateByRoomUser.delete(key);
          }
        }
        console.log(`[Socket.IO] Disconnected: ${user?.displayName || userId} - Remaining: ${users.size}`);

        const stillOnline = Array.from(users.values()).some((u) => u.id === userId);
        if (!stillOnline) {
          userLastDisconnectAt.set(userId, Date.now());
          try {
            await db.update(onlineUsers)
              .set({ isOnline: false, lastSeen: new Date(), status: "offline" })
              .where(eq(onlineUsers.id, userId));
          } catch (err) {
            console.error("[Socket.IO] Failed to update offline status:", err);
          }
        }

        emitPresenceUpdate();
      }
    });
  });

  return io;
}
