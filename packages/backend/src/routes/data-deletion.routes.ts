import { Router } from 'express';
import {
  deleteAllData,
  deleteSelectiveData,
  deleteAccount,
} from '../controllers/data-deletion.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Delete all user data (preserves account)
router.delete('/all', deleteAllData);

// Delete selective user data
router.delete('/selective', deleteSelectiveData);

// Delete user account completely
router.delete('/account', deleteAccount);

export default router;
