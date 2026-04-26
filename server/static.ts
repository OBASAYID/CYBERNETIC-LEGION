import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(__dirname, "..", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  let distPath: string | null = null;
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      distPath = dir;
      break;
    }
  }

  if (!distPath) {
    throw new Error(
      `Could not find the build directory in any of: ${candidates.join(", ")}`,
    );
  }

  // Long-lived cache for hashed JS/CSS assets; no-cache for HTML so the app shell is always fresh
  app.use(express.static(distPath, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
