import prisma from '../config/database.js';
import { Contact, Deal, Property } from '@prisma/client';
import { askZenaService } from './ask-zena.service.js';
import { contextRetrieverService } from './context-retriever.service.js';
import { logger } from './logger.service.js';
import { userPersonaService } from './user-persona.service.js';

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
     * Performs deep intelligence analysis on a single deal with TTL-based caching
     */
    async analyzeDeal(userId: string, dealId: string, forceRefresh: boolean = false): Promise<DealAnalysis> {
        try {
            // 0. CHECK CACHE (24h TTL)
            if (!forceRefresh) {
                const existingBrief = await prisma.zenaAction.findFirst({
                    where: {
                        dealId,
                        type: 'deal_brief',
                        status: 'executed',
                        triggeredAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
                        }
                    },
                    orderBy: { triggeredAt: 'desc' }
                });

                if (existingBrief && existingBrief.payload) {
                    logger.info(`[DealIntelligence] Returning cached brief for deal ${dealId}`);
                    return existingBrief.payload as unknown as DealAnalysis;
                }
            }

            // 1. Fetch full context for the deal
            const deal = await prisma.deal.findUnique({
                where: { id: dealId },
                include: {
                    property: true,
                    contacts: true,
                    threads: {
                        take: 10,
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

            // 2c. Fetch User Persona for dynamic prompt adjustment
            const persona = await userPersonaService.getPersona(userId);
            const personaSnippet = userPersonaService.getSystemPromptSnippet(persona);

            // 3. Prompt Gemini for analysis
            const prompt = `
You are Zena's High Intelligence Brain. Your task is to perform a deep momentum audit for a New Zealand real estate deal.
${personaSnippet}

DEAL CONTEXT:
${context}

NZ MARKET CONTEXT:
- Median days to sell in Auckland is ~51 days.
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
7. Executive Summary: A narrative 2-sentence summary of the deal's current state.

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
  "coachingInsight": "string",
  "executiveSummary": "string"
}
`;

            const response = await askZenaService.askBrain(prompt, { jsonMode: true });
            const analysis = JSON.parse(response);

            // 4. PERSIST TO DATABASE: Sync Gemini's analysis back to the core record
            const riskLevel = this.mapHealthToRiskLevel(analysis.healthScore, analysis.riskSignals);

            // Update Deal record with primary metrics
            await prisma.deal.update({
                where: { id: dealId },
                data: {
                    riskLevel,
                    riskFlags: analysis.riskSignals.map((s: any) => s.description),
                    summary: `${deal.summary.split('\n\n[Zena Brief]')[0]}\n\n[Zena Brief] ${analysis.executiveSummary}\n\n[Zena Insight] ${analysis.coachingInsight}`
                }
            });

            // Store full analysis in ZenaAction for caching
            await prisma.zenaAction.create({
                data: {
                    userId,
                    dealId,
                    type: 'deal_brief',
                    status: 'executed',
                    output: analysis.executiveSummary,
                    payload: analysis as any,
                    triggeredAt: new Date(),
                    executedAt: new Date()
                }
            });

            logger.info(`[DealIntelligence] Analysis complete, cached, and persisted for deal ${dealId}. Health: ${analysis.healthScore}, Risk: ${riskLevel}`);

            return { ...analysis, riskLevel };
        } catch (error) {
            logger.error(`[DealIntelligence] Error analyzing deal ${dealId}:`, error);

            // Fallback for dev/test
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`[DealIntelligence] Using mock fallback for deal ${dealId}`);
                const mockAnalysis = {
                    healthScore: 85,
                    healthVelocity: 5,
                    riskSignals: [{ type: 'momentum', severity: 'low', description: 'Slight delay in finance approval' }],
                    sentiment: 'Positive',
                    suggestedPowerMove: {
                        action: 'email',
                        headline: 'Nudge for finance update',
                        rationale: 'Keep the momentum going while they wait for banker',
                        draftContent: 'Hi Sarah, just checking in on the finance progress...',
                        priority: 'medium'
                    },
                    coachingInsight: 'Stay close to the buyer during the finance period.',
                    executiveSummary: 'Deal is progressing well with high engagement.'
                };
                return { ...mockAnalysis, riskLevel: 'low' } as DealAnalysis;
            }
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
