/**
 * CYRUS Comm — second Socket.IO mount (path /cyrus-comm-io) for SDP offer/answer signaling,
 * DM-style messaging, and live location broadcast. Complements main /cyrus-io presence (polling);
 * this path allows WebSocket upgrades for lower signaling latency when the edge supports it.
 */

import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { randomUUID } from "crypto";
import { createCyrusCorsOriginAccess } from "../cors-trusted.js";

type RegistryEntry = { socketId: string; displayName: string; socket: Socket };

class UserRegistry {
  private byUserId = new Map<string, RegistryEntry>();
  private bySocketId = new Map<string, string>();

  register(userId: string, displayName: string, socket: Socket) {
    const existing = this.byUserId.get(userId);
    if (existing && existing.socketId !== socket.id) {
      try {
        existing.socket.emit("session-superseded", {
          reason: "Another CYRUS Comm client joined with the same user ID",
        });
        existing.socket.disconnect(true);
      } catch {
        /* ignore */
      }
      this.bySocketId.delete(existing.socketId);
    }
    this.byUserId.set(userId, { socketId: socket.id, displayName: displayName || userId, socket });
    this.bySocketId.set(socket.id, userId);
    socket.data.userId = userId;
    socket.data.displayName = displayName || userId;
  }

  removeBySocketId(socketId: string): string | null {
    const userId = this.bySocketId.get(socketId);
    if (!userId) return null;
    const entry = this.byUserId.get(userId);
    if (entry?.socketId === socketId) this.byUserId.delete(userId);
    this.bySocketId.delete(socketId);
    return userId;
  }

  getSocket(userId: string): Socket | null {
    return this.byUserId.get(userId)?.socket ?? null;
  }

  getOnlineUsers() {
    const list: { userId: string; displayName: string; socketId: string }[] = [];
    for (const [userId, v] of this.byUserId) {
      list.push({ userId, displayName: v.displayName, socketId: v.socketId });
    }
    return list;
  }
}

type ChatMsg = {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  ts: number;
};

class MessageStore {
  private threads = new Map<string, ChatMsg[]>();

  private threadKey(a: string, b: string) {
    return [a, b].sort().join("::");
  }

  append(fromUserId: string, toUserId: string, text: string): ChatMsg {
    const key = this.threadKey(fromUserId, toUserId);
    if (!this.threads.has(key)) this.threads.set(key, []);
    const msg: ChatMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fromUserId,
      toUserId,
      text,
      ts: Date.now(),
    };
    const arr = this.threads.get(key)!;
    arr.push(msg);
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    return msg;
  }

  getHistory(userA: string, userB: string, limit = 100): ChatMsg[] {
    const key = this.threadKey(userA, userB);
    const arr = this.threads.get(key) ?? [];
    return arr.slice(-limit);
  }
}

export function initCyrusCommSocketSignaling(server: HttpServer) {
  const registry = new UserRegistry();
  const messages = new MessageStore();

  const callPeers = new Map<string, Set<string>>();

  function addCallPeer(a: string, b: string) {
    if (!callPeers.has(a)) callPeers.set(a, new Set());
    if (!callPeers.has(b)) callPeers.set(b, new Set());
    callPeers.get(a)!.add(b);
    callPeers.get(b)!.add(a);
  }

  function removeCallPeer(userId: string, peerId: string) {
    callPeers.get(userId)?.delete(peerId);
    callPeers.get(peerId)?.delete(userId);
    if (callPeers.get(userId)?.size === 0) callPeers.delete(userId);
    if (callPeers.get(peerId)?.size === 0) callPeers.delete(peerId);
  }

  function clearCallsForUser(userId: string) {
    const peers = callPeers.get(userId);
    if (!peers) return;
    for (const p of [...peers]) {
      removeCallPeer(userId, p);
      registry.getSocket(p)?.emit("call-ended", { peerUserId: userId, reason: "peer-disconnected" });
    }
  }

  const io = new SocketIOServer(server, {
    path: "/cyrus-comm-io",
    cors: {
      origin: createCyrusCorsOriginAccess(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    allowEIO3: true,
    pingTimeout: 60_000,
    pingInterval: 25_000,
    connectTimeout: 60_000,
    maxHttpBufferSize: 1e6,
  });

  function broadcastUsers() {
    io.emit("users-updated", { users: registry.getOnlineUsers() });
  }

  io.on("connection", (socket) => {
    const log = (...args: unknown[]) => console.log(`[CyrusComm-io][${socket.id}]`, ...args);

    socket.on("join", (payload: { userId?: string; displayName?: string }, ack?: (r: unknown) => void) => {
      try {
        const userId = String(payload?.userId || "").trim();
        const displayName = String(payload?.displayName || userId).trim();
        if (!userId) {
          ack?.({ ok: false, error: "userId required" });
          return;
        }
        registry.register(userId, displayName, socket);
        void socket.join("session:global");
        log("join", userId);
        broadcastUsers();
        ack?.({ ok: true, userId, users: registry.getOnlineUsers() });
      } catch (e: unknown) {
        console.error("[CyrusComm-io] join error", e);
        ack?.({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    });

    socket.on(
      "call-user",
      (payload: {
        targetUserId?: string;
        offer?: { type?: string; sdp?: string };
        callId?: string;
        media?: string;
      }) => {
        const fromUserId = socket.data.userId as string | undefined;
        if (!fromUserId) return;
        const targetUserId = payload?.targetUserId;
        const offer = payload?.offer;
        const callId = payload?.callId || randomUUID();
        if (!targetUserId || !offer) return;
        const target = registry.getSocket(targetUserId);
        if (!target) {
          socket.emit("call-failed", { targetUserId, reason: "user-offline" });
          return;
        }
        addCallPeer(fromUserId, targetUserId);
        target.emit("incoming-call", {
          callId,
          fromUserId,
          fromDisplayName: socket.data.displayName,
          offer,
          media: payload?.media || "video",
        });
        log("call-user ->", targetUserId, callId);
      },
    );

    socket.on(
      "answer-call",
      (payload: { targetUserId?: string; answer?: { type?: string; sdp?: string }; callId?: string }) => {
        const fromUserId = socket.data.userId as string | undefined;
        if (!fromUserId) return;
        const targetUserId = payload?.targetUserId;
        const answer = payload?.answer;
        const callId = payload?.callId;
        if (!targetUserId || !answer) return;
        const target = registry.getSocket(targetUserId);
        if (!target) return;
        target.emit("call-answered", { callId, fromUserId, answer });
        log("answer-call ->", targetUserId);
      },
    );

    socket.on(
      "ice-candidate",
      (payload: { targetUserId?: string; candidate?: unknown; callId?: string }) => {
        const fromUserId = socket.data.userId as string | undefined;
        if (!fromUserId) return;
        const targetUserId = payload?.targetUserId;
        const candidate = payload?.candidate;
        const callId = payload?.callId;
        if (!targetUserId || candidate === undefined) return;
        const target = registry.getSocket(targetUserId);
        if (!target) return;
        target.emit("ice-candidate", { callId, fromUserId, candidate });
      },
    );

    socket.on("end-call", (payload: { peerUserId?: string }) => {
      const fromUserId = socket.data.userId as string | undefined;
      if (!fromUserId) return;
      const peerUserId = payload?.peerUserId;
      if (peerUserId) {
        removeCallPeer(fromUserId, peerUserId);
        registry.getSocket(peerUserId)?.emit("call-ended", { peerUserId: fromUserId, reason: "hangup" });
      }
      log("end-call", peerUserId);
    });

    socket.on(
      "send-message",
      (
        payload: { targetUserId?: string; text?: string },
        ack?: (r: { ok: boolean; id?: string }) => void,
      ) => {
        const fromUserId = socket.data.userId as string | undefined;
        if (!fromUserId) return;
        const toUserId = payload?.targetUserId;
        const text = String(payload?.text || "").trim();
        if (!toUserId || !text) {
          ack?.({ ok: false });
          return;
        }
        const msg = messages.append(fromUserId, toUserId, text);
        registry.getSocket(toUserId)?.emit("receive-message", {
          ...msg,
          fromDisplayName: socket.data.displayName,
        });
        ack?.({ ok: true, id: msg.id });
        log("message ->", toUserId);
      },
    );

    socket.on(
      "fetch-messages",
      (payload: { withUserId?: string }, ack?: (r: { ok: boolean; messages?: ChatMsg[] }) => void) => {
        const userId = socket.data.userId as string | undefined;
        if (!userId || !ack) return;
        const other = payload?.withUserId;
        if (!other) {
          ack({ ok: false });
          return;
        }
        ack({ ok: true, messages: messages.getHistory(userId, other) });
      },
    );

    socket.on(
      "location-update",
      (payload: { latitude?: number; longitude?: number; accuracy?: number }) => {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;
        const lat = Number(payload?.latitude);
        const lng = Number(payload?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        socket.to("session:global").emit("location-updated", {
          userId,
          displayName: socket.data.displayName,
          latitude: lat,
          longitude: lng,
          accuracy: payload?.accuracy,
          ts: Date.now(),
        });
      },
    );

    socket.on("disconnect", (reason) => {
      const left = registry.removeBySocketId(socket.id);
      if (left) {
        clearCallsForUser(left);
        io.emit("user-left", { userId: left, reason });
        broadcastUsers();
        log("disconnect", reason, left);
      }
    });
  });

  console.log("[Cyrus Comm] Socket.IO signaling mounted at path /cyrus-comm-io (ws+polling)");
}
