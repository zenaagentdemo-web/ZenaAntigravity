// Zena Actions Controller - API endpoints for AI-powered deal actions
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    zenaActionsService,
    ZenaActionType,
    ACTION_CONFIGS
} from '../services/zena-actions.service.js';


const prisma = new PrismaClient();

/**
 * GET /api/actions/deal/:dealId/pending
 * Get pending/suggested actions for a deal
 */
export async function getPendingActions(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { dealId } = req.params;

        // Fetch deal with relations
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId },
            include: {
                property: { select: { address: true } },
                contacts: { select: { id: true, name: true } }
            }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        // Get pending actions based on deal state
        const pendingActions = zenaActionsService.getPendingActions(deal);

        // Get any stored pending actions
        const storedActions = await prisma.zenaAction.findMany({
            where: { dealId, status: 'pending' },
            orderBy: { triggeredAt: 'desc' }
        });

        res.status(200).json({
            suggestedActions: pendingActions,
            storedActions,
            actionConfigs: ACTION_CONFIGS
        });
    } catch (error) {
        console.error('Error in getPendingActions:', error);
        res.status(500).json({
            error: 'Failed to get pending actions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * POST /api/actions/deal/:dealId/generate
 * Generate a draft for a specific action type
 */
export async function generateAction(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { dealId } = req.params;
        const { actionType, context } = req.body;

        if (!actionType || !ACTION_CONFIGS[actionType as ZenaActionType]) {
            res.status(400).json({
                error: 'Invalid action type',
                validTypes: Object.keys(ACTION_CONFIGS)
            });
            return;
        }

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId },
            include: {
                property: { select: { address: true } },
                contacts: { select: { id: true, name: true } }
            }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        // Build context from deal if not provided
        const fullContext = {
            propertyAddress: deal.property?.address || 'Property',
            contactName: deal.contacts?.[0]?.name || 'Client',
            stage: deal.stage,
            ...context
        };

        // Generate the action
        const action = await zenaActionsService.generateAction(
            userId,
            dealId,
            actionType as ZenaActionType,
            fullContext
        );

        res.status(200).json({
            action,
            config: ACTION_CONFIGS[actionType as ZenaActionType]
        });
    } catch (error) {
        console.error('Error in generateAction:', error);
        res.status(500).json({
            error: 'Failed to generate action',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * POST /api/actions/:actionId/execute
 * Mark an action as executed
 */
export async function executeAction(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { actionId } = req.params;

        // Verify action ownership
        const action = await prisma.zenaAction.findFirst({
            where: { id: actionId, userId }
        });

        if (!action) {
            res.status(404).json({ error: 'Action not found' });
            return;
        }

        const updatedAction = await zenaActionsService.executeAction(actionId);

        res.status(200).json({ action: updatedAction });
    } catch (error) {
        console.error('Error in executeAction:', error);
        res.status(500).json({
            error: 'Failed to execute action',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * POST /api/actions/:actionId/dismiss
 * Dismiss an action
 */
export async function dismissAction(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { actionId } = req.params;

        // Verify action ownership
        const action = await prisma.zenaAction.findFirst({
            where: { id: actionId, userId }
        });

        if (!action) {
            res.status(404).json({ error: 'Action not found' });
            return;
        }

        const updatedAction = await zenaActionsService.dismissAction(actionId);

        res.status(200).json({ action: updatedAction });
    } catch (error) {
        console.error('Error in dismissAction:', error);
        res.status(500).json({
            error: 'Failed to dismiss action',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * GET /api/actions/deal/:dealId/history
 * Get action history for a deal
 */
export async function getActionHistory(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { dealId } = req.params;

        // Verify deal ownership
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId }
        });

        if (!deal) {
            res.status(404).json({ error: 'Deal not found' });
            return;
        }

        const history = await zenaActionsService.getActionHistory(dealId);

        res.status(200).json({ history });
    } catch (error) {
        console.error('Error in getActionHistory:', error);
        res.status(500).json({
            error: 'Failed to get action history',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * GET /api/actions/pending
 * Get all pending actions for the current user
 */
export async function getUserPendingActions(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const pendingActions = await zenaActionsService.getUserPendingActions(userId);

        res.status(200).json({
            pendingActions,
            count: pendingActions.length
        });
    } catch (error) {
        console.error('Error in getUserPendingActions:', error);
        res.status(500).json({
            error: 'Failed to get pending actions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * GET /api/actions/types
 * Get available action types and their configs
 */
export async function getActionTypes(_req: Request, res: Response): Promise<void> {
    try {
        res.status(200).json({
            actionTypes: ACTION_CONFIGS
        });
    } catch (error) {
        console.error('Error in getActionTypes:', error);
        res.status(500).json({
            error: 'Failed to get action types'
        });
    }
}
