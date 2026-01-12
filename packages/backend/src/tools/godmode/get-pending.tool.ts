/**
 * Godmode: Get Pending Actions Tool
 * 
 * Gets pending autonomous actions for approval.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { godmodeService } from '../../services/godmode.service.js';

interface GetPendingActionsInput {
    limit?: number;
}

interface GetPendingActionsOutput {
    success: boolean;
    actions: Array<{
        id: string;
        type: string;
        summary: string;
        contactName?: string;
        priority: string;
    }>;
    count: number;
}

export const getPendingActionsTool: ZenaToolDefinition<GetPendingActionsInput, GetPendingActionsOutput> = {
    name: 'godmode.get_pending',
    domain: 'godmode',
    description: 'Get pending autonomous actions awaiting approval',

    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Maximum number of actions to return'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            actions: { type: 'array' },
            count: { type: 'number' }
        }
    },

    permissions: ['godmode:read'],
    requiresApproval: false,

    async execute(params: GetPendingActionsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetPendingActionsOutput>> {
        try {
            const actions = await godmodeService.getPendingActions(context.userId);
            const limitedActions = params.limit ? actions.slice(0, params.limit) : actions;

            return {
                success: true,
                data: {
                    success: true,
                    actions: limitedActions.map(a => ({
                        id: a.id,
                        type: a.type,
                        summary: a.summary,
                        contactName: a.contactName,
                        priority: a.priority || 'normal'
                    })),
                    count: actions.length
                }
            };
        } catch (error) {
            console.error('[godmode.get_pending] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get pending actions'
            };
        }
    },

    auditLogFormat(_input: GetPendingActionsInput, output: ToolExecutionResult<GetPendingActionsOutput>) {
        const count = output.success && output.data ? output.data.count : 0;
        return {
            action: 'GODMODE_GET_PENDING',
            summary: `Retrieved ${count} pending actions`,
            entityType: 'godmode'
        };
    }
};

toolRegistry.register(getPendingActionsTool);
