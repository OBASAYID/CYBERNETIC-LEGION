/**
 * WebRTC ICE + SFU placeholders for CYRUS Comm P2P layer (satellite-ready: add TURN for constrained paths).
 */

export type CyrusCommIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export const CYRUS_COMM_ICE_SERVERS: CyrusCommIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

/** Enable coturn via env when deploying behind symmetric NAT */
if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
  CYRUS_COMM_ICE_SERVERS.push({
    urls: process.env.TURN_URLS.split(",").map((s) => s.trim()),
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  });
}

export const CYRUS_COMM_SFU = {
  mode: "p2p" as const,
  mediasoup: { workerCount: 0, rtcMinPort: 0, rtcMaxPort: 0 },
  janus: { wsUrl: "" },
};

export function getCyrusCommWebRtcConfigResponse() {
  return {
    iceServers: CYRUS_COMM_ICE_SERVERS,
    sfu: CYRUS_COMM_SFU,
  };
}
