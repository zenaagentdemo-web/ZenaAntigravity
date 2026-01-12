import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { dealIntelligenceService } from '../../services/deal-intelligence.service.js';

export const getDealBriefTool: ZenaToolDefinition = {
    name: 'deal.get_brief',
    domain: 'deals',
    description: 'Fetch a deep intelligence brief for a deal, including health score, risks, and strategic Power Moves.',

    inputSchema: {
        type: 'object',
        properties: {
            dealId: { type: 'string', description: 'The ID of the deal to analyze.' },
            forceRefresh: { type: 'boolean', description: 'If true, bypasses the cache and performs a fresh neural analysis.' }
        },
        required: ['dealId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            analysis: { type: 'object' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { dealId, forceRefresh } = params;
        const userId = context.userId;

        const analysis = await dealIntelligenceService.analyzeDeal(userId, dealId, forceRefresh);

        return {
            success: true,
            data: { analysis }
        };
    },

    auditLogFormat: (input, output) => ({
        action: 'DEAL_BRIEF_FETCH',
        summary: `Fetched intelligence brief for deal ${input.dealId}. Health Score: ${output.data?.analysis?.healthScore}`
    })
};

toolRegistry.register(getDealBriefTool);
