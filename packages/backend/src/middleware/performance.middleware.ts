import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service.js';

/**
 * Performance metrics storage
 */
interface PerformanceMetrics {
  endpoint: string;
  method: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  errors: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private slowRequestThreshold: number;
  
  constructor() {
    // Threshold for slow requests in milliseconds
    this.slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10);
    
    // Log metrics summary every 5 minutes
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.logMetricsSummary(), 5 * 60 * 1000);
    }
  }
  
  recordRequest(method: string, endpoint: string, duration: number, statusCode: number): void {
    const key = `${method}:${endpoint}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.avgDuration = existing.totalDuration / existing.count;
      if (statusCode >= 500) {
        existing.errors++;
      }
    } else {
      this.metrics.set(key, {
        endpoint,
        method,
        count: 1,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        avgDuration: duration,
        errors: statusCode >= 500 ? 1 : 0,
      });
    }
    
    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      logger.warn('Slow request detected', {
        method,
        endpoint,
        duration: `${duration}ms`,
        threshold: `${this.slowRequestThreshold}ms`,
      });
    }
  }
  
  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }
  
  resetMetrics(): void {
    this.metrics.clear();
  }
  
  private logMetricsSummary(): void {
    const metrics = this.getMetrics();
    
    if (metrics.length === 0) {
      return;
    }
    
    logger.info('Performance metrics summary', {
      totalEndpoints: metrics.length,
      metrics: metrics.map(m => ({
        endpoint: `${m.method} ${m.endpoint}`,
        requests: m.count,
        avgDuration: `${Math.round(m.avgDuration)}ms`,
        maxDuration: `${m.maxDuration}ms`,
        errors: m.errors,
      })),
    });
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to track request performance
 */
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override res.end to record metrics
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    
    // Normalize endpoint path (remove IDs and query params)
    const normalizedPath = req.route?.path || req.path.replace(/\/[0-9a-f-]{36}/gi, '/:id');
    
    // Record metrics
    performanceMonitor.recordRequest(req.method, normalizedPath, duration, res.statusCode);
    
    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
}

/**
 * Endpoint to retrieve performance metrics
 */
export function getPerformanceMetrics(req: Request, res: Response): void {
  const metrics = performanceMonitor.getMetrics();
  
  res.json({
    timestamp: new Date().toISOString(),
    metrics: metrics.map(m => ({
      endpoint: `${m.method} ${m.endpoint}`,
      requests: m.count,
      avgDuration: Math.round(m.avgDuration),
      minDuration: m.minDuration,
      maxDuration: m.maxDuration,
      errors: m.errors,
      errorRate: m.count > 0 ? ((m.errors / m.count) * 100).toFixed(2) + '%' : '0%',
    })),
  });
}
