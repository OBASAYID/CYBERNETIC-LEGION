/**
 * Express middleware for Vision & Scan API routes
 */

import { Request, Response, NextFunction } from "express";
import { ScanError, logScanError } from "./scan-errors.js";
import {
  validateBase64Image,
  validateScanMode,
  validateLanguageCode,
  validateText,
  ValidationError,
} from "./scan-types.js";

// ============================================
// RATE LIMITING
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

/**
 * Simple in-memory rate limiter for scan endpoints
 */
export function scanRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientIP = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  
  const record = requestCounts.get(clientIP);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    next();
    return;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    res.status(429).json({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter,
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
    });
    return;
  }
  
  record.count++;
  next();
}

/**
 * Cleanup rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Error handler middleware for scan operations
 */
export function handleScanError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ScanError) {
    logScanError(error, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(error.statusCode).json(error.toJSON());
    return;
  }
  
  if (error instanceof ValidationError) {
    const scanError = ScanError.invalidInput(error.message, { field: error.field });
    logScanError(scanError, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(scanError.statusCode).json(scanError.toJSON());
    return;
  }
  
  // Unknown error
  const scanError = ScanError.unknownError(error);
  logScanError(scanError, {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  res.status(scanError.statusCode).json(scanError.toJSON());
}

/**
 * Async route handler wrapper that catches errors
 */
export function asyncScanHandler(
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
 * Validates base64 image in request body
 */
export function validateImageBody(req: Request, res: Response, next: NextFunction): void {
  try {
    const { image } = req.body;
    if (!image) {
      throw ScanError.invalidImage("Image data is required in request body");
    }
    req.body.validatedImage = validateBase64Image(image);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates scan mode parameter
 */
export function validateScanModeParam(req: Request, res: Response, next: NextFunction): void {
  try {
    const mode = req.body.mode || req.query.mode;
    if (mode) {
      req.body.validatedMode = validateScanMode(mode as string);
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates language parameters
 */
export function validateLanguageParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const { targetLanguage, sourceLanguage } = req.body;
    if (targetLanguage) {
      req.body.validatedTargetLanguage = validateLanguageCode(targetLanguage, "targetLanguage");
    }
    if (sourceLanguage) {
      req.body.validatedSourceLanguage = validateLanguageCode(sourceLanguage, "sourceLanguage");
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates text in request body
 */
export function validateTextBody(req: Request, res: Response, next: NextFunction): void {
  try {
    const { text } = req.body;
    if (!text) {
      throw ScanError.emptyInput("text");
    }
    req.body.validatedText = validateText(text, "text", { maxLength: 500_000 });
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates file upload size
 */
export function validateScanFileSize(maxSizeMB: number = 10) {
  return (req: Request & { file?: Express.Multer.File }, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        throw ScanError.invalidInput("No file uploaded");
      }
      const fileSizeMB = req.file.size / 1024 / 1024;
      if (fileSizeMB > maxSizeMB) {
        throw ScanError.imageTooLarge(fileSizeMB, maxSizeMB);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================
// REQUEST LOGGING
// ============================================

/**
 * Logs incoming scan requests for monitoring
 */
export function logScanRequest(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log("[Scan][Request]", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Checks if scan services are available
 */
export async function checkScanServiceHealth(): Promise<{
  available: boolean;
  services: Record<string, boolean>;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const services: Record<string, boolean> = {
    openAI: false,
    localLLM: false,
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
  
  const available = services.openAI || services.localLLM;
  
  return { available, services, warnings };
}
