/**
 * Godmode: Dismiss Action Tool
 * 
 * Dismisses a pending autonomous action.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { godmodeService } from '../../services/godmode.service.js';

interface DismissActionInput {
    actionId: string;
    reason?: string;
}

interface DismissActionOutput {
    success: boolean;
    action: {
        id: string;
        status: string;
    };
}

export const dismissActionTool: ZenaToolDefinition<DismissActionInput, DismissActionOutput> = {
    name: 'godmode.dismiss',
    domain: 'godmode',
    description: 'Dismiss a pending autonomous action',

    inputSchema: {
        type: 'object',
        properties: {
            actionId: {
                type: 'string',
                description: 'ID of the action to dismiss'
            },
            reason: {
                type: 'string',
                description: 'Optional reason for dismissal'
            }
        },
        required: ['actionId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            action: { type: 'object' }
        }
    },

    permissions: ['godmode:write'],
    requiresApproval: false,

    async execute(params: DismissActionInput, context: ToolExecutionContext): Promise<ToolExecutionResult<DismissActionOutput>> {
        try {
            await godmodeService.dismissAction(params.actionId, context.userId);

            return {
                success: true,
                data: {
                    success: true,
                    action: {
                        id: params.actionId,
                        status: 'dismissed'
                    }
                }
            };
        } catch (error) {
            console.error('[godmode.dismiss] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to dismiss action'
            };
        }
    },

    auditLogFormat(input: DismissActionInput, _output: ToolExecutionResult<DismissActionOutput>) {
        return {
            action: 'GODMODE_DISMISS',
            summary: `Dismissed action ${input.actionId}${input.reason ? `: ${input.reason}` : ''}`,
            entityType: 'godmode',
            entityId: input.actionId
        };
    }
};

toolRegistry.register(dismissActionTool);
