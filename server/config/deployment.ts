/**
 * Deployment-facing URLs and service resolution — no hardcoded host machine assumptions.
 * Set PUBLIC_BASE_URL (or BASE_URL) in every non-local deployment.
 */
import { getCyrusLivePort, getServerBindHost, getCyrusFusedOrigin } from "./stack-ports.js";
import { getCyrusScaleLimits } from "../../shared/comms/scale-config.js";
import { buildMobileShellPayload } from "../../shared/cyrus-mobile-shell.js";
import { pushCallServiceConfigured } from "../comms/push-call-service.js";

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Canonical public HTTPS/HTTP origin browsers should use (no path). */
export function getPublicBaseUrl(): string {
  return getCyrusFusedOrigin();
}

/** WebSocket origin derived from public base (wss when https). */
export function getPublicWebSocketOrigin(): string {
  const base = getPublicBaseUrl();
  try {
    const u = new URL(base);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}`;
  } catch {
    return base.replace(/^http/, "ws");
  }
}

/** Resolve sidecar / external service URL — never assume developer loopback in production. */
export function resolveServiceUrl(options: {
  explicitEnv: string | undefined;
  dockerHost: string;
  localFallback: string;
}): string {
  const explicit = options.explicitEnv?.trim();
  if (explicit) return trimSlash(explicit);

  if (process.env.NODE_ENV === "production") {
    return trimSlash(options.dockerHost);
  }

  return trimSlash(options.localFallback);
}

export function getCommsMlServiceUrl(): string {
  return resolveServiceUrl({
    explicitEnv: process.env.COMMS_ML_URL,
    dockerHost: "http://comms-ml:5002",
    localFallback: "http://127.0.0.1:5002",
  });
}

export function getDeploymentPayload() {
  const publicBaseUrl = getPublicBaseUrl();
  const bindHost = getServerBindHost();
  const livePort = getCyrusLivePort();

  return {
    mode: process.env.NODE_ENV || "development",
    publicBaseUrl,
    publicWebSocketOrigin: getPublicWebSocketOrigin(),
    bindHost,
    livePort,
    multiDevice: {
      identityModel: "account-plus-device",
      sessionStore:
        process.env.CYRUS_SESSION_STORE === "memory" || !process.env.DATABASE_URL
          ? "memory"
          : "postgresql",
      commsSignaling: "socket.io:/cyrus-io",
    },
    services: {
      commsMl: getCommsMlServiceUrl(),
      cyrusAi:
        process.env.CYRUS_AI_URL?.trim() ||
        process.env.CYRUS_MEMORY_SERVICE_URL?.trim() ||
        null,
    },
    webrtc: {
      sfuAnnouncedIp: process.env.CYRUS_SFU_ANNOUNCED_IP?.trim() || null,
      turnConfigured: Boolean(
        process.env.TURN_URLS?.trim() ||
          process.env.TURN_SECRET?.trim() ||
          (process.env.TURN_USERNAME?.trim() && process.env.TURN_CREDENTIAL?.trim()),
      ),
      redisSignaling: Boolean(process.env.REDIS_URL?.trim()),
      pushConfigured: pushCallServiceConfigured(),
    },
    scale: getCyrusScaleLimits(),
    mobileShell: buildMobileShellPayload(publicBaseUrl),
    hints: [
      "Mobile: install PWA from publicBaseUrl — UI caches on device; AI/comms/DB stay on server.",
      "Set PUBLIC_BASE_URL to your public HTTPS origin — not 127.0.0.1 — for cookies and WebRTC on mobile/LAN.",
      "Same account on multiple devices: log in on each; deviceId stays per-browser, userId follows session.",
      "Production: REDIS_URL + horizontal replicas, TURN_URLS/TURN_SECRET, CYRUS_SFU_ANNOUNCED_IP, UDP 40000-40100 per pod.",
      "500k users: scale API replicas (HPA), global TURN fleet, regional SFU clusters — not a single VPS.",
    ],
  };
}
