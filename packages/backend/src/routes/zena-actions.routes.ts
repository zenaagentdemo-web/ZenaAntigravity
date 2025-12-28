// Zena Actions Routes
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as zenaActionsController from '../controllers/zena-actions.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get available action types
router.get('/types', zenaActionsController.getActionTypes);

// Get pending actions for current user
router.get('/pending', zenaActionsController.getUserPendingActions);

// Get pending/suggested actions for a deal
router.get('/deal/:dealId/pending', zenaActionsController.getPendingActions);

// Get action history for a deal
router.get('/deal/:dealId/history', zenaActionsController.getActionHistory);

// Generate a new action draft
router.post('/deal/:dealId/generate', zenaActionsController.generateAction);

// Execute an action
router.post('/:actionId/execute', zenaActionsController.executeAction);

// Dismiss an action
router.post('/:actionId/dismiss', zenaActionsController.dismissAction);

export default router;
