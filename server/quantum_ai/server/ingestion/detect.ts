import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

export interface DetectionResult {
  declaredMime?: string;
  detectedMime?: string;
  ext?: string;
  size: number;
  sha256: string;
}

export async function detectFile(buffer: Buffer, declaredMime?: string): Promise<DetectionResult> {
  const size = buffer.length;
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const ft = await fileTypeFromBuffer(buffer);
  return {
    declaredMime,
    detectedMime: ft?.mime,
    ext: ft?.ext,
    size,
    sha256,
  };
}

