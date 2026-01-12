/**
 * Contact: Archive Contact Tool
 * 
 * Archives a contact (soft delete).
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ArchiveContactInput {
    contactId: string;
}

interface ArchiveContactOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
        isArchived: boolean;
    };
}

export const archiveContactTool: ZenaToolDefinition<ArchiveContactInput, ArchiveContactOutput> = {
    name: 'contact.archive',
    domain: 'contact',
    description: 'Archive a contact (can be restored later)',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to archive'
            }
        },
        required: ['contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contact: { type: 'object' }
        }
    },

    permissions: ['contacts:write'],
    requiresApproval: false,

    async execute(params: ArchiveContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ArchiveContactOutput>> {
        try {
            const contact = await prisma.contact.findFirst({
                where: { id: params.contactId, userId: context.userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            const updated = await prisma.contact.update({
                where: { id: params.contactId },
                data: { role: 'Archived' }
            });

            return {
                success: true,
                data: {
                    success: true,
                    contact: {
                        id: updated.id,
                        name: updated.name,
                        isArchived: true
                    }
                }
            };
        } catch (error) {
            console.error('[contact.archive] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to archive contact'
            };
        }
    },

    auditLogFormat(input, output) {
        const name = output.success && output.data ? output.data.contact.name : 'Unknown';
        return {
            action: 'CONTACT_ARCHIVE',
            summary: `Archived contact: "${name}"`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(archiveContactTool);
