#!/usr/bin/env node
/** Fail fast when server JSON configs are invalid (merge regressions). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configs = ["server/ai/knowledge-brain-config.json"];

let failed = false;
for (const rel of configs) {
  const file = path.join(root, rel);
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
    console.log(`[validate-json] OK ${rel}`);
  } catch (e) {
    failed = true;
    console.error(`[validate-json] INVALID ${rel}:`, e instanceof Error ? e.message : e);
  }
}
process.exit(failed ? 1 : 0);
