/**
 * WebRTC ICE + link hints for CYRUS Comm P2P (terrestrial + NTN / satellite-ready).
 *
 * - Terrestrial: env `TURN_*` for production symmetric NAT.
 * - Satellite / high-latency backhaul: optional `SATELLITE_TURN_*` (or reuse `TURN_*`)
 *   and `GET /api/cyrus-comm/config/webrtc?link=satellite` for client encoding hints.
 */

export type CyrusCommIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type CyrusCommLinkHints = {
  /** Client selects encoding / hangup windows (NTN / GEO IP often 400–800 ms RTT). */
  encodingProfile: "terrestrial" | "high_latency_ntn";
  satelliteBackhaulCapable: boolean;
  recommendedAudioBitrateMax: number;
  recommendedVideoBitrateMax: number;
  /** Guidance for UI copy / stats (not enforced in browser). */
  expectedRttMsTypical: { min: number; max: number };
};

export const CYRUS_COMM_ICE_SERVERS: CyrusCommIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Enable coturn via env when deploying behind symmetric NAT */
if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
  const urls = process.env.TURN_URLS.split(",").map((s) => s.trim()).filter(Boolean);
  if (urls.length > 0) {
    CYRUS_COMM_ICE_SERVERS.push({
      urls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
}

/** Optional dedicated relay pool for satellite / NTN terminals (same format as TURN_*). */
if (
  process.env.SATELLITE_TURN_URLS &&
  process.env.SATELLITE_TURN_USERNAME &&
  process.env.SATELLITE_TURN_CREDENTIAL
) {
  const satUrls = process.env.SATELLITE_TURN_URLS.split(",").map((s) => s.trim()).filter(Boolean);
  if (satUrls.length > 0) {
    CYRUS_COMM_ICE_SERVERS.push({
      urls: satUrls,
      username: process.env.SATELLITE_TURN_USERNAME,
      credential: process.env.SATELLITE_TURN_CREDENTIAL,
    });
  }
}

export const CYRUS_COMM_SFU = {
  mode: "p2p" as const,
  mediasoup: { workerCount: 0, rtcMinPort: 0, rtcMaxPort: 0 },
  janus: { wsUrl: "" },
};

function buildLinkHints(satellite: boolean): CyrusCommLinkHints {
  if (satellite) {
    return {
      encodingProfile: "high_latency_ntn",
      satelliteBackhaulCapable: true,
      recommendedAudioBitrateMax: 48_000,
      recommendedVideoBitrateMax: 900_000,
      expectedRttMsTypical: { min: 400, max: 900 },
    };
  }
  return {
    encodingProfile: "terrestrial",
    satelliteBackhaulCapable: true,
    recommendedAudioBitrateMax: 64_000,
    recommendedVideoBitrateMax: 2_500_000,
    expectedRttMsTypical: { min: 20, max: 120 },
  };
}

export type CyrusCommWebRtcConfigQuery = {
  /** `satellite` — NTN / Starlink / VSAT style high-latency IP backhaul */
  link?: string;
};

export function getCyrusCommWebRtcConfigResponse(query?: CyrusCommWebRtcConfigQuery) {
  const satellite =
    query?.link === "satellite" ||
    query?.link === "ntn" ||
    process.env.CYRUS_COMM_DEFAULT_LINK === "satellite" ||
    process.env.CYRUS_COMM_DEFAULT_LINK === "ntn";

  return {
    iceServers: CYRUS_COMM_ICE_SERVERS,
    sfu: CYRUS_COMM_SFU,
    linkHints: buildLinkHints(satellite),
  };
}
