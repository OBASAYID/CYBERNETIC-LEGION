import { Jimp } from "jimp";
import QrCode from "qrcode-reader";

export interface QrResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
  type?: string;
}

export async function decodeQr(buffer: Buffer): Promise<QrResult> {
  try {
    const image = await Jimp.read(buffer);
    return await new Promise((resolve) => {
      const qr = new QrCode();
      qr.callback = (err: any, value: any) => {
        if (err || !value) {
          return resolve({ success: false, error: "QR decode failed" });
        }
        resolve({
          success: true,
          text: value.result,
          confidence: 0.8,
          type: "qr",
        });
      };
      qr.decode(image.bitmap as any);
    });
  } catch (err: any) {
    return { success: false, error: err?.message || "QR read failed" };
  }
}

