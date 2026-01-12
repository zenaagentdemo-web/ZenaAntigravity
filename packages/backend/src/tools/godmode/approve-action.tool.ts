/**
 * Godmode: Approve Action Tool
 * 
 * Approves a pending autonomous action.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { godmodeService } from '../../services/godmode.service.js';

interface ApproveActionInput {
    actionId: string;
}

interface ApproveActionOutput {
    success: boolean;
    action: {
        id: string;
        status: string;
    };
}

export const approveActionTool: ZenaToolDefinition<ApproveActionInput, ApproveActionOutput> = {
    name: 'godmode.approve',
    domain: 'godmode',
    description: 'Approve a pending autonomous action for execution',

    inputSchema: {
        type: 'object',
        properties: {
            actionId: {
                type: 'string',
                description: 'ID of the action to approve'
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

    async execute(params: ApproveActionInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ApproveActionOutput>> {
        try {
            const result = await godmodeService.approveAction(params.actionId, context.userId);

            return {
                success: true,
                data: {
                    success: true,
                    action: {
                        id: params.actionId,
                        status: result.status || 'approved'
                    }
                }
            };
        } catch (error) {
            console.error('[godmode.approve] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to approve action'
            };
        }
    },

    auditLogFormat(input: ApproveActionInput, _output: ToolExecutionResult<ApproveActionOutput>) {
        return {
            action: 'GODMODE_APPROVE',
            summary: `Approved action ${input.actionId}`,
            entityType: 'godmode',
            entityId: input.actionId
        };
    }
};

toolRegistry.register(approveActionTool);
