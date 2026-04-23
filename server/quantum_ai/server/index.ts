import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
let systemReady = false;

function findDistPublic(): string | null {
  const candidates = [
    path.resolve(__dirname, "..", "public"),
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.get("/__health", (_req, res) => res.status(200).send("ok"));
app.get("/health/live", (_req, res) => res.status(200).json({ status: "alive" }));
app.get("/health/ready", (_req, res) => {
  res.status(systemReady ? 200 : 503).json({ status: systemReady ? "ready" : "initializing" });
});

const distPublic = process.env.NODE_ENV === "production" ? findDistPublic() : null;
if (distPublic) {
  log(`[Static] Serving from ${distPublic}`);
  app.use(express.static(distPublic, { index: "index.html" }));
  app.get("/", (_req, res) => res.status(200).sendFile(path.join(distPublic, "index.html")));
} else if (process.env.NODE_ENV === "production") {
  app.get("/", (_req, res) => res.status(200).json({ service: "CYRUS", status: "online" }));
}

app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use('/images', express.static(path.join(process.cwd(), 'public', 'images')));
app.use('/videos', express.static(path.join(process.cwd(), 'public', 'videos')));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

app.use("/api", (req, res, next) => {
  if (systemReady) return next();
  res.status(503).json({ message: "System initializing" });
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
      log(logLine);
    }
  });
  next();
});

const port = parseInt(process.env.PORT || "5000", 10);
const listenOptions: { port: number; host: string; reusePort?: boolean } = {
  port,
  host: "0.0.0.0",
};

if (process.env.ENABLE_REUSE_PORT === "true") {
  listenOptions.reusePort = true;
}

httpServer.listen(listenOptions, () => {
  log(`serving on port ${port}`);

  setTimeout(() => {
    initializeSystem().catch((err) => {
      console.error("System initialization error:", err);
    });
  }, 500);
});

async function initializeSystem() {
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));

  try {
    if (process.env.REPL_ID) {
      const { setupAuth, registerAuthRoutes } = await import("./replit_integrations/auth");
      await setupAuth(app);
      registerAuthRoutes(app);
      log("Replit Auth initialized");
    } else {
      const { setupAuth, registerAuthRoutes } = await import("../standalone/auth-adapter");
      setupAuth(app);
      registerAuthRoutes(app);
      log("Standalone Auth initialized");
    }
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

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV !== "production") {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } catch (e) {
      console.error("[Init] Vite failed:", e);
    }
  } else {
    const dp = findDistPublic();
    if (dp) {
      app.use("*", (_req, res) => {
        res.sendFile(path.join(dp, "index.html"));
      });
    }
  }

  systemReady = true;
  log("All systems initialized - accepting API traffic");

  if (process.env.NODE_ENV === "production") {
    try {
      const { spawn } = await import("child_process");
      const pyBridge = spawn("python", ["server/quantum_ai/quantum_bridge.py"], { stdio: "ignore", detached: true });
      pyBridge.unref();
      const pyML = spawn("python", ["server/comms/ml_service.py"], { stdio: "ignore", detached: true });
      pyML.unref();
      log("Python services spawned");
    } catch (e) {
      console.error("[Init] Python services failed (non-fatal):", e);
    }
  }
}

process.on("SIGTERM", () => { httpServer.close(); });
process.on("unhandledRejection", (r) => { console.error("[Process] Unhandled rejection:", r); });
process.on("uncaughtException", (e) => {
  console.error("[Process] Uncaught exception:", e);
  if (e.message?.includes("EADDRINUSE")) process.exit(1);
});
