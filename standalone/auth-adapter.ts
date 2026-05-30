import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_TTL_MS = SESSION_TTL;

type SessionUser = {
  id: string;
  username: string;
  role: "admin" | "user";
  claims: { sub: string };
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSessionTokenSecret(): string {
  const explicit = String(process.env.CYRUS_SESSION_TOKEN_SECRET || "").trim();
  if (explicit) return explicit;
  return `${resolveSessionSecret()}::cyrus-session-token`;
}

function issueSessionToken(user: SessionUser): string {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + SESSION_TOKEN_TTL_MS,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSessionTokenSecret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string): SessionUser | null {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = crypto.createHmac("sha256", getSessionTokenSecret()).update(payloadB64).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64)) as {
      sub?: string;
      username?: string;
      role?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.username || (parsed.role !== "admin" && parsed.role !== "user")) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return {
      id: parsed.sub,
      username: parsed.username,
      role: parsed.role,
      claims: { sub: parsed.sub },
    };
  } catch {
    return null;
  }
}

function readSessionTokenFromRequest(req: any): string | null {
  const header = String(req.get?.("x-cyrus-session-token") || "").trim();
  if (header) return header;
  const auth = String(req.get?.("authorization") || "").trim();
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return null;
}

function resolveSessionCookieSecure(): boolean {
  const v = String(process.env.SESSION_COOKIE_SECURE || "").trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  if (process.env.NODE_ENV === "production") return true;
  const base = String(process.env.BASE_URL || "").trim();
  if (base.startsWith("https://")) return true;
  return String(process.env.PUBLIC_PROTOCOL || "").trim().toLowerCase() === "https";
}

function isRailwayEnvironment(): boolean {
  return !!process.env.RAILWAY_ENVIRONMENT_ID || !!process.env.RAILWAY_DEPLOYMENT_ID;
}

function resolveTrustProxy(): boolean {
  if (process.env.TRUST_PROXY === "1" || /^true$/i.test(String(process.env.TRUST_PROXY || ""))) {
    return true;
  }
  if (isRailwayEnvironment()) {
    console.log("[Auth] Railway environment detected — enabling trust proxy automatically");
    return true;
  }
  return false;
}

function resolveSessionSameSite(): "lax" | "strict" | "none" {
  const defaultSameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
  const raw = String(process.env.SESSION_SAME_SITE || defaultSameSite).trim().toLowerCase();
  if (raw === "strict") return "strict";
  if (raw === "none") return "none";
  if (raw === "lax") return "lax";

  // Default: use "lax" for HTTP, "none" for HTTPS (requires secure flag)
  const isHttps =
    String(process.env.PUBLIC_PROTOCOL || "").trim().toLowerCase() === "https" ||
    String(process.env.BASE_URL || "").trim().startsWith("https://");
  return isHttps ? "none" : "lax";
}

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  console.warn("[Auth] SESSION_SECRET not set. Using ephemeral session secret for non-production mode.");
  return crypto.randomBytes(32).toString("hex");
}

function resolveAccessConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  const adminCode = String(process.env.ADMIN_ACCESS_CODE || (isProduction ? "" : "71580019")).trim();
  const userCode = String(process.env.USER_ACCESS_CODE || (isProduction ? "" : "170392")).trim();

  if (isProduction && (!adminCode || !userCode)) {
    throw new Error("ADMIN_ACCESS_CODE and USER_ACCESS_CODE must be set in production.");
  }

  return { adminCode, userCode };
}

/** PostgreSQL-backed sessions when DATABASE_URL is set; otherwise in-memory (login always works for demos / bad DB). */
function buildSessionStore() {
  const db = String(process.env.DATABASE_URL || "").trim();
  const forceMemory = /^memory$/i.test(String(process.env.CYRUS_SESSION_STORE || "").trim());

  if (forceMemory) {
    console.warn(
      "[Auth] CYRUS_SESSION_STORE=memory — sessions are in-memory only (avoids Postgres `sessions` table / connection issues).",
    );
    return undefined;
  }

  if (!db) {
    console.warn(
      "[Auth] DATABASE_URL not set — using in-memory sessions (logins succeed; sessions clear when the process restarts).",
    );
    return undefined;
  }

  const PgStore = connectPg(session);
  return new PgStore({
    conString: db,
    createTableIfMissing: true,
    ttl: SESSION_TTL,
    tableName: "sessions",
  });
}

export async function setupAuth(app: Express): Promise<void> {
  // Lazy-load activity helpers — non-fatal if the module isn't ready yet.
  async function tryActivity() {
    try {
      return await import("../server/auth/auth-activity.js");
    } catch {
      return null;
    }
  }

  // Token-first auth routes are mounted before session middleware so login cannot hang on session-store I/O.
  app.post("/api/login", async (req: any, res) => {
    console.log("[Auth] /api/login token-first handler invoked");
    const username = String((req.body || {}).username ?? "").trim();
    const code = String((req.body || {}).code ?? "").trim();
    if (!username || !code) {
      return res.status(400).json({ message: "Username and access code required" });
    }

    const activity = await tryActivity();
    const ip = activity?.getIp(req) ?? null;

    // Check if user is blocked before doing anything else.
    if (activity) {
      const blocked = await activity.isUserBlocked(username).catch(() => false);
      if (blocked) {
        void activity.logActivity({ username, eventType: "login_blocked", ipAddress: ip });
        return res.status(403).json({ message: "ACCESS DENIED", hint: "Account restricted" });
      }
    }

    // Resolve live codes (DB/env) plus deterministic local fallback defaults for
    // recovery scenarios where stored codes drift from expected operator values.
    let adminCode: string;
    let userCode: string;
    try {
      const { getAccessCodes } = await import("../server/auth/access-code-store.js");
      const codes = await getAccessCodes();
      adminCode = codes.adminCode;
      userCode = codes.userCode;
    } catch {
      const fallback = resolveAccessConfig();
      adminCode = fallback.adminCode;
      userCode = fallback.userCode;
    }

    const fallback = resolveAccessConfig();
    const legacyRecoveryAdminCode = process.env.NODE_ENV === "production" ? "" : "71580019";
    const legacyRecoveryUserCode = process.env.NODE_ENV === "production" ? "" : "170392";
    const validAdminCodes = new Set([adminCode, fallback.adminCode, legacyRecoveryAdminCode].filter(Boolean));
    const validUserCodes = new Set([userCode, fallback.userCode, legacyRecoveryUserCode].filter(Boolean));

    let role: "admin" | "user";
    if (validAdminCodes.has(code)) {
      role = "admin";
    } else if (validUserCodes.has(code)) {
      role = "user";
    } else {
      void activity?.logActivity({ username, eventType: "login_failed", details: "Invalid access code", ipAddress: ip });
      return res.status(401).json({ message: "Invalid access code" });
    }

    const userId = crypto.createHash("sha256").update(username).digest("hex").slice(0, 16);
    const user: SessionUser = {
      id: userId,
      username,
      role,
      claims: { sub: userId },
    };
    const sessionToken = issueSessionToken(user);

    // Record session and log success (non-blocking).
    if (activity) {
      void activity.recordSession({ token: sessionToken, username, role, ipAddress: ip });
      void activity.logActivity({ username, eventType: "login_success", details: role, ipAddress: ip });
    }

    console.log(`[Auth] /api/login token-first success for ${username} (${role})`);
    res.json({ success: true, user: { id: userId, username, role, isAdmin: role === "admin" }, sessionToken });
  });

  app.get("/api/auth/user", async (req: any, res, next) => {
    console.log("[Auth] /api/auth/user token-first handler invoked");
    const token = readSessionTokenFromRequest(req);
    if (token) {
      const tokenUser = verifySessionToken(token);
      if (tokenUser) {
        // Check if token was revoked by an admin action.
        const activity = await tryActivity();
        if (activity) {
          const revoked = await activity.isTokenRevoked(token).catch(() => false);
          if (revoked) {
            return res.status(401).json({ message: "Session revoked" });
          }
          void activity.touchSession(token);
        }
        return res.json({ ...tokenUser, isAdmin: tokenUser.role === "admin" });
      }
    }
    return next();
  });

  app.post("/api/logout", async (req: any, res) => {
    const token = readSessionTokenFromRequest(req);
    if (token) {
      const activity = await tryActivity();
      if (activity) {
        const tokenUser = verifySessionToken(token);
        void activity.revokeSessionByHash(
          require("crypto").createHash("sha256").update(token).digest("hex").slice(0, 64)
        );
        void activity.logActivity({ username: tokenUser?.username, eventType: "logout" });
      }
    }
    res.json({ success: true });
  });

  app.post("/api/logout-all", async (req: any, res) => {
    const token = readSessionTokenFromRequest(req);
    let user: SessionUser | null = null;
    if (token) user = verifySessionToken(token);
    if (!user) user = req.session?.user ?? null;
    if (!user?.id) return res.status(401).json({ error: "Not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin access required" });

    const activity = await tryActivity();
    let revoked = 0;
    if (activity) {
      const sessions = await activity.getActiveSessions().catch(() => []);
      await Promise.all(sessions.map((s) => activity.revokeSessionByHash(s.tokenHash).catch(() => {})));
      revoked = sessions.length;
      void activity.logActivity({ username: user.username, eventType: "session_revoked", details: `All sessions (${revoked})` });
    }
    console.log(`[Auth] /api/logout-all invoked by admin ${user.username}, revoked ${revoked} sessions`);
    res.json({ success: true, message: `All sessions invalidated (${revoked} revoked)` });
  });

  const store = buildSessionStore();
  const cookieSecure = resolveSessionCookieSecure();
  const sameSite = resolveSessionSameSite();
  if (sameSite === "none" && !cookieSecure) {
    console.warn("[Auth] sameSite=none requires secure cookies — enabling secure session cookie.");
  }
  const sessionOpts = {
    ...(store ? { store } : {}),
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    proxy: resolveTrustProxy(),
    cookie: {
      httpOnly: true,
      secure: cookieSecure || sameSite === "none",
      maxAge: SESSION_TTL,
      sameSite: sameSite as "lax" | "strict" | "none",
      path: "/",
    },
  };

  // Log the cookie configuration for debugging
  console.log(`[Auth] Session cookie config:`, {
    secure: sessionOpts.cookie.secure,
    sameSite: sessionOpts.cookie.sameSite,
    httpOnly: sessionOpts.cookie.httpOnly,
    path: sessionOpts.cookie.path,
    maxAge: sessionOpts.cookie.maxAge,
    trustProxy: sessionOpts.proxy,
  });

  app.use(session(sessionOpts as Parameters<typeof session>[0]));

  console.log(`[Auth] Session cookie config:`, {
    secure: sessionOpts.cookie.secure,
    sameSite: sessionOpts.cookie.sameSite,
    httpOnly: sessionOpts.cookie.httpOnly,
    maxAge: sessionOpts.cookie.maxAge,
    trustProxy: sessionOpts.proxy,
  });
  // Add middleware to log Set-Cookie headers for debugging
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      const setCookie = res.getHeader("set-cookie");
      if (setCookie) {
        console.log("[Auth] Set-Cookie header sent:", setCookie);
      }
      return originalSend.call(this, data);
    };
    next();
  });

  console.log(`[Auth] Gate ready: admin+user codes loaded; session=${store ? "postgresql" : "memory"}`);

  app.get("/api/auth/user", (req: any, res) => {
    if (req.session?.user) {
      const sessionUser = req.session.user;
      return res.json({ ...sessionUser, isAdmin: sessionUser.role === "admin" });
    }
    const token = readSessionTokenFromRequest(req);
    if (token) {
      const tokenUser = verifySessionToken(token);
      if (tokenUser) return res.json({ ...tokenUser, isAdmin: tokenUser.role === "admin" });
    }
    res.status(401).json({ message: "Not authenticated" });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }
  const token = readSessionTokenFromRequest(req);
  if (token) {
    const tokenUser = verifySessionToken(token);
    if (tokenUser) {
      req.user = tokenUser;
      return next();
    }
  }
  res.status(401).json({ message: "Authentication required" });
};

export function getSession() {
  const store = buildSessionStore();
  const cookieSecure = resolveSessionCookieSecure();
  const sameSite = resolveSessionSameSite();
  return session({
    ...(store ? { store } : {}),
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    proxy: resolveTrustProxy(),
    cookie: {
      httpOnly: true,
      secure: cookieSecure || sameSite === "none",
      maxAge: SESSION_TTL,
      sameSite: sameSite as "lax" | "strict" | "none",
      path: "/",
    },
  } as Parameters<typeof session>[0]);
}

export function registerAuthRoutes(_app: Express): void {}
