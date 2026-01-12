import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const getPropertyTool: ZenaToolDefinition = {
    name: 'property.get',
    domain: 'property',
    description: 'Get full details of a single property by ID or address.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The property ID' },
            address: { type: 'string', description: 'Full or partial address if ID is unknown' }
        }
    },

    outputSchema: {
        type: 'object',
        properties: {
            property: { type: 'object' }
        }
    },

    permissions: ['properties:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const userId = context.userId;
        const { id, address } = params;

        let property;
        if (id) {
            property = await prisma.property.findFirst({
                where: { id, userId },
                include: {
                    vendors: { select: { id: true, name: true, emails: true } },
                    buyers: { select: { id: true, name: true, emails: true } }
                }
            });
        } else if (address) {
            property = await prisma.property.findFirst({
                where: {
                    userId,
                    address: { contains: address, mode: 'insensitive' }
                },
                include: {
                    vendors: { select: { id: true, name: true, emails: true } },
                    buyers: { select: { id: true, name: true, emails: true } }
                }
            });
        }

        if (!property) {
            return { success: false, error: 'Property not found' };
        }

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
        action: 'PROPERTY_GET',
        summary: `Retrieved details for property ${input.id || input.address}`
    })
};

toolRegistry.register(getPropertyTool);
