/**
 * Structured error handling for Document Intelligence operations
 */

// ============================================
// ERROR CODES
// ============================================

export enum DocumentErrorCode {
  // Input Validation Errors (400)
  INVALID_INPUT = "INVALID_INPUT",
  INVALID_FILE = "INVALID_FILE",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  NO_FILE_PROVIDED = "NO_FILE_PROVIDED",
  INVALID_JURISDICTION = "INVALID_JURISDICTION",
  INVALID_MODE = "INVALID_MODE",
  INVALID_DOC_TYPE = "INVALID_DOC_TYPE",
  INVALID_AUDIENCE = "INVALID_AUDIENCE",
  INVALID_TARGET_PAGES = "INVALID_TARGET_PAGES",
  INVALID_CONTENT = "INVALID_CONTENT",
  EMPTY_CONTENT = "EMPTY_CONTENT",
  
  // Processing Errors (422)
  DETECTION_FAILED = "DETECTION_FAILED",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  ANALYSIS_FAILED = "ANALYSIS_FAILED",
  GENERATION_FAILED = "GENERATION_FAILED",
  EXPORT_FAILED = "EXPORT_FAILED",
  NO_TEXT_EXTRACTED = "NO_TEXT_EXTRACTED",
  UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE",
  
  // Configuration Errors (503)
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  OPENAI_NOT_CONFIGURED = "OPENAI_NOT_CONFIGURED",
  LOCAL_LLM_UNAVAILABLE = "LOCAL_LLM_UNAVAILABLE",
  LEGAL_BRIDGE_UNAVAILABLE = "LEGAL_BRIDGE_UNAVAILABLE",
  
  // Job-related Errors (404, 409)
  JOB_NOT_FOUND = "JOB_NOT_FOUND",
  JOB_ALREADY_RUNNING = "JOB_ALREADY_RUNNING",
  JOB_FAILED = "JOB_FAILED",
  
  // Internal Errors (500)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================
// ERROR CLASS
// ============================================

export class DocumentError extends Error {
  constructor(
    public readonly code: DocumentErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "DocumentError";
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get HTTP status code for this error
   */
  get statusCode(): number {
    switch (this.code) {
      case DocumentErrorCode.INVALID_INPUT:
      case DocumentErrorCode.INVALID_FILE:
      case DocumentErrorCode.FILE_TOO_LARGE:
      case DocumentErrorCode.NO_FILE_PROVIDED:
      case DocumentErrorCode.INVALID_JURISDICTION:
      case DocumentErrorCode.INVALID_MODE:
      case DocumentErrorCode.INVALID_DOC_TYPE:
      case DocumentErrorCode.INVALID_AUDIENCE:
      case DocumentErrorCode.INVALID_TARGET_PAGES:
      case DocumentErrorCode.INVALID_CONTENT:
      case DocumentErrorCode.EMPTY_CONTENT:
        return 400;
      
      case DocumentErrorCode.DETECTION_FAILED:
      case DocumentErrorCode.EXTRACTION_FAILED:
      case DocumentErrorCode.ANALYSIS_FAILED:
      case DocumentErrorCode.GENERATION_FAILED:
      case DocumentErrorCode.EXPORT_FAILED:
      case DocumentErrorCode.NO_TEXT_EXTRACTED:
      case DocumentErrorCode.UNSUPPORTED_FILE_TYPE:
        return 422;
      
      case DocumentErrorCode.JOB_NOT_FOUND:
        return 404;
      
      case DocumentErrorCode.JOB_ALREADY_RUNNING:
        return 409;
      
      case DocumentErrorCode.SERVICE_UNAVAILABLE:
      case DocumentErrorCode.OPENAI_NOT_CONFIGURED:
      case DocumentErrorCode.LOCAL_LLM_UNAVAILABLE:
      case DocumentErrorCode.LEGAL_BRIDGE_UNAVAILABLE:
        return 503;
      
      case DocumentErrorCode.INTERNAL_ERROR:
      case DocumentErrorCode.UNKNOWN_ERROR:
      case DocumentErrorCode.JOB_FAILED:
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

  static invalidInput(message: string, details?: unknown): DocumentError {
    return new DocumentError(DocumentErrorCode.INVALID_INPUT, message, details);
  }

  static invalidFile(message: string = "Invalid file", details?: unknown): DocumentError {
    return new DocumentError(DocumentErrorCode.INVALID_FILE, message, details);
  }

  static fileTooLarge(sizeMB: number, maxSizeMB: number): DocumentError {
    return new DocumentError(
      DocumentErrorCode.FILE_TOO_LARGE,
      `File size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed (${maxSizeMB}MB)`,
      { sizeMB, maxSizeMB }
    );
  }

  static noFileProvided(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.NO_FILE_PROVIDED,
      "No file was provided for processing"
    );
  }

  static invalidJurisdiction(jurisdiction: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.INVALID_JURISDICTION,
      `Invalid jurisdiction: ${jurisdiction}`,
      { jurisdiction }
    );
  }

  static invalidMode(mode: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.INVALID_MODE,
      `Invalid document mode: ${mode}`,
      { mode, validModes: ["standard", "legal", "audit", "compliance"] }
    );
  }

  static invalidDocType(docType: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.INVALID_DOC_TYPE,
      `Invalid document type: ${docType}`,
      { docType }
    );
  }

  static invalidAudience(audience: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.INVALID_AUDIENCE,
      `Invalid audience: ${audience}`,
      { audience }
    );
  }

  static invalidTargetPages(targetPages: number, maxPages: number): DocumentError {
    return new DocumentError(
      DocumentErrorCode.INVALID_TARGET_PAGES,
      `Target pages (${targetPages}) must be between 1 and ${maxPages}`,
      { targetPages, maxPages }
    );
  }

  static invalidContent(reason: string = "Content is invalid"): DocumentError {
    return new DocumentError(DocumentErrorCode.INVALID_CONTENT, reason);
  }

  static emptyContent(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.EMPTY_CONTENT,
      "Content cannot be empty"
    );
  }

  static detectionFailed(reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.DETECTION_FAILED,
      reason || "Failed to detect file type",
      { reason }
    );
  }

  static extractionFailed(reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.EXTRACTION_FAILED,
      reason || "Failed to extract text from document",
      { reason }
    );
  }

  static analysisFailed(reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.ANALYSIS_FAILED,
      reason || "Document analysis failed",
      { reason }
    );
  }

  static generationFailed(reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.GENERATION_FAILED,
      reason || "Document generation failed",
      { reason }
    );
  }

  static exportFailed(format: string, reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.EXPORT_FAILED,
      reason || `Failed to export document as ${format}`,
      { format, reason }
    );
  }

  static noTextExtracted(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.NO_TEXT_EXTRACTED,
      "No text could be extracted from the document",
      { suggestion: "Try a different file format or ensure the document contains readable text" }
    );
  }

  static unsupportedFileType(mime?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.UNSUPPORTED_FILE_TYPE,
      mime ? `Unsupported file type: ${mime}` : "Unsupported file type",
      {
        mime,
        supportedTypes: ["PDF", "Word (DOCX)", "Text", "Images (JPG, PNG, WEBP)"]
      }
    );
  }

  static serviceUnavailable(serviceName: string = "Document service"): DocumentError {
    return new DocumentError(
      DocumentErrorCode.SERVICE_UNAVAILABLE,
      `${serviceName} is currently unavailable`,
      { serviceName }
    );
  }

  static openAINotConfigured(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.OPENAI_NOT_CONFIGURED,
      "OpenAI API is not configured. Set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable",
      { envVars: ["OPENAI_API_KEY", "AI_INTEGRATIONS_OPENAI_API_KEY"] }
    );
  }

  static localLLMUnavailable(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.LOCAL_LLM_UNAVAILABLE,
      "Local LLM service is unavailable",
      { suggestion: "Configure OpenAI API key or start local LLM service" }
    );
  }

  static legalBridgeUnavailable(): DocumentError {
    return new DocumentError(
      DocumentErrorCode.LEGAL_BRIDGE_UNAVAILABLE,
      "Legal analysis bridge service is unavailable",
      { suggestion: "Check QUANTUM_BRIDGE_URL configuration" }
    );
  }

  static jobNotFound(jobId: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.JOB_NOT_FOUND,
      `Job not found: ${jobId}`,
      { jobId }
    );
  }

  static jobAlreadyRunning(jobId: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.JOB_ALREADY_RUNNING,
      `Job is already running: ${jobId}`,
      { jobId }
    );
  }

  static jobFailed(jobId: string, reason?: string): DocumentError {
    return new DocumentError(
      DocumentErrorCode.JOB_FAILED,
      reason || `Job failed: ${jobId}`,
      { jobId, reason }
    );
  }

  static internalError(message: string = "Internal server error", details?: unknown): DocumentError {
    return new DocumentError(DocumentErrorCode.INTERNAL_ERROR, message, details);
  }

  static unknownError(originalError?: unknown): DocumentError {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    return new DocumentError(
      DocumentErrorCode.UNKNOWN_ERROR,
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
export async function withDocumentErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DocumentError) {
      throw error;
    }
    console.error(`[Document][${operationName}] Error:`, error);
    throw DocumentError.unknownError(error);
  }
}

/**
 * Logs document errors with structured information
 */
export function logDocumentError(error: DocumentError, context?: Record<string, unknown>): void {
  console.error("[Document] Error:", {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  });
}
