/**
 * Deal: Assign Contact Tool
 * 
 * Assigns a contact to a deal.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface AssignContactInput {
    dealId: string;
    contactId: string;
}

interface AssignContactOutput {
    success: boolean;
    deal: {
        id: string;
        contactCount: number;
    };
}

export const assignContactTool: ZenaToolDefinition<AssignContactInput, AssignContactOutput> = {
    name: 'deal.assign_contact',
    domain: 'deal',
    description: 'Assign a contact to a deal',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal'
            },
            contactId: {
                type: 'string',
                description: 'ID of the contact to assign'
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

    async execute(params: AssignContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<AssignContactOutput>> {
        try {
            const deal = await prisma.deal.findFirst({
                where: { id: params.dealId, userId: context.userId }
            });

            if (!deal) {
                return { success: false, error: 'Deal not found' };
            }

            const contact = await prisma.contact.findFirst({
                where: { id: params.contactId, userId: context.userId }
            });

            if (!contact) {
                return { success: false, error: 'Contact not found' };
            }

            const updated = await prisma.deal.update({
                where: { id: params.dealId },
                data: {
                    contacts: {
                        connect: { id: params.contactId }
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
            console.error('[deal.assign_contact] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to assign contact'
            };
        }
    },

    auditLogFormat(input: AssignContactInput, _output: ToolExecutionResult<AssignContactOutput>) {
        return {
            action: 'DEAL_ASSIGN_CONTACT',
            summary: `Assigned contact to deal`,
            entityType: 'deal',
            entityId: input.dealId,
            metadata: { contactId: input.contactId }
        };
    }
};

toolRegistry.register(assignContactTool);
