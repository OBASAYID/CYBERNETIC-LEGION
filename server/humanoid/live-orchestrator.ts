import type { Response } from "express";

export type HumanoidEventSeverity = "info" | "active" | "alert";

export interface HumanoidLiveEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: HumanoidEventSeverity;
  title: string;
  detail: string;
  payload?: Record<string, unknown>;
}

interface HumanoidClient {
  id: string;
  res: Response;
}

const clients: HumanoidClient[] = [];
const eventHistory: HumanoidLiveEvent[] = [];

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function publishHumanoidEvent(event: Omit<HumanoidLiveEvent, "id" | "timestamp">): HumanoidLiveEvent {
  const enriched: HumanoidLiveEvent = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  eventHistory.unshift(enriched);
  if (eventHistory.length > 100) {
    eventHistory.length = 100;
  }

  const frame = `data: ${JSON.stringify(enriched)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(frame);
    } catch {
      // Ignore write failures; disconnect cleanup handles stale clients.
    }
  }

  return enriched;
}

export function getHumanoidEventHistory(limit = 20): HumanoidLiveEvent[] {
  return eventHistory.slice(0, Math.max(1, Math.min(100, limit)));
}

export function registerHumanoidEventClient(res: Response): string {
  const id = nextId();
  clients.push({ id, res });
  return id;
}

export function removeHumanoidEventClient(id: string): void {
  const idx = clients.findIndex((client) => client.id === id);
  if (idx >= 0) {
    clients.splice(idx, 1);
  }
}
