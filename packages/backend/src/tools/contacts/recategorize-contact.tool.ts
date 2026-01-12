/**
 * Contact: Recategorize Tool
 * 
 * Triggers AI recategorization for a contact.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { contactCategorizationService } from '../../services/contact-categorization.service.js';

interface RecategorizeContactInput {
    contactId: string;
}

interface RecategorizeContactOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
        zenaCategory: string;
        role: string;
    };
}

export const recategorizeContactTool: ZenaToolDefinition<RecategorizeContactInput, RecategorizeContactOutput> = {
    name: 'contact.recategorize',
    domain: 'contact',
    description: 'Trigger AI to recategorize a contact based on their interaction history',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to recategorize'
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

    async execute(params: RecategorizeContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<RecategorizeContactOutput>> {
        try {
            const contact = await prisma.contact.findFirst({
                where: { id: params.contactId, userId: context.userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            // Trigger recategorization
            await contactCategorizationService.categorizeContact(params.contactId);

            // Fetch updated contact
            const updated = await prisma.contact.findUnique({
                where: { id: params.contactId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    contact: {
                        id: updated!.id,
                        name: updated!.name,
                        zenaCategory: updated!.zenaCategory,
                        role: updated!.role
                    }
                }
            };
        } catch (error) {
            console.error('[contact.recategorize] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to recategorize contact'
            };
        }
    },

    auditLogFormat(input, output) {
        const name = output.success && output.data ? output.data.contact.name : 'Unknown';
        const category = output.success && output.data ? output.data.contact.zenaCategory : '';
        return {
            action: 'CONTACT_RECATEGORIZE',
            summary: `Recategorized "${name}" as ${category}`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(recategorizeContactTool);
