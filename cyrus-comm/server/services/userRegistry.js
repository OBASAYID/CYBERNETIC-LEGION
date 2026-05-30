/**
 * In-memory userId ↔ socket mapping. Single active socket per userId (last join wins).
 */

class UserRegistry {
  constructor() {
    /** @type {Map<string, { socketId: string, displayName: string, socket: import('socket.io').Socket }>} */
    this.byUserId = new Map();
    /** @type {Map<string, string>} socketId -> userId */
    this.bySocketId = new Map();
  }

  /**
   * @param {string} userId
   * @param {string} displayName
   * @param {import('socket.io').Socket} socket
   */
  register(userId, displayName, socket) {
    const existing = this.byUserId.get(userId);
    if (existing && existing.socketId !== socket.id) {
      try {
        existing.socket.emit("session-superseded", {
          reason: "Another client joined with the same user ID",
        });
        existing.socket.disconnect(true);
      } catch (_) {
        /* ignore */
      }
      this.bySocketId.delete(existing.socketId);
    }

    this.byUserId.set(userId, {
      socketId: socket.id,
      displayName: displayName || userId,
      socket,
    });
    this.bySocketId.set(socket.id, userId);
    socket.data.userId = userId;
    socket.data.displayName = displayName || userId;
  }

  /** @param {string} socketId */
  removeBySocketId(socketId) {
    const userId = this.bySocketId.get(socketId);
    if (!userId) return null;
    const entry = this.byUserId.get(userId);
    if (entry && entry.socketId === socketId) {
      this.byUserId.delete(userId);
    }
    this.bySocketId.delete(socketId);
    return userId;
  }

  /** @param {string} userId */
  getSocket(userId) {
    return this.byUserId.get(userId)?.socket ?? null;
  }

  getOnlineUsers() {
    const list = [];
    for (const [userId, v] of this.byUserId) {
      list.push({ userId, displayName: v.displayName, socketId: v.socketId });
    }
    return list;
  }
}

module.exports = { UserRegistry };
