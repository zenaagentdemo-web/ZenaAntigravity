import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import { aiProcessingService } from './ai-processing.service.js';

export interface PortfolioBrief {
    contactId: string;
    strategyType: 'SELLING_TO_BUY' | 'INVESTMENT_EXPANSION' | 'CONSOLIDATION' | 'DIVERSIFIED' | 'SINGLE_TRANSACTION';
    summary: string;
    dependencies: Array<{
        fromDealId: string;
        toDealId: string;
        description: string;
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    overallNextStep: string;
    analyzedAt: string;
}

export class PortfolioIntelligenceService {
    /**
     * Analyze the relationship between multiple active deals for a single contact.
     */
    async analyzePortfolio(userId: string, contactId: string, forceRefresh = false): Promise<PortfolioBrief | null> {
        logger.info(`[PortfolioIntel] Analyzing portfolio for contact ${contactId}`);

        // 1. Fetch contact and all related active deals
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            include: {
                deals: {
                    where: {
                        status: 'active',
                        userId: userId
                    },
                    include: {
                        property: true
                    }
                }
            }
        });

        if (!contact || contact.deals.length < 2) {
            return null; // No multi-deal strategy needed for single or zero deals
        }

        const deals = contact.deals;

        // 2. Build context for AI synthesis
        const dealContext = deals.map(d => ({
            id: d.id,
            address: d.property?.address || 'Unknown Property',
            pipelineType: d.pipelineType, // 'buyer' or 'seller'
            stage: d.stage,
            value: d.dealValue,
            settlementDate: d.settlementDate,
            summary: d.summary
        }));

        const prompt = `
      You are Zena, a high-performance Real Estate AI Agent.
      Analyze the following active deals for contact "${contact.name}" and synthesize a portfolio-level strategy.
      
      CONTACT ROLE: ${contact.role}
      DEALS:
      ${JSON.stringify(dealContext, null, 2)}

      TASKS:
      1. Determine the STRATEGY TYPE:
         - SELLING_TO_BUY: One 'seller' deal and one 'buyer' deal (interdependent).
         - INVESTMENT_EXPANSION: Multiple 'buyer' deals (building a portfolio).
         - CONSOLIDATION: Multiple 'seller' deals (exiting market).
         - DIVERSIFIED: Mixture of types.
      2. Identify DEPENDENCIES: Are there financial or timing links? (e.g. "Needs settlement of A to fund purchase of B").
      3. Synthesize a concise SUMMARY (2-3 sentences).
      4. Recommend the single most important OVERALL NEXT STEP for the agent.

      RESPONSE FORMAT: JSON
      {
        "strategyType": "...",
        "summary": "...",
        "dependencies": [{"fromDealId": "...", "toDealId": "...", "description": "...", "riskLevel": "..."}],
        "overallNextStep": "..."
      }
    `;

        let aiResponse = '';
        try {
            if (aiProcessingService.apiEndpoint === 'google') {
                aiResponse = await aiProcessingService.callGemini(prompt, aiProcessingService.apiKey);
            } else {
                aiResponse = await aiProcessingService.callLLM(prompt);
            }

            // Robust JSON parsing
            const jsonText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonText);

            return {
                contactId,
                strategyType: analysis.strategyType,
                summary: analysis.summary,
                dependencies: analysis.dependencies || [],
                overallNextStep: analysis.overallNextStep,
                analyzedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`[PortfolioIntel] AI Synthesis failed for contact ${contactId}:`, error);
            // @ts-ignore
            if (error instanceof SyntaxError) {
                logger.error(`[PortfolioIntel] Raw AI Response: ${aiResponse}`);
            }

            // Heuristic Fallback
            const hasSeller = deals.some(d => d.pipelineType === 'seller');
            const hasBuyer = deals.some(d => d.pipelineType === 'buyer');

            return {
                contactId,
                strategyType: (hasSeller && hasBuyer) ? 'SELLING_TO_BUY' : 'DIVERSIFIED',
                summary: `[HEURISTIC] Managing ${deals.length} active transactions. AI synthesis failed.`,
                dependencies: [],
                overallNextStep: 'Verify dependency between active deals manually.',
                analyzedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Analyze the state of the entire portfolio for a user.
     * Provides macro-level stats, clusters of risks, and strategic high-ground.
     */
    async analyzeGlobalPortfolio(userId: string): Promise<any> {
        logger.info(`[PortfolioIntel] Performing global portfolio analysis for user ${userId}`);

        // 1. Fetch all active deals and listings
        const deals = await prisma.deal.findMany({
            where: { userId, status: 'active' },
            include: { property: true, contacts: true }
        });

        if (deals.length === 0) return { summary: "No active deals to analyze." };

        // 2. Aggregate metrics
        const totalValue = deals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
        const stagesCount = deals.reduce((acc, d) => {
            acc[d.stage] = (acc[d.stage] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // 3. Build context for Macro AI Synthesis
        const macroContext = {
            totalDeals: deals.length,
            totalValue,
            stagesDistribution: stagesCount,
            recentHurdles: deals.filter(d => d.riskLevel !== 'none').map(d => ({
                deal: d.summary,
                risk: d.riskLevel,
                nextStep: d.nextAction
            }))
        };

        const prompt = `
            You are Zena, an Executive Real Estate Strategist.
            Analyze the following portfolio metrics and provide a "Big Picture" summary.
            
            METRICS:
            ${JSON.stringify(macroContext, null, 2)}

            TASKS:
            1. Identify PORTFOLIO HEALTH: Is the pipeline balanced or bottom-heavy?
            2. Detect MACRO RISKS: Are there common hurdles preventing movement?
            3. Provide EXECUTIVE SUMMARY: A vibrant, 3-sentence overview for the agent.
            4. Recommend the #1 TOP PRIORITY for the entire business today.

            RESPONSE FORMAT: JSON
            {
                "healthScore": 0-100,
                "summary": "...",
                "macroRisks": ["risk 1", "risk 2"],
                "topPriority": "..."
            }
        `;

        try {
            const aiResponse = await aiProcessingService.callGemini(prompt, aiProcessingService.apiKey);
            const jsonText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonText);

            // 4. Run automated matching and risk clustering
            const opportunities = await this.detectOpportunityMatches(userId);
            const clusters = this.clusterRisks(deals);

            return {
                ...analysis,
                totalValue,
                activeDealsCount: deals.length,
                opportunities,
                riskClusters: clusters,
                analyzedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`[PortfolioIntel] Global analysis failed:`, error);
            return {
                summary: `You have ${deals.length} active deals with a total pipeline value of $${totalValue.toLocaleString()}. AI synthesis failed.`,
                totalValue,
                activeDealsCount: deals.length,
                analyzedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Cross-reference buyers with internal listings to find pre-market matches.
     */
    async detectOpportunityMatches(userId: string): Promise<any[]> {
        // Fetch contacts with buyer profiles in zenaIntelligence
        const buyers = await prisma.contact.findMany({
            where: { userId, role: 'buyer' }
        });

        // Fetch current active listings (properties with a 'seller' deal)
        const listings = await prisma.property.findMany({
            where: { userId, status: 'active' },
            include: { deals: { where: { pipelineType: 'seller' } } }
        });

        const matches: any[] = [];

        // Simplified heuristic matching for now (Phase 8 MVP)
        for (const buyer of buyers) {
            const intel = buyer.zenaIntelligence as any;
            if (!intel || !intel.preferences) continue;

            for (const property of listings) {
                // Check suburb match
                if (intel.preferences.location && property.address.toLowerCase().includes(intel.preferences.location.toLowerCase())) {
                    matches.push({
                        buyerName: buyer.name,
                        buyerId: buyer.id,
                        propertyAddress: property.address,
                        propertyId: property.id,
                        reason: `Target location match: ${intel.preferences.location}`
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Group deals by common hurdles/risks
     */
    private clusterRisks(deals: any[]): any[] {
        const clusters: Record<string, string[]> = {};

        deals.forEach(d => {
            if (d.riskLevel !== 'none') {
                const key = d.stage; // Simpler clustering for MVP
                if (!clusters[key]) clusters[key] = [];
                clusters[key].push(d.summary);
            }
        });

        return Object.entries(clusters).map(([stage, items]) => ({
            stage,
            count: items.length,
            deals: items
        })).filter(c => c.count > 1);
    }

    /**
     * Scan content for property mentions and link a contact as a buyer/vendor.
     */
    async linkContactToProperties(userId: string, contactId: string, content: string): Promise<void> {
        logger.info(`[PortfolioIntel] Scanning note for property mentions: ${contactId}`);

        // Fetch all properties for this user to match against
        const properties = await prisma.property.findMany({
            where: { userId }
        });

        const linkedPropertyIds: string[] = [];

        for (const property of properties) {
            // Simple heuristic match for address parts
            const addressParts = property.address.split(',')[0].toLowerCase();
            if (content.toLowerCase().includes(addressParts)) {
                linkedPropertyIds.push(property.id);
            }
        }

        if (linkedPropertyIds.length > 0) {
            logger.info(`[PortfolioIntel] Linking contact ${contactId} to ${linkedPropertyIds.length} properties`);
            await prisma.contact.update({
                where: { id: contactId },
                data: {
                    buyerProperties: {
                        connect: linkedPropertyIds.map(id => ({ id }))
                    }
                }
            });
        }
    }
}

export const portfolioIntelligenceService = new PortfolioIntelligenceService();
