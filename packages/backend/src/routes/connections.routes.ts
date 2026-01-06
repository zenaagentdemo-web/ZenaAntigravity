import { Router } from 'express';
import { connectionsController } from '../controllers/connections.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/connections
router.get('/', authMiddleware, (req, res) => connectionsController.getConnections(req, res));

// GET /api/connections/sessions - Get captured session domains
router.get('/sessions', authMiddleware, (req, res) => connectionsController.getSessions(req, res));

// GET /api/connections/debug-sessions - PUBLIC debug endpoint to check session capture
router.get('/debug-sessions', (req, res) => connectionsController.getDebugSessions(req, res));

// GET /api/connections/profiles - Get all AI-analyzed site profiles
router.get('/profiles', authMiddleware, (req, res) => connectionsController.getSiteProfiles(req, res));

// GET /api/connections/profiles/:domain - Get site profile for specific domain
router.get('/profiles/:domain', authMiddleware, (req, res) => connectionsController.getSiteProfile(req, res));

// POST /api/connections/capture-session - Receive session from extension (public for extension access)
router.post('/capture-session', (req, res) => connectionsController.captureSession(req, res));

// POST /api/connections/extract/:domain - Trigger data extraction
router.post('/extract/:domain', authMiddleware, (req, res) => connectionsController.triggerExtraction(req, res));

// POST /api/connections/schedule/:domain - Schedule periodic extraction
router.post('/schedule/:domain', authMiddleware, (req, res) => connectionsController.scheduleExtraction(req, res));

// POST /api/connections/query - Auto-detect site and execute dynamic query (Phase 5)
router.post('/query', authMiddleware, (req, res) => connectionsController.executeQueryAuto(req, res));

// POST /api/connections/query/:domain - Execute dynamic query against specific site (Phase 5)
router.post('/query/:domain', authMiddleware, (req, res) => connectionsController.executeQuery(req, res));

// ============================================
// INTELLIGENT NAVIGATION & SITE DISCOVERY
// ============================================

// POST /api/connections/trigger-discovery/:domain - Manually trigger site discovery
router.post('/trigger-discovery/:domain', authMiddleware, (req, res) => connectionsController.triggerDiscovery(req, res));

// GET /api/connections/discovery-status/:domain - Get discovery status
router.get('/discovery-status/:domain', authMiddleware, (req, res) => connectionsController.getDiscoveryStatus(req, res));

// POST /api/connections/intelligent-query - Execute query using vision-based navigation
router.post('/intelligent-query', authMiddleware, (req, res) => connectionsController.intelligentQuery(req, res));

// POST /api/connections/:id/sync
router.post('/:id/sync', authMiddleware, (req, res) => connectionsController.syncConnection(req, res));

// POST /api/connections/:id/toggle
router.post('/:id/toggle', authMiddleware, (req, res) => connectionsController.toggleConnection(req, res));

export default router;


