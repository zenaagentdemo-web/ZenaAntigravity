import { Router } from 'express';
import { getPersona, refreshPersona } from '../controllers/user-persona.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/persona', authenticate, getPersona);
router.post('/persona/refresh', authenticate, refreshPersona);

export default router;
