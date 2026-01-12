/**
 * Contacts: Link to Property Tool
 * 
 * Links a contact to a property as either a buyer or vendor.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface LinkToPropertyInput {
    contactId: string;
    propertyId: string;
    role?: 'buyer' | 'vendor';
    contactName?: string;
    propertyAddress?: string;
}

interface LinkToPropertyOutput {
    success: boolean;
    contact: {
        id: string;
        name: string;
    };
    property: {
        id: string;
        address: string;
    };
    role: string;
}

export const linkToPropertyTool: ZenaToolDefinition<LinkToPropertyInput, LinkToPropertyOutput> = {
    name: 'contact.link_to_property',
    domain: 'contact',
    description: 'Link a contact to a property as a buyer or vendor',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'ID of the contact to link'
            },
            contactName: {
                type: 'string',
                description: 'Name of the contact to link (alternative to contactId)'
            },
            propertyId: {
                type: 'string',
                description: 'ID of the property to link'
            },
            propertyAddress: {
                type: 'string',
                description: 'Address of the property to link (alternative to propertyId)'
            },
            role: {
                type: 'string',
                enum: ['buyer', 'vendor'],
                description: 'Role of the contact for this property (default: buyer)'
            }
        },
        required: []
    },

    recommendedFields: ['contactName', 'propertyAddress'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            contact: { type: 'object' },
            property: { type: 'object' },
            role: { type: 'string' }
        }
    },

    permissions: ['contacts:write', 'properties:write'],
    requiresApproval: false,

    async execute(params: LinkToPropertyInput, context: ToolExecutionContext): Promise<ToolExecutionResult<LinkToPropertyOutput>> {
        try {
            const userId = context.userId;
            let contactId = params.contactId;
            let propertyId = params.propertyId;
            const role = params.role || 'buyer';

            // 🧠 ZENA INTEL: Resolve contact name
            if (!contactId && params.contactName) {
                const contact = await prisma.contact.findFirst({
                    where: { userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (contact) contactId = contact.id;
            }

            if (!contactId) return { success: false, error: 'Contact ID or Name required' };

            // 🧠 ZENA INTEL: Resolve property address
            if (!propertyId && params.propertyAddress) {
                const property = await prisma.property.findFirst({
                    where: { userId, address: { contains: params.propertyAddress, mode: 'insensitive' } }
                });
                if (property) propertyId = property.id;
            }

            if (!propertyId) return { success: false, error: 'Property ID or Address required' };

            // Check if contact and property exist
            const contact = await prisma.contact.findFirst({
                where: { id: contactId, userId }
            });
            if (!contact) return { success: false, error: 'Contact not found' };

            const property = await prisma.property.findFirst({
                where: { id: propertyId, userId }
            });
            if (!property) return { success: false, error: 'Property not found' };

            // Link them based on role
            if (role === 'vendor') {
                await prisma.property.update({
                    where: { id: propertyId },
                    data: {
                        vendors: {
                            connect: { id: contactId }
                        }
                    }
                });
            } else {
                await prisma.property.update({
                    where: { id: propertyId },
                    data: {
                        buyers: {
                            connect: { id: contactId }
                        }
                    }
                });
            }

            return {
                success: true,
                data: {
                    success: true,
                    contact: { id: contact.id, name: contact.name },
                    property: { id: property.id, address: property.address },
                    role
                }
            };
        } catch (error) {
            console.error('[contact.link_to_property] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to link contact to property'
            };
        }
    },

    auditLogFormat(input: LinkToPropertyInput, output: ToolExecutionResult<LinkToPropertyOutput>) {
        return {
            action: 'CONTACT_LINK_PROPERTY',
            summary: `Linked contact ${output.data?.contact?.name} to property ${output.data?.property?.address} as ${output.data?.role}`,
            entityType: 'contact',
            entityId: input.contactId,
            metadata: { propertyId: input.propertyId, role: input.role || 'buyer' }
        };
    }
};

toolRegistry.register(linkToPropertyTool);
