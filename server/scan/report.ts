export interface ScanReport {
  success: boolean;
  scanType: "qr" | "image" | "document" | "unknown";
  sourceDescription: string;
  detectedLanguage: string;
  languageConfidence: number;
  translation?: string;
  originalText?: string;
  qrPayload?: string;
  qrSafety?: {
    isUrl: boolean;
    safe: boolean;
    reason: string;
    domain?: string;
  };
  interpretation?: string;
  keyFindings: string[];
  risks: string[];
  ambiguities: string[];
  confidence: "High" | "Medium" | "Low";
  warnings: string[];
  attempted: string[];
  nextSteps: string[];
  qualityScores?: Record<string, number>;
  calibration?: {
    algorithmVersion: string;
    calibrated: boolean;
    overallScanQuality?: number;
    trainedAt?: string;
    simulations?: number;
    metrics?: { maeBefore: number; maeAfter: number; r2After: number };
    blend?: number;
  };
}

