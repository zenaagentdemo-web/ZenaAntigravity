import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  createExport,
  getExportStatus,
  downloadExport,
} from '../controllers/export.controller.js';

const router = Router();

// All export routes require authentication
router.use(authenticateToken);

// Create export jobs
router.post('/contacts', createExport);
router.post('/properties', createExport);
router.post('/deals', createExport);

// Get export status
router.get('/:id', getExportStatus);

// Download export file
router.get('/:id/download', downloadExport);

export default router;
