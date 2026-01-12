/**
 * Export: Properties Tool
 * 
 * Exports properties to CSV/Excel format.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { exportService } from '../../services/export.service.js';

interface ExportPropertiesInput {
    format: 'csv' | 'xlsx';
    propertyIds?: string[];
}

interface ExportPropertiesOutput {
    success: boolean;
    exportId: string;
    status: string;
}

export const exportPropertiesTool: ZenaToolDefinition<ExportPropertiesInput, ExportPropertiesOutput> = {
    name: 'export.properties',
    domain: 'export',
    description: 'Export properties to CSV or Excel format',

    inputSchema: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['csv', 'xlsx'],
                description: 'Export format'
            },
            propertyIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific property IDs to export'
            }
        },
        required: ['format']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            exportId: { type: 'string' },
            status: { type: 'string' }
        }
    },

    permissions: ['properties:read', 'export:write'],
    requiresApproval: false,

    async execute(params: ExportPropertiesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ExportPropertiesOutput>> {
        try {
            const exportId = await exportService.createExport({
                userId: context.userId,
                type: 'properties',
                format: params.format,
                recordIds: params.propertyIds
            });

            return {
                success: true,
                data: {
                    success: true,
                    exportId,
                    status: 'pending'
                }
            };
        } catch (error) {
            console.error('[export.properties] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create export'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'EXPORT_PROPERTIES',
            summary: `Started properties export (${input.format})`,
            entityType: 'export',
            entityId: output.success && output.data ? output.data.exportId : undefined
        };
    }
};

toolRegistry.register(exportPropertiesTool);
