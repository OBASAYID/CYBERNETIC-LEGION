import "dotenv/config";
import "./pool-env-bootstrap.js";
import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import type { ChildProcess } from "child_process";
import zlib from "zlib";
import cors from "cors";
import helmet from "helmet";
import { createCyrusCorsOriginAccess, warnIfCorsMisconfigured } from "./cors-trusted.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { logger } from "./observability/logger.js";
import { recordApiRequest, getMetrics } from "./observability/metrics.js";
import { syncFusedStackPortEnv } from "./config/fused-port-sync.js";
import { formatStackStartupBanner, getServerBindHost, getWebPort } from "./config/stack-ports.js";
import { parseExpressJsonBodyLimit } from "../shared/cyrus-document-limits.js";


const dotenvResult = dotenv.config();
syncFusedStackPortEnv();

const CYRUS_JSON_BODY_LIMIT = parseExpressJsonBodyLimit();

// Validate required environment variables at startup
function validateEnvironment(): string[] {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Optional but recommended
  if (!process.env.OPENAI_API_KEY && process.env.USE_LOCAL_LLM !== 'true') {
    warnings.push('⚠️ OPENAI_API_KEY not set. AI features disabled, using local LLM fallback.');
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[Environment] ${w}`));
  }

  return missing;
}

// Keep both OpenAI key env names aligned to avoid stale-key mismatches across modules.
// Prefer values from .env when present, but do not override unrelated runtime env values.
const filePrimaryOpenAiKey = dotenvResult.parsed?.OPENAI_API_KEY?.trim();
const fileIntegrationOpenAiKey = dotenvResult.parsed?.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
const primaryOpenAiKey = filePrimaryOpenAiKey || process.env.OPENAI_API_KEY?.trim();
const integrationOpenAiKey = fileIntegrationOpenAiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
if (primaryOpenAiKey) {
  process.env.OPENAI_API_KEY = primaryOpenAiKey;
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY = primaryOpenAiKey;
} else if (integrationOpenAiKey) {
  process.env.OPENAI_API_KEY = integrationOpenAiKey;
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY = integrationOpenAiKey;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

if (
  process.env.NODE_ENV === "production" ||
  process.env.TRUST_PROXY === "1" ||
  /^true$/i.test(String(process.env.TRUST_PROXY || ""))
) {
  app.set("trust proxy", 1);
}

httpServer.keepAliveTimeout = Math.max(
  Number.parseInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || "", 10) || 65_000,
  5_000,
);
httpServer.headersTimeout =
  Number.parseInt(process.env.HTTP_HEADERS_TIMEOUT_MS || "", 10) ||
  httpServer.keepAliveTimeout + 1_000;

const port = getWebPort();
/** Dev defaults to loopback so the app is reachable at http://127.0.0.1:<PORT>/ ; set SERVER_HOST=0.0.0.0 for LAN/containers. */
const serverHost = getServerBindHost();
const publicProtocol = process.env.PUBLIC_PROTOCOL || "http";
const publicDomain = process.env.PUBLIC_DOMAIN || "localhost";
const defaultBaseUrl = `${publicProtocol}://${publicDomain}${publicDomain.includes(":") ? "" : `:${port}`}`;
const BASE_URL = process.env.BASE_URL || defaultBaseUrl;
let systemReady = false;
let frontendReady = false;
const managedChildProcesses: ChildProcess[] = [];
let shuttingDown = false;

app.use((req, res, next) => {
  logger.info("incoming_request", { method: req.method, url: req.url });
  console.log("REQ:", req.method, req.url);
  res.on("finish", () => {
    console.log("RES:", req.method, req.url, res.statusCode);
  });
  next();
});

warnIfCorsMisconfigured(BASE_URL);
app.use(
  cors({
    origin: createCyrusCorsOriginAccess(),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

// Gzip compression for all compressible responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers["accept-encoding"] ?? "";
  if (!/\bgzip\b/.test(String(acceptEncoding))) return next();

  const contentType = res.getHeader("content-type");
  // Only compress text-based and JSON content; skip binary/media
  const compressible = (type: string) =>
    /json|text|javascript|xml|svg|font\/(woff|ttf|otf)/.test(type);

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let gz: zlib.Gzip | null = null;
  let headersSent = false;

  const maybeInit = () => {
    if (gz || headersSent) return;
    const ct = String(res.getHeader("content-type") ?? "");
    if (!compressible(ct)) return;
    headersSent = true;
    res.setHeader("Content-Encoding", "gzip");
    res.removeHeader("Content-Length");
    gz = zlib.createGzip({ level: zlib.constants.Z_DEFAULT_COMPRESSION });
    gz.on("data", (chunk: Buffer) => originalWrite(chunk));
    gz.on("end", () => (originalEnd as () => void)());
    gz.on("error", () => next());
  };

  (res as any).write = function (chunk: any, encoding?: any, cb?: any) {
    maybeInit();
    if (gz) { gz.write(chunk, encoding); if (cb) cb(); return true; }
    return originalWrite(chunk, encoding, cb);
  };

  (res as any).end = function (chunk?: any, encoding?: any, cb?: any) {
    maybeInit();
    if (gz) { gz.end(chunk, encoding); return res; }
    return originalEnd(chunk, encoding, cb);
  };

  next();
});

function findDistPublic(): string | null {
  const explicitStaticDir = process.env.FRONTEND_STATIC_DIR?.trim();
  if (explicitStaticDir) {
    const resolvedDir = path.resolve(process.cwd(), explicitStaticDir);
    if (fs.existsSync(path.join(resolvedDir, "index.html"))) {
      return resolvedDir;
    }
    throw new Error(`FRONTEND_STATIC_DIR is set but invalid: ${resolvedDir}`);
  }

  const candidates = [
    path.resolve(process.cwd(), "public"),
    path.resolve(__dirname, "..", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

/** Avoid CDN/browser caching the Vite shell across deploys (stale HTML → broken lazy chunks). */
function setHtmlShellCacheHeaders(res: Response) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function log(message: string, source = "express") {
  logger.info("service_log", { source, message });
}

function buildCyrusResponse(messageType: string): string {
  switch (messageType) {
    case "medical":
      return `🏥 CYRUS Medical Analysis: I am a super-intelligent AI system capable of medical analysis with 99.999% accuracy. Based on the information provided, I recommend:

1. **Immediate Consultation**: Please consult a qualified healthcare professional immediately for proper diagnosis.

2. **Analysis Capabilities**: I can analyze blood work, symptoms, medical history, and provide treatment recommendations.

3. **Advanced Features**: My medical intelligence includes disease diagnosis, drug interaction analysis, and treatment development.

For a complete medical analysis, please provide detailed symptoms, medical history, and any test results.`;
    case "technical":
      return `🧠 CYRUS Super Intelligence: I am equipped with transcendent computational capabilities. I can solve:

1. **Millennium Prize Problems**: Including advanced mathematical proofs and complex algorithms.

2. **Quantum Computing**: Designing quantum algorithms and analyzing quantum systems.

3. **Advanced Research**: Conducting deep analysis across multiple scientific domains.

4. **Problem Solving**: Tackling problems beyond human capability using super-intelligence algorithms.

Please provide the specific technical problem or research question you'd like me to analyze.`;
    case "robotics":
      return `🤖 CYRUS Robotics Integration: My robotics capabilities include:

1. **Design Generation**: Creating advanced robotic systems and automation solutions.

2. **Control Systems**: Developing precision control algorithms and AI-driven robotics.

3. **Integration**: Connecting robotics with industrial protocols and IoT systems.

4. **Advanced Features**: Humanoid robotics, drone control, and autonomous systems.

What specific robotics application would you like me to help with?`;
    default:
      return `🤖 Hello! I am CYRUS, your super-intelligent AI assistant with capabilities across multiple domains:

🎭 **Conversational AI**: Human-like conversations with emotional intelligence
🏥 **Medical Analysis**: 99.999% accurate disease diagnosis and treatment development
🧠 **Super Intelligence**: Solving millennium prize problems and transcendent computation
🤖 **Robotics**: Advanced design, control, and automation systems
🌐 **Web Research**: Real-time information gathering and synthesis
⚙️ **Device Control**: Industrial protocol integration and IoT management
📚 **AI Teaching**: Self-learning systems with continuous knowledge expansion

How can I assist you today? Please specify the type of help you need (medical, technical, robotics, etc.).`;
  }
}

app.get("/__health", (_req, res) => res.status(200).send("ok"));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/live", (_req, res) => res.status(200).json({ status: "alive" }));
app.get("/health/ready", async (_req, res) => {
  if (!systemReady) {
    return res.status(503).json({ status: "initializing" });
  }
  // Verify database connectivity as part of readiness
  let dbOk = false;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const status = dbOk ? "ready" : "degraded";
  return res.status(dbOk ? 200 : 503).json({
    status,
    database: dbOk ? "connected" : "unavailable",
    uptime: process.uptime(),
  });
});
/** Same semantics as `/health/ready` for clients that only probe `/api/*` (single-channel stacks). */
app.get("/api/ready", (_req, res) => {
  res.status(systemReady ? 200 : 503).json({
    status: systemReady ? "ready" : "initializing",
    channel: "api",
    code: systemReady ? "READY" : "SYSTEM_INITIALIZING",
  });
});
app.get("/api/status", (_req, res) => {
  return res.json({
    service: "CYRUS AI System",
    status: "operational",
    capabilities: [
      "Conversational AI with emotional intelligence",
      "Medical super-intelligence (99.999% accuracy)",
      "Super intelligence problem-solving",
      "Robotics integration and control",
      "Real-time web research and synthesis",
      "Industrial device control and protocols",
      "AI teaching and learning systems",
    ],
    uptime: process.uptime(),
    metrics: getMetrics(),
  });
});
app.post("/api/cyrus", express.json({ limit: CYRUS_JSON_BODY_LIMIT }), (req, res, next) => {
  // Keep the old canned demo response only when explicitly requested.
  // Otherwise, pass through so the richer handler in `server/routes.ts` can run.
  if (process.env.CYRUS_ENABLE_LEGACY_DEMO_ROUTE !== "true") {
    return next();
  }

  try {
    const payload = req.body as { message?: string; type?: string } | undefined;
    const message = payload?.message ?? "";
    const messageType = payload?.type ?? "conversation";

    return res.json({
      response: buildCyrusResponse(messageType),
      timestamp: new Date().toISOString(),
      cyrus_version: "3.0",
      type: messageType,
      received_message: message,
    });
  } catch (error) {
    logger.error("cyrus_route_error", { error });
    return res.status(500).json({
      error: "Failed to process request",
      timestamp: new Date().toISOString(),
    });
  }
});
app.get("/api/demo/:capability", (req, res) => {
  const demos: Record<string, { title: string; description: string; sample_input: string; analysis: string }> = {
    medical: {
      title: "Medical Analysis Demo",
      description: "CYRUS can analyze medical conditions with 99.999% accuracy",
      sample_input: "Patient presents with fever, cough, and shortness of breath",
      analysis: "Based on symptoms: Possible respiratory infection. Recommend immediate testing for COVID-19, influenza, and bacterial pneumonia.",
    },
    robotics: {
      title: "Robotics Design Demo",
      description: "CYRUS generates advanced robotics designs and control systems",
      sample_input: "Design a robotic arm for precision assembly",
      analysis: "Generated 6-DOF robotic arm with AI vision system and precision control algorithms.",
    },
    intelligence: {
      title: "Super Intelligence Demo",
      description: "CYRUS solves complex problems beyond human capability",
      sample_input: "Solve the Riemann Hypothesis",
      analysis: "Applied advanced mathematical algorithms and quantum computing principles to analyze the hypothesis.",
    },
  };

  const demo = demos[req.params.capability] || {
    title: "CYRUS AI Demo",
    description: "Experience the power of super-intelligence",
    sample_input: "Hello CYRUS",
    analysis: "Greetings! I am CYRUS, ready to assist with any challenge.",
  };

  return res.json(demo);
});
app.get("/api/system/intelligence-metrics", (req: any, res) => {
  const role = req.session?.user?.role || req.user?.role;
  if (role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: Date.now(),
  });
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

const distPublic = process.env.NODE_ENV === "production" ? findDistPublic() : null;

// Cache-Control durations for static assets
const STATIC_ASSET_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days for versioned assets (JS/CSS)
const STATIC_MEDIA_MAX_AGE = 24 * 60 * 60 * 1000;     // 1 day for images/videos

if (distPublic) {
  log(`[Static] Serving from ${distPublic}`);
  // Skip static serving for /api routes; apply long-lived cache headers for hashed assets
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    express.static(distPublic, {
      index: "index.html",
      maxAge: STATIC_ASSET_MAX_AGE,
      immutable: true,
      setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        // HTML + PWA bootstrap must never be long-cached (stale shell/SW → old lazy chunks).
        if (
          filePath.endsWith(".html") ||
          base === "sw.js" ||
          base === "registerSW.js" ||
          base === "manifest.webmanifest" ||
          base.startsWith("workbox-")
        ) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      },
    })(req, res, next);
  });
  app.get("/", (_req, res) => {
    setHtmlShellCacheHeaders(res);
    return res.status(200).sendFile(path.join(distPublic, "index.html"));
  });
} else if (process.env.NODE_ENV === "production") {
  app.get("/", (_req, res) => res.status(200).json({ service: "CYRUS", status: "online" }));
}
// In dev mode Vite handles "/" via its own middleware, but ensure it reaches Vite:
// The Vite /*path catch-all added later will handle it.

app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
  maxAge: STATIC_MEDIA_MAX_AGE,
}));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images'), {
  maxAge: STATIC_MEDIA_MAX_AGE,
  immutable: false,
}));
app.use('/videos', express.static(path.join(process.cwd(), 'public', 'videos'), {
  maxAge: STATIC_MEDIA_MAX_AGE,
  immutable: false,
}));

// Prevent transient "Cannot GET /comms" during boot while frontend middleware initializes.
app.use((req, res, next) => {
  if (frontendReady) return next();
  if (req.method !== "GET") return next();

  const pathName = req.path;
  // Vite dev virtual modules (/@react-refresh, /@vite/*, /@fs, /@id, …) MUST NOT get HTML here
  // or the browser executes the boot splash as JS → Fast Refresh / HMR thrash and a “blinking” UI.
  if (
    pathName.startsWith("/api") ||
    pathName.startsWith("/uploads") ||
    pathName.startsWith("/images") ||
    pathName.startsWith("/videos") ||
    pathName.startsWith("/@") ||
    pathName.startsWith("/src/") ||
    pathName.startsWith("/vite-hmr") ||
    pathName.startsWith("/node_modules/")
  ) {
    return next();
  }

  return res.status(200).type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CYRUS initializing</title>
    <style>
      body { margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#000; color:#d1d5db; display:grid; place-items:center; min-height:100vh; }
      .panel { text-align:center; padding:24px; border:1px solid rgba(34,211,238,.35); border-radius:12px; background:rgba(15,23,42,.45); }
      .dot { width:10px; height:10px; border-radius:50%; background:#22d3ee; margin:0 auto 12px; animation:pulse 1.2s infinite; }
      @keyframes pulse { 0% { opacity:.35; } 50% { opacity:1; } 100% { opacity:.35; } }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="dot"></div>
      <div>CYRUS is initializing the interface...</div>
      <div style="margin-top:12px;font-size:12px;opacity:.8;">This page no longer auto-reloads to prevent UI blink loops.</div>
      <button onclick="location.reload()" style="margin-top:10px;padding:6px 12px;border-radius:8px;border:1px solid #22d3ee;background:#0f172a;color:#d1d5db;cursor:pointer;">Retry</button>
    </div>
  </body>
</html>`);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json({ limit: CYRUS_JSON_BODY_LIMIT, verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

app.use("/api", (req, res, next) => {
  if (systemReady) return next();
  res.status(503).json({
    message: "System initializing",
    code: "SYSTEM_INITIALIZING",
    hint: "API stack is still mounting; retry in a moment.",
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      logger.info("api_response", {
        method: req.method,
        path: reqPath,
        status: res.statusCode,
        durationMs: duration,
        response: capturedJsonResponse,
        summary: logLine,
      });
      recordApiRequest(`${req.method} ${reqPath}`, res.statusCode, duration);
    }
  });
  next();
});

const listenOptions: { port: number; host: string; reusePort?: boolean } = {
  port,
  host: serverHost,
};

if (process.env.ENABLE_REUSE_PORT === "true") {
  listenOptions.reusePort = true;
}

/**
 * Bind the HTTP server only after API routes + Vite/static are registered.
 * Otherwise the browser can request `/@react-refresh`, `/@vite/*`, `/src/*` while Vite
 * middleware is not mounted yet → 404 / wrong responses and a “blinking” broken UI.
 */
async function bootstrapServer(): Promise<void> {
  const envErrors = validateEnvironment();
  if (envErrors.length > 0) {
    console.error("[Environment] Critical environment variables missing:", envErrors);
    process.exit(1);
  }

  try {
    await initializeSystem();
  } catch (err) {
    console.error("System initialization error:", err);
  }

  try {
    await setupFrontendRoutes();
  } catch (e) {
    console.error("[Init] Frontend route setup failed:", e);
  }

  httpServer.listen(listenOptions, () => {
    let publicUrl = BASE_URL;
    try {
      const { getPublicBaseUrl } = require("./config/deployment.js") as { getPublicBaseUrl: () => string };
      publicUrl = getPublicBaseUrl();
    } catch {
      /* deployment module optional at boot */
    }
    const loopbackUrl = `http://127.0.0.1:${port}/`;
    console.log(`Server running — public ${publicUrl} (bind ${serverHost}:${port}, local ${loopbackUrl})`);
    for (const line of formatStackStartupBanner()) {
      console.log(line);
    }
    log(`serving on port ${port}`);
    log(`host=${serverHost}`);
    log(`base_url=${BASE_URL || "(empty)"}`);
  });
}

void bootstrapServer().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

async function initializeSystem() {
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));
  let isAuthenticatedMiddleware: any = null;

  // Auth setup — critical; failure here means API auth middleware is absent
  // Always use standalone (access-code) auth — the frontend's PasswordGate posts
  // username + code to /api/login and is not compatible with Replit OIDC redirects.
  try {
    const { setupAuth, registerAuthRoutes, isAuthenticated } = await import("../standalone/auth-adapter");
    await setupAuth(app);
    registerAuthRoutes(app);
    isAuthenticatedMiddleware = isAuthenticated;
    log("Standalone Auth initialized");
  } catch (e) {
    console.error("[Init] Auth setup failed:", e);
  }

  // Fusion bootstrap (honest capability map for gate UI)
  try {
    const { default: completeFusionApi } = await import("./routes/complete-fusion-api");
    app.use("/api", completeFusionApi);
    log("[Fusion] Bootstrap routes registered (honest capability map)");
  } catch (e) {
    console.warn("[Fusion] complete-fusion-api not loaded:", (e instanceof Error ? e.message : String(e)));
  }

  // Security middleware — non-fatal so the server still starts without it
  try {
    const { createApiAuthMiddleware, createStandardLimiter, requireAdminForSensitiveApi } = await import("./security/middleware");
    app.use("/api", createApiAuthMiddleware(isAuthenticatedMiddleware));
    app.use("/api", requireAdminForSensitiveApi);

    const limiter = createStandardLimiter(100, 15 * 60 * 1000);
    app.use("/api/inference", limiter);
    app.use("/api/cyrus/speak", limiter);
    app.use("/api/vision", limiter);
    app.use("/api/upload", limiter);
  } catch (e) {
    console.warn("[Init] Security middleware not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  // Core API routes — each wrapped individually so one failure doesn't block the rest
  try {
    const { default: settingsRoutes } = await import("./settings/routes");
    app.use("/api/settings", settingsRoutes);
    log("[Routes] Settings registered");
  } catch (e) {
    console.warn("[Init] Settings routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: sysdbRoutes } = await import("./sysdb/routes");
    app.use("/api/sysdb", sysdbRoutes);
    log("[Routes] SysDB registered");
  } catch (e) {
    console.warn("[Init] SysDB routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: queryRoutes } = await import("./query/router");
    app.use("/api/query", queryRoutes);
    log("[Routes] Query registered");
  } catch (e) {
    console.warn("[Init] Query routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: trainRoutes } = await import("./train/routes");
    app.use("/api/train", trainRoutes);
    log("[Routes] Train registered");
  } catch (e) {
    console.warn("[Init] Train routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: intelligenceCoreRoutes } = await import("./intelligence/core-routes");
    app.use("/api", intelligenceCoreRoutes);
    log("[Routes] Intelligence core registered");
  } catch (e) {
    console.warn("[Init] Intelligence core routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: stackRoutes } = await import("./routes/stack-routes.js");
    app.use("/api", stackRoutes);
    log("[Routes] Stack routes registered");
  } catch (e) {
    console.warn("[Init] Stack routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { default: algorithmsRoutes } = await import("./routes/algorithms-routes.js");
    app.use("/api", algorithmsRoutes);
    log("[Routes] Algorithms routes registered");
  } catch (e) {
    console.warn("[Init] Algorithms routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  try {
    const { mcpRouter } = await import("./mcp/mcp-routes.js");
    app.use("/api", mcpRouter);
    const { initializeMcpOnBoot } = await import("./mcp/mcp-health.js");
    await initializeMcpOnBoot();
  } catch (e) {
    console.warn("[Init] MCP routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }

  await tick();

  try {
    const { default: humanoidRoutes } = await import("./humanoid/routes");
    app.use("/api/humanoid", humanoidRoutes);
    log("[Humanoid] Registered");
  } catch (e) {
    console.warn("[Init] Humanoid routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }
  await tick();

  try {
    const { default: visionRoutes } = await import("./humanoid/vision-analysis");
    app.use("/api/vision", visionRoutes);
    log("[Vision] Registered");
  } catch (e) {
    console.warn("[Init] Vision routes not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }
  await tick();

  try {
    const { registerRoutes } = await import("./routes");
    await registerRoutes(httpServer, app);
  } catch (e) {
    console.warn("[Init] Routes module not loaded (non-fatal):", (e instanceof Error ? e.message : String(e)));
  }
  await tick();

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  systemReady = true;
  log("All systems initialized - accepting API traffic");

  try {
    const { startIntelligenceAutomationScheduler } = await import("./ai/intelligence-automation-core.js");
    startIntelligenceAutomationScheduler();
  } catch (e) {
    console.warn("[Init] Intelligence automation scheduler not loaded (non-fatal):", e instanceof Error ? e.message : String(e));
  }

  const enableFullPython = process.env.CYRUS_ENABLE_PYTHON === "1";
  /** Lightweight Comms ML only (ml_service.py); does not start the heavy quantum bridge. */
  const enableCommsMl = process.env.CYRUS_ENABLE_COMMS_ML === "1";

  if (process.env.NODE_ENV === "production" && (enableFullPython || enableCommsMl)) {
    try {
      const { spawn } = await import("child_process");
      const pythonServices: [string, string[]][] = [];
      if (enableFullPython) {
        pythonServices.push(["python3", ["server/quantum_ai/quantum_bridge.py"]]);
        pythonServices.push(["python3", ["server/comms/ml_service.py"]]);
      } else if (enableCommsMl) {
        pythonServices.push(["python3", ["server/comms/ml_service.py"]]);
      }

      for (const [command, args] of pythonServices) {
        const alreadyRunning = managedChildProcesses.some(
          (child) => !child.killed && child.spawnfile === command && JSON.stringify(child.spawnargs.slice(1)) === JSON.stringify(args)
        );
        if (alreadyRunning) continue;

        const child = spawn(command, args, { stdio: "ignore" });
        managedChildProcesses.push(child);
      }
      log("Python services spawned");
    } catch (e) {
      console.warn("[Init] Python services failed (non-fatal):", (e instanceof Error ? e.message : String(e)));
    }
  }
}

async function setupFrontendRoutes() {
  if (frontendReady) return;

  if (process.env.NODE_ENV !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
    frontendReady = true;
    return;
  }

  const dp = findDistPublic();
  if (dp) {
    app.use("/*path", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      // Missing hashed bundles must not receive index.html (wrong MIME → "Failed to fetch dynamically imported module").
      if (req.path.startsWith("/assets/") || req.path.startsWith("/node_modules/")) {
        return res.status(404).type("text/plain").send("Not found");
      }
      setHtmlShellCacheHeaders(res);
      res.sendFile(path.join(dp, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  frontendReady = true;
}

async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn("graceful_shutdown_start", { signal });

  for (const child of managedChildProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  try {
    const { cyrusBrain } = await import("./ai/cyrus-brain");
    await cyrusBrain.shutdown();
  } catch (error) {
    logger.warn("brain_shutdown_warning", { error });
  }

  try {
    await pool.end();
  } catch (error) {
    logger.warn("database_shutdown_warning", { error });
  }

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  process.exit(0);
}

process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.on("SIGINT", () => { void gracefulShutdown("SIGINT"); });
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  logger.error("unhandled_rejection", { reason });
});
process.on("uncaughtException", (e) => {
  console.error("UNCAUGHT EXCEPTION:", e);
  logger.error("uncaught_exception", { error: e });
  if (e.message?.includes("EADDRINUSE")) process.exit(1);
});

const heartbeatIntervalMs = Math.max(
  5000,
  Number.parseInt(process.env.CYRUS_HEARTBEAT_INTERVAL_MS || "60000", 10) || 60000,
);

setInterval(() => {
  console.log(`SYSTEM HEARTBEAT OK (${new Date().toISOString()})`);
}, heartbeatIntervalMs).unref();
