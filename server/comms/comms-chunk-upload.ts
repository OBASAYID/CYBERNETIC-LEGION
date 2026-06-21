import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import {
  COMMS_DEFAULT_CHUNK_BYTES,
  COMMS_DEFAULT_MAX_UPLOAD_BYTES,
  COMMS_HARD_MAX_UPLOAD_BYTES,
  guessCommsMediaMime,
} from "../../shared/comms/media-formats.js";

export type ChunkUploadSession = {
  uploadId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  userId: string;
  createdAt: number;
};

const sessions = new Map<string, ChunkUploadSession>();
/** Allow multi-hour uploads on slow links (resume via chunk status if interrupted). */
const SESSION_TTL_MS = 72 * 60 * 60 * 1000;
const loadedSessionIndexes = new Set<string>();

type SerializedChunkSession = Omit<ChunkUploadSession, "receivedChunks"> & {
  receivedChunks: number[];
};

function sessionsIndexPath(chunksRoot: string): string {
  return path.join(chunksRoot, ".sessions-index.json");
}

function loadSessionsFromDisk(chunksRoot: string): void {
  if (loadedSessionIndexes.has(chunksRoot)) return;
  loadedSessionIndexes.add(chunksRoot);

  const indexPath = sessionsIndexPath(chunksRoot);
  if (!fs.existsSync(indexPath)) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as SerializedChunkSession[];
    const now = Date.now();
    for (const row of parsed) {
      if (!row?.uploadId || now - row.createdAt > SESSION_TTL_MS) continue;
      sessions.set(row.uploadId, {
        ...row,
        receivedChunks: new Set(row.receivedChunks || []),
      });
    }
  } catch {
    /* ignore corrupt session index */
  }
}

function persistSessionsToDisk(chunksRoot: string): void {
  const payload: SerializedChunkSession[] = [...sessions.values()].map((session) => ({
    ...session,
    receivedChunks: [...session.receivedChunks],
  }));
  fs.writeFileSync(sessionsIndexPath(chunksRoot), JSON.stringify(payload));
}

export function getCommsMaxUploadBytes(): number {
  const raw = process.env.CYRUS_COMMS_MAX_UPLOAD_BYTES;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, COMMS_HARD_MAX_UPLOAD_BYTES);
  }
  return COMMS_DEFAULT_MAX_UPLOAD_BYTES;
}

export function getCommsChunkSizeBytes(): number {
  const raw = process.env.CYRUS_COMMS_CHUNK_BYTES;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 256 * 1024) return n;
  }
  return COMMS_DEFAULT_CHUNK_BYTES;
}

export function getCommsChunksDir(baseUploadDir: string): string {
  const dir = path.join(baseUploadDir, ".chunks");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sessionDir(chunksRoot: string, uploadId: string): string {
  return path.join(chunksRoot, uploadId);
}

function purgeExpiredSessions(chunksRoot: string): void {
  const now = Date.now();
  let changed = false;
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
      changed = true;
      try {
        fs.rmSync(sessionDir(chunksRoot, id), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
  if (changed) persistSessionsToDisk(chunksRoot);
}

export function initChunkUpload(
  chunksRoot: string,
  input: { fileName: string; fileSize: number; mimeType?: string; userId: string },
): ChunkUploadSession {
  loadSessionsFromDisk(chunksRoot);
  purgeExpiredSessions(chunksRoot);

  const maxBytes = getCommsMaxUploadBytes();
  if (input.fileSize <= 0 || input.fileSize > maxBytes) {
    throw new Error(`File size must be between 1 byte and ${maxBytes} bytes`);
  }

  const safeName = path.basename(input.fileName || "upload.bin");
  const chunkSize = getCommsChunkSizeBytes();
  const totalChunks = Math.ceil(input.fileSize / chunkSize);
  const uploadId = uuid();

  const session: ChunkUploadSession = {
    uploadId,
    fileName: safeName,
    mimeType: guessCommsMediaMime(safeName, input.mimeType),
    fileSize: input.fileSize,
    chunkSize,
    totalChunks,
    receivedChunks: new Set(),
    userId: input.userId,
    createdAt: Date.now(),
  };

  const dir = sessionDir(chunksRoot, uploadId);
  fs.mkdirSync(dir, { recursive: true });
  sessions.set(uploadId, session);
  persistSessionsToDisk(chunksRoot);
  return session;
}

export function getChunkUploadSession(uploadId: string, chunksRoot?: string): ChunkUploadSession | null {
  if (chunksRoot) loadSessionsFromDisk(chunksRoot);
  return sessions.get(uploadId) || null;
}

export async function writeUploadChunk(
  chunksRoot: string,
  uploadId: string,
  chunkIndex: number,
  data: Buffer,
): Promise<{ received: number; total: number }> {
  loadSessionsFromDisk(chunksRoot);
  let session = sessions.get(uploadId);
  if (!session) throw new Error("Upload session not found or expired");

  if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    throw new Error("Invalid chunk index");
  }

  const dir = sessionDir(chunksRoot, uploadId);
  const chunkPath = path.join(dir, `${String(chunkIndex).padStart(6, "0")}.part`);
  await fs.promises.writeFile(chunkPath, data);
  session.receivedChunks.add(chunkIndex);
  persistSessionsToDisk(chunksRoot);

  return { received: session.receivedChunks.size, total: session.totalChunks };
}

async function mergeChunksToFile(
  chunksRoot: string,
  session: ChunkUploadSession,
  destPath: string,
): Promise<void> {
  const dir = sessionDir(chunksRoot, session.uploadId);
  const handle = await fs.promises.open(destPath, "w");

  try {
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(dir, `${String(i).padStart(6, "0")}.part`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`);
      }
      const data = await fs.promises.readFile(chunkPath);
      await handle.write(data);
    }
  } finally {
    await handle.close();
  }

  const stat = await fs.promises.stat(destPath);
  if (stat.size !== session.fileSize) {
    throw new Error(`Merged size mismatch: expected ${session.fileSize}, got ${stat.size}`);
  }
}

export async function completeChunkUpload(
  chunksRoot: string,
  uploadDir: string,
  uploadId: string,
): Promise<{ fileName: string; filePath: string; mimeType: string; fileSize: number }> {
  loadSessionsFromDisk(chunksRoot);
  const session = sessions.get(uploadId);
  if (!session) throw new Error("Upload session not found or expired");

  if (session.receivedChunks.size !== session.totalChunks) {
    throw new Error(`Incomplete upload: ${session.receivedChunks.size}/${session.totalChunks} chunks`);
  }

  const ext = path.extname(session.fileName) || "";
  const finalName = `${Date.now()}-${uuid()}${ext}`;
  const destPath = path.join(uploadDir, finalName);

  await mergeChunksToFile(chunksRoot, session, destPath);

  sessions.delete(uploadId);
  try {
    fs.rmSync(sessionDir(chunksRoot, uploadId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  persistSessionsToDisk(chunksRoot);

  return {
    fileName: finalName,
    filePath: destPath,
    mimeType: session.mimeType,
    fileSize: session.fileSize,
  };
}
