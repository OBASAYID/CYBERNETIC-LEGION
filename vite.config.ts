import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiRoot = process.env.CYRUS_UI_ROOT
  ? path.resolve(__dirname, process.env.CYRUS_UI_ROOT)
  : path.resolve(__dirname, "cyrus-ui");

/** Force lazy `client/` chunks to use the same react-query instance as `cyrus-ui/` (avoids "No QueryClient set"). */
const rootReactQuery = path.resolve(__dirname, "node_modules/@tanstack/react-query");

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-icon.svg", "pwa-icon-192.png", "pwa-icon-512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "CYRUS AI — Super-Intelligence Assistant",
        short_name: "CYRUS",
        description: "CYRUS fused stack: dashboard, Command Center modules, and real-time comms.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Home",
            url: "/",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Comms",
            short_name: "Comms",
            url: "/comms",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/health\//,
          /^\/uploads\//,
          /^\/images\//,
          /^\/videos\//,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    dedupe: ["@tanstack/react-query", "react", "react-dom"],
    alias: {
      "@": path.resolve(uiRoot, "src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@tanstack/react-query": rootReactQuery,
    },
  },
  root: uiRoot,
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/@tensorflow/") || id.includes("@tensorflow-models/")) {
            return "vendor-tensorflow";
          }

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }

          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }

          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }

          if (id.includes("/zod/")) {
            return "vendor-zod";
          }

          if (id.includes("/@floating-ui/")) {
            return "vendor-floating-ui";
          }

          if (id.includes("/@radix-ui/")) {
            return "vendor-radix-ui";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    /** Align with `server/index.ts` default `PORT` so tooling matches integrated dev (`npm run dev` on 3105). */
    port: Number.parseInt(process.env.CYRUS_LIVE_PORT || process.env.PORT || "3105", 10),
    allowedHosts: true,
    watch: {
      ignored: [
        "**/.cursor/**",
        path.join(__dirname, ".cursor"),
        path.join(__dirname, ".cursor", "**"),
        path.join(__dirname, ".cursor", "debug-6913f9.log"),
      ],
    },
    fs: {
      allow: [uiRoot, path.resolve(__dirname, "client")],
    },
  },
});
