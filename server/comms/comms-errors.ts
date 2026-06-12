/**
 * Structured error types for CYRUS communication system.
 */

export enum CommsErrorCode {
  // Validation errors
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // Resource errors
  USER_NOT_FOUND = "USER_NOT_FOUND",
  CALL_NOT_FOUND = "CALL_NOT_FOUND",
  CONFERENCE_NOT_FOUND = "CONFERENCE_NOT_FOUND",
  MESSAGE_NOT_FOUND = "MESSAGE_NOT_FOUND",
  GROUP_NOT_FOUND = "GROUP_NOT_FOUND",

  // State errors
  CALL_ALREADY_ACTIVE = "CALL_ALREADY_ACTIVE",
  CONFERENCE_FULL = "CONFERENCE_FULL",
  USER_ALREADY_IN_CALL = "USER_ALREADY_IN_CALL",
  INVALID_CALL_STATE = "INVALID_CALL_STATE",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE",
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT",

  // Encryption errors
  ENCRYPTION_ERROR = "ENCRYPTION_ERROR",
  DECRYPTION_ERROR = "DECRYPTION_ERROR",
  MISSING_ENCRYPTION_KEY = "MISSING_ENCRYPTION_KEY",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Internal errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
}

export class CommsError extends Error {
  constructor(
    public code: CommsErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CommsError";
    Error.captureStackTrace?.(this, CommsError);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  static invalidInput(field: string, reason: string): CommsError {
    return new CommsError(CommsErrorCode.INVALID_INPUT, `Invalid ${field}: ${reason}`, { field, reason });
  }

  static missingField(field: string): CommsError {
    return new CommsError(CommsErrorCode.MISSING_REQUIRED_FIELD, `Missing required field: ${field}`, { field });
  }

  static userNotFound(userId: string): CommsError {
    return new CommsError(CommsErrorCode.USER_NOT_FOUND, `User not found: ${userId}`, { userId });
  }

  static callNotFound(callId: string): CommsError {
    return new CommsError(CommsErrorCode.CALL_NOT_FOUND, `Call not found: ${callId}`, { callId });
  }

  static conferenceNotFound(conferenceId: string): CommsError {
    return new CommsError(CommsErrorCode.CONFERENCE_NOT_FOUND, `Conference not found: ${conferenceId}`, {
      conferenceId,
    });
  }

  static conferenceFull(conferenceId: string, maxParticipants: number): CommsError {
    return new CommsError(
      CommsErrorCode.CONFERENCE_FULL,
      `Conference is full (max ${maxParticipants} participants)`,
      { conferenceId, maxParticipants },
    );
  }

  static databaseError(operation: string, cause?: Error): CommsError {
    return new CommsError(CommsErrorCode.DATABASE_ERROR, `Database operation failed: ${operation}`, {
      operation,
      cause: cause?.message,
    });
  }

  static databaseUnavailable(): CommsError {
    return new CommsError(CommsErrorCode.DATABASE_UNAVAILABLE, "Database is unavailable (fallback mode active)");
  }

  static encryptionError(reason: string): CommsError {
    return new CommsError(CommsErrorCode.ENCRYPTION_ERROR, `Encryption failed: ${reason}`, { reason });
  }

  static rateLimitExceeded(resource: string, limit: number): CommsError {
    return new CommsError(CommsErrorCode.RATE_LIMIT_EXCEEDED, `Rate limit exceeded for ${resource}`, {
      resource,
      limit,
    });
  }

  static internalError(message: string, cause?: Error): CommsError {
    return new CommsError(CommsErrorCode.INTERNAL_ERROR, message, { cause: cause?.message });
  }
}

/** Wraps async operations with consistent error handling */
export async function withCommsErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
): Promise<{ success: true; data: T } | { success: false; error: CommsError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    if (error instanceof CommsError) {
      console.error(`[Comms][${context}] Error:`, error.toJSON());
      return { success: false, error };
    }
    const commsError = CommsError.internalError(`${context} failed`, error as Error);
    console.error(`[Comms][${context}] Unexpected error:`, error);
    return { success: false, error: commsError };
  }
}
