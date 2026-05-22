/**
 * Helpers for multi-user Socket.IO rooms (`sess:<sessionId>`).
 * Used for coordinated sessions ahead of SFU / satellite multi-party routing.
 */

/**
 * @param {import('socket.io').Server} io
 * @param {string} room
 * @param {string | null} [excludeSocketId]
 * @returns {{ userId: string, displayName: string }[]}
 */
function collectMembersInRoom(io, room, excludeSocketId = null) {
  const adapterRoom = io.sockets.adapter.rooms.get(room);
  const members = [];
  if (!adapterRoom) return members;
  for (const sockId of adapterRoom) {
    if (excludeSocketId && sockId === excludeSocketId) continue;
    const s = io.sockets.sockets.get(sockId);
    if (s?.data?.userId) {
      members.push({ userId: s.data.userId, displayName: s.data.displayName || s.data.userId });
    }
  }
  return members;
}

/**
 * @param {import('socket.io').Server} io
 * @param {string} room
 * @param {string} sessionId
 * @param {string | null} [excludeSocketId]
 */
function broadcastSessionMembers(io, room, sessionId, excludeSocketId = null) {
  const members = collectMembersInRoom(io, room, excludeSocketId);
  io.to(room).emit("session-members", {
    sessionId,
    members,
    count: members.length,
    ts: Date.now(),
  });
}

module.exports = { collectMembersInRoom, broadcastSessionMembers };
