/**
 * Oracle Routes - Predictive Intelligence API
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
    getContactPrediction,
    analyzeContact,
    batchAnalyzeContacts,
    recordEmailAnalyzed,
} from '../controllers/oracle.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/oracle/contact/:id - Get predictions for a contact
router.get('/contact/:id', getContactPrediction);

// POST /api/oracle/analyze/:id - Trigger fresh analysis
router.post('/analyze/:id', analyzeContact);

// POST /api/oracle/batch-analyze - Analyze multiple contacts
router.post('/batch-analyze', batchAnalyzeContacts);

// POST /api/oracle/record-email - Record email analyzed
router.post('/record-email', recordEmailAnalyzed);

export default router;
