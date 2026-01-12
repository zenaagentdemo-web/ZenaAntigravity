/**
 * Deal: Search Deal Tool
 * 
 * Searches for a deal by property address or contact name.
 * Returns the best matching deal for follow-up actions.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchDealInput {
    propertyAddress?: string;
    contactName?: string;
    query?: string;
}

interface SearchDealOutput {
    found: boolean;
    deal?: {
        id: string;
        propertyAddress: string;
        stage: string;
        pipelineType: string;
        riskLevel: string;
        summary: string;
    };
    alternatives?: Array<{
        id: string;
        propertyAddress: string;
        stage: string;
    }>;
}

export const searchDealTool: ZenaToolDefinition<SearchDealInput, SearchDealOutput> = {
    name: 'deal.search',
    domain: 'deal',
    description: 'Search for a deal by property address or contact name. Use this to find a deal before updating.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyAddress: {
                type: 'string',
                description: 'Property address to search for'
            },
            contactName: {
                type: 'string',
                description: 'Contact name associated with the deal'
            },
            query: {
                type: 'string',
                description: 'General search query'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            found: { type: 'boolean' },
            deal: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: SearchDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchDealOutput>> {
        try {
            const deals = await prisma.deal.findMany({
                where: {
                    userId: context.userId,
                    OR: [
                        params.propertyAddress ? { property: { address: { contains: params.propertyAddress, mode: 'insensitive' } } } : {},
                        params.contactName ? { contacts: { some: { name: { contains: params.contactName, mode: 'insensitive' } } } } : {},
                        params.query ? { summary: { contains: params.query, mode: 'insensitive' } } : {}
                    ].filter(o => Object.keys(o).length > 0)
                },
                include: {
                    property: true,
                    contacts: true
                },
                take: 5,
                orderBy: { updatedAt: 'desc' }
            });

            if (deals.length === 0) {
                return {
                    success: true,
                    data: { found: false }
                };
            }

            const bestMatch = deals[0];
            const alternatives = deals.slice(1).map(d => ({
                id: d.id,
                propertyAddress: d.property?.address || 'Unknown',
                stage: d.stage
            }));

            return {
                success: true,
                data: {
                    found: true,
                    deal: {
                        id: bestMatch.id,
                        propertyAddress: bestMatch.property?.address || 'Unknown',
                        stage: bestMatch.stage,
                        pipelineType: bestMatch.pipelineType,
                        riskLevel: bestMatch.riskLevel,
                        summary: bestMatch.summary
                    },
                    alternatives: alternatives.length > 0 ? alternatives : undefined
                }
            };
        } catch (error) {
            console.error('[deal.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search deals'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'DEAL_SEARCH',
            summary: `Searched for deal: ${input.propertyAddress || input.contactName || input.query}`,
            entityType: 'deal',
            entityId: output.success && output.data?.deal ? output.data.deal.id : undefined
        };
    }
};

toolRegistry.register(searchDealTool);
