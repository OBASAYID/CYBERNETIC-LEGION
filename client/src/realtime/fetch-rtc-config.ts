/**
 * Pulls ICE / link hints from the CYRUS API so production TURN (coturn) env vars are honored.
 * Merges with client-side VITE_RTC_ICE_SERVERS_JSON and browser defaults from webrtc-config.
 */

import { systemFetch } from "@shared/cyrus-api-client";
import {
  buildRtcConfiguration,
  createPeerConnectionConfig,
  getRuntimeIceServers,
  mergeIceServerLists,
} from "../lib/webrtc-config";

type ApiIce = { urls: string | string[]; username?: string; credential?: string };

function normalizeIceServers(raw: unknown): RTCIceServer[] {
  if (!Array.isArray(raw)) return [];
  const out: RTCIceServer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || !("urls" in entry)) continue;
    const e = entry as ApiIce;
    out.push({
      urls: e.urls,
      username: e.username,
      credential: e.credential,
    });
  }
  return out;
}

export async function fetchCyrusCommRtcConfiguration(query?: {
  link?: string;
}): Promise<RTCConfiguration> {
  const params = new URLSearchParams();
  if (query?.link) params.set("link", query.link);
  const qs = params.toString();
  const path = `/api/cyrus-comm/config/webrtc${qs ? `?${qs}` : ""}`;
  try {
    const res = await systemFetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { iceServers?: unknown };
    const serverIce = normalizeIceServers(data.iceServers);
    const localIce = getRuntimeIceServers();
    const merged = mergeIceServerLists(serverIce, localIce);
    return buildRtcConfiguration(merged);
  } catch (e) {
    console.warn("[CYRUS-RTC] Server ICE config unavailable, using client defaults:", e);
    return createPeerConnectionConfig();
  }
}
