/**
 * Geocoding Routes
 * Address autocomplete and geocoding endpoints
 */

import { Router } from 'express';
import { geocodingController } from '../controllers/geocoding.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/geocoding/autocomplete - Address autocomplete
router.get('/autocomplete', (req, res) => geocodingController.autocomplete(req, res));

// GET /api/geocoding/enrich - Full property enrichment
router.get('/enrich', (req, res) => geocodingController.enrichProperty(req, res));

export default router;
