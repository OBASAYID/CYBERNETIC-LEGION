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
    return new URL(base).origin === window.location.origin ? "include" : "omit";
  } catch {
    return "omit";
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
  const credentials = init?.credentials ?? systemCredentials();
  return fetch(url, { ...init, credentials });
}
