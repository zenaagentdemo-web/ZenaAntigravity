import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getTimeline,
  createManualNote,
  getEntityTimeline,
} from '../controllers/timeline.controller.js';

const router = Router();

// All timeline routes require authentication
router.use(authenticateToken);

// Get timeline events with filters
router.get('/', getTimeline);

// Create manual note
router.post('/notes', createManualNote);

// Get timeline for specific entity
router.get('/:entityType/:entityId', getEntityTimeline);

export default router;
