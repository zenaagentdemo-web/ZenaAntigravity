/**
 * Admin Routes - Token Usage Reporting
 * 
 * Provides endpoints for viewing AI token usage statistics.
 */

import { Router, Request, Response } from 'express';
import { tokenTrackingService } from '../services/token-tracking.service.js';

const router = Router();

/**
 * GET /api/admin/token-usage/daily
 * Get daily token usage breakdown
 */
router.get('/token-usage/daily', async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const userId = req.query.userId as string | undefined;

        const usage = await tokenTrackingService.getDailyUsage(days, userId);

        res.json({
            success: true,
            data: usage,
            meta: {
                days,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Admin] Error fetching daily usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily usage'
        });
    }
});

/**
 * GET /api/admin/token-usage/by-source
 * Get token usage grouped by source/feature
 */
router.get('/token-usage/by-source', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : new Date();
        const userId = req.query.userId as string | undefined;

        const stats = await tokenTrackingService.getStatsBySource(startDate, endDate, userId);

        res.json({
            success: true,
            data: stats,
            meta: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Admin] Error fetching usage by source:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch usage by source'
        });
    }
});

/**
 * GET /api/admin/token-usage/totals
 * Get total token usage for a period
 */
router.get('/token-usage/totals', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : new Date();
        const userId = req.query.userId as string | undefined;

        const totals = await tokenTrackingService.getTotals(startDate, endDate, userId);

        res.json({
            success: true,
            data: totals,
            meta: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Admin] Error fetching totals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch totals'
        });
    }
});

export default router;
