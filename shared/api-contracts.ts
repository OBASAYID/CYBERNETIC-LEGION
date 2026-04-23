import { z } from "zod";

export const API_PATHS = {
  device: {
    status: "/api/device/status",
    execute: "/api/device/execute",
  },
  files: {
    detect: "/api/files/detect",
    extract: "/api/files/extract",
    analyze: "/api/files/analyze",
    fullAnalysis: "/api/files/full-analysis",
  },
  scan: {
    qr: "/api/scan/qr",
    ocr: "/api/scan/ocr",
    vision: "/api/scan/vision",
    detectLanguage: "/api/scan/detect-language",
    translate: "/api/scan/translate",
    interpret: "/api/scan/interpret",
    report: "/api/scan/report",
  },
} as const;

export const DeviceActionSchema = z.enum([
  "open_app",
  "focus_app",
  "keystroke",
  "text",
  "pointer_move",
  "pointer_click",
  "pointer_drag",
  "scroll",
  "shortcut",
  "screenshot",
]);

export const DeviceCommandSchema = z.object({
  action: DeviceActionSchema,
  appName: z.string().optional(),
  bundleId: z.string().optional(),
  text: z.string().optional(),
  keys: z.array(z.string()).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  dx: z.number().optional(),
  dy: z.number().optional(),
  button: z.enum(["left", "right", "middle"]).optional(),
  shortcut: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
  confirmToken: z.string().optional(),
});

export const DeviceStatusSchema = z.object({
  enabled: z.boolean(),
  platform: z.string(),
  allowedApps: z.array(z.string()),
  dryRunDefault: z.boolean(),
});

export const ScanDetectLanguageRequestSchema = z.object({
  text: z.string().min(1),
});

export type DeviceCommand = z.infer<typeof DeviceCommandSchema>;
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
