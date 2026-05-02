/**
 * Socket.IO signaling: presence, WebRTC offers/answers/ICE, chat, live location,
 * multi-user session rooms (join-session / leave-session).
 * Cleans up mappings on disconnect to avoid leaks.
 */

const { randomUUID } = require("crypto");
const { broadcastSessionMembers } = require("./services/sessionMembers");

/**
 * @param {import('socket.io').Server} io
 * @param {import('./services/userRegistry').UserRegistry} registry
 * @param {import('./services/messageStore').MessageStore} messages
 */
function attachSignaling(io, registry, messages) {
  /** @type {Map<string, Set<string>>} userId -> peer userIds in an active call */
  const callPeers = new Map();

  function addCallPeer(a, b) {
    if (!callPeers.has(a)) callPeers.set(a, new Set());
    if (!callPeers.has(b)) callPeers.set(b, new Set());
    callPeers.get(a).add(b);
    callPeers.get(b).add(a);
  }

  function removeCallPeer(userId, peerId) {
    callPeers.get(userId)?.delete(peerId);
    callPeers.get(peerId)?.delete(userId);
    if (callPeers.get(userId)?.size === 0) callPeers.delete(userId);
    if (callPeers.get(peerId)?.size === 0) callPeers.delete(peerId);
  }

  function clearCallsForUser(userId) {
    const peers = callPeers.get(userId);
    if (!peers) return;
    for (const p of [...peers]) {
      removeCallPeer(userId, p);
      const sock = registry.getSocket(p);
      sock?.emit("call-ended", { peerUserId: userId, reason: "peer-disconnected" });
    }
  }

  function broadcastUsers() {
    io.emit("users-updated", { users: registry.getOnlineUsers() });
  }

  io.on("connection", (socket) => {
    const log = (...args) => console.log(`[signaling][${socket.id}]`, ...args);

    socket.on("join", (payload, ack) => {
      try {
        const userId = String(payload?.userId || "").trim();
        const displayName = String(payload?.displayName || userId).trim();
        if (!userId) {
          ack?.({ ok: false, error: "userId required" });
          return;
        }
        registry.register(userId, displayName, socket);
        socket.join("session:global");
        socket.data.sessionRooms = socket.data.sessionRooms || new Set();
        log("join", userId);
        broadcastUsers();
        ack?.({ ok: true, userId, users: registry.getOnlineUsers() });
      } catch (e) {
        console.error("[signaling] join error", e);
        ack?.({ ok: false, error: String(e.message || e) });
      }
    });

    /** Explicit leave (optional); same cleanup as disconnect for registered users. */
    socket.on("leave", (ack) => {
      const userId = socket.data.userId;
      if (!userId) {
        ack?.({ ok: false });
        return;
      }
      const rooms = socket.data.sessionRooms ? [...socket.data.sessionRooms] : [];
      for (const room of rooms) {
        const sessionId = room.startsWith("sess:") ? room.slice(5) : room;
        socket.leave(room);
        socket.data.sessionRooms.delete(room);
        broadcastSessionMembers(io, room, sessionId, socket.id);
      }
      socket.leave("session:global");
      registry.removeBySocketId(socket.id);
      clearCallsForUser(userId);
      io.emit("user-left", { userId, reason: "leave" });
      broadcastUsers();
      log("leave", userId);
      delete socket.data.userId;
      delete socket.data.displayName;
      ack?.({ ok: true });
    });

    /**
     * Multi-user communication session (logical room). Starlink / UAV ops can map one mission to one sessionId.
     */
    socket.on("join-session", (payload, ack) => {
      const userId = socket.data.userId;
      if (!userId) {
        ack?.({ ok: false, error: "join global session first" });
        return;
      }
      socket.data.sessionRooms = socket.data.sessionRooms || new Set();
      const raw = String(payload?.sessionId ?? "default").trim() || "default";
      const sessionId = raw.replace(/[^\w\-:.]/g, "_").slice(0, 128);
      const room = `sess:${sessionId}`;
      socket.join(room);
      socket.data.sessionRooms.add(room);
      broadcastSessionMembers(io, room, sessionId);
      log("join-session", sessionId);
      ack?.({ ok: true, sessionId, room });
    });

    socket.on("leave-session", (payload, ack) => {
      const userId = socket.data.userId;
      if (!userId) {
        ack?.({ ok: false });
        return;
      }
      const raw = String(payload?.sessionId ?? "").trim();
      if (!raw) {
        ack?.({ ok: false, error: "sessionId required" });
        return;
      }
      const room = `sess:${raw}`;
      socket.leave(room);
      socket.data.sessionRooms?.delete(room);
      broadcastSessionMembers(io, room, raw, socket.id);
      log("leave-session", raw);
      ack?.({ ok: true, sessionId: raw });
    });

    socket.on("call-user", (payload) => {
      const fromUserId = socket.data.userId;
      if (!fromUserId) return;
      const targetUserId = payload?.targetUserId;
      const offer = payload?.offer;
      const callId = payload?.callId || randomUUID();
      if (!targetUserId || !offer) {
        log("call-user rejected: missing fields");
        return;
      }
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
    });

    socket.on("answer-call", (payload) => {
      const fromUserId = socket.data.userId;
      if (!fromUserId) return;
      const targetUserId = payload?.targetUserId;
      const answer = payload?.answer;
      const callId = payload?.callId;
      if (!targetUserId || !answer) return;
      const target = registry.getSocket(targetUserId);
      if (!target) return;
      target.emit("call-answered", {
        callId,
        fromUserId,
        answer,
      });
      log("answer-call ->", targetUserId);
    });

    socket.on("ice-candidate", (payload) => {
      const fromUserId = socket.data.userId;
      if (!fromUserId) return;
      const targetUserId = payload?.targetUserId;
      const candidate = payload?.candidate;
      const callId = payload?.callId;
      if (!targetUserId || candidate == null) return;
      const target = registry.getSocket(targetUserId);
      if (!target) return;
      target.emit("ice-candidate", {
        callId,
        fromUserId,
        candidate,
      });
    });

    socket.on("end-call", (payload) => {
      const fromUserId = socket.data.userId;
      if (!fromUserId) return;
      const peerUserId = payload?.peerUserId;
      if (peerUserId) {
        removeCallPeer(fromUserId, peerUserId);
        registry.getSocket(peerUserId)?.emit("call-ended", {
          peerUserId: fromUserId,
          reason: "hangup",
        });
      }
      log("end-call", peerUserId);
    });

    socket.on("send-message", (payload, ack) => {
      const fromUserId = socket.data.userId;
      if (!fromUserId) return;
      const toUserId = payload?.targetUserId;
      const text = String(payload?.text || "").trim();
      if (!toUserId || !text) {
        ack?.({ ok: false });
        return;
      }
      const msg = messages.append(fromUserId, toUserId, text);
      const target = registry.getSocket(toUserId);
      target?.emit("receive-message", {
        ...msg,
        fromDisplayName: socket.data.displayName,
      });
      ack?.({ ok: true, id: msg.id });
      log("message ->", toUserId);
    });

    socket.on("fetch-messages", (payload, ack) => {
      const userId = socket.data.userId;
      if (!userId || !ack) return;
      const other = payload?.withUserId;
      if (!other) {
        ack({ ok: false });
        return;
      }
      const history = messages.getHistory(userId, other);
      ack({ ok: true, messages: history });
    });

    socket.on("location-update", (payload) => {
      const userId = socket.data.userId;
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
    });

    socket.on("disconnect", (reason) => {
      const rooms = socket.data.sessionRooms ? [...socket.data.sessionRooms] : [];
      const left = registry.removeBySocketId(socket.id);
      for (const room of rooms) {
        const sessionId = room.startsWith("sess:") ? room.slice(5) : room;
        broadcastSessionMembers(io, room, sessionId, socket.id);
      }
      if (left) {
        clearCallsForUser(left);
        io.emit("user-left", { userId: left, reason });
        broadcastUsers();
        log("disconnect", reason, left);
      }
    });
  });
}

module.exports = { attachSignaling };
