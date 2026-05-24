/**
 * Client-side outbound message queue — survives disconnects and retries on reconnect.
 */

import type { ChatOutboundPayload } from "../contexts/PresenceContext";
import { buildPresenceSendMessagePayload } from "./comms-outbound";

const STORAGE_KEY = "cyrus_comms_outbound_v1";
const MAX_QUEUE = 200;

export type QueuedOutboundMessage = {
  id: string;
  conversationId: string;
  payload: ChatOutboundPayload;
  createdAt: number;
  attempts: number;
};

function readQueue(): QueuedOutboundMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedOutboundMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    // Storage full — drop oldest half
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-Math.floor(MAX_QUEUE / 2))));
  }
}

export function enqueueOutboundMessage(conversationId: string, payload: ChatOutboundPayload): QueuedOutboundMessage {
  const item: QueuedOutboundMessage = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    conversationId,
    payload: { ...payload, timestamp: payload.timestamp || new Date().toISOString() },
    createdAt: Date.now(),
    attempts: 0,
  };
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function removeOutboundMessage(id: string): void {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function listOutboundQueue(): QueuedOutboundMessage[] {
  return readQueue();
}

export function flushOutboundQueue(
  emit: (conversationId: string, body: Record<string, unknown>) => void,
): { sent: number; remaining: number } {
  const queue = readQueue();
  if (!queue.length) return { sent: 0, remaining: 0 };

  const remaining: QueuedOutboundMessage[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      emit(item.conversationId, buildPresenceSendMessagePayload(item.conversationId, item.payload));
      sent += 1;
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}
