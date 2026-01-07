/**
 * Godmode Routes - Autonomous Action API
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
    getSettings,
    updateSettings,
    getPendingActions,
    getActionHistory,
    approveAction,
    dismissAction,
    bulkApprove,
    suggestActions,
    triggerHeartbeat,
    seedMockActions,
    simulateStress,
} from '../controllers/godmode.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Heartbeat (Throttled Scan)
router.post('/heartbeat', triggerHeartbeat);

// Actions
router.get('/actions', getPendingActions);
router.get('/history', getActionHistory);
router.post('/actions/:id/approve', approveAction);
router.post('/actions/:id/dismiss', dismissAction);
router.post('/bulk-approve', bulkApprove);

// Suggestions
router.post('/suggest/:contactId', suggestActions);

// Dev/Testing - Seed mock pending actions
router.post('/seed-mock', seedMockActions);
router.post('/simulate-stress', simulateStress);

export default router;

