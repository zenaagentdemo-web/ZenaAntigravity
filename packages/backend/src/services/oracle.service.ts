/**
 * Oracle Service - Predictive Intelligence for Contacts
 * 
 * This service provides:
 * 1. Personality prediction using LLM (Gemini) with DISC framework
 * 2. Propensity scoring (sell/buy probability) via LLM analysis
 * 3. Data maturity tracking (honest "I don't know" states)
 * 
 * BRAIN-FIRST ARCHITECTURE: All predictions now route through Zena's LLM brain
 */

import { predictPersonality, PERSONALITY_MARKERS } from './personality-markers.service';
import { askZenaService } from './ask-zena.service.js';
import prisma from '../config/database.js';
import { tokenTrackingService } from './token-tracking.service.js';

// LLM API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Data Maturity Levels
export enum MaturityLevel {
    LEARNING = 0,    // Just created, no analysis possible
    OBSERVING = 1,   // 3+ emails or 5+ events - can show trends
    PROFILING = 2,   // 10+ emails + 1 month - can predict personality
    PREDICTING = 3,  // 20+ events + 3 months + intent signal - full predictions
}

// Propensity signal types
interface PropensitySignal {
    type: string;
    weight: number;
    source: string;
    detectedAt: Date;
}

// Oracle prediction result
export interface OraclePrediction {
    maturityLevel: MaturityLevel;
    maturityLabel: string;
    personalityType: string | null;
    personalityConfidence: number | null;
    communicationTips: string[];
    sellProbability: number | null;
    buyProbability: number | null;
    churnRisk: number | null;
    signalsDetected: PropensitySignal[];
    dataPoints: {
        emailsAnalyzed: number;
        eventsCount: number;
        monthsActive: number;
    };
}

class OracleService {
    /**
     * Get or create prediction for a contact
     */
    async getContactPrediction(contactId: string): Promise<OraclePrediction | null> {
        const prediction = await prisma.contactPrediction.findUnique({
            where: { contactId },
        });

        if (!prediction) {
            return null;
        }

        return {
            maturityLevel: prediction.maturityLevel as MaturityLevel,
            maturityLabel: this.getMaturityLabel(prediction.maturityLevel),
            personalityType: prediction.personalityType,
            personalityConfidence: prediction.personalityConfidence,
            communicationTips: (prediction.communicationTips as string[]) || [],
            sellProbability: prediction.sellProbability,
            buyProbability: prediction.buyProbability,
            churnRisk: prediction.churnRisk,
            signalsDetected: [
                ...((prediction.sellSignals as PropensitySignal[]) || []),
                ...((prediction.buySignals as PropensitySignal[]) || []),
            ],
            dataPoints: {
                emailsAnalyzed: prediction.emailsAnalyzed,
                eventsCount: prediction.eventsCount,
                monthsActive: prediction.oldestDataAt
                    ? this.monthsBetween(prediction.oldestDataAt, new Date())
                    : 0,
            },
        };
    }

    /**
     * Analyze contact and update predictions
     */
    async analyzeContact(contactId: string, userId: string): Promise<OraclePrediction> {
        // Get contact with related data
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            include: {
                deals: true,
                prediction: true,
            },
        });

        if (!contact) {
            throw new Error(`Contact ${contactId} not found`);
        }

        // Count data points (in real app, count from messages/timeline)
        const emailsAnalyzed = contact.prediction?.emailsAnalyzed || 0;
        const eventsCount = contact.prediction?.eventsCount || 0;
        const oldestDataAt = contact.prediction?.oldestDataAt || contact.createdAt;
        const monthsActive = this.monthsBetween(oldestDataAt, new Date());

        // Calculate maturity level (now passing intelligence snippet for qualitative boost)
        const maturityLevel = this.calculateMaturityLevel(
            emailsAnalyzed,
            eventsCount,
            monthsActive,
            contact.intelligenceSnippet,
            contact.prediction?.personalityType
        );

        // Initialize prediction data from existing if available
        let personalityType: string | null = contact.prediction?.personalityType || null;
        let personalityConfidence: number | null = contact.prediction?.personalityConfidence || null;
        let communicationTips: string[] = (contact.prediction?.communicationTips as string[]) || [];
        let detectedMarkers: string[] = (contact.prediction?.detectedMarkers as string[]) || [];

        // BRAIN-FIRST: Use LLM for personality prediction instead of regex
        if (maturityLevel >= MaturityLevel.PROFILING && contact.intelligenceSnippet) {
            try {
                const llmPrediction = await this.predictPersonalityWithLLM(
                    contact.name,
                    contact.role,
                    contact.intelligenceSnippet,
                    contact.lastActivityDetail || ''
                );

                if (llmPrediction && llmPrediction.confidence >= 0.3) {
                    personalityType = llmPrediction.type;
                    personalityConfidence = llmPrediction.confidence;
                    communicationTips = llmPrediction.communicationTips;
                    detectedMarkers = llmPrediction.detectedMarkers;
                }
            } catch (err) {
                console.warn('[Oracle] LLM personality prediction failed, using heuristic fallback:', err);
                // Fallback to regex-based prediction
                const prediction = predictPersonality(contact.intelligenceSnippet);
                if (prediction.confidence >= 0.3 && (prediction.confidence >= (personalityConfidence || 0))) {
                    personalityType = prediction.type;
                    personalityConfidence = prediction.confidence;
                    communicationTips = prediction.communicationTips;
                    detectedMarkers = prediction.detectedMarkers;
                }
            }
        }

        // BRAIN-FIRST: Use LLM for propensity scoring
        let sellProbability: number | null = null;
        let buyProbability: number | null = null;
        let sellSignals: PropensitySignal[] = [];
        let buySignals: PropensitySignal[] = [];

        if (maturityLevel >= MaturityLevel.PROFILING && contact.intelligenceSnippet) {
            try {
                const propensityResult = await this.calculatePropensityWithLLM(
                    contact.name,
                    contact.role,
                    contact.intelligenceSnippet,
                    contact.deals || []
                );
                sellProbability = propensityResult.sellProbability;
                buyProbability = propensityResult.buyProbability;
                sellSignals = propensityResult.sellSignals;
                buySignals = propensityResult.buySignals;
            } catch (err) {
                console.warn('[Oracle] LLM propensity scoring failed, using heuristic fallback:', err);
                // Fallback to heuristic
                const sellResult = this.calculateSellPropensity(contact, maturityLevel);
                const buyResult = this.calculateBuyPropensity(contact, maturityLevel);
                sellProbability = sellResult.sellProbability;
                buyProbability = buyResult.buyProbability;
                sellSignals = sellResult.sellSignals;
                buySignals = buyResult.buySignals;
            }
        } else {
            // Not enough data for LLM, use heuristics
            const sellResult = this.calculateSellPropensity(contact, maturityLevel);
            const buyResult = this.calculateBuyPropensity(contact, maturityLevel);
            sellProbability = sellResult.sellProbability;
            buyProbability = buyResult.buyProbability;
            sellSignals = sellResult.sellSignals;
            buySignals = buyResult.buySignals;
        }

        const churnRisk = this.calculateChurnRisk(contact, eventsCount);

        // Upsert prediction
        const savedPrediction = await prisma.contactPrediction.upsert({
            where: { contactId },
            create: {
                contactId,
                userId,
                maturityLevel,
                emailsAnalyzed,
                eventsCount,
                oldestDataAt,
                personalityType,
                personalityConfidence,
                detectedMarkers,
                communicationTips,
                sellProbability,
                sellConfidence: sellProbability !== null ? 0.7 : null,
                sellSignals,
                buyProbability,
                buyConfidence: buyProbability !== null ? 0.7 : null,
                buySignals,
                churnRisk,
                lastAnalyzedAt: new Date(),
            },
            update: {
                maturityLevel,
                emailsAnalyzed,
                eventsCount,
                personalityType,
                personalityConfidence,
                detectedMarkers,
                communicationTips,
                sellProbability,
                sellConfidence: sellProbability !== null ? 0.7 : null,
                sellSignals,
                buyProbability,
                buyConfidence: buyProbability !== null ? 0.7 : null,
                buySignals,
                churnRisk,
                lastAnalyzedAt: new Date(),
            },
        });

        return {
            maturityLevel,
            maturityLabel: this.getMaturityLabel(maturityLevel),
            personalityType,
            personalityConfidence,
            communicationTips,
            sellProbability,
            buyProbability,
            churnRisk,
            signalsDetected: [...(sellSignals || []), ...(buySignals || [])],
            dataPoints: {
                emailsAnalyzed,
                eventsCount,
                monthsActive,
            },
        };
    }

    /**
     * Increment email count and re-analyze
     */
    async recordEmailAnalyzed(contactId: string, userId: string, emailContent: string): Promise<void> {
        // Increment counter
        await prisma.contactPrediction.upsert({
            where: { contactId },
            create: {
                contactId,
                userId,
                emailsAnalyzed: 1,
                oldestDataAt: new Date(),
            },
            update: {
                emailsAnalyzed: { increment: 1 },
            },
        });

        // Re-analyze if we have enough data
        const prediction = await prisma.contactPrediction.findUnique({ where: { contactId } });
        if (prediction && prediction.emailsAnalyzed >= 3) {
            await this.analyzeContact(contactId, userId);
        }
    }

    /**
     * Get personality-aware email prompt addition
     */
    getEmailStylePrompt(personalityType: string | null): string {
        if (!personalityType || !PERSONALITY_MARKERS[personalityType as keyof typeof PERSONALITY_MARKERS]) {
            return '';
        }

        const markers = PERSONALITY_MARKERS[personalityType as keyof typeof PERSONALITY_MARKERS];

        switch (personalityType) {
            case 'D':
                return `
IMPORTANT: This contact has a DOMINANCE personality (direct, results-oriented).
- Keep the email under 75 words
- Lead with the key point/ask
- Use bullet points
- No small talk or pleasantries
- Be direct and decisive`;

            case 'I':
                return `
IMPORTANT: This contact has an INFLUENCE personality (enthusiastic, people-oriented).
- Be warm and enthusiastic
- Include a personal touch
- Use exclamation marks appropriately
- Focus on the relationship and collaboration
- Make it feel fun and engaging`;

            case 'S':
                return `
IMPORTANT: This contact has a STEADINESS personality (patient, supportive).
- Be reassuring and patient
- Provide context and background
- Don't rush them
- Acknowledge their concerns
- Be warm but methodical`;

            case 'C':
                return `
IMPORTANT: This contact has a CONSCIENTIOUSNESS personality (analytical, detail-oriented).
- Include specific data and evidence
- Be precise with numbers
- Answer questions thoroughly
- Use formal language
- Provide documentation or references`;

            default:
                return '';
        }
    }

    // Private helper methods

    private calculateMaturityLevel(
        emails: number,
        events: number,
        months: number,
        snippet?: string | null,
        existingPersonality?: string | null
    ): MaturityLevel {
        // QUALITATIVE BOOST: If we already have a personality or rich context, jump to PROFILING
        if (existingPersonality) {
            return MaturityLevel.PROFILING;
        }

        if (snippet && snippet.length > 150) {
            const personalityKeywords = ['direct', 'results', 'enthusiastic', 'people', 'patient', 'supportive', 'analytical', 'precise'];
            const lowerSnippet = snippet.toLowerCase();
            const hasKeyword = personalityKeywords.some(kw => lowerSnippet.includes(kw));

            if (hasKeyword || snippet.length > 300) {
                return MaturityLevel.PROFILING;
            }
        }

        // QUANTITATIVE THRESHOLDS
        if (emails >= 20 && events >= 20 && months >= 3) {
            return MaturityLevel.PREDICTING;
        }
        if (emails >= 10 && months >= 1) {
            return MaturityLevel.PROFILING;
        }
        if (emails >= 3 || events >= 5) {
            return MaturityLevel.OBSERVING;
        }
        return MaturityLevel.LEARNING;
    }

    private getMaturityLabel(level: number): string {
        switch (level) {
            case MaturityLevel.LEARNING: return 'Learning';
            case MaturityLevel.OBSERVING: return 'Observing';
            case MaturityLevel.PROFILING: return 'Profiling';
            case MaturityLevel.PREDICTING: return 'Predicting';
            default: return 'Unknown';
        }
    }

    private monthsBetween(date1: Date, date2: Date): number {
        const months = (date2.getFullYear() - date1.getFullYear()) * 12;
        return months + date2.getMonth() - date1.getMonth();
    }

    private calculateSellPropensity(
        contact: any,
        maturityLevel: MaturityLevel
    ): { sellProbability: number | null; sellSignals: PropensitySignal[] } {
        // Only calculate if we have enough data
        if (maturityLevel < MaturityLevel.PROFILING) {
            return { sellProbability: null, sellSignals: [] };
        }

        const signals: PropensitySignal[] = [];
        let probability = 0.05; // Base probability

        // Check for sell signals in intelligence snippet
        const snippet = (contact.intelligenceSnippet || '').toLowerCase();

        if (snippet.includes('selling') || snippet.includes('list')) {
            signals.push({ type: 'intent_keyword', weight: 0.15, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.15;
        }

        if (snippet.includes('appraisal') || snippet.includes('valuation')) {
            signals.push({ type: 'appraisal_request', weight: 0.25, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.25;
        }

        if (snippet.includes('downsize') || snippet.includes('relocat')) {
            signals.push({ type: 'life_event', weight: 0.15, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.15;
        }

        // Check role
        if (contact.role === 'vendor') {
            signals.push({ type: 'role_vendor', weight: 0.10, source: 'contact.role', detectedAt: new Date() });
            probability += 0.10;
        }

        // Only return if we have at least one signal
        if (signals.length === 0) {
            return { sellProbability: null, sellSignals: [] };
        }

        return {
            sellProbability: Math.min(probability, 0.95),
            sellSignals: signals,
        };
    }

    private calculateBuyPropensity(
        contact: any,
        maturityLevel: MaturityLevel
    ): { buyProbability: number | null; buySignals: PropensitySignal[] } {
        // Only calculate if we have enough data
        if (maturityLevel < MaturityLevel.PROFILING) {
            return { buyProbability: null, buySignals: [] };
        }

        const signals: PropensitySignal[] = [];
        let probability = 0.05; // Base probability

        const snippet = (contact.intelligenceSnippet || '').toLowerCase();

        if (snippet.includes('buying') || snippet.includes('looking')) {
            signals.push({ type: 'intent_keyword', weight: 0.15, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.15;
        }

        if (snippet.includes('pre-approv') || snippet.includes('loan')) {
            signals.push({ type: 'finance_ready', weight: 0.25, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.25;
        }

        if (snippet.includes('viewing') || snippet.includes('open home')) {
            signals.push({ type: 'active_viewing', weight: 0.20, source: 'intelligenceSnippet', detectedAt: new Date() });
            probability += 0.20;
        }

        if (contact.role === 'buyer') {
            signals.push({ type: 'role_buyer', weight: 0.10, source: 'contact.role', detectedAt: new Date() });
            probability += 0.10;
        }

        if (signals.length === 0) {
            return { buyProbability: null, buySignals: [] };
        }

        return {
            buyProbability: Math.min(probability, 0.95),
            buySignals: signals,
        };
    }

    private calculateChurnRisk(contact: any, eventsCount: number): number | null {
        // Churn risk is trend-based, can calculate earlier
        if (eventsCount < 5) {
            return null;
        }

        // Check last activity
        if (contact.lastActivityAt) {
            const daysSinceActivity = Math.floor(
                (Date.now() - new Date(contact.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceActivity > 60) return 0.8;
            if (daysSinceActivity > 30) return 0.5;
            if (daysSinceActivity > 14) return 0.2;
        }

        return 0.1; // Low churn risk by default
    }

    /**
     * BRAIN-FIRST: LLM-based personality prediction using DISC framework
     * Calls Gemini to analyze communication patterns and determine personality type
     */
    private async predictPersonalityWithLLM(
        name: string,
        role: string,
        intelligenceSnippet: string,
        lastActivityDetail: string
    ): Promise<{
        type: string;
        confidence: number;
        communicationTips: string[];
        detectedMarkers: string[];
    }> {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const prompt = `You are an expert psychologist specializing in the DISC personality assessment framework.
Analyze this contact's communication style and determine their DISC personality type.

Contact Information:
- Name: ${name}
- Role: ${role}
- Intelligence Summary: ${intelligenceSnippet}
- Recent Activity: ${lastActivityDetail}

DISC Types:
- D (Dominance): Direct, decisive, competitive, results-focused. Short sentences, minimal pleasantries.
- I (Influence): Enthusiastic, optimistic, collaborative, expressive. Uses exclamation marks, warm tone.
- S (Steadiness): Patient, reliable, team-oriented, good listener. Thoughtful, supportive language.
- C (Conscientiousness): Analytical, precise, quality-focused, systematic. Detailed, formal language.

Return a JSON object with exactly this structure:
{
    "type": "D" | "I" | "S" | "C",
    "confidence": 0.0-1.0,
    "communicationTips": ["tip1", "tip2", "tip3"],
    "detectedMarkers": ["marker1", "marker2"]
}

Base your confidence on how clearly the patterns match. If unclear, still provide your best guess with lower confidence.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Log token usage
        if (data.usageMetadata) {
            tokenTrackingService.log({
                source: 'oracle-personality',
                endpoint: 'generateContent',
                model: 'gemini-3-flash-preview',
                inputTokens: data.usageMetadata.promptTokenCount || 0,
                outputTokens: data.usageMetadata.candidatesTokenCount || 0,
            });
        }

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse LLM response as JSON');
        }

        const result = JSON.parse(jsonMatch[0]);
        return {
            type: result.type || 'Unknown',
            confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
            communicationTips: result.communicationTips || [],
            detectedMarkers: result.detectedMarkers || ['LLM-analyzed'],
        };
    }

    /**
     * BRAIN-FIRST: LLM-based propensity scoring
     * Calls Gemini to analyze intent signals and predict buy/sell probability
     */
    private async calculatePropensityWithLLM(
        name: string,
        role: string,
        intelligenceSnippet: string,
        deals: any[]
    ): Promise<{
        sellProbability: number | null;
        buyProbability: number | null;
        sellSignals: PropensitySignal[];
        buySignals: PropensitySignal[];
    }> {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const dealSummary = deals.length > 0
            ? deals.map(d => `${d.stage || 'unknown'} stage deal`).join(', ')
            : 'No active deals';

        const prompt = `You are a real estate market analyst. Analyze this contact and predict their likelihood to buy or sell property.

Contact Information:
- Name: ${name}
- Role: ${role}
- Intelligence Summary: ${intelligenceSnippet}
- Active Deals: ${dealSummary}

Analyze for these signals:
SELL SIGNALS: mentions of selling, listing, downsizing, relocating, appraisal requests, estate situations
BUY SIGNALS: mentions of buying, searching, pre-approval, loan discussions, viewing properties, investment intent

Return a JSON object with exactly this structure:
{
    "sellProbability": 0.0-1.0 or null if no evidence,
    "buyProbability": 0.0-1.0 or null if no evidence,
    "sellSignals": [{"type": "signal_type", "reasoning": "why"}],
    "buySignals": [{"type": "signal_type", "reasoning": "why"}]
}

Be conservative - only return non-null probabilities if there's clear evidence. Probability should reflect confidence in the prediction.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Log token usage
        if (data.usageMetadata) {
            tokenTrackingService.log({
                source: 'oracle-propensity',
                endpoint: 'generateContent',
                model: 'gemini-3-flash-preview',
                inputTokens: data.usageMetadata.promptTokenCount || 0,
                outputTokens: data.usageMetadata.candidatesTokenCount || 0,
            });
        }

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse LLM response as JSON');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Convert LLM signals to PropensitySignal format
        const sellSignals: PropensitySignal[] = (result.sellSignals || []).map((s: any) => ({
            type: s.type || 'llm_detected',
            weight: result.sellProbability || 0.5,
            source: 'llm_analysis',
            detectedAt: new Date(),
        }));

        const buySignals: PropensitySignal[] = (result.buySignals || []).map((s: any) => ({
            type: s.type || 'llm_detected',
            weight: result.buyProbability || 0.5,
            source: 'llm_analysis',
            detectedAt: new Date(),
        }));

        return {
            sellProbability: result.sellProbability !== null ? Math.min(1, Math.max(0, result.sellProbability)) : null,
            buyProbability: result.buyProbability !== null ? Math.min(1, Math.max(0, result.buyProbability)) : null,
            sellSignals,
            buySignals,
        };
    }
}

export const oracleService = new OracleService();
