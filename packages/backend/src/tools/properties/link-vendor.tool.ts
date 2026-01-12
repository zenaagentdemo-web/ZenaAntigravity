import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const linkVendorTool: ZenaToolDefinition = {
    name: 'property.link_vendor',
    domain: 'property',
    description: 'Link a contact as a vendor (seller) for a property.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' },
            contactId: { type: 'string' }
        },
        required: ['propertyId', 'contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        const { propertyId, contactId } = params;

        console.log(`[property.link_vendor] Linking Contact ${contactId} to Property ${propertyId} for User ${userId}`);

        try {
            await prisma.property.update({
                where: { id: propertyId, userId },
                data: {
                    vendors: {
                        connect: { id: contactId }
                    }
                }
            });

            return {
                success: true,
                data: { success: true }
            };
        } catch (err) {
            return { success: false, error: 'Failed to link vendor. Ensure property and contact exist.' };
        }
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_VENDOR_LINK',
        summary: `Linked contact ${input.contactId} as vendor for property ${input.propertyId}`
    })
};

toolRegistry.register(linkVendorTool);
