import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import {
  COMMS_DEFAULT_CHUNK_BYTES,
  COMMS_DEFAULT_MAX_UPLOAD_BYTES,
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
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function getCommsMaxUploadBytes(): number {
  const raw = process.env.CYRUS_COMMS_MAX_UPLOAD_BYTES;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
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
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
      try {
        fs.rmSync(sessionDir(chunksRoot, id), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

export function initChunkUpload(
  chunksRoot: string,
  input: { fileName: string; fileSize: number; mimeType?: string; userId: string },
): ChunkUploadSession {
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
  return session;
}

export function getChunkUploadSession(uploadId: string): ChunkUploadSession | null {
  return sessions.get(uploadId) || null;
}

export async function writeUploadChunk(
  chunksRoot: string,
  uploadId: string,
  chunkIndex: number,
  data: Buffer,
): Promise<{ received: number; total: number }> {
  const session = sessions.get(uploadId);
  if (!session) throw new Error("Upload session not found or expired");

  if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    throw new Error("Invalid chunk index");
  }

  const dir = sessionDir(chunksRoot, uploadId);
  const chunkPath = path.join(dir, `${String(chunkIndex).padStart(6, "0")}.part`);
  await fs.promises.writeFile(chunkPath, data);
  session.receivedChunks.add(chunkIndex);

  return { received: session.receivedChunks.size, total: session.totalChunks };
}

async function mergeChunksToFile(
  chunksRoot: string,
  session: ChunkUploadSession,
  destPath: string,
): Promise<void> {
  const dir = sessionDir(chunksRoot, session.uploadId);
  const writeStream = fs.createWriteStream(destPath);

  try {
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(dir, `${String(i).padStart(6, "0")}.part`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`);
      }
      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on("error", reject);
        readStream.on("end", resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }
  } catch (err) {
    writeStream.destroy();
    throw err;
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on("error", reject);
  });

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

  return {
    fileName: finalName,
    filePath: destPath,
    mimeType: session.mimeType,
    fileSize: session.fileSize,
  };
}
