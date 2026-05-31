/**
 * Pulls ICE / link hints from the CYRUS API so production TURN (coturn) env vars are honored.
 * Merges with client-side VITE_RTC_ICE_SERVERS_JSON and browser defaults from webrtc-config.
 */

import { systemFetch } from "@shared/cyrus-api-client";
import {
  buildRtcConfiguration,
  createPeerConnectionConfig,
  getRuntimeIceServers,
  isLikelyCrossNetworkPath,
  mergeIceServerLists,
} from "../lib/webrtc-config";

type ApiIce = { urls: string | string[]; username?: string; credential?: string };

export type CyrusRtcConfigResponse = {
  iceServers?: unknown;
  iceTransportPolicy?: "all" | "relay";
  relayConfigured?: boolean;
  linkHints?: {
    recommendedAudioBitrateMax?: number;
    recommendedVideoBitrateMax?: number;
  };
};

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
  forceRelay?: boolean;
}): Promise<RTCConfiguration> {
  const params = new URLSearchParams();
  if (query?.link) params.set("link", query.link);
  const qs = params.toString();
  const path = `/api/cyrus-comm/config/webrtc${qs ? `?${qs}` : ""}`;
  try {
    const res = await systemFetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as CyrusRtcConfigResponse;
    const serverIce = normalizeIceServers(data.iceServers);
    const localIce = getRuntimeIceServers();
    const merged = mergeIceServerLists(serverIce, localIce);

    const forceRelay =
      query?.forceRelay === true ||
      data.iceTransportPolicy === "relay" ||
      (Boolean(data.relayConfigured) && isLikelyCrossNetworkPath());

    return buildRtcConfiguration(merged, { forceRelay });
  } catch (e) {
    console.warn("[CYRUS-RTC] Server ICE config unavailable, using client defaults:", e);
    return createPeerConnectionConfig();
  }
}

export async function fetchCyrusCommIceServers(): Promise<RTCIceServer[]> {
  const cfg = await fetchCyrusCommRtcConfiguration();
  return cfg.iceServers ?? getRuntimeIceServers();
}
