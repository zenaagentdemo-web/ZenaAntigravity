/**
 * Deal: Analyze Tool
 * 
 * Gets AI intelligence analysis for a deal.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { dealIntelligenceService } from '../../services/deal-intelligence.service.js';

interface AnalyzeDealInput {
    dealId: string;
}

interface AnalyzeDealOutput {
    success: boolean;
    analysis: {
        riskLevel: string;
        riskFlags: string[];
        recommendations: string[];
        nextActions: string[];
    };
}

export const analyzeDealTool: ZenaToolDefinition<AnalyzeDealInput, AnalyzeDealOutput> = {
    name: 'deal.analyze',
    domain: 'deal',
    description: 'Get AI intelligence analysis for a deal including risks and recommendations',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: {
                type: 'string',
                description: 'ID of the deal to analyze'
            }
        },
        required: ['dealId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            analysis: { type: 'object' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: AnalyzeDealInput, context: ToolExecutionContext): Promise<ToolExecutionResult<AnalyzeDealOutput>> {
        try {
            const analysis = await dealIntelligenceService.analyzeDeal(params.dealId, context.userId) as any;

            return {
                success: true,
                data: {
                    success: true,
                    analysis: {
                        riskLevel: analysis.riskLevel || 'unknown',
                        riskFlags: analysis.riskFlags || [],
                        recommendations: analysis.recommendations || [],
                        nextActions: analysis.nextActions || []
                    }
                }
            };
        } catch (error) {
            console.error('[deal.analyze] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to analyze deal'
            };
        }
    },

    auditLogFormat(input, output) {
        const level = output.success && output.data ? output.data.analysis.riskLevel : 'unknown';
        return {
            action: 'DEAL_ANALYZE',
            summary: `Analyzed deal - risk level: ${level}`,
            entityType: 'deal',
            entityId: input.dealId
        };
    }
};

toolRegistry.register(analyzeDealTool);
