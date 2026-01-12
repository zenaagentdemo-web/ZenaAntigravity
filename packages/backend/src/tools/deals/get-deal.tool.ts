/**
 * Deal: Get Deal Tool
 * 
 * Gets full deal details with linked entities and synapse context.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';
import { contextRetrieverService } from '../../services/context-retriever.service.js';

interface GetDealInput {
    dealId: string;
}

interface GetDealOutput {
    deal: {
        id: string;
        pipelineType: string;
        stage: string;
        riskLevel: string;
        riskFlags: string[];
        status: string;
        summary?: string;
        conditions?: any;
        propertyAddress?: string;
        dealValue?: number;
        settlementDate?: string;
        createdAt: string;
        updatedAt: string;
    };
    property?: {
        id: string;
        address: string;
        status: string;
    };
    contacts: Array<{
        id: string;
        name: string;
        role: string;
        email?: string;
    }>;
    tasks: Array<{
        id: string;
        label: string;
        status: string;
        dueDate?: string;
    }>;
    recentTimeline: Array<{
        type: string;
        summary: string;
        date: string;
    }>;
}

export const getDealTool: ZenaToolDefinition<GetDealInput, GetDealOutput> = {
    name: 'deal.get',
    domain: 'deal',
    description: 'Get full deal details including linked property, contacts, tasks, and recent timeline events',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'The ID of the deal to retrieve'
            }
        },
        required: ['dealId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            deal: { type: 'object' },
            property: { type: 'object' },
            contacts: { type: 'array' },
            tasks: { type: 'array' },
            recentTimeline: { type: 'array' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: GetDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetDealOutput>> {
        try {
            // Fetch deal with relations
            const deal = await prisma.deal.findFirst({
                where: {
                    id: params.dealId,
                    userId: context.userId
                },
                include: {
                    property: {
                        select: {
                            id: true,
                            address: true,
                            status: true
                        }
                    },
                    contacts: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                            emails: true
                        }
                    }
                }
            });

            if (!deal) {
                return {
                    success: false,
                    error: 'Deal not found'
                };
            }

            // Fetch tasks linked to deal
            const tasks = await prisma.task.findMany({
                where: {
                    userId: context.userId,
                    dealId: params.dealId
                },
                orderBy: { dueDate: 'asc' },
                take: 10
            });

            // Fetch synapse context for timeline
            const synapseContext = await contextRetrieverService.getUnifiedContext(
                context.userId,
                'deal',
                params.dealId
            );

            return {
                success: true,
                data: {
                    deal: {
                        id: deal.id,
                        pipelineType: deal.pipelineType,
                        stage: deal.stage,
                        riskLevel: deal.riskLevel,
                        riskFlags: deal.riskFlags || [],
                        status: deal.status,
                        summary: deal.summary || undefined,
                        conditions: deal.conditions || undefined,
                        propertyAddress: deal.property?.address || undefined,
                        dealValue: deal.dealValue ? Number(deal.dealValue) : undefined,
                        settlementDate: deal.settlementDate?.toISOString() || undefined,
                        createdAt: deal.createdAt.toISOString(),
                        updatedAt: deal.updatedAt.toISOString()
                    },
                    property: deal.property ? {
                        id: deal.property.id,
                        address: deal.property.address,
                        status: deal.property.status
                    } : undefined,
                    contacts: deal.contacts.map(c => ({
                        id: c.id,
                        name: c.name,
                        role: c.role,
                        email: c.emails[0] || undefined
                    })),
                    tasks: tasks.map(t => ({
                        id: t.id,
                        label: t.label,
                        status: t.status,
                        dueDate: t.dueDate?.toISOString()
                    })),
                    recentTimeline: synapseContext.timelineEvents.slice(0, 5).map(e => ({
                        type: e.type,
                        summary: e.summary,
                        date: e.date
                    }))
                }
            };
        } catch (error) {
            console.error('[deal.get] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get deal'
            };
        }
    },

    auditLogFormat(input, output) {
        const address = output.success && output.data?.deal?.propertyAddress
            ? output.data.deal.propertyAddress
            : 'Unknown';
        return {
            action: 'DEAL_GET',
            summary: `Opened deal: ${address}`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(getDealTool);
