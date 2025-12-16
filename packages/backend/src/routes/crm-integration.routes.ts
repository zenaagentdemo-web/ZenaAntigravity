import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  listAvailableCRMs,
  getUserCRMIntegrations,
  connectCRM,
  syncCRM,
  disconnectCRM,
} from '../controllers/crm-integration.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/integrations/crm - List available CRM providers
router.get('/', listAvailableCRMs);

// GET /api/integrations/crm/user - Get user's CRM integrations
router.get('/user', getUserCRMIntegrations);

// POST /api/integrations/crm/:provider/connect - Connect a CRM provider
router.post('/:provider/connect', connectCRM);

// POST /api/integrations/crm/:provider/sync - Trigger CRM sync
router.post('/:provider/sync', syncCRM);

// DELETE /api/integrations/crm/:provider - Disconnect a CRM provider
router.delete('/:provider', disconnectCRM);

export default router;
