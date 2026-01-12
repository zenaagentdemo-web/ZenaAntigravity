/**
 * Property: Bulk Delete Tool
 * 
 * Deletes multiple properties at once.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkDeletePropertiesInput {
    propertyIds: string[];
}

interface BulkDeletePropertiesOutput {
    success: boolean;
    deletedCount: number;
}

export const bulkDeletePropertiesTool: ZenaToolDefinition<BulkDeletePropertiesInput, BulkDeletePropertiesOutput> = {
    name: 'property.bulk_delete',
    domain: 'property',
    description: 'Permanently delete multiple properties',

    inputSchema: {
        type: 'object',
        properties: {
            propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of property IDs to delete'
            }
        },
        required: ['propertyIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedCount: { type: 'number' }
        }
    },

    permissions: ['properties:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (params) => {
        const count = params.propertyIds.length;
        return `⚠️ Permanently delete ${count} propert${count !== 1 ? 'ies' : 'y'}? This cannot be undone.`;
    },

    async execute(params: BulkDeletePropertiesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkDeletePropertiesOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Bulk delete requires approval'
            };
        }

        try {
            const result = await prisma.property.deleteMany({
                where: {
                    id: { in: params.propertyIds },
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
            console.error('[property.bulk_delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk delete properties'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.deletedCount : 0;
        return {
            action: 'PROPERTY_BULK_DELETE',
            summary: `Deleted ${count} properties`,
            entityType: 'property',
            metadata: { propertyIds: input.propertyIds }
        };
    }
};

toolRegistry.register(bulkDeletePropertiesTool);
