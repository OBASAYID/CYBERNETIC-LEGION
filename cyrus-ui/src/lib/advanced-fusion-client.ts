import { systemFetch } from "./system-api";

export type FusionBootstrapPayload = {
  tier: string;
  protocolVersion: string;
  channels: string[];
  capabilities: Record<string, boolean>;
  surfaces: { health: string; login: string; status: string };
  serverTime: string;
  uptimeMs: number;
};

export type FusionHandshakePayload = {
  accepted: boolean;
  fusionSessionId: string;
  tier: string;
  echo: { displayName: string | null; role: string | null; client: string };
  issuedAt: string;
  hints: { useCredentials: string; bootstrapPath: string };
};

export async function fetchFusionBootstrap(): Promise<
  { ok: true; data: FusionBootstrapPayload; latencyMs: number } | { ok: false; status?: number }
> {
  try {
    const t0 = performance.now();
    const r = await systemFetch("/api/fusion/bootstrap", {
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - t0);
    if (!r.ok) return { ok: false, status: r.status };
    const data = (await r.json()) as FusionBootstrapPayload;
    return { ok: true, data, latencyMs };
  } catch {
    return { ok: false };
  }
}

export async function postFusionHandshake(input: {
  displayName: string;
  role: string;
  client?: string;
}): Promise<{ ok: true; data: FusionHandshakePayload } | { ok: false }> {
  try {
    const r = await systemFetch("/api/fusion/handshake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: input.displayName,
        role: input.role,
        client: input.client ?? "cyrus-ui",
      }),
    });
    if (!r.ok) return { ok: false };
    const data = (await r.json()) as FusionHandshakePayload;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
