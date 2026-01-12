/**
 * Deal: Remove Contact Tool
 * 
 * Removes a contact from a deal.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface RemoveContactInput {
    dealId: string;
    contactId: string;
}

interface RemoveContactOutput {
    success: boolean;
    deal: {
        id: string;
        contactCount: number;
    };
}

export const removeContactTool: ZenaToolDefinition<RemoveContactInput, RemoveContactOutput> = {
    name: 'deal.remove_contact',
    domain: 'deal',
    description: 'Remove a contact from a deal',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal'
            },
            contactId: {
                type: 'string',
                description: 'ID of the contact to remove'
            }
        },
        required: ['dealId', 'contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deal: { type: 'object' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: RemoveContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<RemoveContactOutput>> {
        try {
            const deal = await prisma.deal.findFirst({
                where: { id: params.dealId, userId: context.userId }
            });

            if (!deal) {
                return { success: false, error: 'Deal not found' };
            }

            const updated = await prisma.deal.update({
                where: { id: params.dealId },
                data: {
                    contacts: {
                        disconnect: { id: params.contactId }
                    }
                },
                include: { contacts: true }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deal: {
                        id: updated.id,
                        contactCount: updated.contacts.length
                    }
                }
            };
        } catch (error) {
            console.error('[deal.remove_contact] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove contact'
            };
        }
    },

    auditLogFormat(input: RemoveContactInput, _output: ToolExecutionResult<RemoveContactOutput>) {
        return {
            action: 'DEAL_REMOVE_CONTACT',
            summary: `Removed contact from deal`,
            entityType: 'deal',
            entityId: input.dealId,
            metadata: { contactId: input.contactId }
        };
    }
};

toolRegistry.register(removeContactTool);
