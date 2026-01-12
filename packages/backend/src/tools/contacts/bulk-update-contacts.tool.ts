/**
 * Contact: Bulk Update Tool
 * 
 * Updates multiple contacts at once.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkUpdateContactsInput {
    contactIds: string[];
    role?: string;
    isArchived?: boolean;
}

interface BulkUpdateContactsOutput {
    success: boolean;
    updatedCount: number;
}

export const bulkUpdateContactsTool: ZenaToolDefinition<BulkUpdateContactsInput, BulkUpdateContactsOutput> = {
    name: 'contact.bulk_update',
    domain: 'contact',
    description: 'Update multiple contacts at once (role or archive status)',

    inputSchema: {
        type: 'object',
        properties: {
            contactIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of contact IDs to update'
            },
            role: {
                type: 'string',
                description: 'New role to set for all contacts'
            },
            isArchived: {
                type: 'boolean',
                description: 'Set archive status for all contacts'
            }
        },
        required: ['contactIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            updatedCount: { type: 'number' }
        }
    },

    permissions: ['contacts:write'],
    requiresApproval: false,

    async execute(params: BulkUpdateContactsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkUpdateContactsOutput>> {
        try {
            const updateData: any = {};
            if (params.role) updateData.role = params.role;
            if (params.isArchived !== undefined) updateData.isArchived = params.isArchived;

            if (Object.keys(updateData).length === 0) {
                return { success: false, error: 'No update fields provided' };
            }

            const result = await prisma.contact.updateMany({
                where: {
                    id: { in: params.contactIds },
                    userId: context.userId
                },
                data: updateData
            });

            return {
                success: true,
                data: {
                    success: true,
                    updatedCount: result.count
                }
            };
        } catch (error) {
            console.error('[contact.bulk_update] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk update contacts'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.updatedCount : 0;
        return {
            action: 'CONTACT_BULK_UPDATE',
            summary: `Updated ${count} contacts`,
            entityType: 'contact',
            metadata: { contactIds: input.contactIds, updates: { role: input.role, isArchived: input.isArchived } }
        };
    }
};

toolRegistry.register(bulkUpdateContactsTool);
