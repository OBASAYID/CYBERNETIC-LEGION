/// <reference types="vite/client" />
/**
 * Browser → CYRUS Express: same origin or `VITE_CYRUS_API_BASE` (split-origin).
 * Imported by cyrus-ui, client Command Center, and re-exported from cyrus-ui `system-api` / `api-url`.
 */

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
    } catch {
      // Keep fetch resilient even if URL parsing fails.
    }
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "include", // ALWAYS include credentials
  });
}
