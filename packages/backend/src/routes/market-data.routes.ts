import { Router } from 'express';
import { marketDataController } from '../controllers/market-data.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/market-data/scrape
router.post('/scrape', authMiddleware, (req, res) => marketDataController.generateReport(req, res));

// GET /api/market-data/autocomplete
router.get('/autocomplete', authMiddleware, (req, res) => marketDataController.getAutocompleteSuggestions(req, res));

export default router;
