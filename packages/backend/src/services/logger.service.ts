import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, '../../debug.log');

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  requestId?: string;
  service?: string;
  action?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class LoggerService {
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor() {
    // Set minimum log level based on environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    this.minLevel = envLevel || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    // In production, you might send this to a logging service (e.g., CloudWatch, Datadog)
    // For now, we'll use console with appropriate methods
    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }

    // Also write to file for debugging
    try {
      fs.appendFileSync(LOG_FILE, output + '\n');
    } catch (e) {
      // Ignore write errors
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      const entry = this.formatLogEntry('debug', message, context);
      this.output(entry);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      const entry = this.formatLogEntry('info', message, context);
      this.output(entry);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      const entry = this.formatLogEntry('warn', message, context);
      this.output(entry);
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const entry = this.formatLogEntry('error', message, context, error);
      this.output(entry);
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('fatal')) {
      const entry = this.formatLogEntry('fatal', message, context, error);
      this.output(entry);
    }
  }

  // Helper method to create a child logger with default context
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

class ChildLogger {
  constructor(
    private parent: LoggerService,
    private defaultContext: LogContext
  ) { }

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.parent.fatal(message, error, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = new LoggerService();
