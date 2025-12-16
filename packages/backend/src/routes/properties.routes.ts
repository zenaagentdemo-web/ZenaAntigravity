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

// GET /api/properties/:id - Get property details
router.get('/:id', (req, res) => propertiesController.getProperty(req, res));

// PUT /api/properties/:id - Update property
router.put('/:id', (req, res) => propertiesController.updateProperty(req, res));

// POST /api/properties/:id/milestones - Add campaign milestone
router.post('/:id/milestones', (req, res) => propertiesController.addMilestone(req, res));

// POST /api/properties/:id/vendor-update - Generate vendor update
router.post('/:id/vendor-update', generateVendorUpdate);

export default router;
