import fs from "fs";
import path from "path";

/** Stable on-disk store for comms/Pshare media (override with CYRUS_COMMS_UPLOAD_DIR). */
export function resolveCommsUploadDir(cwd = process.cwd()): string {
  const env = String(process.env.CYRUS_COMMS_UPLOAD_DIR || "").trim();
  const dir = env ? path.resolve(env) : path.join(cwd, "uploads", "comms");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function resolveCommsRecordingsDir(uploadDir = resolveCommsUploadDir()): string {
  const dir = path.join(uploadDir, "recordings");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
