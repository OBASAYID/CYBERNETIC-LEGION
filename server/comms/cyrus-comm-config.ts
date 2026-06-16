/**
 * WebRTC ICE + link hints for CYRUS Comm P2P (terrestrial + NTN / satellite-ready).
 *
 * - Terrestrial: env `TURN_*` for production symmetric NAT.
 * - Backup public relay pool when `CYRUS_COMM_PUBLIC_TURN` is not `false`.
 * - Satellite / high-latency backhaul: optional `SATELLITE_TURN_*`
 */

import { createHmac } from "crypto";

export type CyrusCommIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const productionTurnConfigured = Boolean(
  process.env.TURN_URLS?.trim() ||
    process.env.TURN_SECRET?.trim() ||
    (process.env.TURN_USERNAME?.trim() && process.env.TURN_CREDENTIAL?.trim()),
);

/** In production with private TURN, disable metered.ca public relay (unsuitable at scale). */
const allowPublicBackupTurn =
  process.env.CYRUS_COMM_PUBLIC_TURN === "true" ||
  (process.env.CYRUS_COMM_PUBLIC_TURN !== "false" &&
    !(process.env.NODE_ENV === "production" && productionTurnConfigured));

const PUBLIC_BACKUP_TURN: CyrusCommIceServer[] = allowPublicBackupTurn
  ? [
        {
          urls: [
            "turn:openrelay.metered.ca:80",
            "turn:openrelay.metered.ca:443",
            "turn:openrelay.metered.ca:443?transport=tcp",
          ],
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ]
  : [];

export const CYRUS_COMM_ICE_SERVERS: CyrusCommIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" },
  ...PUBLIC_BACKUP_TURN,
];

function appendTurnFromEnv(
  urlsEnv: string | undefined,
  userEnv: string | undefined,
  credEnv: string | undefined,
): void {
  if (!urlsEnv || !userEnv || !credEnv) return;
  const urls = urlsEnv.split(",").map((s) => s.trim()).filter(Boolean);
  if (urls.length > 0) {
    CYRUS_COMM_ICE_SERVERS.push({
      urls,
      username: userEnv,
      credential: credEnv,
    });
  }
}

/** Primary production coturn */
appendTurnFromEnv(process.env.TURN_URLS, process.env.TURN_USERNAME, process.env.TURN_CREDENTIAL);

/** Optional dedicated relay pool for satellite / NTN terminals */
appendTurnFromEnv(
  process.env.SATELLITE_TURN_URLS,
  process.env.SATELLITE_TURN_USERNAME,
  process.env.SATELLITE_TURN_CREDENTIAL,
);

/** Time-limited TURN credentials (coturn `use-auth-secret`) when TURN_SECRET is set. */
export function mintTurnCredentials(validSeconds = 86400): { username: string; credential: string } | null {
  const secret = process.env.TURN_SECRET?.trim();
  if (!secret) return null;
  const expiry = Math.floor(Date.now() / 1000) + validSeconds;
  const username = `${expiry}:cyrus`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential };
}

export function getProductionIceServers(): CyrusCommIceServer[] {
  const base = [...CYRUS_COMM_ICE_SERVERS];
  const minted = mintTurnCredentials();
  if (minted && process.env.TURN_URLS) {
    const urls = process.env.TURN_URLS.split(",").map((s) => s.trim()).filter(Boolean);
    if (urls.length) {
      base.unshift({ urls, username: minted.username, credential: minted.credential });
    }
  }
  return base;
}

export const CYRUS_COMM_SFU = {
  mode: "p2p" as const,
  mediasoup: { workerCount: 0, rtcMinPort: 0, rtcMaxPort: 0 },
  janus: { wsUrl: "" },
};

/** Runtime SFU block for WebRTC config API (reflects mediasoup worker when online). */
export function getLiveSfuConfig() {
  try {
    const { getSfuStatus } = require("./sfu/sfu-manager.js") as {
      getSfuStatus: () => {
        mode: string;
        mediasoupAvailable: boolean;
        rtcPortRange?: { min: number; max: number };
        announcedIp?: string | null;
      };
    };
    const s = getSfuStatus();
    const mode = s.mode === "mediasoup" ? "mediasoup" : s.mode === "star" ? "star" : "p2p";
    const workerCount =
      "workerCount" in s && typeof (s as { workerCount?: number }).workerCount === "number"
        ? (s as { workerCount: number }).workerCount
        : s.mediasoupAvailable
          ? 1
          : 0;
    return {
      mode,
      mediasoup: {
        workerCount,
        rtcMinPort: s.rtcPortRange?.min ?? 0,
        rtcMaxPort: s.rtcPortRange?.max ?? 0,
        announcedIp: s.announcedIp ?? "",
      },
      janus: { wsUrl: "" },
    };
  } catch {
    return CYRUS_COMM_SFU;
  }
}

function buildLinkHints(satellite: boolean): CyrusCommLinkHints {
  if (satellite) {
    return {
      encodingProfile: "high_latency_ntn",
      satelliteBackhaulCapable: true,
      recommendedAudioBitrateMax: 64_000,
      recommendedVideoBitrateMax: 900_000,
      expectedRttMsTypical: { min: 400, max: 900 },
    };
  }
  return {
    encodingProfile: "terrestrial",
    satelliteBackhaulCapable: true,
    recommendedAudioBitrateMax: 128_000,
    recommendedVideoBitrateMax: 2_500_000,
    expectedRttMsTypical: { min: 20, max: 120 },
  };
}

export type CyrusCommLinkHints = {
  encodingProfile: "terrestrial" | "high_latency_ntn";
  satelliteBackhaulCapable: boolean;
  recommendedAudioBitrateMax: number;
  recommendedVideoBitrateMax: number;
  expectedRttMsTypical: { min: number; max: number };
};

export type CyrusCommWebRtcConfigQuery = {
  link?: string;
};

export function relayIsConfigured(servers: CyrusCommIceServer[]): boolean {
  return servers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => String(u).startsWith("turn:") || String(u).startsWith("turns:"));
  });
}

export function getCyrusCommWebRtcConfigResponse(query?: CyrusCommWebRtcConfigQuery) {
  const satellite =
    query?.link === "satellite" ||
    query?.link === "ntn" ||
    process.env.CYRUS_COMM_DEFAULT_LINK === "satellite" ||
    process.env.CYRUS_COMM_DEFAULT_LINK === "ntn";

  const iceServers = getProductionIceServers();
  const hasProductionTurn = productionTurnConfigured || relayIsConfigured(iceServers);
  const iceTransportPolicy =
    process.env.CYRUS_COMM_ICE_TRANSPORT_POLICY === "relay" ||
    (hasProductionTurn &&
      (process.env.CYRUS_COMM_PREFER_RELAY === "true" ||
        process.env.CYRUS_COMM_MOBILE_RELAY_FIRST === "true"))
      ? ("relay" as const)
      : ("all" as const);

  return {
    iceServers,
    sfu: getLiveSfuConfig(),
    linkHints: buildLinkHints(satellite),
    iceTransportPolicy,
    relayConfigured: relayIsConfigured(iceServers),
    audioProcessingRecommended: true,
    voiceActivityDetection: false,
  };
}
