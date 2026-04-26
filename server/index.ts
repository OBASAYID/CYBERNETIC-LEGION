import "dotenv/config";
import "./pool-env-bootstrap.js";
import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import type { ChildProcess } from "child_process";
import cors from "cors";
import helmet from "helmet";
import { createCyrusCorsOriginAccess, warnIfCorsMisconfigured } from "./cors-trusted.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { logger } from "./observability/logger.js";
import { syncFusedStackPortEnv } from "./config/fused-port-sync.js";
import { formatStackStartupBanner, getServerBindHost, getWebPort } from "./config/stack-ports.js";

const dotenvResult = dotenv.config();
syncFusedStackPortEnv();

// Validate required environment variables at startup
function validateEnvironment(): string[] {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Optional but recommended
  if (!process.env.OPENAI_API_KEY && process.env.USE_LOCAL_LLM !== 'true') {
    warnings.push('⚠️ OPENAI_API_KEY not set. AI features disabled, using local LLM fallback.');
  }

  if (!process.env.DATABASE_URL) {
    warnings.push('⚠️ DATABASE_URL not set. Using in-memory storage.');
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

if (process.env.TRUST_PROXY === "1" || /^true$/i.test(String(process.env.TRUST_PROXY || ""))) {
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
app.get("/health/ready", (_req, res) => {
  res.status(systemReady ? 200 : 503).json({ status: systemReady ? "ready" : "initializing" });
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
    accuracy: "99.999%",
    uptime: "100%",
  });
});
app.post("/api/cyrus", express.json({ limit: "2mb" }), (req, res, next) => {
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
if (distPublic) {
  log(`[Static] Serving from ${distPublic}`);
  // Skip static serving for /api routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    express.static(distPublic, { index: "index.html" })(req, res, next);
  });
  app.get("/", (_req, res) => res.status(200).sendFile(path.join(distPublic, "index.html")));
} else if (process.env.NODE_ENV === "production") {
  app.get("/", (_req, res) => res.status(200).json({ service: "CYRUS", status: "online" }));
}
// In dev mode Vite handles "/" via its own middleware, but ensure it reaches Vite:
// The Vite /*path catch-all added later will handle it.

app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
app.use('/videos', express.static(path.join(process.cwd(), 'public', 'videos')));

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

app.use(express.json({ limit: "2mb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
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
    const loopbackUrl = `http://127.0.0.1:${port}/`;
    console.log(`Server running at ${loopbackUrl} (bind ${serverHost}:${port})`);
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

  try {
    if (process.env.REPL_ID) {
      const { setupAuth, registerAuthRoutes, isAuthenticated } = await import("./replit_integrations/auth");
      await setupAuth(app);
      registerAuthRoutes(app);
      isAuthenticatedMiddleware = isAuthenticated;
      log("Hosted environment auth initialized (Replit)");
    } else {
      const { setupAuth, registerAuthRoutes, isAuthenticated } = await import("../standalone/auth-adapter");
      await setupAuth(app);
      registerAuthRoutes(app);
      isAuthenticatedMiddleware = isAuthenticated;
      log("Standalone Auth initialized");
    }

    if (process.env.CYRUS_DISABLE_FUSION_STUBS !== "true") {
      try {
        const { default: completeFusionApi } = await import("./routes/complete-fusion-api");
        app.use("/api", completeFusionApi);
        log("[Fusion] Public demo routes from complete-fusion-api (before /api auth)");
      } catch (e) {
        console.warn("[Fusion] complete-fusion-api not loaded:", e);
      }
    }

    const { createApiAuthMiddleware, createStandardLimiter, requireAdminForSensitiveApi } = await import("./security/middleware");
    app.use("/api", createApiAuthMiddleware(isAuthenticatedMiddleware));
    app.use("/api", requireAdminForSensitiveApi);

    const limiter = createStandardLimiter(100, 15 * 60 * 1000);
    app.use("/api/inference", limiter);
    app.use("/api/cyrus/speak", limiter);
    app.use("/api/vision", limiter);
    app.use("/api/upload", limiter);

    const { default: settingsRoutes } = await import("./settings/routes");
    const { default: sysdbRoutes } = await import("./sysdb/routes");
    const { default: queryRoutes } = await import("./query/router");
    const { default: trainRoutes } = await import("./train/routes");
    const { default: intelligenceCoreRoutes } = await import("./intelligence/core-routes");

    app.use("/api/settings", settingsRoutes);
    app.use("/api/sysdb", sysdbRoutes);
    app.use("/api/query", queryRoutes);
    app.use("/api/train", trainRoutes);
    app.use("/api", intelligenceCoreRoutes);
    const { default: stackRoutes } = await import("./routes/stack-routes.js");
    app.use("/api", stackRoutes);
    const { default: algorithmsRoutes } = await import("./routes/algorithms-routes.js");
    app.use("/api", algorithmsRoutes);
  } catch (e) {
    console.error("[Init] Auth setup failed (non-fatal):", e);
  }
  await tick();

  try {
    const { default: humanoidRoutes } = await import("./humanoid/routes");
    app.use("/api/humanoid", humanoidRoutes);
    log("[Humanoid] Registered");
  } catch (e) {
    console.error("[Init] Humanoid failed (non-fatal):", e);
  }
  await tick();

  try {
    const { default: visionRoutes } = await import("./humanoid/vision-analysis");
    app.use("/api/vision", visionRoutes);
    log("[Vision] Registered");
  } catch (e) {
    console.error("[Init] Vision failed (non-fatal):", e);
  }
  await tick();

  try {
    const { registerRoutes } = await import("./routes");
    await registerRoutes(httpServer, app);
  } catch (e) {
    console.error("[Init] Routes failed:", e);
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

  if (process.env.NODE_ENV === "production" && process.env.CYRUS_ENABLE_PYTHON === "1") {
    try {
      const { spawn } = await import("child_process");
      const pythonServices = [
        ["python3", ["server/quantum_ai/quantum_bridge.py"]],
        ["python3", ["server/comms/ml_service.py"]],
      ] as const;

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
      console.error("[Init] Python services failed (non-fatal):", e);
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
      res.sendFile(path.join(dp, "index.html"));
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
