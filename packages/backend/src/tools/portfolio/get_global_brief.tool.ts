import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { portfolioIntelligenceService } from '../../services/portfolio-intelligence.service.js';

interface GlobalBriefOutput {
    summary: string;
    totalValue: number;
    activeDealsCount: number;
    healthScore?: number;
    macroRisks?: string[];
    topPriority?: string;
    opportunities?: any[];
    riskClusters?: any[];
    analyzedAt: string;
}

export const portfolioGetGlobalBrief: ZenaToolDefinition<any, GlobalBriefOutput> = {
    name: 'portfolio.get_global_brief',
    domain: 'deal',
    description: 'Provide an executive summary of the entire real estate portfolio. Use this for broad business questions like "How is my business looking?" or "Summarize my pipeline."',

    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            totalValue: { type: 'number' },
            activeDealsCount: { type: 'number' },
            healthScore: { type: 'number' },
            macroRisks: { type: 'array' },
            topPriority: { type: 'string' },
            opportunities: { type: 'array' },
            riskClusters: { type: 'array' },
            analyzedAt: { type: 'string' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: any, context: ToolExecutionContext): Promise<ToolExecutionResult<GlobalBriefOutput>> {
        try {
            const data = await portfolioIntelligenceService.analyzeGlobalPortfolio(context.userId);
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('[portfolio.get_global_brief] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get global brief'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'PORTFOLIO_GLOBAL_BRIEF',
            summary: `Generated executive portfolio summary`
        };
    }
};
