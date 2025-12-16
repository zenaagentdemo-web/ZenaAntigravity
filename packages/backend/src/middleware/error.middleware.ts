import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service.js';

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    requestId?: string;
  };
}

/**
 * Global error handling middleware
 * Should be registered last in the middleware chain
 */
export function errorHandlingMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Determine if this is an AppError or generic Error
  const isAppError = err instanceof AppError;
  
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const retryable = isAppError ? err.retryable : false;
  const details = isAppError ? err.details : undefined;
  
  // Log the error with appropriate level
  const logContext = {
    requestId: req.requestId,
    userId: (req as any).user?.id,
    method: req.method,
    url: req.url,
    statusCode,
    errorCode,
  };
  
  if (statusCode >= 500) {
    logger.error('Server error occurred', err, logContext);
  } else if (statusCode >= 400) {
    logger.warn('Client error occurred', logContext);
  }
  
  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message: err.message,
      retryable,
      requestId: req.requestId,
    },
  };
  
  // Include details in non-production environments or for client errors
  if (details || (process.env.NODE_ENV !== 'production' && statusCode < 500)) {
    errorResponse.error.details = details || (statusCode < 500 ? undefined : err.stack);
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Middleware to catch 404 errors
 */
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    404,
    'NOT_FOUND',
    `Route ${req.method} ${req.url} not found`,
    false
  );
  next(error);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
