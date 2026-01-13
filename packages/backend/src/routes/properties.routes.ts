import { Router } from 'express';
import { propertiesController } from '../controllers/properties.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { generateVendorUpdate } from '../controllers/vendor-update.controller.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/properties - List properties
router.get('/', (req, res) => propertiesController.listProperties(req, res));

// POST /api/properties - Create property
router.post('/', (req, res) => propertiesController.createProperty(req, res));

// POST /api/properties/bulk-delete - Bulk delete properties
router.post('/bulk-delete', (req, res) => propertiesController.bulkDeleteProperties(req, res));

// POST /api/properties/bulk-archive - Bulk archive properties
router.post('/bulk-archive', (req, res) => propertiesController.bulkArchiveProperties(req, res));

// PATCH /api/properties/bulk - Bulk update properties (status, type)
router.patch('/bulk', (req, res) => propertiesController.bulkUpdateProperties(req, res));

// GET /api/properties/stats - Property statistics (MUST be before /:id)
router.get('/stats', (req, res) => propertiesController.getStats(req, res));

// Property Intelligence Routes - MUST BE BEFORE /:id to avoid matching "smart-matches" as an ID
router.get('/smart-matches', propertiesController.getAllSmartMatches.bind(propertiesController));

// Dynamic ID routes - AFTER specific routes
// GET /api/properties/:id - Get property details
router.get('/:id', (req, res) => propertiesController.getProperty(req, res));

// PUT /api/properties/:id - Update property
router.put('/:id', (req, res) => propertiesController.updateProperty(req, res));

// DELETE /api/properties/:id - Delete property
router.delete('/:id', (req, res) => propertiesController.deleteProperty(req, res));

// Smart matches for single property
router.get('/:id/smart-matches', propertiesController.getSmartMatches.bind(propertiesController));

// GET /api/properties/:id/milestones - List campaign milestones
router.get('/:id/milestones', propertiesController.getMilestones.bind(propertiesController));

// POST /api/properties/:id/milestones - Add campaign milestone
router.post('/:id/milestones', propertiesController.addMilestone.bind(propertiesController));

// PUT /api/properties/:id/milestones/:milestoneId - Update campaign milestone
router.put('/:id/milestones/:milestoneId', propertiesController.updateMilestone.bind(propertiesController));

// DELETE /api/properties/:id/milestones/:milestoneId - Delete campaign milestone
router.delete('/:id/milestones/:milestoneId', propertiesController.deleteMilestone.bind(propertiesController));

// POST /api/properties/:id/vendor-update - Generate vendor update
router.post('/:id/vendor-update', generateVendorUpdate);

// POST /api/properties/:id/intelligence/refresh - Refresh Zena Intelligence
router.post('/:id/intelligence/refresh', (req, res) => propertiesController.refreshIntelligence(req, res));

// GET /api/properties/:id/intelligence - Get Zena Intelligence
router.get('/:id/intelligence', (req, res) => propertiesController.getIntelligence(req, res));

// POST /api/properties/:id/comparables - Generate Comparable Sales Report (Market Scraper)
router.post('/:id/comparables', (req, res) => propertiesController.generateComparables(req, res));

// POST /api/properties/:id/generate-copy - Generate AI Listing Copy (S17)
router.post('/:id/generate-copy', (req, res) => propertiesController.generateListingCopy(req, res));

// POST /api/properties/bulk-analyze - Batch Market Analysis (S21)
router.post('/bulk-analyze', (req, res) => propertiesController.bulkAnalyzeProperties(req, res));

export default router;
