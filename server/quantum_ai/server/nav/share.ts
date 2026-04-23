import { getBestFix } from "./position";

interface ShareSession {
  token: string;
  recipientId: string;
  expiresAt: number;
  mode: "live" | "snapshot";
  snapshotFix?: any;
}

const sessions = new Map<string, ShareSession>();

function randomToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function startShare(recipientId: string, durationSeconds: number, mode: "live" | "snapshot"): string {
  const token = randomToken();
  const expiresAt = Date.now() + durationSeconds * 1000;
  const snapshotFix = mode === "snapshot" ? getBestFix() : undefined;
  sessions.set(token, { token, recipientId, expiresAt, mode, snapshotFix });
  return token;
}

export function stopShare(token: string) {
  sessions.delete(token);
}

export function getSharedFix(token: string) {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  if (session.mode === "snapshot") return session.snapshotFix;
  return getBestFix();
}

