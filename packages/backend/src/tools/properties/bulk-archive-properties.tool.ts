/**
 * Property: Bulk Archive Tool
 * 
 * Archives multiple properties at once.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface BulkArchivePropertiesInput {
    propertyIds: string[];
}

interface BulkArchivePropertiesOutput {
    success: boolean;
    archivedCount: number;
}

export const bulkArchivePropertiesTool: ZenaToolDefinition<BulkArchivePropertiesInput, BulkArchivePropertiesOutput> = {
    name: 'property.bulk_archive',
    domain: 'property',
    description: 'Archive multiple properties at once',

    inputSchema: {
        type: 'object',
        properties: {
            propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of property IDs to archive'
            }
        },
        required: ['propertyIds']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            archivedCount: { type: 'number' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: false,

    async execute(params: BulkArchivePropertiesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<BulkArchivePropertiesOutput>> {
        try {
            const result = await prisma.property.updateMany({
                where: {
                    id: { in: params.propertyIds },
                    userId: context.userId
                },
                data: { status: 'archived' }
            });

            return {
                success: true,
                data: {
                    success: true,
                    archivedCount: result.count
                }
            };
        } catch (error) {
            console.error('[property.bulk_archive] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to bulk archive properties'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.archivedCount : 0;
        return {
            action: 'PROPERTY_BULK_ARCHIVE',
            summary: `Archived ${count} properties`,
            entityType: 'property',
            metadata: { propertyIds: input.propertyIds }
        };
    }
};

toolRegistry.register(bulkArchivePropertiesTool);
