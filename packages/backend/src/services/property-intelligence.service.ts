import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import { websocketService } from './websocket.service.js';
import { tokenTrackingService } from './token-tracking.service.js';

export interface PropertyHeat {
    level: 'hot' | 'active' | 'cold';
    boxLabel: string; // e.g. "Hot", "Active"
    emoji: string;
    score: number;
    reasoning: string;
}

export interface MarketPulse {
    totalBuyerMatches: number;
    hotPropertiesCount: number;
    staleListingsCount: number;
    vendorContactOverdueCount: number;
    topHotPropertyId?: string;
    topStalePropertyId?: string;
    insights: string[];
}

export interface SmartMatchResult {
    contactId: string;
    name: string;
    role: string;
    matchScore: number;
    matchReason: string;
    contactMethods: string[]; // ['email', 'phone']
}

export interface SuggestedAction {
    action: string;
    reasoning: string;
    impact: 'Low' | 'Medium' | 'High';
}

export interface PropertyPredictionResult {
    id: string;
    propertyId: string;
    momentumScore: number;
    buyerInterestLevel: 'Low' | 'Medium' | 'High' | 'Hot';
    reasoning: string;
    predictedSaleDate: string | null;
    marketValueEstimate: number | null;
    confidenceScore: number;
    suggestedActions: SuggestedAction[];
    milestoneForecasts: Array<{ type: string; date: string; confidence: number }>;
    lastAnalyzedAt: string;
}

export class PropertyIntelligenceService {
    private pulseCache: Map<string, { data: MarketPulse, timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes for market pulse
    private readonly INTELLIGENCE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for property intelligence
    private static readonly STRATEGY_POOL: SuggestedAction[] = [
        { action: 'Best & Final Offers Deadline', reasoning: 'Capitalise on the current engagement pulse by setting a hard deadline. This creates immediate scarcity and forces passive interest into a competitive posture.', impact: 'High' },
        { action: 'Professional Twilight Photography Refresh', reasoning: 'Refresh the visual anchor of the listing with high-impact twilight shots. This re-sets the listing in the buyer\'s mind and increases click-through velocity.', impact: 'Medium' },
        { action: 'Geo-Fenced Social Ad Pulse', reasoning: 'Deploy hyper-targeted Facebook and Instagram ads restricted to high-net-worth postcodes. This ensures the listing is seen by active buyers who haven\'t yet hit the portals.', impact: 'High' },
        { action: 'Price Bracket Alignment Pulse', reasoning: 'Adjust the listing price by a nominal amount to "hack" the search filters of the major portals, appearing in a fresh price bracket for a new pool of buyers.', impact: 'High' },
        { action: 'Custom Property Micro-site', reasoning: 'Create a dedicated, high-aesthetic single-property website. This removes the "noise" of the portals and allows for deep lifestyle storytelling and immersive media.', impact: 'Medium' },
        { action: 'Twilight Garden Soirée', reasoning: 'Host an exclusive, invite-only evening viewing with ambient lighting and refreshments. This creates an emotional "lifestyle" connection that standard open homes fail to achieve.', impact: 'Medium' },
        { action: 'Drone Aerial Strategy Reel', reasoning: 'Execute a cinematic drone sequence highlighting the property\'s proximity to key lifestyle amenities (beaches, parks, cafes). Buyers buy the location as much as the home.', impact: 'Medium' },
        { action: '3D Immersive Matterport Tour', reasoning: 'Deploy a high-definition 3D walkthrough. This qualifies buyers before they arrive, ensuring physical viewings are high-intent only.', impact: 'Low' },
        { action: 'Off-Market Database Preview', reasoning: 'Pull the listing back to "Coming Soon" status for a VIP database preview. Exclusivity drives early, high-value offers before the listing becomes public knowledge.', impact: 'High' },
        { action: 'Home Staging Consultation', reasoning: 'Engage a professional stylist to refresh the key living areas. Neutralising and modernizing the decor can increase perceived value by 5-10%.', impact: 'Medium' },
        { action: 'Influencer Lifestyle Collaboration', reasoning: 'Partner with a local lifestyle influencer for a property walkthrough Reel. This taps into established trust and reaches a demographic that ignores traditional ads.', impact: 'Medium' },
        { action: 'Virtual Renovation Overlay', reasoning: 'For dated properties, provide a digital "render" of what the space could look like after a renovation. This helps buyers overcome "vision fatigue".', impact: 'Medium' },
        { action: 'HNW Investor Portfolio Intro', reasoning: 'Directly pitch the property to our curated list of high-net-worth investors. These buyers often move faster and with fewer conditions than owner-occupiers.', impact: 'High' },
        { action: 'SEO Description Overhaul', reasoning: 'Rewrite the listing copy with hyper-local keywords. This improves organic search visibility and ensures the property appears for specific lifestyle searches.', impact: 'Low' },
        { action: 'Neighborhood Amenity Feature', reasoning: 'Update the marketing package with a dedicated section on "The Walkable Life"—detailing local spots. This shifts the focus from the house to the life it offers.', impact: 'Low' },
        { action: 'Interactive Floor Plan Deployment', reasoning: 'Add an interactive element where buyers can "place furniture" in the floor plan. This builds mental ownership before they even step foot in the door.', impact: 'Low' },
        { action: 'Inquiry Response Optimization Pulse', reasoning: 'Implement a "<2 minute" response protocol for all digital inquiries. Speed-to-lead is the single biggest factor in conversion momentum.', impact: 'High' },
        { action: 'Buyer Match Intro Pulse', reasoning: 'Manually introduce the property to buyers matched from other listings in the Zena ecosystem. This creates cross-listing momentum and identifies sectoral patterns.', impact: 'High' },
        { action: 'Auction Fever Preview', reasoning: 'If leading to auction, host a "Question & Answer" session on the contract and process. Removing friction increases bidder registrations.', impact: 'High' },
        { action: 'Professional Copywriting Refresh', reasoning: 'Swap generic real estate jargon for punchy, benefits-led storytelling. Fresh words re-engage buyers who have scrolled past the listing before.', impact: 'Medium' },
        { action: 'Paid Google Search Ad Pulse', reasoning: 'Bid on specific address searches and hyper-local suburb keywords to ensure you own the top of the search result page.', impact: 'Medium' },
        { action: 'Lifestyle Brand Partnership', reasoning: 'Collaborate with a local luxury brand (e.g., high-end furniture or cars) for a cross-promotional event. This aligns the property with premium buyer aspirations.', impact: 'Medium' }
    ];

    /**
     * BRAIN-FIRST: Refresh Intelligence for a Property using LLM
     * This is the core AI function that generates predictions and actions
     * 
     * OPTIMIZATION: Uses 30-minute cache to avoid redundant LLM calls
     */
    async refreshIntelligence(propertyId: string, userId: string, forceRefresh: boolean = false): Promise<PropertyPredictionResult> {
        // Check if we have fresh cached data (unless force refresh is requested)
        if (!forceRefresh) {
            const cached = await prisma.propertyPrediction.findUnique({
                where: { propertyId }
            });

            if (cached && (Date.now() - cached.lastAnalyzedAt.getTime()) < this.INTELLIGENCE_CACHE_TTL) {
                const cacheAgeMinutes = Math.round((Date.now() - cached.lastAnalyzedAt.getTime()) / 60000);
                logger.info(`[ZenaBrain] Using cached intelligence for property ${propertyId} (age: ${cacheAgeMinutes}min)`);

                return {
                    id: cached.id,
                    propertyId: cached.propertyId,
                    momentumScore: cached.momentumScore,
                    buyerInterestLevel: cached.buyerInterestLevel as any,
                    reasoning: cached.reasoning || '',
                    predictedSaleDate: cached.predictedSaleDate?.toISOString() || null,
                    marketValueEstimate: cached.marketValueEstimate ? Number(cached.marketValueEstimate) : null,
                    confidenceScore: cached.confidenceScore || 0.7,
                    suggestedActions: (cached.suggestedActions as SuggestedAction[]) || [],
                    milestoneForecasts: (cached.milestoneForecasts as any[]) || [],
                    lastAnalyzedAt: cached.lastAnalyzedAt.toISOString(),
                };
            }
        }

        logger.info(`[ZenaBrain] Refreshing intelligence for property ${propertyId} (cache miss or force refresh)`);

        // Fetch property with all related data
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                vendors: true,
                buyers: true,
                deals: true,
            }
        });

        if (!property) {
            throw new Error('Property not found');
        }

        // Get recent timeline events for context
        const recentEvents = await prisma.timelineEvent.findMany({
            where: { entityType: 'property', entityId: propertyId },
            orderBy: { timestamp: 'desc' },
            take: 10
        });

        // Get linked threads for sentiment analysis
        const linkedThreads = await prisma.thread.findMany({
            where: { propertyId: propertyId },
            orderBy: { lastMessageAt: 'desc' },
            take: 5
        });

        // Build context for LLM
        const daysOnMarket = Math.floor((new Date().getTime() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const buyerCount = property.buyers?.length || 0;
        const vendorCount = property.vendors?.length || 0;
        const hasActiveDeals = property.deals?.some((d: any) => ['offer', 'conditional'].includes(d.stage));

        const eventContext = recentEvents.map(e => `- ${e.type}: ${e.summary}`).join('\n') || 'No recent activity';
        const threadContext = linkedThreads.map(t => `- ${t.subject}: ${t.summary}`).join('\n') || 'No linked communications';

        // Step 3: Multi-Property Buyer Patterns
        // Find other properties these buyers have interacted with to identify sectoral patterns
        const buyerIds = property.buyers?.map(b => b.id) || [];
        let buyerPatternContext = 'No cross-property buyer patterns identified.';

        if (buyerIds.length > 0) {
            const otherInteractions = await prisma.property.findMany({
                where: {
                    id: { not: propertyId },
                    buyers: {
                        some: {
                            id: { in: buyerIds }
                        }
                    }
                },
                select: {
                    address: true,
                    type: true,
                    buyers: {
                        where: { id: { in: buyerIds } },
                        select: { name: true }
                    }
                },
                take: 10
            });

            if (otherInteractions.length > 0) {
                buyerPatternContext = otherInteractions.map(p => {
                    const buyerNames = p.buyers.map(b => b.name).join(', ');
                    return `- ${buyerNames} also engaged with ${p.address} (${p.type})`;
                }).join('\n');
            }
        }

        // Call LLM for intelligent analysis
        const prediction = await this.analyzePropertyWithLLM({
            address: property.address,
            status: property.status || 'active',
            type: property.type || 'residential',
            listingPrice: property.listingPrice ? Number(property.listingPrice) : null,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            daysOnMarket,
            buyerCount,
            vendorCount,
            hasActiveDeals,
            eventContext,
            threadContext,
            buyerPatternContext,
            viewingCount: property.viewingCount || 0,
            inquiryCount: property.inquiryCount || 0,
        });

        // Store prediction in database
        const stored = await prisma.propertyPrediction.upsert({
            where: { propertyId },
            update: {
                momentumScore: prediction.momentumScore,
                buyerInterestLevel: prediction.buyerInterestLevel,
                reasoning: prediction.reasoning,
                predictedSaleDate: prediction.predictedSaleDate ? new Date(prediction.predictedSaleDate) : null,
                confidenceScore: prediction.confidenceScore,
                suggestedActions: prediction.suggestedActions,
                milestoneForecasts: prediction.milestoneForecasts,
                lastAnalyzedAt: new Date(),
            },
            create: {
                propertyId,
                momentumScore: prediction.momentumScore,
                buyerInterestLevel: prediction.buyerInterestLevel,
                reasoning: prediction.reasoning,
                predictedSaleDate: prediction.predictedSaleDate ? new Date(prediction.predictedSaleDate) : null,
                confidenceScore: prediction.confidenceScore,
                suggestedActions: prediction.suggestedActions,
                milestoneForecasts: prediction.milestoneForecasts,
                lastAnalyzedAt: new Date(),
            }
        });

        // Broadcast update via WebSocket
        websocketService.broadcastToUser(userId, 'property.intelligence', {
            propertyId,
            prediction: {
                id: stored.id,
                propertyId: stored.propertyId,
                momentumScore: stored.momentumScore,
                buyerInterestLevel: stored.buyerInterestLevel,
                reasoning: stored.reasoning,
                predictedSaleDate: stored.predictedSaleDate?.toISOString() || null,
                confidenceScore: stored.confidenceScore,
                suggestedActions: stored.suggestedActions,
                milestoneForecasts: stored.milestoneForecasts,
                lastAnalyzedAt: stored.lastAnalyzedAt.toISOString(),
            }
        });

        logger.info(`[ZenaBrain] Property ${propertyId} intelligence updated: momentum=${prediction.momentumScore}`);

        return {
            id: stored.id,
            propertyId: stored.propertyId,
            momentumScore: stored.momentumScore,
            buyerInterestLevel: stored.buyerInterestLevel as any,
            reasoning: stored.reasoning || '',
            predictedSaleDate: stored.predictedSaleDate?.toISOString() || null,
            marketValueEstimate: null,
            confidenceScore: stored.confidenceScore || 0.7,
            suggestedActions: stored.suggestedActions as string[],
            milestoneForecasts: (stored.milestoneForecasts as any[]) || [],
            lastAnalyzedAt: stored.lastAnalyzedAt.toISOString(),
        };
    }

    /**
     * BRAIN-FIRST: LLM Analysis of Property
     */
    private async analyzePropertyWithLLM(context: {
        address: string;
        status: string;
        type: string;
        listingPrice: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        daysOnMarket: number;
        buyerCount: number;
        vendorCount: number;
        hasActiveDeals: boolean;
        eventContext: string;
        threadContext: string;
        viewingCount: number;
        inquiryCount: number;
        buyerPatternContext: string;
    }): Promise<{
        momentumScore: number;
        buyerInterestLevel: 'Low' | 'Medium' | 'High' | 'Hot';
        reasoning: string;
        predictedSaleDate: string | null;
        confidenceScore: number;
        suggestedActions: SuggestedAction[];
        milestoneForecasts: Array<{ type: string; date: string; confidence: number }>;
    }> {
        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            // Fallback to heuristics if no API key
            return this.fallbackPropertyAnalysis(context);
        }

        const prompt = `You are Zena, an elite AI real estate intelligence agent. Analyze this property listing and provide strategic intelligence.

MARKET CONTEXT:
You have access to Google Search. You MUST use it to find the latest Late 2025 market trends. Do not rely on generic data.

PROPERTY DATA:
- Address: ${context.address}
- Type: ${context.type}
- Status: ${context.status}
- Price: ${context.listingPrice ? `$${context.listingPrice.toLocaleString()}` : 'Price on Application'}
- Specs: ${context.bedrooms || '?'} beds, ${context.bathrooms || '?'} baths
- Days on Market: ${context.daysOnMarket}
- Buyer Interest: ${context.buyerCount} registered buyers
- Vendors: ${context.vendorCount}
- Viewings: ${context.viewingCount}
- Inquiries: ${context.inquiryCount}
- Active Offers: ${context.hasActiveDeals ? 'Yes' : 'No'}

RECENT ACTIVITY:
${context.eventContext}

COMMUNICATIONS:
${context.threadContext}

BUYER PORTFOLIO PATTERNS (CRITICAL):
${context.buyerPatternContext}

INSTRUCTIONS:
- Use the BUYER PORTFOLIO PATTERNS to identify motivated sectoral buyers and suggest cross-property follow-up strategy.
- CRITICAL: A "Propensity to Sell" score (momentumScore) should be highly sensitive to the COMPOSITE of (Viewing Count / Inquiries) against (Days on Market). 
- If recent viewings are high (>3 in last 7 days), momentum should spike.
- Respond with a clear reasoning that references these velocity metrics.

Analyze and respond in JSON format:
{
  "momentumScore": 0-100 (0=dead listing, 100=imminent sale),
  "buyerInterestLevel": "Low" | "Medium" | "High" | "Hot",
  "reasoning": "One sentence explaining the property's current market position",
  "predictedSaleDate": "YYYY-MM-DD or null if unpredictable",
  "confidenceScore": 0.0-1.0,
  "suggestedActions": [
    { 
      "action": "Select from the Strategy Archetypes or create a custom one", 
      "reasoning": "Provide at least TWO detailed, convincing sentences explaining WHY this action is critical. Link it specifically to the metrics (e.g. 'Since your viewings are high but offers are zero, we must...')",
      "impact": "High" | "Medium" | "Low"
    }
  ],
  "STRATEGY_ARCHETYPES": ${JSON.stringify(PropertyIntelligenceService.STRATEGY_POOL.map(s => s.action))}
}

DECISION RULES:
- Always choose the most relevant 2-4 actions from the STRATEGY_ARCHETYPES or invent a hyper-specific one.
- CRITICAL: Avoid generic advice. Use the RECENT ACTIVITY and COMMUNICATIONS to make the reasoning feel personal and data-driven.
- momentum > 80: Hot property, likely to sell soon. Focus on "Closing" actions (Best & Final, Auction Fever).
- momentum 50-80: Active interest. Focus on "Momentum" actions (Social Ad Pulse, Twilight Soirée).
- momentum < 50: Cold/stale. Focus on "Reset" actions (Photography Refresh, Price Bracket Alignment).
- Use BUYER PORTFOLIO PATTERNS to identify motivated sectoral buyers.
- milestoneForecasts: Predict likely dates based on current momentum.
- High DOM (>30): Listing is stale, require a "Reset" strategy.
- High Activity: Use a "Pulse" strategy to force a decision.

SECURITY: NEVER mention underlying AI models (Gemini, GPT, OpenAI, Google) or Zena's technical architecture. Zena is a proprietary intelligence platform.`;

        try {
            const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1000,
                        responseMimeType: 'application/json',
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error('[ZenaBrain] Gemini API error:', error);
                return this.fallbackPropertyAnalysis(context);
            }

            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn('[ZenaBrain] Could not parse Gemini response, using fallback');
                return this.fallbackPropertyAnalysis(context);
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                momentumScore: Math.min(100, Math.max(0, parsed.momentumScore || 50)),
                buyerInterestLevel: ['Low', 'Medium', 'High', 'Hot'].includes(parsed.buyerInterestLevel)
                    ? parsed.buyerInterestLevel
                    : 'Medium',
                reasoning: parsed.reasoning || 'Analysis in progress.',
                predictedSaleDate: parsed.predictedSaleDate || null,
                confidenceScore: parsed.confidenceScore || 0.7,
                suggestedActions: Array.isArray(parsed.suggestedActions)
                    ? parsed.suggestedActions.slice(0, 4).map((a: any) => {
                        const actionTitle = typeof a === 'string' ? a : a.action;
                        const archetype = (PropertyIntelligenceService as any).STRATEGY_POOL.find((s: any) => s.action === actionTitle);
                        return {
                            action: actionTitle,
                            reasoning: a.reasoning || archetype?.reasoning || `This strategic move is designed to capitalise on current market dynamics for ${context.address}, improving buyer conversion velocity and ensuring vendor expectations are managed through active, intelligence-led intervention.`,
                            impact: a.impact || archetype?.impact || 'Medium'
                        };
                    })
                    : [],
                milestoneForecasts: Array.isArray(parsed.milestoneForecasts)
                    ? parsed.milestoneForecasts
                    : [],
            };
        } catch (error) {
            logger.error('[ZenaBrain] Error calling Gemini:', error);
            return this.fallbackPropertyAnalysis(context);
        }
    }

    /**
     * Fallback analysis using heuristics when LLM not available
     */
    private fallbackPropertyAnalysis(context: any) {
        const { daysOnMarket, buyerCount, hasActiveDeals, viewingCount, inquiryCount } = context;

        let momentumScore = 50;
        let buyerInterestLevel: 'Low' | 'Medium' | 'High' | 'Hot' = 'Medium';
        let reasoning = 'Performing at market average.';
        const suggestedActions: SuggestedAction[] = [];

        // Calculate momentum based on signals
        if (hasActiveDeals) {
            momentumScore = 85;
            buyerInterestLevel = 'Hot';
            reasoning = 'Active offer in progress - high momentum.';
        } else if (buyerCount >= 5 || viewingCount >= 10) {
            momentumScore = 80;
            buyerInterestLevel = 'Hot';
            reasoning = `Strong demand with ${buyerCount} buyers and ${viewingCount} viewings - high transaction probability.`;
        } else if (buyerCount >= 2 || (viewingCount + inquiryCount) >= 5) {
            momentumScore = 70;
            buyerInterestLevel = 'High';
            reasoning = `Steady interest with ${buyerCount} buyers and significant engagement pulse (${viewingCount + inquiryCount} interactions).`;
        } else if (daysOnMarket > 30 && buyerCount === 0 && viewingCount < 2) {
            momentumScore = 20;
            buyerInterestLevel = 'Low';
            reasoning = `Stale listing - ${daysOnMarket} days with critical lack of engagement.`;
        }

        // Peak Momentum (>80)
        if (momentumScore >= 80) {
            suggestedActions.push(...this.getStrategiesByActions(['Best & Final Offers Deadline', 'Auction Fever Preview', 'Buyer Match Intro Pulse']));
        }
        // Active Interest (50-80)
        else if (momentumScore >= 50) {
            suggestedActions.push(...this.getStrategiesByActions(['Geo-Fenced Social Ad Pulse', 'Twilight Garden Soirée', '3D Immersive Matterport Tour']));
        }
        // Stale Listing (<50)
        else {
            suggestedActions.push(...this.getStrategiesByActions(['Professional Twilight Photography Refresh', 'Price Bracket Alignment Pulse', 'SEO Description Overhaul']));
        }

        // Always add a vendor communication strategy if stale or semi-stale
        if (daysOnMarket > 14) {
            suggestedActions.push({
                action: 'Strategic Vendor alignment Pulse',
                reasoning: 'Proactive communication after 14 days on market is vital to ensure the vendor remains committed to the current strategy and understands the engagement data we are seeing.',
                impact: 'Medium'
            });
        }

        return {
            momentumScore,
            buyerInterestLevel,
            reasoning,
            predictedSaleDate: null,
            confidenceScore: 0.6,
            suggestedActions: suggestedActions.slice(0, 4),
            milestoneForecasts: [],
        };
    }

    /**
     * Helper to grab full strategy objects from the pool
     */
    private getStrategiesByActions(actionTitles: string[]): SuggestedAction[] {
        return actionTitles
            .map(title => PropertyIntelligenceService.STRATEGY_POOL.find(s => s.action === title))
            .filter((s): s is SuggestedAction => !!s);
    }

    /**
   * Calculate Heat Score for a property based on DB data
   */
    async calculatePropertyHeat(propertyId: string, existingData?: any): Promise<PropertyHeat> {
        let property = existingData;

        if (!property) {
            property = await prisma.property.findUnique({
                where: { id: propertyId },
                include: {
                    buyers: true,
                }
            });
        }

        if (!property) {
            throw new Error('Property not found');
        }

        return this.computeHeat(property);
    }

    /**
     * Sync helper to compute heat from data
     */
    computeHeat(property: any): PropertyHeat {
        const now = new Date();
        const created = new Date(property.createdAt);
        const daysOnMarket = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

        const buyerCount = property.buyers ? property.buyers.length : 0;

        let level: 'hot' | 'active' | 'cold' = 'active';
        let score = 50;
        let emoji = '⚡';
        let reasoning = 'Performing at market average.';

        if (buyerCount >= 5 || property.viewingCount >= 10) {
            level = 'hot';
            score = 92;
            emoji = '🔥';
            reasoning = `Strategic Surge: ${buyerCount} buyers and ${property.viewingCount || 0} viewings creating peak momentum.`;
        } else if (buyerCount >= 2 || (property.viewingCount + property.inquiryCount) >= 5) {
            level = 'active';
            score = 75;
            reasoning = `Steady interest: High engagement pulse detected from ${buyerCount} active parties.`;
        } else if (daysOnMarket > 21 && buyerCount === 0 && (property.viewingCount || 0) < 2) {
            level = 'cold';
            score = 25;
            emoji = '💤';
            reasoning = `Stale: Critical engagement deficit after ${daysOnMarket} days on market.`;
        }

        return {
            level,
            boxLabel: level.charAt(0).toUpperCase() + level.slice(1),
            emoji,
            score,
            reasoning
        };
    }

    /**
     * Get Market Pulse (Aggregated Insights)
     * Optimized with in-memory caching and Stale-While-Revalidate pattern.
     * Now returns FAST metrics immediately even on first load.
     */
    async getMarketPulse(userId: string): Promise<MarketPulse> {
        const now = Date.now();
        const cached = this.pulseCache.get(userId);

        if (cached) {
            const isStale = now - cached.timestamp > this.CACHE_TTL;
            if (isStale) {
                // Return stale data immediately and trigger refresh in background
                logger.info(`[ZenaBrain] Returning stale Market Pulse for ${userId}, triggering background refresh`);
                this.refreshMarketPulseInBackground(userId).catch(err =>
                    logger.error(`[ZenaBrain] Background pulse refresh failed:`, err)
                );
                return cached.data;
            }
            logger.debug(`[ZenaBrain] Returning fresh cached Market Pulse for ${userId}`);
            return cached.data;
        }

        // No cache: compute FAST metrics immediately (no LLM), then enrich in background
        logger.info(`[ZenaBrain] No cache for Market Pulse ${userId}, returning fast metrics`);
        const fastPulse = await this.computeMarketPulseFast(userId);
        this.pulseCache.set(userId, { data: fastPulse, timestamp: now });

        // Trigger LLM enrichment in background
        this.enrichMarketPulseInBackground(userId, fastPulse).catch(err =>
            logger.error(`[ZenaBrain] Background pulse enrichment failed:`, err)
        );

        return fastPulse;
    }

    /**
     * Internal background refresh to keep the cache warm without blocking the user
     */
    private async refreshMarketPulseInBackground(userId: string): Promise<void> {
        const pulse = await this.computeMarketPulse(userId);
        this.pulseCache.set(userId, { data: pulse, timestamp: Date.now() });

        // Optionally broadcast update via websocket so UI can update if it wants
        websocketService.broadcastToUser(userId, 'market_pulse.update', pulse);
    }

    /**
     * FAST: Compute market pulse with DB-only metrics (no LLM)
     * Returns instantly with basic insights
     */
    private async computeMarketPulseFast(userId: string): Promise<MarketPulse> {
        const properties = await prisma.property.findMany({
            where: { userId, status: 'active' },
            include: { buyers: true }
        });

        let totalBuyerMatches = 0;
        let hotPropertiesCount = 0;
        let staleListingsCount = 0;
        let vendorContactOverdueCount = 0;

        for (const p of properties) {
            totalBuyerMatches += p.buyers.length;

            const daysOnMarket = Math.floor((new Date().getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            if (p.buyers.length >= 5) hotPropertiesCount++;
            if (daysOnMarket > 30 && p.buyers.length === 0) staleListingsCount++;
            if (daysOnMarket > 14) vendorContactOverdueCount++;
        }

        // Basic heuristic insights (no LLM)
        const insights: string[] = [];
        if (hotPropertiesCount > 0) insights.push(`${hotPropertiesCount} properties are trending hot.`);
        if (staleListingsCount > 0) insights.push(`${staleListingsCount} listings need price review.`);

        return {
            totalBuyerMatches,
            hotPropertiesCount,
            staleListingsCount,
            vendorContactOverdueCount,
            insights
        };
    }

    /**
     * Enrich existing fast pulse with LLM strategic insights in background
     */
    private async enrichMarketPulseInBackground(userId: string, basePulse: MarketPulse): Promise<void> {
        const properties = await prisma.property.findMany({
            where: { userId, status: 'active' },
            include: { buyers: true }
        });

        const propertySummaries = properties.map(p => ({
            id: p.id,
            address: p.address,
            buyers: p.buyers.map(b => b.id)
        }));

        // Identify cross-property patterns
        const buyerIntentMap: Record<string, string[]> = {};
        for (const p of propertySummaries) {
            for (const buyerId of p.buyers) {
                if (!buyerIntentMap[buyerId]) buyerIntentMap[buyerId] = [];
                buyerIntentMap[buyerId].push(p.address);
            }
        }

        const crossPropertyBuyers = Object.entries(buyerIntentMap)
            .filter(([_, addresses]) => addresses.length > 1)
            .map(([buyerId, addresses]) => `Buyer ${buyerId.substring(0, 4)} is interested in: ${addresses.join(', ')}`);

        // Build enriched insights
        const enrichedInsights = [...basePulse.insights];
        if (crossPropertyBuyers.length > 0) {
            enrichedInsights.push(`${crossPropertyBuyers.length} buyers are active across multiple properties.`);
        }

        // Add LLM strategic insights
        try {
            const strategicInsights = await this.generateMarketPulseInsightsWithLLM(properties, {
                totalBuyerMatches: basePulse.totalBuyerMatches,
                hotPropertiesCount: basePulse.hotPropertiesCount,
                staleListingsCount: basePulse.staleListingsCount,
                vendorContactOverdueCount: basePulse.vendorContactOverdueCount,
                buyerPatterns: crossPropertyBuyers.slice(0, 5)
            });
            enrichedInsights.push(...strategicInsights);
        } catch (error) {
            logger.warn('[ZenaBrain] Background portfolio analysis failed:', error);
        }

        const enrichedPulse: MarketPulse = {
            ...basePulse,
            insights: enrichedInsights
        };

        // Update cache with enriched data
        this.pulseCache.set(userId, { data: enrichedPulse, timestamp: Date.now() });

        // Broadcast enriched pulse to UI
        websocketService.broadcastToUser(userId, 'market_pulse.update', enrichedPulse);
        logger.info(`[ZenaBrain] Market Pulse enriched with LLM insights for ${userId}`);
    }

    /**
     * The actual computation logic moved from getMarketPulse
     */
    private async computeMarketPulse(userId: string): Promise<MarketPulse> {
        const properties = await prisma.property.findMany({
            where: { userId, status: 'active' },
            include: { buyers: true }
        });

        let totalBuyerMatches = 0;
        let hotPropertiesCount = 0;
        let staleListingsCount = 0;
        let vendorContactOverdueCount = 0;

        for (const p of properties) {
            totalBuyerMatches += p.buyers.length;

            const daysOnMarket = Math.floor((new Date().getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));

            if (p.buyers.length >= 5) hotPropertiesCount++;
            if (daysOnMarket > 30 && p.buyers.length === 0) staleListingsCount++;
            if (daysOnMarket > 14) vendorContactOverdueCount++;
        }

        const propertySummaries = properties.map(p => ({
            id: p.id,
            address: p.address,
            buyers: p.buyers.map(b => b.id)
        }));

        // Identify cross-property patterns
        const buyerIntentMap: Record<string, string[]> = {};
        for (const p of propertySummaries) {
            for (const buyerId of p.buyers) {
                if (!buyerIntentMap[buyerId]) buyerIntentMap[buyerId] = [];
                buyerIntentMap[buyerId].push(p.address);
            }
        }

        const crossPropertyBuyers = Object.entries(buyerIntentMap)
            .filter(([_, addresses]) => addresses.length > 1)
            .map(([buyerId, addresses]) => `Buyer ${buyerId.substring(0, 4)} is interested in: ${addresses.join(', ')}`);

        const insights: string[] = [];
        if (hotPropertiesCount > 0) insights.push(`${hotPropertiesCount} properties are trending hot.`);
        if (staleListingsCount > 0) insights.push(`${staleListingsCount} listings need price review.`);
        if (crossPropertyBuyers.length > 0) insights.push(`${crossPropertyBuyers.length} buyers are active across multiple properties.`);

        // BRAIN-FIRST: Portfolio Analysis
        try {
            const strategicInsights = await this.generateMarketPulseInsightsWithLLM(properties, {
                totalBuyerMatches,
                hotPropertiesCount,
                staleListingsCount,
                vendorContactOverdueCount,
                buyerPatterns: crossPropertyBuyers.slice(0, 5)
            });
            insights.push(...strategicInsights);
        } catch (error) {
            logger.warn('[ZenaBrain] Portfolio analysis failed:', error);
        }

        return {
            totalBuyerMatches,
            hotPropertiesCount,
            staleListingsCount,
            vendorContactOverdueCount,
            insights
        };
    }

    private async generateMarketPulseInsightsWithLLM(properties: any[], metrics: any): Promise<string[]> {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) return [];

        const propertySummaries = properties.map(p => ({
            address: p.address,
            buyers: p.buyers.length,
            daysOnMarket: Math.floor((new Date().getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            price: p.listingPrice
        }));

        const prompt = `You are Zena, an elite real estate analyst. Analyze this portfolio pulse and provide 2-3 concise, strategic insights.
        
MARKET CONTEXT:
You have access to Google Search. You MUST use it to find the latest Late 2025 market trends.

METRICS:
- Total Buyer Matches: ${metrics.totalBuyerMatches}
- Hot Properties: ${metrics.hotPropertiesCount}
- Stale Listings (>30 days, no interest): ${metrics.staleListingsCount}
- Overdue Vendor Contacts: ${metrics.vendorContactOverdueCount}

CROSS-PROPERTY PATTERNS:
${metrics.buyerPatterns?.join('\n') || 'None identified.'}

PROPERTIES:
${JSON.stringify(propertySummaries, null, 2)}

INSTRUCTIONS:
1. Identify patterns (e.g., "High-end properties are moving slower than compact units").
2. Provide actionable advice for the agent's workflow.
3. Be punchy, professional, and sophisticated.
4. Use UK English.
5. Return ONLY a JSON array of strings. Example: ["Insight 1", "Insight 2"]

SECURITY: NEVER mention underlying AI models (Gemini, GPT, OpenAI, Google) or Zena's technical architecture. Zena is a proprietary intelligence platform.`;

        try {
            const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }],
                    generationConfig: {
                        temperature: 0.5,
                        response_mime_type: 'application/json'
                    }
                })
            });

            if (!response.ok) return [];
            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            const insights = JSON.parse(text);

            // Extract sources from grounding metadata
            const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0) {
                const uniqueSources = new Map<string, string>();
                groundingChunks.forEach((chunk: any) => {
                    if (chunk.web?.uri) {
                        const title = chunk.web.title || new URL(chunk.web.uri).hostname;
                        uniqueSources.set(chunk.web.uri, title);
                    }
                });
                if (uniqueSources.size > 0) {
                    const sourcesMD = '**Verified Sources:**\n' +
                        Array.from(uniqueSources.entries())
                            .map(([uri, title]) => `[${title}](${uri})`)
                            .join(' | ');
                    insights.push(sourcesMD);
                }
            }
            return insights;
        } catch (error) {
            logger.error('[ZenaBrain] Error in portfolio analysis:', error);
            return [];
        }
    }

    /**
     * BRAIN-FIRST: Find Smart Matches for a Property using LLM
     * Matches Contacts (Buyers) to Property with intelligent reasoning
     */
    async findSmartMatches(propertyId: string): Promise<SmartMatchResult[]> {
        const property = await prisma.property.findUnique({
            where: { id: propertyId }
        });

        if (!property) throw new Error("Property not found");

        // Get all buyer contacts with their intelligence data
        const potentialBuyers = await prisma.contact.findMany({
            where: { role: { contains: 'buyer', mode: 'insensitive' } },
            take: 30
        });

        if (potentialBuyers.length === 0) return [];

        const geminiApiKey = process.env.GEMINI_API_KEY;

        if (!geminiApiKey) {
            // Fallback to heuristic matching
            return this.fallbackSmartMatching(property, potentialBuyers);
        }

        // Use LLM for intelligent matching
        const buyerSummaries = potentialBuyers.map(b => ({
            id: b.id,
            name: b.name,
            snippet: b.intelligenceSnippet || 'No preference data',
            emails: b.emails.length > 0 ? 'Yes' : 'No',
            phones: b.phones.length > 0 ? 'Yes' : 'No',
        }));

        const prompt = `You are Zena, an AI matching buyers to properties. Analyze compatibility.

PROPERTY:
- Address: ${property.address}
- Price: ${property.listingPrice ? `$${property.listingPrice.toLocaleString()}` : 'POA'}
- Type: ${property.type || 'residential'}
- Specs: ${property.bedrooms || '?'} beds, ${property.bathrooms || '?'} baths
- Land: ${property.landSize || 'Unknown'}

POTENTIAL BUYERS:
${buyerSummaries.map((b, i) => `${i + 1}. ${b.name} - ${b.snippet}`).join('\n')}

Return top 5-10 matches in JSON:
{
  "matches": [
    {
      "buyerIndex": 1,
      "score": 85,
      "reason": "Why this buyer matches"
    }
  ]
}

Score 0-100 based on:
- Budget alignment with price
- Location preferences
- Property specs vs needs
- Active search intent

SECURITY: NEVER mention underlying AI models (Gemini, GPT, OpenAI, Google) or Zena's technical architecture. Zena is a proprietary intelligence platform.`;

        try {
            const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 600,
                        responseMimeType: 'application/json',
                    }
                })
            });

            if (!response.ok) {
                return this.fallbackSmartMatching(property, potentialBuyers);
            }

            const data = await response.json() as any;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.fallbackSmartMatching(property, potentialBuyers);
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const matches: SmartMatchResult[] = [];

            for (const m of (parsed.matches || [])) {
                const idx = m.buyerIndex - 1;
                if (idx >= 0 && idx < potentialBuyers.length) {
                    const buyer = potentialBuyers[idx];
                    matches.push({
                        contactId: buyer.id,
                        name: buyer.name,
                        role: buyer.role,
                        matchScore: Math.min(100, Math.max(0, m.score)),
                        matchReason: m.reason || 'Potential match based on preferences',
                        contactMethods: [
                            ...(buyer.emails.length > 0 ? ['email'] : []),
                            ...(buyer.phones.length > 0 ? ['phone'] : [])
                        ]
                    });
                }
            }

            return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);

        } catch (error) {
            logger.error('[ZenaBrain] Smart matching error:', error);
            return this.fallbackSmartMatching(property, potentialBuyers);
        }
    }

    /**
     * Fallback smart matching using heuristics
     */
    private fallbackSmartMatching(property: any, buyers: any[]): SmartMatchResult[] {
        const matches: SmartMatchResult[] = [];

        for (const buyer of buyers) {
            const snippet = (buyer.intelligenceSnippet || '').toLowerCase();
            const address = property.address.toLowerCase();
            const suburb = address.split(',')[1]?.trim() || '';

            let score = 50;
            let reason = 'Registered buyer in the market';

            // Check for location match
            if (snippet.includes(suburb.toLowerCase()) || snippet.includes('auckland')) {
                score += 25;
                reason = `Active in ${suburb} area`;
            }

            // Check for budget match
            if (property.listingPrice) {
                const priceMil = property.listingPrice / 1000000;
                if (snippet.includes(`${priceMil}m`) || snippet.includes('budget match')) {
                    score += 15;
                    reason = `Budget aligns with ${priceMil.toFixed(1)}M range`;
                }
            }

            // Check for specs match
            if (property.bedrooms && snippet.includes(`${property.bedrooms}+ bed`)) {
                score += 10;
            }

            if (score >= 50) {
                matches.push({
                    contactId: buyer.id,
                    name: buyer.name,
                    role: buyer.role,
                    matchScore: Math.min(95, score),
                    matchReason: reason,
                    contactMethods: [
                        ...(buyer.emails.length > 0 ? ['email'] : []),
                        ...(buyer.phones.length > 0 ? ['phone'] : [])
                    ]
                });
            }
        }

        return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    }

    /**
     * Find Smart Matches Across All Properties (Portfolio View)
     */
    async findAllSmartMatches(userId: string): Promise<SmartMatchResult[]> {
        const properties = await prisma.property.findMany({
            where: { userId, status: 'active' },
            take: 10
        });

        let allMatches: SmartMatchResult[] = [];

        for (const property of properties.slice(0, 5)) {
            const matches = await this.findSmartMatches(property.id);
            const taggedMatches = matches.map(m => ({
                ...m,
                matchReason: `${m.matchReason} (Matched to ${property.address.split(',')[0]})`
            }));
            allMatches = [...allMatches, ...taggedMatches];
        }

        return allMatches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 20);
    }
}

export const propertyIntelligenceService = new PropertyIntelligenceService();

