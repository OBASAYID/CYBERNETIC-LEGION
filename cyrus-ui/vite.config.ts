import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

const wsProxy = (target: string) => ({ target, changeOrigin: true, ws: true } as const);

export default defineConfig(async ({ mode }) => {
  const rootDir = import.meta.dirname;
  const env = loadEnv(mode, rootDir, "");
  const apiPortRaw =
    env.CYRUS_LIVE_PORT ||
    process.env.CYRUS_LIVE_PORT ||
    env.CYRUS_API_PORT ||
    process.env.CYRUS_API_PORT ||
    env.PORT ||
    process.env.PORT ||
    "3105";
  const apiPort = String(Number.parseInt(String(apiPortRaw), 10) || 3105);
  const apiTarget =
    (env.CYRUS_API_PROXY_TARGET || process.env.CYRUS_API_PROXY_TARGET || "").trim() ||
    `http://127.0.0.1:${apiPort}`;
  const standalonePort = Number.parseInt(
    env.CYRUS_UI_STANDALONE_PORT || process.env.CYRUS_UI_STANDALONE_PORT || "3000",
    10,
  );
  const repoRoot = path.resolve(rootDir, "..");
  const rootReactQuery = path.resolve(repoRoot, "node_modules/@tanstack/react-query");

  return {
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    // Hosted Replit workspace only (`REPL_ID`). Local Cursor/CLI dev omits these — use repo-root `npm run dev`.
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    dedupe: ["@tanstack/react-query", "react", "react-dom"],
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "src", "assets"),
      "@tanstack/react-query": rootReactQuery,
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: import.meta.dirname,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    /**
     * Standalone UI only (API should run separately on `PORT` / 3105).
     * For one process + one port use repo root: `npm run dev` → http://127.0.0.1:3105/
     */
    port: Number.isFinite(standalonePort) ? standalonePort : 3000,
    strictPort: false,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
      "/cyrus-io": wsProxy(apiTarget),
      "/cyrus-comm-io": wsProxy(apiTarget),
      "/socket.io": wsProxy(apiTarget),
      "/ws": wsProxy(apiTarget),
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
      // App imports `../../client/...` and `../shared` — without this, dev often serves a blank page
      // ("file outside Vite serving allow list" / failed module transform).
      allow: [rootDir, repoRoot, path.join(repoRoot, "client"), path.join(repoRoot, "shared")],
    },
  },
};
});
