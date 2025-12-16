# Monitoring and Logging System

This document describes the monitoring and logging infrastructure implemented for the Zena AI Real Estate PWA backend.

## Overview

The monitoring and logging system provides:
- **Structured logging** with contextual information
- **Error tracking** with automatic categorization
- **Performance monitoring** with metrics collection
- **Health checks** for system status
- **Alert system** for critical issues

## Components

### 1. Logger Service (`logger.service.ts`)

Centralized logging service with structured JSON output.

**Features:**
- Multiple log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Contextual logging with request IDs, user IDs, and custom metadata
- Environment-based log level filtering
- Child loggers for service-specific contexts

**Usage:**
```typescript
import { logger } from './services/logger.service.js';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database query failed', error, { query: 'SELECT * FROM users' });

// Child logger with default context
const serviceLogger = logger.child({ service: 'sync-engine' });
serviceLogger.info('Sync started', { accountId: 'abc' });
```

**Environment Variables:**
- `LOG_LEVEL`: Minimum log level (default: `debug` in dev, `info` in production)

### 2. Request Logging Middleware (`logging.middleware.ts`)

Automatically logs all HTTP requests and responses.

**Features:**
- Generates unique request IDs
- Logs request method, URL, user agent, IP
- Logs response status code and duration
- Attaches logger to request object for use in handlers

**Request Context:**
```typescript
// In route handlers
req.logger?.info('Processing request', { customData: 'value' });
```

### 3. Error Handling Middleware (`error.middleware.ts`)

Global error handling with structured error responses.

**Features:**
- Custom `AppError` class with error codes
- Automatic error logging with appropriate severity
- Structured error responses with request IDs
- Stack traces in development mode only

**Usage:**
```typescript
import { AppError, asyncHandler } from './middleware/error.middleware.js';

// Throw custom errors
throw new AppError(404, 'NOT_FOUND', 'User not found', false);

// Wrap async handlers
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  res.json(user);
}));
```

**Error Codes:**
- `AUTH_INVALID_CREDENTIALS` - Invalid login credentials
- `AUTH_TOKEN_EXPIRED` - Access token expired
- `AUTH_OAUTH_FAILED` - OAuth flow failed
- `SYNC_PROVIDER_ERROR` - Email/calendar provider error
- `SYNC_RATE_LIMITED` - Rate limit exceeded
- `AI_PROCESSING_FAILED` - AI processing error
- `AI_TIMEOUT` - AI request timeout
- `VALIDATION_FAILED` - Input validation error
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (duplicate)
- `INTEGRATION_FAILED` - CRM integration error
- `EXPORT_FAILED` - Export generation error

### 4. Performance Monitoring (`performance.middleware.ts`)

Tracks request performance and identifies slow endpoints.

**Features:**
- Records request duration for all endpoints
- Calculates min, max, avg response times
- Tracks error rates per endpoint
- Logs slow requests above threshold
- Periodic metrics summary logging

**Metrics Endpoint:**
```
GET /metrics
```

Returns performance metrics for all endpoints:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metrics": [
    {
      "endpoint": "GET /api/threads",
      "requests": 1250,
      "avgDuration": 145,
      "minDuration": 23,
      "maxDuration": 2340,
      "errors": 5,
      "errorRate": "0.40%"
    }
  ]
}
```

**Environment Variables:**
- `SLOW_REQUEST_THRESHOLD`: Threshold in ms for slow request warnings (default: 1000)
- `METRICS_TOKEN`: Token required to access /metrics in production

### 5. Health Check Service (`health-check.service.ts`)

Comprehensive health checks for system monitoring.

**Endpoints:**

**Main Health Check:**
```
GET /health
```

Returns detailed health status:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection successful"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage normal",
      "details": {
        "heapUsed": "125MB",
        "heapTotal": "256MB",
        "heapUsagePercent": "48.83%",
        "rss": "180MB"
      }
    }
  }
}
```

**Liveness Probe:**
```
GET /health/live
```

Simple check that the process is running (for Kubernetes).

**Readiness Probe:**
```
GET /health/ready
```

Checks if the app is ready to serve traffic (database connected).

### 6. Alert Service (`alert.service.ts`)

Sends alerts for critical issues.

**Features:**
- Multiple alert channels: log, email, webhook
- Alert throttling to prevent spam
- Alert statistics tracking
- Pre-configured alert helpers

**Usage:**
```typescript
import { alerts } from './services/alert.service.js';

// Send alerts
await alerts.authFailure(userId, 'Invalid password');
await alerts.databaseError(error, 'SELECT * FROM users');
await alerts.syncFailure(accountId, 'gmail', error);
await alerts.aiProcessingError('classification', error);
await alerts.memoryCritical(92.5);
```

**Environment Variables:**
- `ALERTS_ENABLED`: Enable/disable alerts (default: false)
- `ALERT_CHANNELS`: Comma-separated list of channels: `log,email,webhook`
- `ALERT_EMAIL_RECIPIENTS`: Comma-separated email addresses
- `ALERT_WEBHOOK_URL`: Webhook URL for alert notifications

**Alert Types:**
- `AUTH_FAILURE` - Authentication failures
- `DATABASE_ERROR` - Database errors
- `SYNC_FAILURE` - Email/calendar sync failures
- `AI_PROCESSING_ERROR` - AI processing errors
- `MEMORY_CRITICAL` - Critical memory usage
- `HIGH_ERROR_RATE` - High error rate on endpoints
- `SLOW_RESPONSE` - Slow response times
- `INTEGRATION_FAILURE` - CRM integration failures

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error, fatal

# Performance
SLOW_REQUEST_THRESHOLD=1000       # Milliseconds
METRICS_TOKEN=your-secret-token   # Required for /metrics in production

# Alerts
ALERTS_ENABLED=true
ALERT_CHANNELS=log,webhook
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL_RECIPIENTS=ops@example.com,dev@example.com
```

### Production Recommendations

1. **Log Level**: Set to `info` or `warn` in production
2. **Metrics Protection**: Always set `METRICS_TOKEN` in production
3. **Alerts**: Enable alerts with webhook to Slack/PagerDuty
4. **Log Aggregation**: Send logs to centralized service (CloudWatch, Datadog, etc.)
5. **Health Checks**: Configure load balancer to use `/health/ready`

## Integration with External Services

### Sentry (Error Tracking)

To integrate with Sentry:

1. Install Sentry SDK:
```bash
npm install @sentry/node
```

2. Initialize in `index.ts`:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add Sentry request handler
app.use(Sentry.Handlers.requestHandler());

// Add Sentry error handler before other error handlers
app.use(Sentry.Handlers.errorHandler());
```

3. Update logger to send errors to Sentry:
```typescript
// In logger.service.ts
if (level === 'error' || level === 'fatal') {
  Sentry.captureException(error, { contexts: { custom: context } });
}
```

### CloudWatch Logs

To send logs to AWS CloudWatch:

1. Install AWS SDK:
```bash
npm install @aws-sdk/client-cloudwatch-logs
```

2. Update logger output method to send to CloudWatch
3. Configure IAM role with CloudWatch Logs permissions

### Datadog

To integrate with Datadog:

1. Install Datadog tracer:
```bash
npm install dd-trace
```

2. Initialize at the top of `index.ts`:
```typescript
import tracer from 'dd-trace';
tracer.init({
  service: 'zena-backend',
  env: process.env.NODE_ENV,
});
```

## Monitoring Best Practices

1. **Always use structured logging** - Include context like userId, requestId
2. **Log at appropriate levels** - Don't log everything as `error`
3. **Include error details** - Stack traces, error codes, context
4. **Monitor key metrics** - Response times, error rates, memory usage
5. **Set up alerts** - For critical errors and performance degradation
6. **Regular health checks** - Use `/health` endpoint in monitoring tools
7. **Review logs regularly** - Look for patterns and anomalies
8. **Correlate logs** - Use request IDs to trace requests across services

## Troubleshooting

### High Memory Usage

Check `/health` endpoint for memory details. If consistently high:
1. Review memory leaks in application code
2. Check for large data structures in memory
3. Consider increasing server resources
4. Implement pagination for large queries

### Slow Requests

Check `/metrics` endpoint to identify slow endpoints:
1. Review database query performance
2. Check external API response times
3. Add caching where appropriate
4. Optimize AI processing pipelines

### Database Connection Issues

Check `/health/ready` endpoint:
1. Verify database credentials
2. Check network connectivity
3. Review connection pool settings
4. Check database server health

## Future Enhancements

- [ ] Distributed tracing with OpenTelemetry
- [ ] Custom metrics dashboard
- [ ] Automated performance regression detection
- [ ] Log retention and archival policies
- [ ] Advanced anomaly detection
- [ ] Integration with APM tools (New Relic, AppDynamics)
