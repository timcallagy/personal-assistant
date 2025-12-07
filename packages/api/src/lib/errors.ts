/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error factory functions for common error types
 */

export function validationError(
  message: string,
  fieldErrors?: Record<string, string>
): AppError {
  return new AppError(
    message || 'The request contains invalid data. Please check the following fields.',
    'VALIDATION_ERROR',
    400,
    fieldErrors ? { fields: fieldErrors } : undefined
  );
}

export function notFoundError(resource: string, id?: number | string): AppError {
  const message = id
    ? `${resource} with ID ${id} was not found. It may have been deleted or the ID is incorrect.`
    : `${resource} was not found.`;

  return new AppError(message, 'NOT_FOUND', 404, {
    resource_type: resource.toLowerCase(),
    resource_id: id,
  });
}

export function unauthorizedError(message?: string): AppError {
  return new AppError(
    message || 'You are not authorized to perform this action.',
    'UNAUTHORIZED',
    401
  );
}

export function conflictError(message: string): AppError {
  return new AppError(message, 'CONFLICT', 409);
}

export function internalError(message?: string): AppError {
  return new AppError(
    message || 'An unexpected error occurred. Please try again later.',
    'INTERNAL_ERROR',
    500
  );
}
