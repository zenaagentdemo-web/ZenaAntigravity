
import { Router } from 'express';
import { getDriveQueue } from '../controllers/drive-mode.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/queue', getDriveQueue);

export default router;
