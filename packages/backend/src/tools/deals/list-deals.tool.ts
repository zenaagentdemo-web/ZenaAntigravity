/**
 * Deal: List Deals Tool
 * 
 * Lists deals with optional filters for pipeline type, stage, and risk level.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ListDealsInput {
    pipelineType?: 'buyer' | 'seller';
    stage?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    status?: 'active' | 'archived';
    limit?: number;
}

interface DealSummary {
    id: string;
    pipelineType: string;
    stage: string;
    riskLevel: string;
    status: string;
    propertyAddress?: string;
    contactCount: number;
    summary?: string;
    lastActivityAt?: string;
}

interface ListDealsOutput {
    deals: DealSummary[];
    total: number;
    filters: {
        pipelineType?: string;
        stage?: string;
        riskLevel?: string;
    };
}

export const listDealsTool: ZenaToolDefinition<ListDealsInput, ListDealsOutput> = {
    name: 'deal.list',
    domain: 'deal',
    description: 'List deals from the Deal Flow page with optional filters for pipeline type, stage, risk level, and status',

    inputSchema: {
        type: 'object',
        properties: {
            pipelineType: {
                type: 'string',
                enum: ['buyer', 'seller'],
                description: 'Filter by pipeline type'
            },
            stage: {
                type: 'string',
                description: 'Filter by deal stage (e.g., "prospect", "viewing", "offer", "conditional", "unconditional")'
            },
            riskLevel: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Filter by risk level'
            },
            status: {
                type: 'string',
                enum: ['active', 'archived'],
                description: 'Filter by status. Defaults to active.',
                default: 'active'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of deals to return',
                default: 20
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            deals: { type: 'array' },
            total: { type: 'number' },
            filters: { type: 'object' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: ListDealsInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ListDealsOutput>> {
        try {
            const limit = params.limit || 20;

            // Build query
            const where: any = {
                userId: context.userId,
                status: params.status === 'archived' ? 'archived' : { not: 'archived' }
            };

            if (params.pipelineType) {
                where.pipelineType = params.pipelineType;
            }
            if (params.stage) {
                where.stage = params.stage;
            }
            if (params.riskLevel) {
                where.riskLevel = params.riskLevel;
            }

            // Fetch deals
            const deals = await prisma.deal.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                take: limit,
                include: {
                    property: {
                        select: { address: true }
                    },
                    contacts: {
                        select: { id: true }
                    }
                }
            });

            // Get total count
            const total = await prisma.deal.count({ where });

            // Format output
            const dealSummaries: DealSummary[] = deals.map(deal => ({
                id: deal.id,
                pipelineType: deal.pipelineType,
                stage: deal.stage,
                riskLevel: deal.riskLevel,
                status: deal.status,
                propertyAddress: deal.property?.address || undefined,
                contactCount: deal.contacts.length,
                summary: deal.summary || undefined,
                lastActivityAt: deal.updatedAt?.toISOString()
            }));

            return {
                success: true,
                data: {
                    deals: dealSummaries,
                    total,
                    filters: {
                        pipelineType: params.pipelineType,
                        stage: params.stage,
                        riskLevel: params.riskLevel
                    }
                }
            };
        } catch (error) {
            console.error('[deal.list] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list deals'
            };
        }
    },

    auditLogFormat(_input, output) {
        const count = output.success && output.data ? output.data.deals.length : 0;
        return {
            action: 'DEAL_LIST',
            summary: `Listed ${count} deals`
        };
    }
};

toolRegistry.register(listDealsTool);
