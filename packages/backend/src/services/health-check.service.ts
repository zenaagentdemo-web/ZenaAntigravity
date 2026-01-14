import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import v8 from 'v8';

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    disk?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  details?: any;
}

class HealthCheckService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<CheckResult> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'pass',
        message: 'Database connection successful',
      };
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return {
        status: 'fail',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): CheckResult {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapLimitMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);

    // Percentage relative to absolute heap limit (usually ~4GB)
    const heapUsagePercent = (memUsage.heapUsed / heapStats.heap_size_limit) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Memory usage normal';

    // Warnings are now based on total system limit
    if (heapUsagePercent > 90) {
      status = 'fail';
      message = 'Critical memory usage (Total Limit)';
    } else if (heapUsagePercent > 70) {
      status = 'warn';
      message = 'High memory usage (Total Limit)';
    }

    return {
      status,
      message,
      details: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal_Allocated: `${heapTotalMB}MB`,
        heapLimit: `${heapLimitMB}MB`,
        heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      },
    };
  }

  /**
   * Perform all health checks
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const [databaseCheck, memoryCheck] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMemory()),
    ]);

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (databaseCheck.status === 'fail' || memoryCheck.status === 'fail') {
      overallStatus = 'unhealthy';
    } else if (databaseCheck.status === 'warn' || memoryCheck.status === 'warn') {
      overallStatus = 'degraded';
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: databaseCheck,
        memory: memoryCheck,
      },
    };
  }

  /**
   * Express handler for health check endpoint
   */
  async healthCheckHandler(_req: Request, res: Response): Promise<void> {
    try {
      const health = await this.performHealthCheck();

      // Set appropriate status code
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Simple liveness probe (for Kubernetes/Docker)
   */
  livenessHandler(_req: Request, res: Response): void {
    res.status(200).json({ status: 'alive' });
  }

  /**
   * Readiness probe (checks if app is ready to serve traffic)
   */
  async readinessHandler(_req: Request, res: Response): Promise<void> {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      res.status(503).json({ status: 'not ready' });
    }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
