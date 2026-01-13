import { Router } from 'express';
import { optimiseDay, applyDay } from '../controllers/calendar.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/optimise', optimiseDay);
router.post('/apply', applyDay);

export default router;
