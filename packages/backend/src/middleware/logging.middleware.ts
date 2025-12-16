import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service.js';
import { randomUUID } from 'crypto';

// Extend Express Request to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      logger?: ReturnType<typeof logger.child>;
      startTime?: number;
    }
  }
}

/**
 * Middleware to add request ID and logger to each request
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Create child logger with request context
  req.logger = logger.child({
    requestId: req.requestId,
    userId: (req as any).user?.id,
  });
  
  // Record start time for performance tracking
  req.startTime = Date.now();
  
  next();
}

/**
 * Middleware to log incoming requests
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { method, url, headers } = req;
  
  req.logger?.info('Incoming request', {
    method,
    url,
    userAgent: headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  });
  
  next();
}

/**
 * Middleware to log response details
 */
export function responseLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override res.end to log when response is sent
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate response time
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    // Log response
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const logMethod = req.logger?.[logLevel].bind(req.logger);
    
    logMethod?.('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    
    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
}
