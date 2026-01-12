/**
 * Property: Search Property Tool
 * 
 * Searches for a property by address.
 * Returns the best matching property for follow-up actions.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchPropertyInput {
    address?: string;
    query?: string;
}

interface SearchPropertyOutput {
    found: boolean;
    property?: {
        id: string;
        address: string;
        status: string;
        type: string;
        listingPrice?: number;
        bedrooms?: number;
        bathrooms?: number;
    };
    alternatives?: Array<{
        id: string;
        address: string;
        status: string;
    }>;
}

export const searchPropertyTool: ZenaToolDefinition<SearchPropertyInput, SearchPropertyOutput> = {
    name: 'property.search',
    domain: 'property',
    description: 'Search for a property by address. Use this to find a property before updating or linking.',

    inputSchema: {
        type: 'object',
        properties: {
            address: {
                type: 'string',
                description: 'Property address to search for'
            },
            query: {
                type: 'string',
                description: 'General search query for address'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            found: { type: 'boolean' },
            property: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['properties:read'],
    requiresApproval: false,

    async execute(params: SearchPropertyInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchPropertyOutput>> {
        try {
            let searchTerm = (params.address || params.query || '').trim();
            // 🧠 ZENA SMART SEARCH: Sanitize extra spaces and commas to get clean keywords
            const sanitizedSearch = searchTerm.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
            const keywords = sanitizedSearch.split(' ').filter(k => k.length > 0);

            if (keywords.length === 0) {
                return { success: false, error: 'Please provide an address or query to search' };
            }

            // 🔍 KEYWORD SEARCH: Ensure the address contains ALL keywords
            // We use AND condition with multiple 'contains' filters
            const properties = await prisma.property.findMany({
                where: {
                    userId: context.userId,
                    AND: keywords.map(keyword => ({
                        address: { contains: keyword, mode: 'insensitive' }
                    }))
                },
                take: 5,
                orderBy: { updatedAt: 'desc' }
            });

            if (properties.length === 0) {
                return {
                    success: true,
                    data: { found: false }
                };
            }

            const bestMatch = properties[0];
            const alternatives = properties.slice(1).map(p => ({
                id: p.id,
                address: p.address,
                status: p.status
            }));

            return {
                success: true,
                data: {
                    found: true,
                    property: {
                        id: bestMatch.id,
                        address: bestMatch.address,
                        status: bestMatch.status,
                        type: bestMatch.type,
                        listingPrice: bestMatch.listingPrice ? Number(bestMatch.listingPrice) : undefined,
                        bedrooms: bestMatch.bedrooms || undefined,
                        bathrooms: bestMatch.bathrooms || undefined
                    },
                    alternatives: alternatives.length > 0 ? alternatives : undefined
                }
            };
        } catch (error) {
            console.error('[property.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search properties'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'PROPERTY_SEARCH',
            summary: `Searched for property: ${input.address || input.query}`,
            entityType: 'property',
            entityId: output.success && output.data?.property ? output.data.property.id : undefined
        };
    }
};

toolRegistry.register(searchPropertyTool);
