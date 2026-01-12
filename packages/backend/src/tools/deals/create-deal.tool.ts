/**
 * Deal: Create Deal Tool
 * 
 * Creates a new deal in the user's pipeline.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { dealFlowService } from '../../services/deal-flow.service.js';

interface CreateDealInput {
    pipelineType: 'buyer' | 'seller';
    summary: string;
    propertyAddress?: string;
    dealValue?: number;
    contactId?: string;
    saleMethod?: string;
}

interface CreateDealOutput {
    success: boolean;
    deal: {
        id: string;
        summary: string;
        pipelineType: string;
        stage: string;
    };
}

export const createDealTool: ZenaToolDefinition<CreateDealInput, CreateDealOutput> = {
    name: 'deal.create',
    domain: 'deal',
    description: 'Create a new buyer or seller deal in the pipeline',

    inputSchema: {
        type: 'object',
        properties: {
            pipelineType: {
                type: 'string',
                enum: ['buyer', 'seller'],
                description: 'Type of deal: "buyer" or "seller"'
            },
            summary: {
                type: 'string',
                description: 'Brief description of the deal'
            },
            propertyAddress: {
                type: 'string',
                description: 'Property address if known'
            },
            dealValue: {
                type: 'number',
                description: 'Estimated deal value in dollars'
            },
            contactId: {
                type: 'string',
                description: 'ID of contact to link to the deal'
            },
            saleMethod: {
                type: 'string',
                description: 'Sale method: negotiation, auction, tender, deadline_sale'
            }
        },
        required: ['pipelineType', 'summary']
    },

    recommendedFields: ['propertyAddress', 'dealValue', 'saleMethod', 'contactId'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deal: { type: 'object' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: true,
    approvalType: 'standard',

    confirmationPrompt: (params) => {
        return `Create ${params.pipelineType} deal: "${params.summary}"?`;
    },

    async execute(params: CreateDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<CreateDealOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Deal creation requires approval'
            };
        }

        try {
            const initialStage = params.pipelineType === 'buyer' ? 'buyer_consult' : 'appraisal';

            // 🧠 ZENA INTEL: Resolve property address to ID

            let resolvedPropertyId: string | undefined;
            if (params.propertyAddress) {
                const property = await prisma.property.findFirst({
                    where: { userId: context.userId, address: params.propertyAddress }
                });

                if (property) {
                    resolvedPropertyId = property.id;
                } else {
                    const newProperty = await prisma.property.create({
                        data: {
                            userId: context.userId,
                            address: params.propertyAddress,
                            type: 'residential',
                            status: 'active'
                        }
                    });
                    resolvedPropertyId = newProperty.id;
                }
            }

            const deal = await dealFlowService.createDeal({
                userId: context.userId,
                pipelineType: params.pipelineType,
                summary: params.summary,
                stage: initialStage,
                saleMethod: params.saleMethod || 'negotiation',
                dealValue: params.dealValue,
                contactIds: params.contactId ? [params.contactId] : undefined,
                propertyId: resolvedPropertyId
            });

            return {
                success: true,
                data: {
                    success: true,
                    deal: {
                        id: deal.id,
                        summary: deal.summary,
                        pipelineType: deal.pipelineType,
                        stage: deal.stage
                    }
                }
            };
        } catch (error) {
            console.error('[deal.create] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create deal'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'DEAL_CREATE',
            summary: `Created ${input.pipelineType} deal: "${input.summary}"`,
            entityType: 'deal',
            entityId: output.success && output.data ? output.data.deal.id : undefined
        };
    }
};

toolRegistry.register(createDealTool);
