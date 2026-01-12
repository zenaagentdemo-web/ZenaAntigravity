/**
 * Contact: Update Contact Tool
 * 
 * Updates an existing contact's fields.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface UpdateContactInput {
    contactId?: string;
    contactName?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    company?: string;
}

interface UpdateContactOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
        emails: string[];
        phones: string[];
        role: string;
    };
}

export const updateContactTool: ZenaToolDefinition<UpdateContactInput, UpdateContactOutput> = {
    name: 'contact.update',
    domain: 'contact',
    description: 'Update a contact\'s name, email, phone, role, or company',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to update (optional if contactName provided)'
            },
            contactName: {
                type: 'string',
                description: 'The name of the contact to update (will resolve to ID)'
            },
            name: {
                type: 'string',
                description: 'New name for the contact'
            },
            email: {
                type: 'string',
                description: 'New email address (replaces existing)'
            },
            phone: {
                type: 'string',
                description: 'New phone number (replaces existing)'
            },
            role: {
                type: 'string',
                description: 'New role for the contact'
            },
            company: {
                type: 'string',
                description: 'New company name'
            }
        },
        required: []
    },
    recommendedFields: ['email', 'phone', 'role', 'company'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contact: { type: 'object' }
        }
    },

    permissions: ['contacts:write'],
    requiresApproval: false,

    async execute(params: UpdateContactInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UpdateContactOutput>> {
        try {
            let resolvedContactId = params.contactId;

            // 🧠 ZENA INTEL: Resolve contact name to ID
            if (!resolvedContactId && params.contactName) {
                const contact = await prisma.contact.findFirst({
                    where: { userId: context.userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (contact) {
                    resolvedContactId = contact.id;
                } else {
                    return { success: false, error: `Contact "${params.contactName}" not found` };
                }
            }

            if (!resolvedContactId) {
                return { success: false, error: 'Please provide either contactId or contactName' };
            }

            // Check contact exists and belongs to user
            const existing = await prisma.contact.findFirst({
                where: { id: resolvedContactId, userId: context.userId }
            });

            if (!existing) {
                return { success: false, error: 'Contact not found' };
            }

            const updateData: any = {};
            if (params.name) updateData.name = params.name;
            if (params.email) updateData.emails = [params.email];
            if (params.phone) updateData.phones = [params.phone];
            if (params.role) updateData.role = params.role;
            if (params.company !== undefined) updateData.company = params.company || null;

            const contact = await prisma.contact.update({
                where: { id: resolvedContactId },
                data: updateData
            });

            return {
                success: true,
                data: {
                    success: true,
                    contact: {
                        id: contact.id,
                        name: contact.name,
                        emails: contact.emails,
                        phones: contact.phones,
                        role: contact.role
                    }
                }
            };
        } catch (error) {
            console.error('[contact.update] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update contact'
            };
        }
    },

    auditLogFormat(input: UpdateContactInput, _output: ToolExecutionResult<UpdateContactOutput>) {
        return {
            action: 'CONTACT_UPDATE',
            summary: `Updated contact ${input.contactId}`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};

toolRegistry.register(updateContactTool);
