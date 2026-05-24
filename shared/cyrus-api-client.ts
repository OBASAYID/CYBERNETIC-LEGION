/// <reference types="vite/client" />
/**
 * Browser → CYRUS Express: same origin or `VITE_CYRUS_API_BASE` (split-origin).
 * Imported by cyrus-ui, client Command Center, and re-exported from cyrus-ui `system-api` / `api-url`.
 */

import { resilientFetch } from "./cyrus-resilience.js";

export function getCyrusApiBase(): string {
  if (typeof import.meta === "undefined") return "";
  const env = (import.meta as ImportMeta & { env?: { VITE_CYRUS_API_BASE?: string } }).env;
  if (!env?.VITE_CYRUS_API_BASE) return "";
  return String(env.VITE_CYRUS_API_BASE).trim().replace(/\/$/, "");
}

export function resolveCyrusApiUrl(path: string): string {
  const base = getCyrusApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Avatar / comms media paths (`/api/comms/...`) resolve against `VITE_CYRUS_API_BASE` when set. */
export function commsAssetUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return resolveCyrusApiUrl(u);
}

export function resolveCyrusApiCredentials(): RequestCredentials {
  const base = getCyrusApiBase();
  if (typeof window === "undefined") return "same-origin";
  if (!base) return "include";
  try {
    // When an explicit API base is configured (split-origin deployments),
    // auth/session cookies must be sent cross-origin.
    return "include";
  } catch {
    return "include";
  }
}

export function systemApiUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const p = s.startsWith("/") ? s : `/${s}`;
  return resolveCyrusApiUrl(p);
}

/**
 * WebSocket URL consistent with {@link systemFetch}: same host as the page unless
 * `VITE_CYRUS_API_BASE` targets a split-origin API (signaling then uses that host).
 *
 * @param pathAndQuery Path starting with `/`, e.g. `/ws?userId=…&name=…`
 */
/** When server `CYRUS_COMM_WS_TOKEN` is set, pass the same value from `VITE_CYRUS_COMM_WS_TOKEN` in the browser. */
export function appendCommSignalingTokenToSearchParams(q: URLSearchParams): void {
  if (typeof import.meta === "undefined") return;
  const env = (import.meta as ImportMeta & { env?: { VITE_CYRUS_COMM_WS_TOKEN?: string } }).env;
  const t = String(env?.VITE_CYRUS_COMM_WS_TOKEN || "").trim();
  if (t) q.set("token", t);
}

/**
 * HTTP(S) origin for Socket.IO (`io(origin, { path: "/cyrus-io" })`).
 * Matches {@link systemFetch} host when `VITE_CYRUS_API_BASE` is set.
 */
export function resolveCyrusSocketIoOrigin(): string {
  const base = getCyrusApiBase();
  if (typeof window === "undefined") {
    return base || "";
  }
  if (!base) return window.location.origin;
  try {
    const normalized =
      base.startsWith("http://") || base.startsWith("https://")
        ? base
        : `https://${base.replace(/^\/\//, "")}`;
    const u = new URL(normalized);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin;
  }
}

export function resolveCyrusWebSocketUrl(pathAndQuery: string): string {
  const path = pathAndQuery.trim().startsWith("/") ? pathAndQuery.trim() : `/${pathAndQuery.trim()}`;
  const base = getCyrusApiBase();

  if (typeof window === "undefined") {
    return path;
  }

  if (!base) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }

  try {
    const normalized =
      base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base.replace(/^\/\//, "")}`;
    const u = new URL(normalized);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}${path}`;
  } catch {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }
}

export function systemCredentials(): RequestCredentials {
  return resolveCyrusApiCredentials();
}

export function systemFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = systemApiUrl(pathOrUrl);
  const headers = new Headers(init?.headers ?? undefined);

  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.pathname.startsWith("/api") && !headers.has("x-cyrus-session-token")) {
        const token = localStorage.getItem("cyrus_session_token");
        if (token) {
          headers.set("x-cyrus-session-token", token);
          // Some proxy/CDN layers are stricter with custom headers than Authorization.
          if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
        }
      }
      if (parsed.pathname.startsWith("/api/comms") && !headers.has("X-Device-Id")) {
        const deviceId = localStorage.getItem("cyrus_device_id") || localStorage.getItem("cyrus-device-id");
        if (deviceId) headers.set("X-Device-Id", deviceId);
      }
    } catch {
      // Keep fetch resilient even if URL parsing fails.
    }
  }

  return resilientFetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}
