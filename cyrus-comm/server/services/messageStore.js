/**
 * In-memory message log for demo. Replace with PostgreSQL/MongoDB using PERSISTENCE in shared/config.
 */

class MessageStore {
  constructor() {
    /** @type {Map<string, Array<{ id: string, fromUserId: string, toUserId: string, text: string, ts: number }>>} */
    this.threads = new Map();
  }

  threadKey(a, b) {
    return [a, b].sort().join("::");
  }

  append(fromUserId, toUserId, text) {
    const key = this.threadKey(fromUserId, toUserId);
    if (!this.threads.has(key)) this.threads.set(key, []);
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fromUserId,
      toUserId,
      text,
      ts: Date.now(),
    };
    this.threads.get(key).push(msg);
    // Cap memory in demo
    const arr = this.threads.get(key);
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    return msg;
  }

  getHistory(userA, userB, limit = 100) {
    const key = this.threadKey(userA, userB);
    const arr = this.threads.get(key) || [];
    return arr.slice(-limit);
  }
}

module.exports = { MessageStore };
