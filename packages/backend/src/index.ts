import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { syncEngineService } from './services/sync-engine.service.js';
import { calendarSyncEngineService } from './services/calendar-sync-engine.service.js';
import { websocketService } from './services/websocket.service.js';
import { dealSchedulerService } from './services/deal-scheduler.service.js';
import { logger } from './services/logger.service.js';
import { healthCheckService } from './services/health-check.service.js';
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

// Communications routes
import communicationsRoutes from './routes/communications.routes.js';
app.use('/api/communications', communicationsRoutes);

// 404 handler - must be after all routes
app.use(notFoundMiddleware);

// Error handling middleware - must be last
app.use(errorHandlingMiddleware);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
websocketService.initialize(server);

// Start sync engines
syncEngineService.start();
calendarSyncEngineService.start();

// Start deal scheduler (Phase 2b)
dealSchedulerService.start();

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Stop background services
    syncEngineService.stop();
    calendarSyncEngineService.stop();
    dealSchedulerService.stop();
    websocketService.shutdown();

    // Disconnect from database
    await prisma.$disconnect();
    logger.info('Database disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
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

// Start server
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

export default app;
