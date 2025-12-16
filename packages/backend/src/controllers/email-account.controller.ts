import { Request, Response } from 'express';
import { oauthService } from '../services/oauth.service.js';
import { emailAccountService } from '../services/email-account.service.js';

/**
 * Email Account Controller
 * Handles OAuth flows and email account management
 */

/**
 * Initiate OAuth flow for email provider
 * POST /api/accounts/email/connect
 */
export async function initiateOAuthFlow(req: Request, res: Response) {
  try {
    const { provider } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    if (!provider) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Provider is required',
          retryable: false,
        },
      });
    }

    // Validate provider
    if (!oauthService.isProviderSupported(provider)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: `Unsupported provider: ${provider}`,
          retryable: false,
        },
      });
    }

    // Generate state with userId for callback verification
    const state = Buffer.from(
      JSON.stringify({ userId, provider, timestamp: Date.now() })
    ).toString('base64');

    // Get authorization URL
    const authUrl = oauthService.getAuthorizationUrl(provider, state);

    res.json({
      authorizationUrl: authUrl,
      state,
    });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      error: {
        code: 'AUTH_OAUTH_FAILED',
        message: 'Failed to initiate OAuth flow',
        retryable: true,
      },
    });
  }
}

/**
 * Handle OAuth callback
 * GET /api/accounts/email/callback
 */
export async function handleOAuthCallback(req: Request, res: Response) {
  try {
    // OAuth providers use GET with query parameters
    const { code, state, error: oauthError, error_description } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      const errorMsg = error_description ? `${oauthError}: ${error_description}` : String(oauthError);
      return res.status(400).json({
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: `OAuth error: ${errorMsg}`,
          retryable: false,
        },
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Code and state are required',
          retryable: false,
        },
      });
    }

    // Decode and validate state
    let stateData: { userId: string; provider: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString('utf-8'));
    } catch {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid state parameter',
          retryable: false,
        },
      });
    }

    const { userId, provider, timestamp } = stateData;

    // Verify state is not too old (10 minutes)
    const stateAge = Date.now() - timestamp;
    if (stateAge > 10 * 60 * 1000) {
      return res.status(400).json({
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: 'OAuth state expired',
          retryable: true,
        },
      });
    }

    // Note: We can't verify user matches authenticated user here because
    // this callback is called by Yahoo's servers, not the user's browser
    // The state parameter contains the userId for verification

    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(provider, String(code));

    // Get user email from provider
    const email = await oauthService.getUserEmail(provider, tokens.accessToken);

    // Create or update email account
    const account = await emailAccountService.createEmailAccount({
      userId,
      provider,
      email,
      tokens,
    });

    // Auto-trigger sync immediately after connecting email account
    try {
      console.log(`Auto-syncing email account ${account.id} for user ${userId}`);
      // Import sync engine service
      const { syncEngineService } = await import('../services/sync-engine.service.js');
      await syncEngineService.triggerManualSync(account.id);
    } catch (syncError) {
      console.error('Auto-sync failed:', syncError);
      // Don't fail the OAuth flow if sync fails
    }

    // Redirect back to frontend settings page with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?oauth=success&provider=${provider}&email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect back to frontend settings page with error message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.redirect(`${frontendUrl}/settings?oauth=error&message=${encodeURIComponent(errorMessage)}`);
  }
}

/**
 * Get all connected email accounts
 * GET /api/accounts/email
 */
export async function getEmailAccounts(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    const accounts = await emailAccountService.getEmailAccountsByUserId(userId);

    res.json({
      accounts,
    });
  } catch (error) {
    console.error('Get email accounts error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve email accounts',
        retryable: true,
      },
    });
  }
}

/**
 * Disconnect email account
 * DELETE /api/accounts/email/:id
 */
export async function disconnectEmailAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    await emailAccountService.disconnectEmailAccount(id, userId);

    res.json({
      success: true,
      message: 'Email account disconnected',
    });
  } catch (error) {
    console.error('Disconnect email account error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Email account not found',
          retryable: false,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to disconnect email account',
        retryable: true,
      },
    });
  }
}

/**
 * Trigger manual sync for email account
 * POST /api/accounts/email/:id/sync
 */
export async function triggerManualSync(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    // Verify account ownership
    const account = await emailAccountService.getEmailAccountById(id);
    if (!account || account.userId !== userId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Email account not found',
          retryable: false,
        },
      });
    }

    // Trigger sync job
    const { syncEngineService } = await import('../services/sync-engine.service.js');
    const result = await syncEngineService.triggerManualSync(id);
    
    res.json({
      success: result.success,
      message: result.success ? 'Sync completed successfully' : 'Sync failed',
      accountId: id,
      threadsProcessed: result.threadsProcessed,
      error: result.error,
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_PROVIDER_ERROR',
        message: 'Failed to trigger sync',
        retryable: true,
      },
    });
  }
}
