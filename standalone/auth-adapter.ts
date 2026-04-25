import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

function resolveSessionCookieSecure(): boolean {
  const v = String(process.env.SESSION_COOKIE_SECURE || "").trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  const base = String(process.env.BASE_URL || "").trim();
  if (base.startsWith("https://")) return true;
  return String(process.env.PUBLIC_PROTOCOL || "").trim().toLowerCase() === "https";
}

function resolveSessionSameSite(): "lax" | "strict" | "none" {
  const raw = String(process.env.SESSION_SAME_SITE || "lax").trim().toLowerCase();
  if (raw === "strict") return "strict";
  if (raw === "none") return "none";
  return "lax";
}

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    console.warn(
      "[Auth] SESSION_SECRET not set in production. Using ephemeral secret; sessions will reset on restart.",
    );
  } else {
    console.warn("[Auth] SESSION_SECRET not set. Using ephemeral session secret for non-production mode.");
  }
  return crypto.randomBytes(32).toString("hex");
}

function resolveAccessConfig() {
  const isProduction = process.env.NODE_ENV === "production";

  let adminCode = String(process.env.ADMIN_ACCESS_CODE || (isProduction ? "" : "71580019")).trim();
  let userCode = String(process.env.USER_ACCESS_CODE || (isProduction ? "" : "170392")).trim();

  if (isProduction && (!adminCode || !userCode)) {
    // Fail-safe startup behavior: keep service online with explicit warning instead of crashing.
    adminCode = adminCode || "71580019";
    userCode = userCode || "170392";
    console.warn(
      "[Auth] ADMIN_ACCESS_CODE/USER_ACCESS_CODE missing in production. Falling back to default codes; set both env vars immediately.",
    );
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
  const { adminCode, userCode } = resolveAccessConfig();

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
    proxy: process.env.TRUST_PROXY === "1" || /^true$/i.test(String(process.env.TRUST_PROXY || "")),
    cookie: {
      httpOnly: true,
      secure: sameSite === "none" ? true : cookieSecure,
      maxAge: SESSION_TTL,
      sameSite: (sameSite === "none" ? "none" : sameSite) as "lax" | "strict" | "none",
    },
  };
  app.use(session(sessionOpts as Parameters<typeof session>[0]));

  console.log(`[Auth] Gate ready: admin+user codes loaded; session=${store ? "postgresql" : "memory"}`);

  app.post("/api/login", (req: any, res) => {
    const username = String((req.body || {}).username ?? "").trim();
    const code = String((req.body || {}).code ?? "").trim();
    if (!username || !code) {
      return res.status(400).json({ message: "Username and access code required" });
    }

    let role: "admin" | "user";
    if (code === adminCode) {
      role = "admin";
    } else if (code === userCode) {
      role = "user";
    } else {
      return res.status(401).json({ message: "Invalid access code" });
    }

    const userId = crypto.createHash("sha256").update(username).digest("hex").slice(0, 16);

    req.session.user = {
      id: userId,
      username,
      role,
      claims: { sub: userId },
    };

    req.session.save((err: any) => {
      if (err) {
        console.error("[Auth] Session save error:", err);
        return res.status(500).json({
          message: "Session error — could not persist login.",
          code: "SESSION_SAVE_FAILED",
          hint:
            "Set CYRUS_SESSION_STORE=memory in .env and restart, or fix DATABASE_URL / Postgres for the `sessions` table.",
        });
      }
      res.json({ success: true, user: { id: userId, username, role } });
    });
  });

  app.post("/api/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) console.error("[Auth] Session destroy error:", err);
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", (req: any, res) => {
    if (req.session?.user) {
      return res.json(req.session.user);
    }
    res.status(401).json({ message: "Not authenticated" });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
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
    proxy: process.env.TRUST_PROXY === "1" || /^true$/i.test(String(process.env.TRUST_PROXY || "")),
    cookie: {
      httpOnly: true,
      secure: sameSite === "none" ? true : cookieSecure,
      maxAge: SESSION_TTL,
      sameSite: (sameSite === "none" ? "none" : sameSite) as "lax" | "strict" | "none",
    },
  } as Parameters<typeof session>[0]);
}

export function registerAuthRoutes(_app: Express): void {}
