import { ErrorInfo } from 'react';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  errorInfo?: ErrorInfo;
  context?: {
    userId?: string;
    route?: string;
    userAgent?: string;
    component?: string;
    props?: any;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface UserFeedback {
  errorId: string;
  message: string;
  email?: string;
  timestamp: Date;
}

class ErrorHandlingService {
  private errors: Map<string, ErrorReport> = new Map();
  private maxErrors = 100; // Keep only the last 100 errors
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Listen for global errors
    window.addEventListener('error', this.handleGlobalError);
  }

  /**
   * Report an error with context
   */
  reportError(
    error: Error,
    context?: ErrorReport['context'],
    severity: ErrorReport['severity'] = 'medium',
    errorInfo?: ErrorInfo
  ): string {
    const errorId = this.generateErrorId();
    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      error,
      errorInfo,
      context: {
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        ...context
      },
      severity,
      handled: true
    };

    this.storeError(errorReport);
    this.sendErrorReport(errorReport);

    return errorId;
  }

  /**
   * Report a widget-specific error
   */
  reportWidgetError(
    widgetName: string,
    error: Error,
    props?: any,
    severity: ErrorReport['severity'] = 'low'
  ): string {
    return this.reportError(error, {
      component: widgetName,
      props
    }, severity);
  }

  /**
   * Report a network error
   */
  reportNetworkError(
    url: string,
    method: string,
    status?: number,
    error?: Error
  ): string {
    const networkError = error || new Error(`Network request failed: ${method} ${url}`);
    return this.reportError(networkError, {
      component: 'NetworkRequest',
      props: { url, method, status }
    }, status && status >= 500 ? 'high' : 'medium');
  }

  /**
   * Report a data loading error
   */
  reportDataError(
    dataType: string,
    error: Error,
    context?: any
  ): string {
    return this.reportError(error, {
      component: 'DataLoader',
      props: { dataType, context }
    }, 'medium');
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get all errors
   */
  getAllErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.getAllErrors().filter(error => error.severity === severity);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.clear();
    this.errorQueue = [];
  }

  /**
   * Submit user feedback for an error
   */
  submitUserFeedback(feedback: UserFeedback): void {
    console.log('User feedback submitted:', feedback);

    // In a real app, this would send feedback to the backend
    if (this.isOnline) {
      this.sendUserFeedback(feedback);
    } else {
      // Queue feedback for when we're back online
      localStorage.setItem(
        `error_feedback_${feedback.errorId}`,
        JSON.stringify(feedback)
      );
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byComponent: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number; // Last 24 hours
  } {
    const errors = this.getAllErrors();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      total: errors.length,
      byComponent: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recent: 0
    };

    errors.forEach(error => {
      // Count by component
      const component = error.context?.component || 'Unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;

      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

      // Count recent errors
      if (error.timestamp >= oneDayAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  /**
   * Check if there are critical errors
   */
  hasCriticalErrors(): boolean {
    return this.getErrorsBySeverity('critical').length > 0;
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Safely stringify objects that might have circular references
   */
  private safeStringify(obj: any): string {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    });
  }

  /**
   * Store error in memory and local storage
   */
  private storeError(errorReport: ErrorReport): void {
    // Store in memory
    this.errors.set(errorReport.id, errorReport);

    // Limit memory usage
    if (this.errors.size > this.maxErrors) {
      const oldestError = Array.from(this.errors.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      this.errors.delete(oldestError.id);
    }

    // Store in local storage for persistence
    try {
      const storedErrorsRaw = localStorage.getItem('zena_errors') || '[]';
      let storedErrors = [];
      try {
        storedErrors = JSON.parse(storedErrorsRaw);
      } catch (e) {
        storedErrors = [];
      }

      // Truncate fields for local storage to prevent quota issues
      const truncatedReport = {
        id: errorReport.id,
        timestamp: errorReport.timestamp,
        severity: errorReport.severity,
        handled: errorReport.handled,
        error: {
          name: errorReport.error.name,
          message: errorReport.error.message.substring(0, 500),
          stack: errorReport.error.stack?.substring(0, 1000)
        },
        context: {
          route: errorReport.context?.route,
          component: errorReport.context?.component,
          // Only store a summary of props/info in local storage
          hasProps: !!errorReport.context?.props,
          hasErrorInfo: !!errorReport.errorInfo
        }
      };

      storedErrors.push(truncatedReport);

      // Keep only the last 20 errors in storage (reduced from 50 to be even safer)
      if (storedErrors.length > 20) {
        storedErrors.splice(0, storedErrors.length - 20);
      }

      try {
        localStorage.setItem('zena_errors', this.safeStringify(storedErrors));
      } catch (storageError) {
        if (storageError instanceof DOMException && storageError.name === 'QuotaExceededError') {
          // If still failing, clear half and try again or just keep a few
          console.warn('LocalStorage quota exceeded, clearing old errors');
          const lastFew = storedErrors.slice(-5);
          localStorage.setItem('zena_errors', this.safeStringify(lastFew));
        }
      }
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Send error report to backend
   */
  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      this.errorQueue.push(errorReport);
      return;
    }

    try {
      // In a real app, this would send to your error tracking service
      console.log('Sending error report:', errorReport);

      // Example API call (commented out for now)
      /*
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: errorReport.id,
          timestamp: errorReport.timestamp.toISOString(),
          message: errorReport.error.message,
          stack: errorReport.error.stack,
          context: errorReport.context,
          severity: errorReport.severity,
          handled: errorReport.handled
        })
      });
      */
    } catch (error) {
      console.warn('Failed to send error report:', error);
      this.errorQueue.push(errorReport);
    }
  }

  /**
   * Send user feedback to backend
   */
  private async sendUserFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // In a real app, this would send to your feedback service
      console.log('Sending user feedback:', feedback);

      // Example API call (commented out for now)
      /*
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback)
      });
      */
    } catch (error) {
      console.warn('Failed to send user feedback:', error);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    console.log('Connection restored, sending queued error reports');

    // Send queued error reports
    this.errorQueue.forEach(errorReport => {
      this.sendErrorReport(errorReport);
    });
    this.errorQueue = [];

    // Send queued feedback
    this.sendQueuedFeedback();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    console.log('Connection lost, queueing error reports');
  };

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.reportError(error, {
      component: 'UnhandledPromiseRejection'
    }, 'high');
  };

  /**
   * Handle global errors
   */
  private handleGlobalError = (event: ErrorEvent): void => {
    const error = event.error || new Error(event.message);
    this.reportError(error, {
      component: 'GlobalError',
      props: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    }, 'high');
  };

  /**
   * Send queued feedback when back online
   */
  private sendQueuedFeedback(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('error_feedback_')) {
        try {
          const feedback = JSON.parse(localStorage.getItem(key) || '');
          this.sendUserFeedback(feedback);
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to send queued feedback:', e);
        }
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();

// Export utility functions
export const reportError = (error: Error, context?: any, severity?: ErrorReport['severity']) =>
  errorHandlingService.reportError(error, context, severity);

export const reportWidgetError = (widgetName: string, error: Error, props?: any) =>
  errorHandlingService.reportWidgetError(widgetName, error, props);

export const reportNetworkError = (url: string, method: string, status?: number, error?: Error) =>
  errorHandlingService.reportNetworkError(url, method, status, error);

export const reportDataError = (dataType: string, error: Error, context?: any) =>
  errorHandlingService.reportDataError(dataType, error, context);