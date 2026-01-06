import { Router } from 'express';
import * as crmDeliveryController from '../controllers/crm-delivery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// Configuration routes
router.get('/config', crmDeliveryController.getCrmConfig);
router.post('/config', crmDeliveryController.updateCrmConfig);
router.post('/test', crmDeliveryController.sendTestCrmSync);
router.get('/delta', crmDeliveryController.getDeltaStatus);

// Sync actions
router.post('/sync/contact/:contactId', crmDeliveryController.syncContactToCrm);
router.post('/sync/property/:propertyId', crmDeliveryController.syncPropertyToCrm);

export default router;
