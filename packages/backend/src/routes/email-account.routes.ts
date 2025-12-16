import { Router } from 'express';
import {
  initiateOAuthFlow,
  handleOAuthCallback,
  getEmailAccounts,
  disconnectEmailAccount,
  triggerManualSync,
} from '../controllers/email-account.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/accounts/email/callback - Handle OAuth callback (no auth required - called by OAuth provider)
// OAuth providers redirect back with GET requests
router.get('/callback', handleOAuthCallback);

// All other routes require authentication
// POST /api/accounts/email/connect - Initiate OAuth flow
router.post('/connect', authenticateToken, initiateOAuthFlow);

// GET /api/accounts/email - Get all connected email accounts
router.get('/', authenticateToken, getEmailAccounts);

// DELETE /api/accounts/email/:id - Disconnect email account
router.delete('/:id', authenticateToken, disconnectEmailAccount);

// POST /api/accounts/email/:id/sync - Trigger manual sync
router.post('/:id/sync', authenticateToken, triggerManualSync);

export default router;
