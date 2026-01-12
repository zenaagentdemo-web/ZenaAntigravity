import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getTimeline,
  createManualNote,
  getEntityTimeline,
  updateEvent,
  deleteEvent,
  createGeneralEvent,
} from '../controllers/timeline.controller.js';

const router = Router();

// All timeline routes require authentication
router.use(authenticateToken);

// Create generic event (meeting, etc)
router.post('/events', createGeneralEvent);

// Get timeline events with filters
router.get('/', getTimeline);

// Create manual note
router.post('/notes', createManualNote);

// Get timeline for specific entity
router.get('/:entityType/:entityId', getEntityTimeline);

// Update timeline event
router.put('/:id', updateEvent);

// Delete timeline event
router.delete('/:id', deleteEvent);

export default router;
