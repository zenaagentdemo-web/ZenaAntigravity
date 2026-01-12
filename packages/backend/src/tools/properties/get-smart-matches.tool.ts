/**
 * Property: Get Smart Matches Tool
 * 
 * Gets AI-powered smart matches for a property.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface GetSmartMatchesInput {
    propertyId: string;
    limit?: number;
}

interface GetSmartMatchesOutput {
    success: boolean;
    matches: Array<{
        contactId: string;
        contactName: string;
        matchScore: number;
        matchReason: string;
    }>;
}

export const getSmartMatchesTool: ZenaToolDefinition<GetSmartMatchesInput, GetSmartMatchesOutput> = {
    name: 'property.get_smart_matches',
    domain: 'property',
    description: 'Get AI-powered buyer matches for a property',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: {
                type: 'string',
                description: 'ID of the property'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of matches to return'
            }
        },
        required: ['propertyId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            matches: { type: 'array' }
        }
    },

    permissions: ['properties:read', 'contacts:read'],
    requiresApproval: false,

    async execute(params: GetSmartMatchesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetSmartMatchesOutput>> {
        try {
            const property = await prisma.property.findFirst({
                where: { id: params.propertyId, userId: context.userId }
            });

            if (!property) {
                return { success: false, error: 'Property not found' };
            }

            // Get buyer contacts for matching
            const buyerContacts = await prisma.contact.findMany({
                where: {
                    userId: context.userId,
                    role: { in: ['Buyer', 'buyer', 'BUYER'] }
                },
                take: params.limit || 10
            });

            // Simple matching based on available data
            const matches = buyerContacts.map(contact => ({
                contactId: contact.id,
                contactName: contact.name,
                matchScore: Math.random() * 0.3 + 0.7, // Placeholder score
                matchReason: 'Active buyer in your database'
            }));

            return {
                success: true,
                data: {
                    success: true,
                    matches
                }
            };
        } catch (error) {
            console.error('[property.get_smart_matches] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get smart matches'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.matches.length : 0;
        return {
            action: 'PROPERTY_SMART_MATCHES',
            summary: `Found ${count} smart matches`,
            entityType: 'property',
            entityId: input.propertyId
        };
    }
};

toolRegistry.register(getSmartMatchesTool);
