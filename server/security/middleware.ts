import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

const PUBLIC_API_PATHS = new Set([
  "/api/login",
  "/api/callback",
  "/api/logout",
  /** Session probe used by the UI gate and `useAuthSession`; must not be blocked by `isAuthenticated` middleware. */
  "/api/auth/user",
  "/api/ready",
  /** Fusion bootstrap (also served earlier by `complete-fusion-api` when enabled). Public so the gate never depends on session order. */
  "/api/fusion/bootstrap",
  "/api/fusion/handshake",
  /** Port / stack discovery for dashboard and local tooling (no secrets). */
  "/api/stack/ports",
  "/api/stack/summary",
  "/api/algorithms/catalog",
  "/api/mcp/catalog",
  "/api/mcp/status",
  "/api/mcp/health",
  /** Live broadcast news feed — public RSS proxy, no secrets exposed */
  "/api/news/rss",
]);

function getFullApiPath(req: Parameters<RequestHandler>[0]): string {
  return `${req.baseUrl || ""}${req.path || ""}`;
}

/** `<img>` / `<video>` cannot send `x-cyrus-session-token`; comms media uses opaque filenames. */
function isPublicCommsMediaGet(req: Parameters<RequestHandler>[0]): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const apiPath = getFullApiPath(req);
  if (apiPath.startsWith("/api/comms/media/")) return true;
  if (apiPath.startsWith("/api/assets/file/")) return true;
  if (/\/api\/comms\/gwa\/sessions\/[^/]+\/report\/html$/.test(apiPath)) return true;
  return false;
}

export function createApiAuthMiddleware(isAuthenticated: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const apiPath = getFullApiPath(req);
    if (PUBLIC_API_PATHS.has(apiPath) || isPublicCommsMediaGet(req)) {
      return next();
    }
    return isAuthenticated(req, res, next);
  };
}

export const requireAdmin: RequestHandler = (req: any, res, next) => {
  const role = req.session?.user?.role || req.user?.role;
  if (role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden" });
};

export function requireRole(role: string): RequestHandler {
  const normalized = role.trim().toLowerCase();
  return (req: any, res, next) => {
    const currentRole = String(req.session?.user?.role || req.user?.role || "").trim().toLowerCase();
    if (currentRole !== normalized) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

export const requireAdminForSensitiveApi: RequestHandler = (req, res, next) => {
  const apiPath = getFullApiPath(req);
  const protectedPrefixes = ["/api/settings/keys", "/api/sysdb", "/api/query", "/api/train", "/api/platform/action", "/api/training/trigger"];

  const protectedExactPaths = new Set([
    "/api/system/train",
    "/api/system/model/safeguard/evaluate",
  ]);

  if (protectedPrefixes.some((prefix) => apiPath.startsWith(prefix)) || protectedExactPaths.has(apiPath)) {
    return requireAdmin(req, res, next);
  }

  return next();
};

export function createStandardLimiter(max = 100, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}