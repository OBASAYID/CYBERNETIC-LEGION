#!/usr/bin/env node
/** Generate PNG PWA / Apple touch icons (192, 512, 180) matching public/pwa-icon.svg branding. */
import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../cyrus-ui/public");
const CYAN = 0x22d3eeff;
const BG = 0x0f172aff;

async function makeIcon(size, filename) {
  const img = new Jimp({ width: size, height: size, color: BG });
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.258;
  const sw = Math.max(2, size * 0.0625);
  const arm = size * 0.195;
  const thick = sw * 0.85;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.abs(d - r) <= sw / 2) img.setPixelColor(CYAN, x, y);
      if (Math.abs(x - cx) <= thick / 2 && y >= cy - arm && y <= cy + arm) img.setPixelColor(CYAN, x, y);
      if (Math.abs(y - cy) <= thick / 2 && x >= cx - arm && x <= cx + arm) img.setPixelColor(CYAN, x, y);
    }
  }

  await img.write(path.join(outDir, filename));
  console.log("wrote", filename);
}

await makeIcon(512, "pwa-icon-512.png");
await makeIcon(192, "pwa-icon-192.png");
await makeIcon(180, "apple-touch-icon.png");
