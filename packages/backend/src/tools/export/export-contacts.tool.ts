/**
 * Export: Contacts Tool
 * 
 * Exports contacts to CSV/Excel format.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { exportService } from '../../services/export.service.js';

interface ExportContactsInput {
    format: 'csv' | 'xlsx' | 'vcard';
    contactIds?: string[];
}

interface ExportContactsOutput {
    success: boolean;
    exportId: string;
    status: string;
}

export const exportContactsTool: ZenaToolDefinition<ExportContactsInput, ExportContactsOutput> = {
    name: 'export.contacts',
    domain: 'export',
    description: 'Export contacts to CSV, Excel, or vCard format',

    inputSchema: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['csv', 'xlsx', 'vcard'],
                description: 'Export format'
            },
            contactIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific contact IDs to export'
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

    permissions: ['contacts:read', 'export:write'],
    requiresApproval: false,

    async execute(params: ExportContactsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ExportContactsOutput>> {
        try {
            const exportId = await exportService.createExport({
                userId: context.userId,
                type: 'contacts',
                format: params.format,
                recordIds: params.contactIds
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
            console.error('[export.contacts] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create export'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'EXPORT_CONTACTS',
            summary: `Started contacts export (${input.format})`,
            entityType: 'export',
            entityId: output.success && output.data ? output.data.exportId : undefined
        };
    }
};

toolRegistry.register(exportContactsTool);
