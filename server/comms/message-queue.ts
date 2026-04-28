/**
 * Message Queue — buffers comms operations when the database is unavailable.
 *
 * Implements a bounded FIFO queue (max 1 000 entries) with per-operation
 * metrics so callers can observe queue health at a glance.
 */

export type QueuedOperationType =
  | "sendMessage"
  | "markAsRead"
  | "addReaction"
  | "initiateCall"
  | "acceptCall"
  | "declineCall"
  | "endCall"
  | "createConference"
  | "joinConference"
  | "leaveConference"
  | "endConference"
  | "updatePresence"
  | "createGroupChat";

export interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  payload: Record<string, unknown>;
  enqueuedAt: Date;
  attempts: number;
}

interface QueueMetrics {
  totalEnqueued: number;
  totalFlushed: number;
  totalDropped: number;
  successRate: number;
}

const MAX_QUEUE_SIZE = 1_000;

class MessageQueue {
  private queue: QueuedOperation[] = [];
  private metrics: QueueMetrics = {
    totalEnqueued: 0,
    totalFlushed: 0,
    totalDropped: 0,
    successRate: 1,
  };

  /** Add an operation to the tail of the queue. Drops the oldest entry on overflow. */
  enqueue(type: QueuedOperationType, payload: Record<string, unknown>): QueuedOperation {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      const dropped = this.queue.shift()!;
      this.metrics.totalDropped++;
      console.warn(
        `[MessageQueue] Queue full (${MAX_QUEUE_SIZE}). Dropped oldest entry: ${dropped.id} (${dropped.type})`
      );
    }

    const op: QueuedOperation = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      enqueuedAt: new Date(),
      attempts: 0,
    };

    this.queue.push(op);
    this.metrics.totalEnqueued++;

    console.log(`[MessageQueue] Enqueued ${type} (id=${op.id}, queueSize=${this.queue.length})`);
    return op;
  }

  /** Drain and return all queued operations in FIFO order. */
  drain(): QueuedOperation[] {
    const ops = [...this.queue];
    this.queue = [];
    return ops;
  }

  /** Peek at the full queue without removing entries. */
  peek(): QueuedOperation[] {
    return [...this.queue];
  }

  /** Remove a single operation by id (e.g. after successful flush). */
  remove(id: string): boolean {
    const idx = this.queue.findIndex((op) => op.id === id);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  /** Record a successful flush of `count` operations and update the success rate. */
  recordFlush(count: number): void {
    this.metrics.totalFlushed += count;
    const total = this.metrics.totalFlushed + this.metrics.totalDropped;
    this.metrics.successRate = total > 0 ? this.metrics.totalFlushed / total : 1;
  }

  get size(): number {
    return this.queue.length;
  }

  /** Age of the oldest queued item in milliseconds, or 0 if the queue is empty. */
  get oldestAgeMs(): number {
    if (this.queue.length === 0) return 0;
    return Date.now() - this.queue[0].enqueuedAt.getTime();
  }

  getMetrics(): QueueMetrics & { queueSize: number; oldestAgeMs: number } {
    return {
      ...this.metrics,
      queueSize: this.queue.length,
      oldestAgeMs: this.oldestAgeMs,
    };
  }
}

export const messageQueue = new MessageQueue();
