/**
 * Contact: Bulk Delete Tool
 * 
 * Deletes multiple contacts at once.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkDeleteContactsInput {
    contactIds: string[];
}

interface BulkDeleteContactsOutput {
    success: boolean;
    deletedCount: number;
    deletedIds: string[];
}

export const bulkDeleteContactsTool: ZenaToolDefinition<BulkDeleteContactsInput, BulkDeleteContactsOutput> = {
    name: 'contact.bulk_delete',
    domain: 'contact',
    description: 'Delete multiple contacts at once',

    inputSchema: {
        type: 'object',
        properties: {
            contactIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of contact IDs to delete'
            }
        },
        required: ['contactIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedCount: { type: 'number' },
            deletedIds: { type: 'array' }
        }
    },

    permissions: ['contacts:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (params) => {
        const count = params.contactIds.length;
        return `⚠️ Permanently delete ${count} contact${count !== 1 ? 's' : ''}? This cannot be undone.`;
    },

    async execute(params: BulkDeleteContactsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkDeleteContactsOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Bulk delete requires approval'
            };
        }

        try {
            const result = await prisma.contact.deleteMany({
                where: {
                    id: { in: params.contactIds },
                    userId: context.userId
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deletedCount: result.count,
                    deletedIds: params.contactIds
                }
            };
        } catch (error) {
            console.error('[contact.bulk_delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk delete contacts'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.deletedCount : 0;
        return {
            action: 'CONTACT_BULK_DELETE',
            summary: `Deleted ${count} contacts`,
            entityType: 'contact',
            metadata: { contactIds: input.contactIds }
        };
    }
};

toolRegistry.register(bulkDeleteContactsTool);
