/**
 * Deal: Update Stage Tool
 * 
 * Moves a deal to a new stage in the pipeline.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface UpdateStageInput {
    dealId: string;
    newStage: string;
}

interface UpdateStageOutput {
    success: boolean;
    deal: {
        id: string;
        previousStage: string;
        newStage: string;
        propertyAddress?: string;
    };
}

// Valid stages for pipelines
const BUYER_STAGES = ['prospect', 'viewing', 'offer', 'conditional', 'unconditional', 'settled'];
const SELLER_STAGES = ['appraisal', 'listing', 'on_market', 'under_offer', 'conditional', 'unconditional', 'settled'];

export const updateStageTool: ZenaToolDefinition<UpdateStageInput, UpdateStageOutput> = {
    name: 'deal.update_stage',
    domain: 'deal',
    description: 'Move a deal to a new stage in the pipeline (e.g., from "offer" to "conditional")',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'The ID of the deal to update'
            },
            newStage: {
                type: 'string',
                description: 'The new stage for the deal (e.g., "prospect", "viewing", "offer", "conditional", "unconditional", "settled")'
            }
        },
        required: ['dealId', 'newStage']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deal: { type: 'object' }
        }
    },

    permissions: ['deals:write'],
    requiresApproval: false,  // Stage changes are reversible

    async execute(params: UpdateStageInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UpdateStageOutput>> {
        try {
            // Fetch deal
            const deal = await prisma.deal.findFirst({
                where: {
                    id: params.dealId,
                    userId: context.userId
                },
                include: {
                    property: { select: { address: true } }
                }
            });

            if (!deal) {
                return {
                    success: false,
                    error: 'Deal not found'
                };
            }

            // Validate stage
            const validStages = deal.pipelineType === 'buyer' ? BUYER_STAGES : SELLER_STAGES;
            if (!validStages.includes(params.newStage)) {
                return {
                    success: false,
                    error: `Invalid stage "${params.newStage}" for ${deal.pipelineType} pipeline. Valid stages: ${validStages.join(', ')}`
                };
            }

            const previousStage = deal.stage;

            // Update deal
            await prisma.deal.update({
                where: { id: params.dealId },
                data: {
                    stage: params.newStage,
                    stageEnteredAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Create timeline event
            await prisma.timelineEvent.create({
                data: {
                    userId: context.userId,
                    entityType: 'deal',
                    entityId: params.dealId,
                    type: 'stage_change',
                    summary: `Deal moved from ${previousStage} to ${params.newStage}`,
                    metadata: {
                        previousStage,
                        newStage: params.newStage,
                        changedBy: 'agent'
                    },
                    timestamp: new Date()
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    deal: {
                        id: deal.id,
                        previousStage,
                        newStage: params.newStage,
                        propertyAddress: deal.property?.address || undefined
                    }
                }
            };
        } catch (error) {
            console.error('[deal.update_stage] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update stage'
            };
        }
    },

    // Rollback: revert to previous stage
    async rollback(_params: UpdateStageInput, _context: ToolExecutionContext): Promise<void> {
        // Would need to store previous stage in execution result to rollback
        console.warn('[deal.update_stage] Rollback not implemented');
    },

    auditLogFormat(input, output) {
        const address = output.success && output.data?.deal?.propertyAddress || 'Unknown';
        const prev = output.success && output.data?.deal?.previousStage || 'unknown';
        return {
            action: 'DEAL_STAGE_UPDATE',
            summary: `Moved ${address} from ${prev} to ${input.newStage}`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(updateStageTool);
