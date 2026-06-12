/**
 * Express middleware for Document Intelligence API routes
 */

import { Request, Response, NextFunction } from "express";
import { DocumentError, logDocumentError } from "./document-errors.js";
import {
  validateJurisdiction,
  validateDocumentMode,
  validateDocumentHint,
  validateAnalysisCommand,
  validateMaxChunks,
  validateBoolean,
  validateFileSize,
  validateDocumentType,
  validateAudience,
  validateTargetPages,
  validateContent,
  validateImageStyle,
  DocumentValidationError,
  sanitizeAnalysisOptions,
} from "./document-types.js";
import { parseMaxAnalysisChunks, parseMaxUploadFileBytes, maxDocgenTargetPages } from "../../shared/cyrus-document-limits.js";

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Error handler middleware for document operations
 */
export function handleDocumentError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof DocumentError) {
    logDocumentError(error, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(error.statusCode).json(error.toJSON());
    return;
  }
  
  if (error instanceof DocumentValidationError) {
    const docError = DocumentError.invalidInput(error.message, { field: error.field });
    logDocumentError(docError, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(docError.statusCode).json(docError.toJSON());
    return;
  }
  
  // Unknown error
  const docError = DocumentError.unknownError(error);
  logDocumentError(docError, {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  res.status(docError.statusCode).json(docError.toJSON());
}

/**
 * Async route handler wrapper that catches errors
 */
export function asyncDocumentHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Validates file upload
 */
export function validateDocumentFile(req: Request & { file?: Express.Multer.File }, res: Response, next: NextFunction): void {
  try {
    if (!req.file) {
      throw DocumentError.noFileProvided();
    }
    const maxBytes = parseMaxUploadFileBytes();
    validateFileSize(req.file.size, maxBytes);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates analysis options from request body or form data
 */
export function validateAnalysisOptions(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body || {};
    const systemMaxChunks = parseMaxAnalysisChunks();
    
    const options = sanitizeAnalysisOptions(
      {
        jurisdiction: body.jurisdiction,
        strictLegalReview: body.strictLegalReview,
        mode: body.mode,
        docHint: body.docHint,
        analysisCommand: body.analysisCommand,
        maxChunks: body.maxChunks,
      },
      systemMaxChunks
    );
    
    // Attach validated options to request
    (req as any).validatedAnalysisOptions = options;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates document generation parameters
 */
export function validateGenerationParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body || {};
    
    const validated = {
      docType: validateDocumentType(body.docType),
      audience: validateAudience(body.audience),
      content: validateContent(body.rawText || body.content),
      targetPages: validateTargetPages(body.targetPages, maxDocgenTargetPages()),
      purpose: body.purpose?.trim() || undefined,
      includeImages: validateBoolean(body.includeImages, "includeImages", false),
      imageStyle: validateImageStyle(body.imageStyle),
    };
    
    // Attach validated params to request
    (req as any).validatedGenerationParams = validated;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates export parameters
 */
export function validateExportParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const { format } = req.body || {};
    if (!format) {
      throw DocumentError.invalidInput("Export format is required", { field: "format" });
    }
    const validFormats = ["pdf", "docx", "html", "md", "txt", "json"];
    if (!validFormats.includes(format)) {
      throw DocumentError.invalidInput(
        `Invalid export format. Must be one of: ${validFormats.join(", ")}`,
        { field: "format", validFormats }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// REQUEST LOGGING
// ============================================

/**
 * Logs incoming document requests for monitoring
 */
export function logDocumentRequest(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log("[Document][Request]", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      fileSize: (req as any).file?.size,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Checks if document services are available
 */
export async function checkDocumentServiceHealth(): Promise<{
  available: boolean;
  services: Record<string, boolean>;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const services: Record<string, boolean> = {
    openAI: false,
    localLLM: false,
    legalBridge: false,
  };
  
  // Check OpenAI configuration
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  services.openAI = Boolean(openaiApiKey);
  if (!services.openAI) {
    warnings.push("OpenAI API key not configured");
  }
  
  // Check local LLM availability
  const useLocalLLM = process.env.USE_LOCAL_LLM !== "false";
  services.localLLM = useLocalLLM;
  if (!useLocalLLM && !services.openAI) {
    warnings.push("No LLM service available (neither OpenAI nor local LLM)");
  }
  
  // Check legal bridge
  const legalBridgeUrl = process.env.QUANTUM_BRIDGE_URL;
  services.legalBridge = Boolean(legalBridgeUrl);
  if (!services.legalBridge) {
    warnings.push("Legal bridge service not configured (QUANTUM_BRIDGE_URL)");
  }
  
  const available = services.openAI || services.localLLM;
  
  return { available, services, warnings };
}

/**
 * Gets system configuration limits
 */
export function getSystemLimits() {
  return {
    maxUploadSizeBytes: parseMaxUploadFileBytes(),
    maxUploadSizeMB: parseMaxUploadFileBytes() / 1024 / 1024,
    maxAnalysisChunks: parseMaxAnalysisChunks(),
    maxDocgenPages: maxDocgenTargetPages(),
  };
}
