import { Router } from 'express';
import { optimiseDay, applyDay } from '../controllers/calendar.controller.js';
import * as CalendarController from '../controllers/calendar.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/optimise', CalendarController.optimiseDay);
router.post('/apply', CalendarController.applyDay);
router.post('/check-conflict', CalendarController.checkConflict);
router.get('/briefing', CalendarController.getBriefing);
router.post('/analyze-intelligence', CalendarController.analyzeIntelligence);

export default router;
