/**
 * Deal: Unarchive Tool
 * 
 * Restores an archived deal back to active status.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface UnarchiveDealInput {
    dealId: string;
}

interface UnarchiveDealOutput {
    success: boolean;
    dealId: string;
    propertyAddress?: string;
}

export const unarchiveDealTool: ZenaToolDefinition<UnarchiveDealInput, UnarchiveDealOutput> = {
    name: 'deal.unarchive',
    domain: 'deal',
    description: 'Restore an archived deal back to active status',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'The ID of the deal to unarchive'
            }
        },
        required: ['dealId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            dealId: { type: 'string' },
            propertyAddress: { type: 'string' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: UnarchiveDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UnarchiveDealOutput>> {
        try {
            const deal = await prisma.deal.findFirst({
                where: {
                    id: params.dealId,
                    userId: context.userId
                },
                include: {
                    property: { select: { address: true } }
                }
            });

            if (!deal) {
                return {
                    success: false,
                    error: 'Deal not found'
                };
            }

            await prisma.deal.update({
                where: { id: params.dealId },
                data: { status: 'active' }
            });

            return {
                success: true,
                data: {
                    success: true,
                    dealId: params.dealId,
                    propertyAddress: deal.property?.address || undefined
                }
            };
        } catch (error) {
            console.error('[deal.unarchive] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unarchive deal'
            };
        }
    },

    auditLogFormat(input, output) {
        const address = output.success && output.data?.propertyAddress || 'Unknown';
        return {
            action: 'DEAL_UNARCHIVE',
            summary: `Restored deal: ${address}`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(unarchiveDealTool);
