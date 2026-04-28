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

  const trusted = baseUrlOrigin() ?? inferredOriginFromPublicEnv();
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (!!trusted && origin === trusted) {
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
