#!/usr/bin/env node
/**
 * Fetch mediasoup-worker prebuilt binary for the current platform (Linux/macOS/Windows).
 * Skips gracefully when no prebuild exists (e.g. darwin-x64) — CYRUS falls back to star relay.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediasoupDir = path.join(root, "node_modules", "mediasoup");

function log(msg) {
  console.log(`[mediasoup-worker] ${msg}`);
}

function readPkgVersion() {
  const pkgPath = path.join(mediasoupDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    log("mediasoup not installed — skip");
    process.exit(0);
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
}

function prebuildName(version) {
  const platform = os.platform();
  const arch = os.arch();
  let name = `mediasoup-worker-${version}-${platform}-${arch}`;
  if (platform === "linux") {
    name += "-kernel6";
  } else if (platform === "darwin") {
    const major = Number.parseInt(String(os.release()).split(".")[0], 10);
    if (Number.isFinite(major)) name += `-kernel${major}`;
  }
  return `${name}.tgz`;
}

function main() {
  if (process.env.CYRUS_SKIP_MEDIASOUP_WORKER === "true") {
    log("CYRUS_SKIP_MEDIASOUP_WORKER=true — skip");
    return;
  }

  const version = readPkgVersion();
  const tarName = prebuildName(version);
  const releaseUrl = `https://github.com/versatica/mediasoup/releases/download/${version}/${tarName}`;
  const releaseDir = path.join(mediasoupDir, "worker", "out", "Release");
  const releaseBin = path.join(releaseDir, "mediasoup-worker");

  if (fs.existsSync(releaseBin)) {
    log(`worker already present at ${releaseBin}`);
    return;
  }

  fs.mkdirSync(releaseDir, { recursive: true });
  const tmpTar = path.join(releaseDir, tarName);

  log(`fetching ${tarName} …`);
  try {
    execFileSync("curl", ["-fsSL", releaseUrl, "-o", tmpTar], { stdio: "pipe" });
  } catch {
    log(`no prebuild for ${os.platform()}-${os.arch()} — group calls use star relay on this host`);
    log("use Linux (Docker) or Apple Silicon for mediasoup SFU");
    try {
      fs.unlinkSync(tmpTar);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    execFileSync("tar", ["-xzf", tmpTar, "-C", releaseDir], { stdio: "pipe" });
    fs.chmodSync(releaseBin, 0o755);
    execFileSync(releaseBin, ["--version"], { stdio: "pipe" });
    log(`installed ${releaseBin}`);
  } catch (e) {
    log(`extract/verify failed (${e instanceof Error ? e.message : String(e)}) — star relay fallback`);
    try {
      fs.unlinkSync(releaseBin);
    } catch {
      /* ignore */
    }
  } finally {
    try {
      fs.unlinkSync(tmpTar);
    } catch {
      /* ignore */
    }
  }
}

try {
  main();
} catch (e) {
  console.error("[mediasoup-worker] error:", e);
  process.exit(0);
}
