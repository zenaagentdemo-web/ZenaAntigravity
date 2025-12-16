import { Router } from 'express';
import {
  initiateCalendarOAuthFlow,
  handleCalendarOAuthCallback,
  getCalendarAccounts,
  disconnectCalendarAccount,
} from '../controllers/calendar-account.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/accounts/calendar/connect - Initiate OAuth flow
router.post('/connect', initiateCalendarOAuthFlow);

// POST /api/accounts/calendar/callback - Handle OAuth callback
router.post('/callback', handleCalendarOAuthCallback);

// GET /api/accounts/calendar - Get all connected calendar accounts
router.get('/', getCalendarAccounts);

// DELETE /api/accounts/calendar/:id - Disconnect calendar account
router.delete('/:id', disconnectCalendarAccount);

export default router;

