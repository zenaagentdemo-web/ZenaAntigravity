/**
 * Contact: Delete Contact Tool
 * 
 * Deletes a contact from the user's CRM.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface DeleteContactInput {
    contactId: string;
}

interface DeleteContactOutput {
    success: boolean;
    deletedId: string;
    name: string;
}

export const deleteContactTool: ZenaToolDefinition<DeleteContactInput, DeleteContactOutput> = {
    name: 'contact.delete',
    domain: 'contact',
    description: 'Delete a contact permanently',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to delete (optional if contactName provided)'
            },
            contactName: {
                type: 'string',
                description: 'The name of the contact to delete (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['contactId', 'contactName'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedId: { type: 'string' },
            name: { type: 'string' }
        }
    },

    permissions: ['contacts:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (_params: DeleteContactInput) => {
        return `⚠️ Permanently delete this contact? This cannot be undone.`;
    },

    async execute(params: DeleteContactInput & { contactName?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<DeleteContactOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Contact deletion requires approval'
            };
        }

        try {
            let contactId = params.contactId;
            const userId = context.userId;

            // 🧠 ZENA INTEL: Resolve contact name
            if (!contactId && params.contactName) {
                const contact = await prisma.contact.findFirst({
                    where: { userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (contact) contactId = contact.id;
            }

            if (!contactId) return { success: false, error: 'Contact ID or Name required' };

            // Get contact name before deletion
            const contact = await prisma.contact.findFirst({
                where: { id: contactId, userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            await prisma.contact.delete({
                where: { id: contactId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deletedId: params.contactId,
                    name: contact.name
                }
            };
        } catch (error) {
            console.error('[contact.delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete contact'
            };
        }
    },

    auditLogFormat(input, output) {
        const name = output.success && output.data ? output.data.name : 'Unknown';
        return {
            action: 'CONTACT_DELETE',
            summary: `Deleted contact: "${name}"`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(deleteContactTool);
