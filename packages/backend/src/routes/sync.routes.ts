import { Router, Request, Response } from 'express';
import { syncEngineService } from '../services/sync-engine.service.js';
import { calendarSyncEngineService } from '../services/calendar-sync-engine.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/sync/status
 * Get sync status for all user's accounts (email and calendar)
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get all email accounts for user
    const emailAccounts = await req.app.locals.prisma.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    // Get all calendar accounts for user
    const calendarAccounts = await req.app.locals.prisma.calendarAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    res.json({
      emailAccounts: emailAccounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        lastSyncAt: account.lastSyncAt,
        syncEnabled: account.syncEnabled,
      })),
      calendarAccounts: calendarAccounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        email: account.email,
        lastSyncAt: account.lastSyncAt,
        syncEnabled: account.syncEnabled,
      })),
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_STATUS_ERROR',
        message: 'Failed to get sync status',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/sync/trigger
 * Trigger manual sync for a specific account or all accounts
 */
router.post('/trigger', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.body;

    if (accountId) {
      // Verify account belongs to user
      const account = await req.app.locals.prisma.emailAccount.findFirst({
        where: {
          id: accountId,
          userId,
        },
      });

      if (!account) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Email account not found',
            retryable: false,
          },
        });
      }

      // Trigger sync for specific account
      const result = await syncEngineService.triggerManualSync(accountId);

      res.json({
        message: 'Sync triggered',
        result,
      });
    } else {
      // Trigger sync for all user's accounts
      const accounts = await req.app.locals.prisma.emailAccount.findMany({
        where: {
          userId,
          syncEnabled: true,
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          lastSyncAt: true,
        },
      });

      const results = await Promise.all(
        accounts.map((account) => syncEngineService.syncAccount(account))
      );

      res.json({
        message: 'Sync triggered for all accounts',
        results,
      });
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_TRIGGER_ERROR',
        message: 'Failed to trigger sync',
        retryable: true,
      },
    });
  }
});

/**
 * POST /api/sync/calendar/trigger
 * Trigger manual calendar sync for a specific account or all calendar accounts
 */
router.post('/calendar/trigger', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { accountId } = req.body;

    if (accountId) {
      // Verify account belongs to user
      const account = await req.app.locals.prisma.calendarAccount.findFirst({
        where: {
          id: accountId,
          userId,
        },
      });

      if (!account) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Calendar account not found',
            retryable: false,
          },
        });
      }

      // Trigger sync for specific account
      const result = await calendarSyncEngineService.triggerManualSync(accountId);

      res.json({
        message: 'Calendar sync triggered',
        result,
      });
    } else {
      // Trigger sync for all user's calendar accounts
      const accounts = await req.app.locals.prisma.calendarAccount.findMany({
        where: {
          userId,
          syncEnabled: true,
        },
        select: {
          id: true,
          userId: true,
          provider: true,
          lastSyncAt: true,
        },
      });

      const results = await Promise.all(
        accounts.map((account) => calendarSyncEngineService.syncAccount(account))
      );

      res.json({
        message: 'Calendar sync triggered for all accounts',
        results,
      });
    }
  } catch (error) {
    console.error('Error triggering calendar sync:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_TRIGGER_ERROR',
        message: 'Failed to trigger calendar sync',
        retryable: true,
      },
    });
  }
});

export default router;
