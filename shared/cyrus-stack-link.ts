/**
 * Client probe for user ↔ server ↔ database connectivity chain.
 */
import { systemFetch } from "./cyrus-api-client.js";

export type StackLinkSegment = {
  ok: boolean;
  detail: string;
};

export type StackLinkResponse = {
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
  ts: number;
};

/** Probe the integrated user/server/database link. */
export async function probeStackLink(): Promise<StackLinkResponse | null> {
  try {
    const res = await systemFetch("/api/stack/link", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as StackLinkResponse;
  } catch {
    return null;
  }
}

/** Wait until server + database segments are healthy (post-login bootstrap). */
export async function waitForStackLinkReady(maxMs = 45_000): Promise<StackLinkResponse | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const link = await probeStackLink();
    if (link?.chain.server.ok && link.chain.database.ok) return link;
    await new Promise((r) => setTimeout(r, 400));
  }
  return probeStackLink();
}
