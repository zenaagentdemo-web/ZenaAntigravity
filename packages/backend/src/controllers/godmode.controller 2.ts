/**
 * Godmode Controller - Autonomous Action API
 */

import { Request, Response } from 'express';
import { godmodeService } from '../services/godmode.service.js';

/**
 * GET /api/godmode/settings
 * Get user's Godmode settings
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const settings = await godmodeService.getSettings(req.user.userId);
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error getting Godmode settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
}

/**
 * PUT /api/godmode/settings
 * Update user's Godmode settings
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { mode, timeWindowStart, timeWindowEnd, enabledActionTypes } = req.body;

        const settings = await godmodeService.updateSettings(req.user.userId, {
            mode,
            timeWindowStart,
            timeWindowEnd,
            enabledActionTypes,
        });

        res.status(200).json({
            success: true,
            settings,
            message: `Godmode ${mode === 'off' ? 'disabled' : `enabled in ${mode} mode`}`,
        });
    } catch (error) {
        console.error('Error updating Godmode settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
}

/**
 * GET /api/godmode/actions
 * List pending actions
 */
export async function getPendingActions(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const actions = await godmodeService.getPendingActions(req.user.userId);
        const settings = await godmodeService.getSettings(req.user.userId);

        res.status(200).json({
            actions,
            count: actions.length,
            mode: settings.mode,
            isInTimeWindow: godmodeService.isWithinGodmodeWindow(settings),
        });
    } catch (error) {
        console.error('Error getting pending actions:', error);
        res.status(500).json({ error: 'Failed to get actions' });
    }
}

/**
 * GET /api/godmode/history
 * Get action history
 */
export async function getActionHistory(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const actions = await godmodeService.getActionHistory(req.user.userId, limit);

        res.status(200).json({
            actions,
            count: actions.length,
        });
    } catch (error) {
        console.error('Error getting action history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
}

/**
 * POST /api/godmode/actions/:id/approve
 * Approve a pending action
 */
export async function approveAction(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { id: actionId } = req.params;
        const action = await godmodeService.approveAction(actionId, req.user.userId);

        res.status(200).json({
            success: true,
            action,
            message: 'Action approved and executed',
        });
    } catch (error) {
        console.error('Error approving action:', error);
        res.status(500).json({ error: 'Failed to approve action' });
    }
}

/**
 * POST /api/godmode/actions/:id/dismiss
 * Dismiss a pending action
 */
export async function dismissAction(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { id: actionId } = req.params;
        const { reason } = req.body;

        await godmodeService.dismissAction(actionId, req.user.userId, reason);

        res.status(200).json({
            success: true,
            message: 'Action dismissed',
        });
    } catch (error) {
        console.error('Error dismissing action:', error);
        res.status(500).json({ error: 'Failed to dismiss action' });
    }
}

/**
 * POST /api/godmode/bulk-approve
 * Approve multiple actions at once
 */
export async function bulkApprove(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { actionIds } = req.body;

        if (!Array.isArray(actionIds)) {
            res.status(400).json({ error: 'actionIds array required' });
            return;
        }

        const results: { id: string; success: boolean }[] = [];

        for (const actionId of actionIds) {
            try {
                await godmodeService.approveAction(actionId, req.user.userId);
                results.push({ id: actionId, success: true });
            } catch (err) {
                results.push({ id: actionId, success: false });
            }
        }

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.status(200).json({
            success: true,
            results,
            message: `${succeeded} approved, ${failed} failed`,
        });
    } catch (error) {
        console.error('Error in bulk approve:', error);
        res.status(500).json({ error: 'Failed to bulk approve' });
    }
}

/**
 * POST /api/godmode/suggest/:contactId
 * Generate suggested actions for a contact
 */
export async function suggestActions(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { contactId } = req.params;
        const suggestions = await godmodeService.generateSuggestedActions(contactId, req.user.userId);

        res.status(200).json({
            suggestions,
            count: suggestions.length,
        });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
}
