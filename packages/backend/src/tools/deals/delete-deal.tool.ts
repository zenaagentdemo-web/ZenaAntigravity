/**
 * Deal: Delete Deal Tool
 * 
 * Permanently deletes a deal.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface DeleteDealInput {
    dealId: string;
}

interface DeleteDealOutput {
    success: boolean;
    deletedId: string;
    summary: string;
}

export const deleteDealTool: ZenaToolDefinition<DeleteDealInput, DeleteDealOutput> = {
    name: 'deal.delete',
    domain: 'deal',
    description: 'Permanently delete a deal',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal to delete'
            }
        },
        required: ['dealId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedId: { type: 'string' },
            summary: { type: 'string' }
        }
    },

    permissions: ['deals:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (_params: DeleteDealInput) => {
        return `⚠️ Permanently delete this deal? This cannot be undone.`;
    },

    async execute(params: DeleteDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<DeleteDealOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Deal deletion requires approval'
            };
        }

        try {
            const deal = await prisma.deal.findFirst({
                where: { id: params.dealId, userId: context.userId }
            });

            if (!deal) {
                return { success: false, error: 'Deal not found' };
            }

            await prisma.deal.delete({
                where: { id: params.dealId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deletedId: params.dealId,
                    summary: deal.summary
                }
            };
        } catch (error) {
            console.error('[deal.delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete deal'
            };
        }
    },

    auditLogFormat(input, output) {
        const summary = output.success && output.data ? output.data.summary : 'Unknown';
        return {
            action: 'DEAL_DELETE',
            summary: `Deleted deal: "${summary}"`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(deleteDealTool);
