import type { CorsOptions } from "cors";

import { getWebPort } from "./config/stack-ports.js";

function parseExplicitOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function baseUrlOrigin(): string | null {
  const base = process.env.BASE_URL?.trim();
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/** Same default as `server/index.ts` when `BASE_URL` is unset (public browser origin). */
function inferredOriginFromPublicEnv(): string | null {
  const port = getWebPort();
  const publicProtocol = String(process.env.PUBLIC_PROTOCOL || "http").trim();
  const publicDomain = String(process.env.PUBLIC_DOMAIN || "localhost").trim();
  const suffix = publicDomain.includes(":") ? "" : `:${port}`;
  try {
    return new URL(`${publicProtocol}://${publicDomain}${suffix}`).origin;
  } catch {
    return null;
  }
}

/** Origins derived from env (BASE_URL, public env, Railway networking vars). */
function collectProductionAllowlistOrigins(): string[] {
  const out = new Set<string>();
  const add = (raw?: string | null) => {
    if (!raw?.trim()) return;
    try {
      out.add(new URL(raw.trim()).origin);
    } catch {
      /* ignore */
    }
  };

  add(process.env.BASE_URL);

  const inferred = inferredOriginFromPublicEnv();
  if (inferred) out.add(inferred);

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    add(`https://${railwayDomain}`);
  }

  add(process.env.RAILWAY_STATIC_URL?.trim());

  return [...out];
}

/** True when running in a Railway container (env names vary by service / era). */
function isRailwayRuntime(): boolean {
  return Object.keys(process.env).some((k) => k.startsWith("RAILWAY_"));
}

/**
 * When the app runs on Railway, the browser origin is typically `https://*.up.railway.app`
 * while BASE_URL may still point at localhost from defaults. Allow same-tab Railway HTTPS
 * origins so Socket.IO / credentialed API calls are not denied.
 */
function isRailwayBrowserOrigin(origin: string): boolean {
  if (!isRailwayRuntime()) return false;
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && u.hostname.endsWith(".up.railway.app");
  } catch {
    return false;
  }
}

/**
 * Dynamic CORS origin for Express and Socket.IO when `credentials: true`.
 * Wildcard `*` is invalid with credentialed requests; this reflects allowed origins instead.
 *
 * - **Non-production:** permissive (any browser `Origin`) so local/LAN dev stays simple.
 * - **Production:** `CORS_ORIGIN` comma list, else `BASE_URL` origin, else `PUBLIC_PROTOCOL` / `PUBLIC_DOMAIN` / `PORT`.
 */
export function createCyrusCorsOriginAccess(): CorsOptions["origin"] {
  const explicit = parseExplicitOrigins();
  if (explicit.length > 0) {
    return (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (explicit.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return (origin, callback) => {
      callback(null, true);
    };
  }

  const allowlist = collectProductionAllowlistOrigins();
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowlist.includes(origin)) {
      callback(null, true);
      return;
    }
    if (isRailwayBrowserOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`), false);
  };
}

export function warnIfCorsMisconfigured(resolvedBaseUrl?: string): void {
  if (process.env.NODE_ENV !== "production") return;
  if (parseExplicitOrigins().length > 0) return;
  if (baseUrlOrigin()) return;
  if (resolvedBaseUrl) {
    try {
      void new URL(resolvedBaseUrl).origin;
      return;
    } catch {
      /* fall through */
    }
  }
  console.warn(
    "[CORS] Production: set CORS_ORIGIN (comma-separated) or a valid BASE_URL so browsers can call the API with credentials.",
  );
}
