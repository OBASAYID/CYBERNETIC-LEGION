import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";

const viteLogger = createLogger();

function singleOriginForced(): boolean {
  const v = process.env.CYRUS_SINGLE_ORIGIN;
  return v === "1" || v === "true";
}

export async function setupVite(server: Server, app: Express) {
  const viteRoot = viteConfig.root
    ? path.resolve(String(viteConfig.root))
    : path.resolve(import.meta.dirname, "..", "cyrus-ui");
  const repoRoot = path.resolve(import.meta.dirname, "..");

  const forceSingle = singleOriginForced();
  const baseDefine = (viteConfig as { define?: Record<string, string> }).define;
  const mergedDefine = forceSingle
    ? { ...(baseDefine ?? {}), "import.meta.env.VITE_CYRUS_API_BASE": JSON.stringify("") }
    : baseDefine;

  const listenPort =
    typeof server.address() === "object" && server.address()
      ? (server.address() as { port: number }).port
      : Number.parseInt(process.env.CYRUS_LIVE_PORT || process.env.PORT || "3105", 10);

  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      path: "/vite-hmr",
      port: listenPort,
      clientPort: listenPort,
    },
    allowedHosts: true as const,
    /** Cursor/debug NDJSON under repo `.cursor/` must not trigger dev HMR loops. */
    watch: {
      ignored: [
        "**/.cursor/**",
        path.join(repoRoot, ".cursor"),
        path.join(repoRoot, ".cursor", "**"),
        path.join(repoRoot, ".cursor", "debug-6913f9.log"),
      ],
    },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    ...(mergedDefine ? { define: mergedDefine } : {}),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl;
    const barePath = url.split("?")[0] || url;

    if (url.startsWith("/api/") || url.startsWith("/ws") || url.startsWith("/socket.io") || url.startsWith("/cyrus-io")) {
      return next();
    }

    // Never treat Vite virtual module URLs as SPA navigations (would return index.html).
    if (barePath.startsWith("/@")) {
      return next();
    }

    // Let asset requests continue through normal middleware/404 handling.
    if (path.extname(url)) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(viteRoot, "index.html");

      // Always reload index.html from disk in development.
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
