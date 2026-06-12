/**
 * Structured error handling for Vision & Scan operations
 */

// ============================================
// ERROR CODES
// ============================================

export enum ScanErrorCode {
  // Input Validation Errors (400)
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_IMAGE = "INVALID_IMAGE",
  INVALID_LANGUAGE_CODE = "INVALID_LANGUAGE_CODE",
  INVALID_MODE = "INVALID_MODE",
  IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE",
  BUFFER_TOO_LARGE = "BUFFER_TOO_LARGE",
  EMPTY_INPUT = "EMPTY_INPUT",
  
  // Processing Errors (422)
  QR_DECODE_FAILED = "QR_DECODE_FAILED",
  OCR_FAILED = "OCR_FAILED",
  VISION_ANALYSIS_FAILED = "VISION_ANALYSIS_FAILED",
  LANGUAGE_DETECTION_FAILED = "LANGUAGE_DETECTION_FAILED",
  TRANSLATION_FAILED = "TRANSLATION_FAILED",
  INTERPRETATION_FAILED = "INTERPRETATION_FAILED",
  NO_TEXT_EXTRACTED = "NO_TEXT_EXTRACTED",
  
  // Configuration Errors (503)
  VISION_SERVICE_UNAVAILABLE = "VISION_SERVICE_UNAVAILABLE",
  OPENAI_NOT_CONFIGURED = "OPENAI_NOT_CONFIGURED",
  LOCAL_LLM_UNAVAILABLE = "LOCAL_LLM_UNAVAILABLE",
  
  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  
  // Internal Errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================
// ERROR CLASS
// ============================================

export class ScanError extends Error {
  constructor(
    public readonly code: ScanErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ScanError";
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get HTTP status code for this error
   */
  get statusCode(): number {
    switch (this.code) {
      case ScanErrorCode.INVALID_INPUT:
      case ScanErrorCode.INVALID_IMAGE:
      case ScanErrorCode.INVALID_LANGUAGE_CODE:
      case ScanErrorCode.INVALID_MODE:
      case ScanErrorCode.IMAGE_TOO_LARGE:
      case ScanErrorCode.BUFFER_TOO_LARGE:
      case ScanErrorCode.EMPTY_INPUT:
        return 400;
      
      case ScanErrorCode.QR_DECODE_FAILED:
      case ScanErrorCode.OCR_FAILED:
      case ScanErrorCode.VISION_ANALYSIS_FAILED:
      case ScanErrorCode.LANGUAGE_DETECTION_FAILED:
      case ScanErrorCode.TRANSLATION_FAILED:
      case ScanErrorCode.INTERPRETATION_FAILED:
      case ScanErrorCode.NO_TEXT_EXTRACTED:
        return 422;
      
      case ScanErrorCode.VISION_SERVICE_UNAVAILABLE:
      case ScanErrorCode.OPENAI_NOT_CONFIGURED:
      case ScanErrorCode.LOCAL_LLM_UNAVAILABLE:
        return 503;
      
      case ScanErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      
      case ScanErrorCode.INTERNAL_ERROR:
      case ScanErrorCode.UNKNOWN_ERROR:
      default:
        return 500;
    }
  }

  /**
   * Convert error to JSON response
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }

  // ============================================
  // STATIC FACTORY METHODS
  // ============================================

  static invalidInput(message: string, details?: unknown): ScanError {
    return new ScanError(ScanErrorCode.INVALID_INPUT, message, details);
  }

  static invalidImage(message: string = "Invalid image data", details?: unknown): ScanError {
    return new ScanError(ScanErrorCode.INVALID_IMAGE, message, details);
  }

  static invalidLanguageCode(code: string): ScanError {
    return new ScanError(
      ScanErrorCode.INVALID_LANGUAGE_CODE,
      `Invalid language code: ${code}`,
      { code }
    );
  }

  static invalidMode(mode: string): ScanError {
    return new ScanError(
      ScanErrorCode.INVALID_MODE,
      `Invalid scan mode: ${mode}`,
      { mode, validModes: ["business", "casual", "legal", "technical", "military"] }
    );
  }

  static imageTooLarge(sizeMB: number, maxSizeMB: number): ScanError {
    return new ScanError(
      ScanErrorCode.IMAGE_TOO_LARGE,
      `Image size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed (${maxSizeMB}MB)`,
      { sizeMB, maxSizeMB }
    );
  }

  static bufferTooLarge(sizeBytes: number, maxSizeBytes: number): ScanError {
    return new ScanError(
      ScanErrorCode.BUFFER_TOO_LARGE,
      `Buffer size exceeds maximum allowed`,
      { sizeBytes, maxSizeBytes }
    );
  }

  static emptyInput(fieldName: string = "input"): ScanError {
    return new ScanError(
      ScanErrorCode.EMPTY_INPUT,
      `${fieldName} cannot be empty`,
      { fieldName }
    );
  }

  static qrDecodeFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.QR_DECODE_FAILED,
      reason || "Failed to decode QR code from image",
      { reason }
    );
  }

  static ocrFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.OCR_FAILED,
      reason || "Failed to extract text via OCR",
      { reason }
    );
  }

  static visionAnalysisFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.VISION_ANALYSIS_FAILED,
      reason || "Vision analysis failed",
      { reason }
    );
  }

  static languageDetectionFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.LANGUAGE_DETECTION_FAILED,
      reason || "Failed to detect language",
      { reason }
    );
  }

  static translationFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.TRANSLATION_FAILED,
      reason || "Translation failed",
      { reason }
    );
  }

  static interpretationFailed(reason?: string): ScanError {
    return new ScanError(
      ScanErrorCode.INTERPRETATION_FAILED,
      reason || "Text interpretation failed",
      { reason }
    );
  }

  static noTextExtracted(): ScanError {
    return new ScanError(
      ScanErrorCode.NO_TEXT_EXTRACTED,
      "No text could be extracted from the image",
      { suggestion: "Try a higher quality image or ensure the image contains readable text or QR code" }
    );
  }

  static visionServiceUnavailable(serviceName: string = "Vision service"): ScanError {
    return new ScanError(
      ScanErrorCode.VISION_SERVICE_UNAVAILABLE,
      `${serviceName} is currently unavailable`,
      { serviceName }
    );
  }

  static openAINotConfigured(): ScanError {
    return new ScanError(
      ScanErrorCode.OPENAI_NOT_CONFIGURED,
      "OpenAI API is not configured. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable",
      { envVars: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"] }
    );
  }

  static localLLMUnavailable(): ScanError {
    return new ScanError(
      ScanErrorCode.LOCAL_LLM_UNAVAILABLE,
      "Local LLM service is unavailable",
      { suggestion: "Configure OpenAI API key or start local LLM service" }
    );
  }

  static rateLimitExceeded(retryAfterMs?: number): ScanError {
    return new ScanError(
      ScanErrorCode.RATE_LIMIT_EXCEEDED,
      "Rate limit exceeded. Please try again later",
      { retryAfterMs }
    );
  }

  static internalError(message: string = "Internal server error", details?: unknown): ScanError {
    return new ScanError(ScanErrorCode.INTERNAL_ERROR, message, details);
  }

  static unknownError(originalError?: unknown): ScanError {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    return new ScanError(
      ScanErrorCode.UNKNOWN_ERROR,
      `An unexpected error occurred: ${message}`,
      { originalError }
    );
  }
}

// ============================================
// ERROR HANDLING UTILITY
// ============================================

/**
 * Wraps an async operation with consistent error handling
 */
export async function withScanErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ScanError) {
      throw error;
    }
    console.error(`[Scan][${operationName}] Error:`, error);
    throw ScanError.unknownError(error);
  }
}

/**
 * Logs scan errors with structured information
 */
export function logScanError(error: ScanError, context?: Record<string, unknown>): void {
  console.error("[Scan] Error:", {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  });
}
