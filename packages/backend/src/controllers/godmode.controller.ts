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

        const { mode, timeWindowStart, timeWindowEnd, enabledActionTypes, fullGodStart, fullGodEnd } = req.body;

        const settings = await godmodeService.updateSettings(req.user.userId, {
            mode,
            timeWindowStart,
            timeWindowEnd,
            enabledActionTypes,
            fullGodStart: fullGodStart ? new Date(fullGodStart) : undefined,
            fullGodEnd: fullGodEnd ? new Date(fullGodEnd) : undefined,
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
 * POST /api/godmode/heartbeat
 * Trigger a throttled autonomous scan
 */
export async function triggerHeartbeat(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const result = await godmodeService.runThrottledScan(req.user.userId);
        res.status(result.success ? 200 : 202).json(result); // 202 if throttled
    } catch (error) {
        console.error('Error in Godmode heartbeat:', error);
        res.status(500).json({ error: 'Failed' });
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

        const { contactId } = req.query;
        const actions = await godmodeService.getPendingActions(
            req.user.userId,
            contactId as string
        );
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
        const { finalBody, finalSubject } = req.body;

        const action = await godmodeService.approveAction(
            actionId,
            req.user.userId,
            { draftBody: finalBody, draftSubject: finalSubject }
        );

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

/**
 * POST /api/godmode/seed-mock
 * Create mock pending actions for testing (DEV ONLY)
 */
export async function seedMockActions(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const userId = req.user.userId;

        // Get first few contacts to attach actions to
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const contacts = await prisma.contact.findMany({
            where: { userId },
            take: 3,
            select: { id: true, name: true, emails: true }
        });

        if (contacts.length === 0) {
            res.status(400).json({ error: 'No contacts found to attach mock actions to' });
            return;
        }

        const mockActions = [
            {
                userId,
                contactId: contacts[0]?.id,
                actionType: 'SEND_FOLLOWUP',
                priority: 8,
                title: `Follow-up Email for ${contacts[0]?.name}`,
                description: 'Zena detected 5 days of silence after initial property inquiry. Suggesting a gentle check-in.',
                draftSubject: `Quick follow-up on your property search`,
                draftBody: `Hi ${contacts[0]?.name?.split(' ')[0]},\n\nI wanted to check in and see if you had any questions about the properties we discussed. I'd be happy to arrange viewings at your convenience.\n\nBest regards`,
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Contact has been inactive for 5 days after showing high interest signals',
            },
            {
                userId,
                contactId: contacts[1]?.id || contacts[0]?.id,
                actionType: 'SCHEDULE_CALL',
                priority: 6,
                title: `Schedule Call with ${contacts[1]?.name || contacts[0]?.name}`,
                description: 'Oracle predicts high sell probability (78%). Recommending proactive outreach.',
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'High seller probability detected from recent email patterns',
            },
            {
                userId,
                contactId: contacts[2]?.id || contacts[0]?.id,
                actionType: 'SEND_NEWSLETTER',
                priority: 4,
                title: `Market Update for ${contacts[2]?.name || contacts[0]?.name}`,
                description: 'Monthly market report ready. Contact has opted-in to updates.',
                draftSubject: 'Auckland Market Update - January 2026',
                draftBody: 'Hi there,\n\nHere\'s your monthly market update for the Auckland property market...',
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Scheduled newsletter based on contact preferences',
            }
        ];

        const createdActions = [];
        for (const action of mockActions) {
            if (action.contactId) {
                const created = await prisma.autonomousAction.create({
                    data: action as any,
                    include: {
                        contact: { select: { id: true, name: true, emails: true } }
                    }
                });
                createdActions.push(created);
            }
        }

        await prisma.$disconnect();

        res.status(200).json({
            success: true,
            message: `Created ${createdActions.length} mock pending actions`,
            actions: createdActions,
        });
    } catch (error) {
        console.error('Error seeding mock actions:', error);
        res.status(500).json({ error: 'Failed to seed mock actions' });
    }
}
