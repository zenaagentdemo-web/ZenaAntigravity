/**
 * Deal: Archive Tool
 * 
 * Archives a deal (reversible).
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ArchiveDealInput {
    dealId: string;
}

interface ArchiveDealOutput {
    success: boolean;
    dealId: string;
    propertyAddress?: string;
}

export const archiveDealTool: ZenaToolDefinition<ArchiveDealInput, ArchiveDealOutput> = {
    name: 'deal.archive',
    domain: 'deal',
    description: 'Archive a deal. This is reversible - the deal can be unarchived later.',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'The ID of the deal to archive'
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
    requiresApproval: false,  // Archive is reversible

    async execute(params: ArchiveDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ArchiveDealOutput>> {
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
                data: { status: 'archived' }
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
            console.error('[deal.archive] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to archive deal'
            };
        }
    },

    async rollback(params: ArchiveDealInput, _context: ToolExecutionContext): Promise<void> {
        await prisma.deal.update({
            where: { id: params.dealId },
            data: { status: 'active' }
        });
    },

    auditLogFormat(input, output) {
        const address = output.success && output.data?.propertyAddress || 'Unknown';
        return {
            action: 'DEAL_ARCHIVE',
            summary: `Archived deal: ${address}`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(archiveDealTool);
