/**
 * Deal: Update Deal Tool
 * 
 * Updates deal fields.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface UpdateDealInput {
    dealId?: string;
    propertyAddress?: string;
    contactName?: string;
    summary?: string;
    dealValue?: number;
    saleMethod?: string;
    settlementDate?: string;
}

interface UpdateDealOutput {
    success: boolean;
    deal: {
        id: string;
        summary: string;
        stage: string;
    };
}

export const updateDealTool: ZenaToolDefinition<UpdateDealInput, UpdateDealOutput> = {
    name: 'deal.update',
    domain: 'deal',
    description: 'Update deal summary, value, sale method, or dates',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal to update (optional if propertyAddress/contactName provided)'
            },
            propertyAddress: {
                type: 'string',
                description: 'Address of the property linked to the deal (to resolve to dealId)'
            },
            contactName: {
                type: 'string',
                description: 'Name of a contact linked to the deal (to resolve to dealId)'
            },
            summary: {
                type: 'string',
                description: 'New deal summary'
            },
            dealValue: {
                type: 'number',
                description: 'New deal value'
            },
            saleMethod: {
                type: 'string',
                description: 'New sale method'
            },
            settlementDate: {
                type: 'string',
                description: 'Settlement date (ISO format)'
            }
        },
        required: []
    },
    recommendedFields: ['name', 'value', 'stage', 'probability', 'closeDate'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deal: { type: 'object' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,

    async execute(params: UpdateDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UpdateDealOutput>> {
        try {
            let resolvedDealId = params.dealId;

            // 🧠 ZENA INTEL: Resolve property address or contact name to Deal ID
            if (!resolvedDealId && (params.propertyAddress || params.contactName)) {
                const deal = await prisma.deal.findFirst({
                    where: {
                        userId: context.userId,
                        OR: [
                            params.propertyAddress ? { property: { address: { contains: params.propertyAddress, mode: 'insensitive' } } } : {},
                            params.contactName ? { contacts: { some: { name: { contains: params.contactName, mode: 'insensitive' } } } } : {}
                        ].filter(o => Object.keys(o).length > 0)
                    }
                });
                if (deal) {
                    resolvedDealId = deal.id;
                } else {
                    return { success: false, error: 'Could not find a matching deal for the provided address or contact name' };
                }
            }

            if (!resolvedDealId) {
                return { success: false, error: 'Please provide either dealId, propertyAddress, or contactName' };
            }

            const existing = await prisma.deal.findFirst({
                where: { id: resolvedDealId, userId: context.userId }
            });

            if (!existing) {
                return { success: false, error: 'Deal not found' };
            }

            const updateData: any = {};
            if (params.summary) updateData.summary = params.summary;
            if (params.dealValue !== undefined) updateData.dealValue = params.dealValue;
            if (params.saleMethod) updateData.saleMethod = params.saleMethod;
            if (params.settlementDate) updateData.settlementDate = new Date(params.settlementDate);

            const deal = await prisma.deal.update({
                where: { id: params.dealId },
                data: updateData
            });

            return {
                success: true,
                data: {
                    success: true,
                    deal: {
                        id: deal.id,
                        summary: deal.summary,
                        stage: deal.stage
                    }
                }
            };
        } catch (error) {
            console.error('[deal.update] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update deal'
            };
        }
    },

    auditLogFormat(input: UpdateDealInput, output: ToolExecutionResult<UpdateDealOutput>) {
        const dealId = output.success && output.data?.deal ? output.data.deal.id : input.dealId;
        return {
            action: 'DEAL_UPDATE',
            summary: `Updated deal ${dealId}`,
            entityType: 'deal',
            entityId: dealId
        };
    }
};

toolRegistry.register(updateDealTool);
