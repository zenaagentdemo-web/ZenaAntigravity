/**
 * Deal: Bulk Delete Tool
 * 
 * Permanently deletes multiple deals.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkDeleteDealsInput {
    dealIds: string[];
}

interface BulkDeleteDealsOutput {
    success: boolean;
    deletedCount: number;
}

export const bulkDeleteDealsTool: ZenaToolDefinition<BulkDeleteDealsInput, BulkDeleteDealsOutput> = {
    name: 'deal.bulk_delete',
    domain: 'deal',
    description: 'Permanently delete multiple deals',

    inputSchema: {
        type: 'object',
        properties: {
            dealIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of deal IDs to delete'
            }
        },
        required: ['dealIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedCount: { type: 'number' }
        }
    },

    permissions: ['deals:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (params) => {
        const count = params.dealIds.length;
        return `⚠️ Permanently delete ${count} deal${count !== 1 ? 's' : ''}? This cannot be undone.`;
    },

    async execute(params: BulkDeleteDealsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkDeleteDealsOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Bulk delete requires approval'
            };
        }

        try {
            const result = await prisma.deal.deleteMany({
                where: {
                    id: { in: params.dealIds },
                    userId: context.userId
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deletedCount: result.count
                }
            };
        } catch (error) {
            console.error('[deal.bulk_delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk delete deals'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.deletedCount : 0;
        return {
            action: 'DEAL_BULK_DELETE',
            summary: `Deleted ${count} deals`,
            entityType: 'deal',
            metadata: { dealIds: input.dealIds }
        };
    }
};

toolRegistry.register(bulkDeleteDealsTool);
