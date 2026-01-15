import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import prisma from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import emailAccountRoutes from './routes/email-account.routes.js';
import calendarAccountRoutes from './routes/calendar-account.routes.js';
import syncRoutes from './routes/sync.routes.js';
import threadsRoutes from './routes/threads.routes.js';
import contactsRoutes from './routes/contacts.routes.js';
import propertiesRoutes from './routes/properties.routes.js';
import dealsRoutes from './routes/deals.routes.js';
import timelineRoutes from './routes/timeline.routes.js';
import calendarActionsRoutes from './routes/calendar-actions.routes.js';
import taskRoutes from './routes/task.routes.js';
import voiceNoteRoutes from './routes/voice-note.routes.js';
import askZenaRoutes from './routes/ask-zena.routes.js';
import searchRoutes from './routes/search.routes.js';
import exportRoutes from './routes/export.routes.js';
import crmIntegrationRoutes from './routes/crm-integration.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dataDeletionRoutes from './routes/data-deletion.routes.js';
import historyRoutes from './routes/history.routes.js';
import actionsRoutes from './routes/actions.routes.js';
import zenaActionsRoutes from './routes/zena-actions.routes.js';
import foldersRoutes from './routes/folders.routes.js';
import userRoutes from './routes/user.routes.js';
import marketDataRoutes from './routes/market-data.routes.js';
import connectionRoutes from './routes/connections.routes.js';
import { syncEngineService } from './services/sync-engine.service.js';
import { calendarSyncEngineService } from './services/calendar-sync-engine.service.js';
import { websocketService } from './services/websocket.service.js';
import { dealSchedulerService } from './services/deal-scheduler.service.js';
import { godmodeSchedulerService } from './services/godmode-scheduler.service.js';
import { intelligenceHeartbeatService } from './services/intelligence-heartbeat.service.js';
import { reminderSchedulerService } from './services/reminder-scheduler.service.js';
import { logger } from './services/logger.service.js';
import { healthCheckService } from './services/health-check.service.js';
import { backgroundJobService } from './services/background-job.service.js';
import {
  requestContextMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
} from './middleware/logging.middleware.js';
import {
  errorHandlingMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware.js';
import {
  performanceMonitoringMiddleware,
  getPerformanceMetrics,
} from './middleware/performance.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Order matters!
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging and monitoring middleware
app.use(requestContextMiddleware);
app.use(requestLoggingMiddleware);
app.use(responseLoggingMiddleware);
app.use(performanceMonitoringMiddleware);

// Make prisma available to routes
app.locals.prisma = prisma;

// Health check endpoints
app.get('/health', healthCheckService.healthCheckHandler.bind(healthCheckService));
app.get('/api/health', healthCheckService.healthCheckHandler.bind(healthCheckService));
app.get('/health/live', healthCheckService.livenessHandler.bind(healthCheckService));
app.get('/health/ready', healthCheckService.readinessHandler.bind(healthCheckService));

// Debug endpoint to view logs
app.get('/api/debug/logs', (req, res) => {
  try {
    const logPath = path.join(process.cwd(), 'debug.log');
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf8');
      res.type('text/plain').send(logs);
    } else {
      res.status(404).send('Log file not found at: ' + logPath);
    }
  } catch (err) {
    res.status(500).send('Error reading logs: ' + (err as Error).message);
  }
});

// Metrics endpoint (protected in production)
app.get('/metrics', (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-metrics-token'] !== process.env.METRICS_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  getPerformanceMetrics(req, res);
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Zena AI Real Estate API' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Email account routes
app.use('/api/accounts/email', emailAccountRoutes);

// Calendar account routes
app.use('/api/accounts/calendar', calendarAccountRoutes);

// Sync routes
app.use('/api/sync', syncRoutes);

// Thread routes
app.use('/api/threads', threadsRoutes);

// Contact routes
app.use('/api/contacts', contactsRoutes);

// Property routes
app.use('/api/properties', propertiesRoutes);

// Deal routes
app.use('/api/deals', dealsRoutes);

// Timeline routes
app.use('/api/timeline', timelineRoutes);

// Calendar Action routes (Pillar E)
app.use('/api/calendar', calendarActionsRoutes);

// Calendar Optimization routes
import calendarRoutes from './routes/calendar.routes.js';
app.use('/api/calendar-optimization', calendarRoutes);

// Drive Mode Routes
import driveModeRoutes from './routes/drive-mode.routes.js';
app.use('/api/drive-mode', driveModeRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Voice note routes
app.use('/api/voice-notes', voiceNoteRoutes);

// Ask Zena routes
app.use('/api/ask', askZenaRoutes);

// Search routes
app.use('/api/search', searchRoutes);

// Export routes
app.use('/api/export', exportRoutes);

// CRM integration routes
app.use('/api/integrations/crm', crmIntegrationRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Data deletion routes
app.use('/api/data', dataDeletionRoutes);

// History routes
app.use('/api/history', historyRoutes);

// Custom action routes
app.use('/api/actions', actionsRoutes);

// Zena Actions routes (AI-powered deal actions)
app.use('/api/zena-actions', zenaActionsRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/user', userRoutes);

app.use('/api/market-data', marketDataRoutes);

// Connections routes
import { restoreSessions } from './controllers/connections.controller.js';
app.use('/api/connections', connectionRoutes);

// Communications routes
import communicationsRoutes from './routes/communications.routes.js';
app.use('/api/communications', communicationsRoutes);

// Oracle routes (Predictive Intelligence)
import oracleRoutes from './routes/oracle.routes.js';
app.use('/api/oracle', oracleRoutes);

// Godmode routes (Autonomous Actions)
import godmodeRoutes from './routes/godmode.routes.js';
app.use('/api/godmode', godmodeRoutes);

// CRM Delivery routes (Email Bridge)
import crmDeliveryRoutes from './routes/crm-delivery.routes.js';
app.use('/api/crm-delivery', crmDeliveryRoutes);

// Geocoding routes (Address Autocomplete)
import geocodingRoutes from './routes/geocoding.routes.js';
app.use('/api/geocoding', geocodingRoutes);

// 404 handler - must be after all routes
app.use(notFoundMiddleware);

// 404 handler - must be after all routes
app.use(notFoundMiddleware);

// Error handling middleware - must be last
app.use(errorHandlingMiddleware);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server and background engines only if not in test
if (process.env.NODE_ENV !== 'test') {
  websocketService.initialize(server);
  backgroundJobService.initialize();

  // Restore sessions from disk (safe initialization)
  restoreSessions();

  // Start background engines with staggered delays to reduce startup resource spike
  syncEngineService.start();

  // Stagger subsequent services
  setTimeout(() => {
    calendarSyncEngineService.start();
  }, 5000);

  setTimeout(() => {
    dealSchedulerService.start();
    godmodeSchedulerService.start();
  }, 15000);

  setTimeout(() => {
    intelligenceHeartbeatService.start();
    reminderSchedulerService.start();
  }, 30000);
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // 1. Stop background services first
    logger.info('Stopping background services...');
    syncEngineService.stop();
    calendarSyncEngineService.stop();
    dealSchedulerService.stop();
    godmodeSchedulerService.stop();
    intelligenceHeartbeatService.stop();
    reminderSchedulerService.stop();
    websocketService.shutdown();

    // 2. Stop accepting new connections
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server', err);
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });
    }

    // 3. Disconnect from database
    await prisma.$disconnect();
    logger.info('Database disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    // Force exit if graceful shutdown fails
    setTimeout(() => process.exit(1), 1000).unref();
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.fatal('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

// Start server if not in test
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      databaseConfigured: !!process.env.DATABASE_URL,
    });

    logger.info('WebSocket server initialized', {
      endpoint: `ws://localhost:${PORT}/ws`,
    });
  });
}

export default app;
