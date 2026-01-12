/**
 * Deal: Bulk Archive Tool
 * 
 * Archives multiple deals at once.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkArchiveDealsInput {
    dealIds: string[];
}

interface BulkArchiveDealsOutput {
    success: boolean;
    archivedCount: number;
}

export const bulkArchiveDealsTool: ZenaToolDefinition<BulkArchiveDealsInput, BulkArchiveDealsOutput> = {
    name: 'deal.bulk_archive',
    domain: 'deal',
    description: 'Archive multiple deals at once',

    inputSchema: {
        type: 'object',
        properties: {
            dealIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of deal IDs to archive'
            }
        },
        required: ['dealIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            archivedCount: { type: 'number' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: BulkArchiveDealsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkArchiveDealsOutput>> {
        try {
            const result = await prisma.deal.updateMany({
                where: {
                    id: { in: params.dealIds },
                    userId: context.userId
                },
                data: { stage: 'archived' }
            });

            return {
                success: true,
                data: {
                    success: true,
                    archivedCount: result.count
                }
            };
        } catch (error) {
            console.error('[deal.bulk_archive] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk archive deals'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.archivedCount : 0;
        return {
            action: 'DEAL_BULK_ARCHIVE',
            summary: `Archived ${count} deals`,
            entityType: 'deal',
            metadata: { dealIds: input.dealIds }
        };
    }
};

toolRegistry.register(bulkArchiveDealsTool);
