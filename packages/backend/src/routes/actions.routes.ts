import { Router } from 'express';
import * as actionsController from '../controllers/actions.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All action routes require authentication
router.use(authenticate);

/**
 * @route POST /api/actions/email/draft
 * @desc Create a draft email in the user's connected Gmail account
 */
router.post('/email/draft', actionsController.draftEmail);

/**
 * @route POST /api/actions/report/generate
 * @desc Generate a simulated property report PDF
 */
router.post('/report/generate', actionsController.generateReport);

/**
 * @route POST /api/actions/calendar/event
 * @desc Add an event to the user's timeline (simulating calendar sync)
 */
router.post('/calendar/event', actionsController.addCalendarEvent);

export default router;
