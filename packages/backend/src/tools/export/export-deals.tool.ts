/**
 * Export: Deals Tool
 * 
 * Exports deals to CSV/Excel format.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { exportService } from '../../services/export.service.js';

interface ExportDealsInput {
    format: 'csv' | 'xlsx';
    dealIds?: string[];
}

interface ExportDealsOutput {
    success: boolean;
    exportId: string;
    status: string;
}

export const exportDealsTool: ZenaToolDefinition<ExportDealsInput, ExportDealsOutput> = {
    name: 'export.deals',
    domain: 'export',
    description: 'Export deals to CSV or Excel format',

    inputSchema: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['csv', 'xlsx'],
                description: 'Export format'
            },
            dealIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific deal IDs to export'
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

    permissions: ['deals:read', 'export:write'],
    requiresApproval: false,

    async execute(params: ExportDealsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ExportDealsOutput>> {
        try {
            const exportId = await exportService.createExport({
                userId: context.userId,
                type: 'deals',
                format: params.format,
                recordIds: params.dealIds
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
            console.error('[export.deals] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create export'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'EXPORT_DEALS',
            summary: `Started deals export (${input.format})`,
            entityType: 'export',
            entityId: output.success && output.data ? output.data.exportId : undefined
        };
    }
};

toolRegistry.register(exportDealsTool);
