/**
 * Express middleware for CYRUS communication routes.
 * Provides validation, error handling, and request processing utilities.
 */

import type { Request, Response, NextFunction } from "express";
import { CommsError, CommsErrorCode } from "./comms-errors.js";
import {
  validateUserId,
  validateMessageContent,
  validateCallType,
  validateUserStatus,
  validateMessageType,
  ValidationError,
} from "./comms-types.js";

/** Extract user/device ID from request headers or session */
export function getUserId(req: Request): string | null {
  const deviceIdHeader =
    (typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : null) ||
    (typeof req.headers["X-Device-Id"] === "string" ? req.headers["X-Device-Id"] : null);
  if (deviceIdHeader && deviceIdHeader.trim()) return deviceIdHeader.trim();

  const userFromSession = (req as { user?: { claims?: { sub?: string } } }).user?.claims?.sub;
  if (userFromSession) return userFromSession;

  const userIdHeader =
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null);
  if (userIdHeader && userIdHeader.trim()) return userIdHeader.trim();

  return null;
}

/** Require authentication - returns 401 if no user ID found */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
      code: CommsErrorCode.UNAUTHORIZED,
    });
    return;
  }
  // Attach userId to request for downstream handlers
  (req as { commsUserId?: string }).commsUserId = userId;
  next();
}

/** Unified error response handler */
export function handleCommsError(error: unknown, res: Response): void {
  if (error instanceof CommsError) {
    const statusCode = getStatusCodeForError(error.code);
    res.status(statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).json({
      error: error.message,
      code: CommsErrorCode.INVALID_INPUT,
      field: error.field,
    });
    return;
  }

  console.error("[CommsRoutes] Unexpected error:", error);
  res.status(500).json({
    error: "Internal server error",
    code: CommsErrorCode.INTERNAL_ERROR,
  });
}

function getStatusCodeForError(code: CommsErrorCode): number {
  switch (code) {
    case CommsErrorCode.INVALID_INPUT:
    case CommsErrorCode.MISSING_REQUIRED_FIELD:
    case CommsErrorCode.INVALID_CALL_STATE:
    case CommsErrorCode.CONFERENCE_FULL:
      return 400;
    case CommsErrorCode.UNAUTHORIZED:
      return 401;
    case CommsErrorCode.FORBIDDEN:
      return 403;
    case CommsErrorCode.USER_NOT_FOUND:
    case CommsErrorCode.CALL_NOT_FOUND:
    case CommsErrorCode.CONFERENCE_NOT_FOUND:
    case CommsErrorCode.MESSAGE_NOT_FOUND:
    case CommsErrorCode.GROUP_NOT_FOUND:
      return 404;
    case CommsErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    case CommsErrorCode.DATABASE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

/** Async route wrapper with error handling */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleCommsError(error, res);
    });
  };
}

/** Validate request body has required fields */
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((field) => {
      const value = (req.body as Record<string, unknown>)[field];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
        code: CommsErrorCode.MISSING_REQUIRED_FIELD,
        fields: missing,
      });
      return;
    }

    next();
  };
}

/** Rate limiting middleware (simple in-memory implementation) */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = getUserId(req) || req.ip || "anonymous";
    const key = `${req.path}:${userId}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || record.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        code: CommsErrorCode.RATE_LIMIT_EXCEEDED,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    record.count++;
    next();
  };
}

// Clean up rate limit store periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  60 * 1000,
); // Cleanup every minute

/** Middleware to validate message body */
export function validateMessageBody(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.content) validateMessageContent(body.content);
    if (body.messageType) validateMessageType(body.messageType);
    if (body.senderId) validateUserId(body.senderId);
    if (body.recipientId && body.recipientId !== "broadcast") validateUserId(body.recipientId);
    next();
  } catch (error) {
    handleCommsError(error, res);
  }
}

/** Middleware to validate call parameters */
export function validateCallParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.callType) validateCallType(body.callType);
    if (body.callerId) validateUserId(body.callerId);
    if (body.recipientId) validateUserId(body.recipientId);
    next();
  } catch (error) {
    handleCommsError(error, res);
  }
}

/** Middleware to validate presence update */
export function validatePresenceParams(req: Request, res: Response, next: NextFunction): void {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.status) validateUserStatus(body.status);
    if (body.userId) validateUserId(body.userId);
    next();
  } catch (error) {
    handleCommsError(error, res);
  }
}

/** Graceful DB table missing handler - returns empty array instead of 500 */
export function handleTableMissing(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    ("message" in error || "code" in error)
  ) {
    const err = error as { message?: string; code?: string };
    return err.message?.includes("does not exist") || err.code === "42P01";
  }
  return false;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/** Extract and validate pagination parameters */
export function getPaginationParams(req: Request, maxLimit = 100): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/** Standard success response */
export function successResponse<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

/** Standard error response */
export function errorResponse(res: Response, message: string, code: CommsErrorCode, statusCode = 500): void {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
}
