import { Router } from 'express';
import { dealsController } from '../controllers/deals.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ===========================================
// DEAL FLOW API ROUTES
// ===========================================

// GET /api/deals/dashboard - Get aggregated dashboard statistics
router.get('/dashboard', (req, res) => dealsController.getDashboardStats(req, res));


// GET /api/deals/stages - Get available stages for a pipeline type
router.get('/stages', (req, res) => dealsController.getStages(req, res));

// GET /api/deals/pipeline/:type - Get deals grouped by stage for kanban view
router.get('/pipeline/:type', (req, res) => dealsController.getPipelineDeals(req, res));

// GET /api/deals - List deals with filters by stage and risk
router.get('/', (req, res) => dealsController.listDeals(req, res));

// POST /api/deals/bulk-delete - Delete multiple deals at once
console.log('[DealsRoutes] Registering bulk-delete route');
router.post('/bulk-delete', (req, res) => dealsController.bulkDelete(req, res));

// POST /api/deals/bulk-archive - Archive multiple deals at once
console.log('[DealsRoutes] Registering bulk-archive route');
router.post('/bulk-archive', (req, res) => dealsController.bulkArchive(req, res));

// POST /api/deals/bulk-restore - Restore multiple archived deals
console.log('[DealsRoutes] Registering bulk-restore route');
router.post('/bulk-restore', (req, res) => dealsController.bulkRestore(req, res));

// POST /api/deals - Create a new deal
router.post('/', (req, res) => dealsController.createDeal(req, res));

// GET /api/deals/:id - Get deal details
router.get('/:id', (req, res) => dealsController.getDeal(req, res));

// PUT /api/deals/:id - Update deal details
router.put('/:id', (req, res) => dealsController.updateDeal(req, res));

// PUT /api/deals/:id/stage - Update deal stage
router.put('/:id/stage', (req, res) => dealsController.updateDealStage(req, res));

// PUT /api/deals/:id/conditions - Update deal conditions
router.put('/:id/conditions', (req, res) => dealsController.updateConditions(req, res));

// POST /api/deals/:id/tasks - Create task for deal
router.post('/:id/tasks', (req, res) => dealsController.createTask(req, res));

// GET /api/deals/:id/intelligence - Perform deep AI intelligence analysis on a deal
router.get('/:id/intelligence', (req, res) => dealsController.analyzeDeal(req, res));

export default router;
