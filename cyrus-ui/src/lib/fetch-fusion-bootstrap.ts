import { getCyrusApiBase } from "./api-url";
import { systemApiUrl, systemCredentials } from "./system-api";

const FLAG = "__CYRUS_FUSED_API_FETCH_INSTALLED__" as const;

function fusedRelativePath(w: Window, input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    if (input.startsWith("/api") || input.startsWith("/health")) return input;
    return null;
  }
  if (input instanceof URL) {
    if (input.origin !== w.location.origin) return null;
    if (input.pathname.startsWith("/api") || input.pathname.startsWith("/health")) {
      return `${input.pathname}${input.search}${input.hash}`;
    }
    return null;
  }
  if (input instanceof Request) {
    try {
      const u = new URL(input.url);
      if (u.origin !== w.location.origin) return null;
      if (u.pathname.startsWith("/api") || u.pathname.startsWith("/health")) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function resolveCredentials(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fusedCred: RequestCredentials,
): RequestCredentials {
  if (init?.credentials !== undefined) return init.credentials;
  if (typeof Request !== "undefined" && input instanceof Request && input.credentials !== undefined) {
    return input.credentials;
  }
  return fusedCred;
}

const fusedCredentials = (): RequestCredentials => systemCredentials();

/**
 * When `VITE_CYRUS_API_BASE` is set, rewrites browser `fetch` for same-origin `/api/*` and `/health`
 * so lazy Command Center bundles and hooks hit the configured API host with matching credentials.
 * No-op when the base is unset (integrated dev / production same-origin).
 */
export function installFusedApiFetch(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w[FLAG]) return;
  if (!getCyrusApiBase()) return;

  w[FLAG] = true;
  const orig = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const path = fusedRelativePath(window, input);
    if (!path) return orig(input, init);

    const url = systemApiUrl(path);
    const credentials = resolveCredentials(input, init, fusedCredentials());

    if (typeof input === "string") {
      return orig(url, { ...init, credentials });
    }

    if (input instanceof Request) {
      return orig(url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        cache: input.cache,
        integrity: input.integrity,
        keepalive: input.keepalive,
        mode: input.mode,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        signal: init?.signal ?? input.signal,
        ...init,
        credentials,
      });
    }

    return orig(url, { ...init, credentials });
  };
}

installFusedApiFetch();
