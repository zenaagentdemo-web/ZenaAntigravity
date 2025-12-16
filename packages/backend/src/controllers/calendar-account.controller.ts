import { Request, Response } from 'express';
import { oauthService } from '../services/oauth.service.js';
import { calendarAccountService } from '../services/calendar-account.service.js';

/**
 * Calendar Account Controller
 * Handles OAuth flows and calendar account management
 */

/**
 * Initiate OAuth flow for calendar provider
 * POST /api/accounts/calendar/connect
 */
export async function initiateCalendarOAuthFlow(req: Request, res: Response) {
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

    // Map provider names (google -> google-calendar, microsoft -> microsoft-calendar)
    const oauthProvider = mapProviderToOAuthFormat(provider);

    // Validate provider
    if (!oauthService.isProviderSupported(oauthProvider)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: `Unsupported calendar provider: ${provider}`,
          retryable: false,
        },
      });
    }

    // Generate state with userId for callback verification
    const state = Buffer.from(
      JSON.stringify({ userId, provider: oauthProvider, timestamp: Date.now() })
    ).toString('base64');

    // Get authorization URL
    const authUrl = oauthService.getAuthorizationUrl(oauthProvider, state);

    res.json({
      authorizationUrl: authUrl,
      state,
    });
  } catch (error) {
    console.error('Calendar OAuth initiation error:', error);
    res.status(500).json({
      error: {
        code: 'AUTH_OAUTH_FAILED',
        message: 'Failed to initiate calendar OAuth flow',
        retryable: true,
      },
    });
  }
}

/**
 * Handle calendar OAuth callback
 * POST /api/accounts/calendar/callback
 */
export async function handleCalendarOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state, error: oauthError } = req.body;

    // Check for OAuth errors
    if (oauthError) {
      return res.status(400).json({
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: `OAuth error: ${oauthError}`,
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
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
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

    // Verify user matches authenticated user
    if (req.user?.id !== userId) {
      return res.status(403).json({
        error: {
          code: 'AUTH_OAUTH_FAILED',
          message: 'User mismatch',
          retryable: false,
        },
      });
    }

    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(provider, code);

    // Get user email from provider
    const email = await oauthService.getUserEmail(provider, tokens.accessToken);

    // Create or update calendar account
    const account = await calendarAccountService.createCalendarAccount({
      userId,
      provider,
      email,
      tokens,
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        provider: account.provider,
        email: account.email,
        syncEnabled: account.syncEnabled,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    console.error('Calendar OAuth callback error:', error);
    res.status(500).json({
      error: {
        code: 'AUTH_OAUTH_FAILED',
        message: 'Failed to complete calendar OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    });
  }
}

/**
 * Get all connected calendar accounts
 * GET /api/accounts/calendar
 */
export async function getCalendarAccounts(req: Request, res: Response) {
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

    const accounts = await calendarAccountService.getCalendarAccountsByUserId(userId);

    res.json({
      accounts,
    });
  } catch (error) {
    console.error('Get calendar accounts error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve calendar accounts',
        retryable: true,
      },
    });
  }
}

/**
 * Disconnect calendar account
 * DELETE /api/accounts/calendar/:id
 */
export async function disconnectCalendarAccount(req: Request, res: Response) {
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

    await calendarAccountService.disconnectCalendarAccount(id, userId);

    res.json({
      success: true,
      message: 'Calendar account disconnected',
    });
  } catch (error) {
    console.error('Disconnect calendar account error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Calendar account not found',
          retryable: false,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to disconnect calendar account',
        retryable: true,
      },
    });
  }
}

/**
 * Map provider name to OAuth format
 * google -> google-calendar
 * microsoft -> microsoft-calendar
 */
function mapProviderToOAuthFormat(provider: string): string {
  if (provider === 'google') {
    return 'google-calendar';
  } else if (provider === 'microsoft') {
    return 'microsoft-calendar';
  }
  return provider;
}

