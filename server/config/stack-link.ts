/**
 * User ↔ server ↔ database link probe — validates the full request chain.
 */
import type { Request } from "express";
import { pool } from "../db.js";
import { getDeploymentPayload } from "./deployment.js";
import { buildCommsUserId } from "../../shared/cyrus-identity.js";

export type StackLinkSegment = {
  ok: boolean;
  detail: string;
};

export type StackLinkPayload = {
  ok: boolean;
  chain: {
    server: StackLinkSegment;
    database: StackLinkSegment;
    redis: StackLinkSegment;
    session: StackLinkSegment;
    identity: StackLinkSegment;
  };
  user: {
    accountUserId: string | null;
    deviceId: string | null;
    commsUserId: string | null;
    authenticated: boolean;
  };
  deployment: ReturnType<typeof getDeploymentPayload>;
  ts: number;
};

function readHeader(req: Request, name: string): string | null {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function readRequestDeviceId(req: Request): string | null {
  return readHeader(req, "x-device-id");
}

export function readRequestAccountUserId(req: Request): string | null {
  const sessionUser = (req as { user?: { id?: string; claims?: { sub?: string } } }).user;
  return (
    sessionUser?.id ||
    sessionUser?.claims?.sub ||
    readHeader(req, "x-user-id") ||
    null
  );
}

export async function pingDatabase(): Promise<StackLinkSegment> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, detail: "DATABASE_URL unset — in-memory mode" };
  }
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return { ok: true, detail: "connected" };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "database unavailable",
    };
  }
}

export async function pingRedis(): Promise<StackLinkSegment> {
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) {
    return { ok: false, detail: "REDIS_URL unset" };
  }
  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2500,
      lazyConnect: true,
    });
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return { ok: pong === "PONG", detail: pong === "PONG" ? "connected" : String(pong) };
  } catch (e) {
    return {
      ok: false,
      detail: e instanceof Error ? e.message : "redis unavailable",
    };
  }
}

export async function buildStackLinkPayload(
  req: Request,
  options: { systemReady: boolean },
): Promise<StackLinkPayload> {
  const database = await pingDatabase();
  const redis = await pingRedis();

  const accountUserId = readRequestAccountUserId(req);
  const deviceId = readRequestDeviceId(req);
  const commsUserId = deviceId || accountUserId
    ? buildCommsUserId(accountUserId, deviceId || accountUserId || "")
    : null;
  const authenticated = Boolean(accountUserId);

  const session: StackLinkSegment = authenticated
    ? { ok: true, detail: "session token valid" }
    : readHeader(req, "authorization") || readHeader(req, "x-cyrus-session-token")
      ? { ok: false, detail: "session token invalid or expired" }
      : { ok: false, detail: "no session token" };

  const identity: StackLinkSegment =
    deviceId && (authenticated || !readHeader(req, "authorization"))
      ? {
          ok: true,
          detail: authenticated
            ? `account+device (${accountUserId} @ ${deviceId})`
            : `device-only (${deviceId})`,
        }
      : authenticated
        ? { ok: true, detail: `account ${accountUserId}` }
        : { ok: false, detail: "missing X-Device-Id header" };

  const server: StackLinkSegment = options.systemReady
    ? { ok: true, detail: "accepting traffic" }
    : { ok: false, detail: "initializing" };

  const chainOk =
    server.ok &&
    database.ok &&
    redis.ok &&
    (!authenticated || session.ok);

  return {
    ok: chainOk,
    chain: { server, database, redis, session, identity },
    user: { accountUserId, deviceId, commsUserId, authenticated },
    deployment: getDeploymentPayload(),
    ts: Date.now(),
  };
}
