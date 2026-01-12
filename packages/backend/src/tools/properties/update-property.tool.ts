import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const updatePropertyTool: ZenaToolDefinition = {
    name: 'property.update',
    domain: 'property',
    description: 'Update an existing property listing.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The property ID (optional if address provided)' },
            address: { type: 'string', description: 'The property address to resolve (case-insensitive)' },
            status: { type: 'string', enum: ['active', 'under_contract', 'sold', 'withdrawn'] },
            listingPrice: { type: 'number' },
            bedrooms: { type: 'number' },
            bathrooms: { type: 'number' },
            landSize: { type: 'string' }
        },
        required: []
    },
    recommendedFields: ['address', 'price', 'bedrooms', 'bathrooms', 'landArea', 'buildingArea'],

    outputSchema: {
        type: 'object',
        properties: {
            property: { type: 'object' }
        }
    },

    permissions: ['properties:write'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        let { id, address, ...updates } = params;

        // 🧠 ZENA INTEL: Resolve property address to ID
        if (!id && address) {
            const property = await prisma.property.findFirst({
                where: { userId, address: { contains: address, mode: 'insensitive' } }
            });
            if (property) {
                id = property.id;
            } else {
                return { success: false, error: `Property at "${address}" not found` };
            }
        }

        if (!id) {
            return { success: false, error: 'Please provide either id or address' };
        }

        if (updates.listingPrice) {
            (updates as any).listingPrice = Number(updates.listingPrice);
        }

        const property = await prisma.property.update({
            where: { id, userId },
            data: updates
        });

        return {
            success: true,
            data: {
                property: {
                    ...property,
                    listingPrice: property.listingPrice ? Number(property.listingPrice) : null
                }
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_UPDATE',
        summary: `Updated property ${input.id}`
    })
};

toolRegistry.register(updatePropertyTool);
