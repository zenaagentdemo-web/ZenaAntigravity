import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const listPropertiesTool: ZenaToolDefinition = {
    name: 'property.list',
    domain: 'property',
    description: 'List properties with optional filters for status and address search.',

    inputSchema: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['active', 'under_contract', 'sold', 'withdrawn'],
                description: 'Filter by property status'
            },
            address: {
                type: 'string',
                description: 'Partial address search'
            },
            limit: {
                type: 'number',
                default: 20,
                description: 'Maximum number of properties to return'
            }
        }
    },

    outputSchema: {
        type: 'object',
        properties: {
            properties: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        address: { type: 'string' },
                        status: { type: 'string' },
                        type: { type: 'string' },
                        listingPrice: { type: 'number' },
                        listingDate: { type: 'string' },
                        viewingCount: { type: 'number' },
                        inquiryCount: { type: 'number' }
                    }
                }
            },
            count: { type: 'number' }
        }
    },

    permissions: ['properties:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { status, address, limit = 20 } = params;
        const userId = context.userId;

        const where: any = { userId };
        if (status) where.status = status;
        if (address) {
            where.address = {
                contains: address,
                mode: 'insensitive'
            };
        }

        const properties = await prisma.property.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                address: true,
                status: true,
                type: true,
                listingPrice: true,
                listingDate: true,
                viewingCount: true,
                inquiryCount: true
            }
        });

        return {
            success: true,
            data: {
                properties: properties.map(p => ({
                    ...p,
                    listingPrice: p.listingPrice ? Number(p.listingPrice) : null,
                    listingDate: p.listingDate?.toISOString()
                })),
                count: properties.length
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'PROPERTY_LIST',
        summary: `Listed properties ${input.status ? `with status ${input.status}` : ''}`
    })
};

toolRegistry.register(listPropertiesTool);
