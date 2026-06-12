/**
 * Centralized type definitions and validation for Vision & Scan module
 */

// ============================================
// CORE TYPE DEFINITIONS
// ============================================

export type ScanType = "qr" | "ocr" | "image" | "video" | "unknown";

export type ScanMode = "business" | "casual" | "legal" | "technical" | "military";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type RiskLevel = "low" | "medium" | "high";

export interface ScanOptions {
  targetLanguage?: string;
  sourceLanguage?: string;
  mode?: ScanMode;
}

export interface VisionOcrResult {
  ocrText: string;
  notes: string;
  warnings: string[];
  confidence?: number;
}

export interface QrDecodeResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface QrSafety {
  isUrl: boolean;
  safe: boolean;
  reason: string;
  domain?: string;
}

export interface LanguageDetection {
  language: string;
  confidence: number;
  warnings: string[];
  alternatives?: Array<{ language: string; confidence: number }>;
}

export interface TranslationOptions {
  target: string;
  source?: string;
  mode?: ScanMode;
}

export interface TranslationResult {
  translated: string;
  warnings: string[];
  detectedSource?: string;
  confidence?: number;
}

export interface InterpretationResult {
  interpretation: string;
  keyFindings: string[];
  risks: string[];
  ambiguities: string[];
  warnings: string[];
  confidence?: ConfidenceLevel;
}

export interface ScanReport {
  success: boolean;
  scanType: ScanType;
  sourceDescription: string;
  detectedLanguage: string;
  languageConfidence: number;
  translation?: string;
  originalText: string;
  qrPayload?: string;
  qrSafety?: QrSafety;
  interpretation: string;
  keyFindings: string[];
  risks: string[];
  ambiguities: string[];
  confidence: ConfidenceLevel;
  warnings: string[];
  attempted: string[];
  nextSteps: string[];
  qualityScores?: Record<string, number>;
  calibration?: {
    algorithmVersion: string;
    calibrated: boolean;
    overallScanQuality?: number;
    [key: string]: any;
  };
}

export interface VisionAnalysisPayload {
  image: string;
  mode?: ScanMode;
  targetLanguage?: string;
}

// ============================================
// VALIDATION ERROR TYPES
// ============================================

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates a base64-encoded image string
 */
export function validateBase64Image(image: string | undefined): string {
  if (!image) {
    throw new ValidationError("Image data is required", "image");
  }
  if (typeof image !== "string") {
    throw new ValidationError("Image must be a string", "image");
  }
  if (image.length === 0) {
    throw new ValidationError("Image data cannot be empty", "image");
  }
  // Remove data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    throw new ValidationError("Invalid base64 image data", "image");
  }
  // Check size (10MB max for base64)
  const sizeInBytes = (base64Data.length * 3) / 4;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (sizeInBytes > maxSizeBytes) {
    throw new ValidationError(
      `Image size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${maxSizeBytes / 1024 / 1024}MB)`,
      "image"
    );
  }
  return base64Data;
}

/**
 * Validates scan mode
 */
export function validateScanMode(mode: string | undefined): ScanMode | undefined {
  if (!mode) return undefined;
  const validModes: ScanMode[] = ["business", "casual", "legal", "technical", "military"];
  if (!validModes.includes(mode as ScanMode)) {
    throw new ValidationError(
      `Invalid mode. Must be one of: ${validModes.join(", ")}`,
      "mode"
    );
  }
  return mode as ScanMode;
}

/**
 * Validates language code (ISO 639-1 two-letter codes)
 */
export function validateLanguageCode(code: string | undefined, fieldName: string): string | undefined {
  if (!code) return undefined;
  if (typeof code !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  const trimmed = code.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 3) {
    throw new ValidationError(
      `${fieldName} must be a valid ISO 639-1 language code (2-3 characters)`,
      fieldName
    );
  }
  if (!/^[a-z]{2,3}$/.test(trimmed)) {
    throw new ValidationError(
      `${fieldName} must contain only lowercase letters`,
      fieldName
    );
  }
  return trimmed;
}

/**
 * Validates text input
 */
export function validateText(text: string | undefined, fieldName: string, options: { minLength?: number; maxLength?: number } = {}): string {
  if (!text) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (typeof text !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  const { minLength = 1, maxLength = 1_000_000 } = options;
  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName
    );
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName
    );
  }
  return trimmed;
}

/**
 * Validates buffer size
 */
export function validateBufferSize(buffer: Buffer, maxSizeBytes: number = 10 * 1024 * 1024): Buffer {
  if (!Buffer.isBuffer(buffer)) {
    throw new ValidationError("Invalid buffer data");
  }
  if (buffer.length === 0) {
    throw new ValidationError("Buffer cannot be empty");
  }
  if (buffer.length > maxSizeBytes) {
    throw new ValidationError(
      `Buffer size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${maxSizeBytes / 1024 / 1024}MB)`
    );
  }
  return buffer;
}

/**
 * Validates a positive number within a range
 */
export function validateNumberInRange(
  value: number | string | undefined,
  fieldName: string,
  min: number,
  max: number
): number {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
  }
  if (num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName
    );
  }
  return num;
}

/**
 * Validates confidence level
 */
export function validateConfidence(confidence: string | undefined): ConfidenceLevel | undefined {
  if (!confidence) return undefined;
  const validLevels: ConfidenceLevel[] = ["High", "Medium", "Low"];
  if (!validLevels.includes(confidence as ConfidenceLevel)) {
    throw new ValidationError(
      `Invalid confidence level. Must be one of: ${validLevels.join(", ")}`,
      "confidence"
    );
  }
  return confidence as ConfidenceLevel;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isScanType(value: unknown): value is ScanType {
  return typeof value === "string" && ["qr", "ocr", "image", "video", "unknown"].includes(value);
}

export function isScanMode(value: unknown): value is ScanMode {
  return typeof value === "string" && ["business", "casual", "legal", "technical", "military"].includes(value);
}

export function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return typeof value === "string" && ["High", "Medium", "Low"].includes(value);
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && ["low", "medium", "high"].includes(value);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitizes text by removing potentially harmful content
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Extracts unique strings from an array
 */
export function uniqueStrings(values: string[], limit?: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
    if (limit && output.length >= limit) break;
  }
  return output;
}
