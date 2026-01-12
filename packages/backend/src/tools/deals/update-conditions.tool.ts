/**
 * Deal: Update Conditions Tool
 * 
 * Updates deal conditions (finance, building report, etc).
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface DealCondition {
    type: string;
    label: string;
    dueDate: string;
    status: 'pending' | 'satisfied' | 'failed';
}

interface UpdateConditionsInput {
    dealId: string;
    conditions: DealCondition[];
}

interface UpdateConditionsOutput {
    success: boolean;
    deal: {
        id: string;
        conditionCount: number;
    };
}

export const updateConditionsTool: ZenaToolDefinition<UpdateConditionsInput, UpdateConditionsOutput> = {
    name: 'deal.update_conditions',
    domain: 'deal',
    description: 'Update deal conditions (finance, building report, LIM, etc)',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal'
            },
            conditions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', description: 'Condition type (e.g., finance, building_report, lim)' },
                        label: { type: 'string', description: 'Display label' },
                        dueDate: { type: 'string', description: 'Due date in ISO format' },
                        status: { type: 'string', description: 'Status: pending, satisfied, or failed' }
                    }
                },
                description: 'Array of conditions to set'
            }
        },
        required: ['dealId', 'conditions']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deal: { type: 'object' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: UpdateConditionsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UpdateConditionsOutput>> {
        try {
            const existing = await prisma.deal.findFirst({
                where: { id: params.dealId, userId: context.userId }
            });

            if (!existing) {
                return { success: false, error: 'Deal not found' };
            }

            const deal = await prisma.deal.update({
                where: { id: params.dealId },
                data: {
                    conditions: JSON.parse(JSON.stringify(params.conditions))
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deal: {
                        id: deal.id,
                        conditionCount: params.conditions.length
                    }
                }
            };
        } catch (error) {
            console.error('[deal.update_conditions] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update conditions'
            };
        }
    },

    auditLogFormat(input: UpdateConditionsInput, _output: ToolExecutionResult<UpdateConditionsOutput>) {
        return {
            action: 'DEAL_UPDATE_CONDITIONS',
            summary: `Updated ${input.conditions.length} conditions on deal`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(updateConditionsTool);
