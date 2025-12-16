import { logger } from './logger.service.js';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert types
 */
export type AlertType =
  | 'AUTH_FAILURE'
  | 'DATABASE_ERROR'
  | 'SYNC_FAILURE'
  | 'AI_PROCESSING_ERROR'
  | 'MEMORY_CRITICAL'
  | 'HIGH_ERROR_RATE'
  | 'SLOW_RESPONSE'
  | 'INTEGRATION_FAILURE';

/**
 * Alert payload
 */
export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  channels: ('log' | 'email' | 'webhook')[];
  emailRecipients?: string[];
  webhookUrl?: string;
}

class AlertService {
  private config: AlertConfig;
  private alertCounts: Map<AlertType, number> = new Map();
  private lastAlertTime: Map<AlertType, number> = new Map();
  private alertThrottleMs: number = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.config = {
      enabled: process.env.ALERTS_ENABLED === 'true',
      channels: (process.env.ALERT_CHANNELS?.split(',') as any) || ['log'],
      emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
    };
  }
  
  /**
   * Send an alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
    
    // Check if alert should be throttled
    if (this.shouldThrottle(alert.type)) {
      return;
    }
    
    // Update alert tracking
    this.updateAlertTracking(alert.type);
    
    // Log alert
    logger.warn('Alert triggered', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
    });
    
    // Send through configured channels
    const promises: Promise<void>[] = [];
    
    if (this.config.channels.includes('email') && this.config.emailRecipients) {
      promises.push(this.sendEmailAlert(alert));
    }
    
    if (this.config.channels.includes('webhook') && this.config.webhookUrl) {
      promises.push(this.sendWebhookAlert(alert));
    }
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Check if alert should be throttled
   */
  private shouldThrottle(type: AlertType): boolean {
    const lastTime = this.lastAlertTime.get(type);
    if (!lastTime) {
      return false;
    }
    
    return Date.now() - lastTime < this.alertThrottleMs;
  }
  
  /**
   * Update alert tracking
   */
  private updateAlertTracking(type: AlertType): void {
    const count = this.alertCounts.get(type) || 0;
    this.alertCounts.set(type, count + 1);
    this.lastAlertTime.set(type, Date.now());
  }
  
  /**
   * Send email alert (placeholder - integrate with email service)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    logger.info('Email alert would be sent', {
      recipients: this.config.emailRecipients,
      alert,
    });
  }
  
  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!this.config.webhookUrl) {
      return;
    }
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error as Error, {
        webhookUrl: this.config.webhookUrl,
        alert,
      });
    }
  }
  
  /**
   * Get alert statistics
   */
  getAlertStats(): { type: AlertType; count: number }[] {
    return Array.from(this.alertCounts.entries()).map(([type, count]) => ({
      type,
      count,
    }));
  }
  
  /**
   * Reset alert statistics
   */
  resetAlertStats(): void {
    this.alertCounts.clear();
    this.lastAlertTime.clear();
  }
}

// Export singleton instance
export const alertService = new AlertService();

/**
 * Helper functions for common alerts
 */
export const alerts = {
  authFailure: (userId: string, reason: string) =>
    alertService.sendAlert({
      type: 'AUTH_FAILURE',
      severity: 'warning',
      message: 'Authentication failure detected',
      details: { userId, reason },
      timestamp: new Date().toISOString(),
    }),
  
  databaseError: (error: Error, query?: string) =>
    alertService.sendAlert({
      type: 'DATABASE_ERROR',
      severity: 'critical',
      message: 'Database error occurred',
      details: { error: error.message, query },
      timestamp: new Date().toISOString(),
    }),
  
  syncFailure: (accountId: string, provider: string, error: Error) =>
    alertService.sendAlert({
      type: 'SYNC_FAILURE',
      severity: 'warning',
      message: 'Email/calendar sync failure',
      details: { accountId, provider, error: error.message },
      timestamp: new Date().toISOString(),
    }),
  
  aiProcessingError: (operation: string, error: Error) =>
    alertService.sendAlert({
      type: 'AI_PROCESSING_ERROR',
      severity: 'warning',
      message: 'AI processing error',
      details: { operation, error: error.message },
      timestamp: new Date().toISOString(),
    }),
  
  memoryCritical: (heapUsagePercent: number) =>
    alertService.sendAlert({
      type: 'MEMORY_CRITICAL',
      severity: 'critical',
      message: 'Critical memory usage detected',
      details: { heapUsagePercent: `${heapUsagePercent.toFixed(2)}%` },
      timestamp: new Date().toISOString(),
    }),
  
  highErrorRate: (endpoint: string, errorRate: number) =>
    alertService.sendAlert({
      type: 'HIGH_ERROR_RATE',
      severity: 'warning',
      message: 'High error rate detected',
      details: { endpoint, errorRate: `${errorRate.toFixed(2)}%` },
      timestamp: new Date().toISOString(),
    }),
};
