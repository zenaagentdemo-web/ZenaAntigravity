import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { logger } from './logger.service.js';
import { Deal, Property, Contact } from '@prisma/client';
import { contextRetrieverService } from './context-retriever.service.js';

export interface DealAnalysis {
    healthScore: number;
    healthVelocity: number;
    riskSignals: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        dataPoint?: string;
    }>;
    suggestedPowerMove: {
        action: string;
        headline: string;
        rationale: string;
        draftContent: string;
        priority: string;
    } | null;
    coachingInsight: string;
    sentiment: string;
    riskLevel: string; // The persisted AI-determined risk level
}

export class DealIntelligenceService {
    /**
     * Performs deep intelligence analysis on a single deal using Gemini-3-Flash-Preview
     */
    async analyzeDeal(userId: string, dealId: string): Promise<DealAnalysis> {
        try {
            // 1. Fetch full context for the deal
            const deal = await prisma.deal.findUnique({
                where: { id: dealId },
                include: {
                    property: true,
                    contacts: true,
                    threads: {
                        take: 5,
                        orderBy: { lastMessageAt: 'desc' }
                    }
                }
            });

            if (!deal) {
                throw new Error('Deal not found');
            }

            // 2. Build context for the AI
            const context = this.buildDealContext(deal);

            // 2b. Fetch Universal Synapse Context (Cross-Functional)
            const synapseContext = await contextRetrieverService.getUnifiedContext(userId, 'deal', dealId);
            const humanContext = contextRetrieverService.formatForPrompt(synapseContext);

            // 3. Prompt Gemini for analysis
            const prompt = `
You are Zena's High Intelligence Brain (Gemini-3-Flash-Preview). Your task is to perform a deep momentum audit for a New Zealand real estate deal.

DEAL CONTEXT:
${context}

NZ MARKET CONTEXT:
- Medina days to sell in Auckland is ~51 days.
- Finance conditions typically take 10 working days.
- Building reports typically take 5 working days.

HUMAN CONTEXT (SYNAPSE LAYER):
${humanContext}

ANALYSIS REQUIREMENTS:
1. Health Score: 0-100 based on momentum, communication frequency, and upcoming deadlines.
2. Health Velocity: Predicted % change in health over the next 7 days (-20 to +20).
3. Risk Signals: Identify specific issues (stalling, finance risk, builder report delays, etc.).
4. Sentiment Analysis: Determine current client vibe (positive, hesitant, cold, anxious).
5. Suggested Power Move: Determine the #1 tactical action the agent should take right now. Include a draft message (Email/SMS).
6. Coaching Insight: A punchy, mentor-like insight (max 30 words).

FORMAT:
Respond ONLY with a JSON object in this exact format:
{
  "healthScore": number,
  "healthVelocity": number,
  "riskSignals": [{"type": "string", "severity": "low|medium|high|critical", "description": "string", "dataPoint": "string"}],
  "sentiment": "string",
  "suggestedPowerMove": {
    "action": "email|call|text",
    "headline": "string",
    "rationale": "string",
    "draftContent": "string",
    "priority": "low|medium|high|critical"
  },
  "coachingInsight": "string"
}
`;

            const response = await askZenaService.askBrain(prompt, { jsonMode: true });
            const analysis = JSON.parse(response);

            // 4. PERSIST TO DATABASE: Sync Gemini's analysis back to the core record
            // This closes the "Executive Gap" where dashboard stats were driven by heuristics
            const riskLevel = this.mapHealthToRiskLevel(analysis.healthScore, analysis.riskSignals);

            await prisma.deal.update({
                where: { id: dealId },
                data: {
                    riskLevel,
                    riskFlags: analysis.riskSignals.map((s: any) => s.description),
                    // We also store the coaching insight as a summary update if it's significant
                    summary: `${deal.summary.split('\n\n[Zena Insight]')[0]}\n\n[Zena Insight] ${analysis.coachingInsight}`
                }
            });

            logger.info(`[DealIntelligence] Analysis complete and persisted for deal ${dealId}. Health: ${analysis.healthScore}, Risk: ${riskLevel}`);

            return { ...analysis, riskLevel };
        } catch (error) {
            logger.error(`[DealIntelligence] Error analyzing deal ${dealId}:`, error);
            throw error;
        }
    }

    private mapHealthToRiskLevel(healthScore: number, riskSignals: any[]): string {
        // If there's a critical risk signal, force critical level regardless of score
        if (riskSignals.some(s => s.severity === 'critical')) return 'critical';

        if (healthScore >= 90) return 'none';
        if (healthScore >= 70) return 'low';
        if (healthScore >= 40) return 'medium';
        if (healthScore >= 20) return 'high';
        return 'critical';
    }

    private buildDealContext(deal: any): string {
        const now = new Date();
        const daysInStage = Math.floor((now.getTime() - new Date(deal.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));

        return `
- Property: ${deal.property?.address || 'Unknown'}
- Pipeline: ${deal.pipelineType}
- Current Stage: ${deal.stage} (spent ${daysInStage} days here)
- Risk Level set by user: ${deal.riskLevel}
- Last Contact: ${deal.lastContactAt ? deal.lastContactAt.toISOString() : 'Never'}
- Conditions: ${JSON.stringify(deal.conditions)}
- Settlement Date: ${deal.settlementDate ? deal.settlementDate.toISOString() : 'N/A'}
- Recent Threads: ${deal.threads.map((t: any) => t.subject + " (" + t.classification + ")").join(', ')}
`;
    }
}

export const dealIntelligenceService = new DealIntelligenceService();
