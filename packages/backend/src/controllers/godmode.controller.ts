/**
 * Godmode Controller - Autonomous Action API
 */

import { Request, Response } from 'express';
import { godmodeService } from '../services/godmode.service.js';
import { intelligenceSimulatorService } from '../services/intelligence-simulator.service.js';
import {
    HECTIC_WEEKEND_SCENARIO,
    FULL_GOD_AUTONOMY_SCENARIO,
    MULTI_PROPERTY_PIVOT_SCENARIO
} from '../services/roleplay.scenarios.js';
import prisma from '../config/database.js';

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
        const message = error instanceof Error ? error.message : 'Failed to approve action';
        if (message.includes('not found') || message.includes('already processed')) {
            res.status(404).json({ error: message });
        } else {
            res.status(500).json({ error: message });
        }
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
        const message = error instanceof Error ? error.message : 'Failed to dismiss action';
        if (message.includes('not found') || message.includes('already processed')) {
            res.status(404).json({ error: message });
        } else {
            res.status(500).json({ error: message });
        }
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

        // 1. Get first few contacts to attach actions to
        const contacts = await prisma.contact.findMany({
            where: { userId },
            take: 5,
            select: { id: true, name: true, emails: true }
        });

        if (contacts.length === 0) {
            res.status(400).json({ error: 'No contacts found to attach mock actions to' });
            return;
        }

        // 2. Get first few properties to attach actions to
        const properties = await prisma.property.findMany({
            where: { userId },
            take: 3,
            select: { id: true, address: true }
        });

        const mockActions = [
            // Contact-centric actions
            {
                userId,
                contactId: contacts[0]?.id,
                actionType: 'send_email',
                priority: 8,
                title: `Re-engage ${contacts[0]?.name} (High churn risk)`,
                description: `WHY IT MATTERS: This contact has reached a high churn risk threshold due to recent inactivity. GAIN: Sending a personalized re-engagement email now will rebuild trust and ensure they choose you when they are ready to transact.`,
                draftSubject: `Thinking of you - ${contacts[0]?.name?.split(' ')[0]}`,
                draftBody: `Hi ${contacts[0]?.name?.split(' ')[0]},\n\nI wanted to check in and see if you had any questions about the properties we discussed. I'd be happy to arrange viewings at your convenience.\n\nBest regards`,
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Contact has been inactive for 5 days after showing high interest signals',
                intelligenceSources: [{ type: 'prediction', id: contacts[0]?.id, summary: 'Churn Risk: 0.82' }]
            },
            {
                userId,
                contactId: contacts[1]?.id || contacts[0]?.id,
                actionType: 'schedule_followup',
                priority: 9,
                title: `Follow up with ${contacts[1]?.name || contacts[0]?.name} (High sell intent)`,
                description: `WHY IT MATTERS: Our neural analysis detected a 85% sell probability based on their specific digital behavior and engagement patterns. GAIN: By offering a market appraisal now, you establish yourself as the proactive expert.`,
                status: 'pending',
                mode: 'demi_god',
                reasoning: 'Predictive analysis indicates a 85% probability that the contact is preparing to sell.',
                intelligenceSources: [{ type: 'prediction', id: contacts[1]?.id || contacts[0]?.id, summary: 'Sell Probability: 85%' }]
            },
            // Property-centric actions
            ...(properties.length > 0 ? [
                {
                    userId,
                    propertyId: properties[0].id,
                    actionType: 'generate_weekly_report',
                    priority: 8,
                    title: `Weekly Vendor Report: ${properties[0].address.split(',')[0]}`,
                    description: `WHY IT MATTERS: Campaign has been active for 7+ days. Regular reporting builds trust and transparency with vendors. GAIN: Vendors who receive weekly updates are 40% more likely to agree to price adjustments when recommended.`,
                    reasoning: 'Campaign has been active for 7+ days. Regular reporting schedule triggered.',
                    draftSubject: `Weekly Campaign Activity - ${properties[0].address}`,
                    draftBody: `## Executive Summary\nInterest remains steady for ${properties[0].address}. We've seen a slight increase in online engagement this week.\n\n## Traffic & Engagement\n- Total Views: 124 (+12% from last week)\n- New Inquiries: 3\n\n## Buyer Feedback\n- "Stunning presentation, kitchen is a standout."\n- "A few comments regarding the garden size."\n\n## Strategic Recommendation\nMaintain current pricing for one more week of marketing before reviewing.`,
                    status: 'pending',
                    mode: 'demi_god',
                    payload: { pdfUrl: 'mock-report-123.pdf', reportId: 'rep_12345' },
                    contextSummary: `**Why now?**\nIt has been 7 days since the last report.`
                },
                {
                    userId,
                    propertyId: properties[0].id,
                    actionType: 'buyer_match_intro',
                    priority: 10,
                    title: `Hot Buyer Match: Sarah Jenkins (95%)`,
                    description: `Sarah matches ${properties[0].address.split(',')[0]} 95% based on her requirements. GAIN: Introducing matched buyers immediately while enthusiasm is high will create competitive tension.`,
                    reasoning: 'High-intent buyer active in this price bracket. Early engagement significantly increases conversion probability.',
                    draftSubject: `First look: Perfect match for your search`,
                    draftBody: `Hi Sarah,\n\nI've just listed a property at ${properties[0].address} that I thought of you for immediately. It matches 95% of your requirements.\n\nWould you like to see it before the first open home?`,
                    script: `Hey Sarah, Hamish here. Look, I'm standing in a living room on ${properties[0].address.split(',')[0]} and I thought of you immediately. It's got the master suite you wanted. Can you get here in 20 mins?`,
                    status: 'pending',
                    mode: 'demi_god',
                    contextSummary: `**Why Sarah?**\n- 95% Match Score\n- Viewed 3 similar open homes this month`,
                    payload: { matchedBuyer: { name: 'Sarah Jenkins', matchScore: 95 } }
                }
            ] : []),
            // Simple generic action
            {
                userId,
                contactId: contacts[2]?.id || contacts[0]?.id,
                actionType: 'crm_sync',
                priority: 10,
                title: `Unsynced Changes Detected (15)`,
                description: 'WHY IT MATTERS: You have 15 updates in Zena that are not yet in your CRM. GAIN: Syncing now ensures your CRM remains the single source of truth.',
                reasoning: 'Found 15 records where updatedAt > lastCrmExportAt.',
                status: 'pending',
                mode: 'demi_god',
                payload: { deltaCount: 15, contacts: 10, properties: 5 }
            }
        ];

        const createdActions = [];
        for (const action of mockActions) {
            const created = await prisma.autonomousAction.create({
                data: action as any,
                include: {
                    contact: { select: { id: true, name: true, emails: true } },
                    property: { select: { id: true, address: true } }
                }
            });
            createdActions.push(created);
        }

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

/**
 * POST /api/godmode/simulate-stress
 * Trigger a neural stress test scenario
 */
export async function simulateStress(req: Request, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { scenarioName } = req.body;
        let scenario;

        switch (scenarioName) {
            case 'hectic_weekend':
                scenario = HECTIC_WEEKEND_SCENARIO;
                break;
            case 'full_god':
                scenario = FULL_GOD_AUTONOMY_SCENARIO;
                break;
            case 'multi_pivot':
                scenario = MULTI_PROPERTY_PIVOT_SCENARIO;
                break;
            default:
                scenario = HECTIC_WEEKEND_SCENARIO;
        }

        const auditLog = await intelligenceSimulatorService.runScenario(req.user.userId, scenario);

        res.status(200).json({
            success: true,
            auditLog,
        });
    } catch (error) {
        console.error('Error in simulate stress:', error);
        res.status(500).json({ error: 'Failed to run simulation' });
    }
}
