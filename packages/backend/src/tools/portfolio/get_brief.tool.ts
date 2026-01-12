import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { portfolioIntelligenceService } from '../../services/portfolio-intelligence.service.js';

interface PortfolioBriefInput {
    contactId: string;
    forceRefresh?: boolean;
}

interface PortfolioBriefOutput {
    contactId: string;
    strategyType: string;
    summary: string;
    dependencies: any[];
    overallNextStep: string;
    analyzedAt: string;
}

export const portfolioGetBrief: ZenaToolDefinition<PortfolioBriefInput, PortfolioBriefOutput> = {
    name: 'portfolio.get_brief',
    domain: 'deal',
    description: 'Synthesize a multi-deal strategic brief for a contact involved in multiple properties (e.g. selling to buy). Use this when a contact has more than one active deal.',

    inputSchema: {
        type: 'object',
        properties: {
            contactId: {
                type: 'string',
                description: 'The ID of the contact to analyze.'
            },
            forceRefresh: {
                type: 'boolean',
                description: 'Whether to force a fresh re-analysis of the portfolio context.'
            }
        },
        required: ['contactId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            contactId: { type: 'string' },
            strategyType: { type: 'string' },
            summary: { type: 'string' },
            dependencies: { type: 'array' },
            overallNextStep: { type: 'string' },
            analyzedAt: { type: 'string' }
        }
    },

    permissions: ['deals:read'],
    requiresApproval: false,

    async execute(params: PortfolioBriefInput, context: ToolExecutionContext): Promise<ToolExecutionResult<PortfolioBriefOutput>> {
        try {
            const data = await portfolioIntelligenceService.analyzePortfolio(context.userId, params.contactId, !!params.forceRefresh);
            if (!data) {
                return {
                    success: false,
                    error: 'No portfolio analysis available for this contact'
                };
            }
            return {
                success: true,
                data
            };
        } catch (error) {
            console.error('[portfolio.get_brief] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get portfolio brief'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'PORTFOLIO_CONTACT_BRIEF',
            summary: `Generated portfolio brief for contact: ${input.contactId}`,
            entityType: 'contact',
            entityId: input.contactId
        };
    }
};
