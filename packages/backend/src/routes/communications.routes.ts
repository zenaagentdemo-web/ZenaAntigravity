import { Router } from 'express';
import { communicationsController } from '../controllers/communications.controller.js';
// Assuming we have an auth middleware
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/send', communicationsController.sendEmail.bind(communicationsController));

export default router;
