import { Router } from 'express';
import { dealsController } from '../controllers/deals.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/deals - List deals with filters by stage and risk
router.get('/', (req, res) => dealsController.listDeals(req, res));

// GET /api/deals/:id - Get deal details
router.get('/:id', (req, res) => dealsController.getDeal(req, res));

// PUT /api/deals/:id/stage - Update deal stage
router.put('/:id/stage', (req, res) => dealsController.updateDealStage(req, res));

// POST /api/deals/:id/tasks - Create task for deal
router.post('/:id/tasks', (req, res) => dealsController.createTask(req, res));

export default router;
