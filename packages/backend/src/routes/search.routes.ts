import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Search routes
 * All routes require authentication
 */

// GET /api/search - Search across all entity types
router.get('/', authenticateToken, (req, res) => searchController.search(req, res));

export default router;
