import crypto from "crypto";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function resolveEncryptionKey(): Buffer {
  const rawKey = process.env.CYRUS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("CYRUS_ENCRYPTION_KEY must be set for encrypted secret storage");
  }

  const normalized = rawKey.trim();
  const isHexKey = /^[0-9a-fA-F]{64}$/.test(normalized);
  return isHexKey ? Buffer.from(normalized, "hex") : crypto.createHash("sha256").update(normalized).digest();
}

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = resolveEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "*".repeat(secret.length);
  return `${secret.slice(0, 4)}${"*".repeat(secret.length - 8)}${secret.slice(-4)}`;
}