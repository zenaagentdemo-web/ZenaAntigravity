/**
 * Contact Categorization Service
 * 
 * BRAIN-FIRST: AI-powered service that assigns contacts to one of 4 Zena Intelligence categories
 * using LLM analysis instead of simple threshold heuristics:
 * - PULSE: Default for active contacts in normal engagement
 * - HOT_LEAD: High engagement, recent activity, strong buying/selling signals
 * - COLD_NURTURE: Low engagement 30+ days, needs re-engagement
 * - HIGH_INTENT: Explicit buying/selling intent (viewings, offers, pre-approvals)
 */

import { PrismaClient, ZenaCategory } from '@prisma/client';
import { websocketService } from './websocket.service.js';
import { askZenaService } from './ask-zena.service.js';

const prisma = new PrismaClient();

// LLM API configuration

// Intent keywords that indicate HIGH_INTENT category
const HIGH_INTENT_KEYWORDS = [
    'pre-approval',
    'pre approval',
    'preapproval',
    'ready to buy',
    'ready to sell',
    'actively searching',
    'actively looking',
    'urgently seeking',
    'want to purchase',
    'looking to purchase',
    'making an offer',
    'submitted offer',
    'conditional offer',
    'unconditional',
    'settlement date',
    'finance approved',
    'first home buyer',
    'first-home buyer',
    'downsizing',
    'must sell',
    'motivated seller',
    'motivated buyer'
];

// Deal stages that indicate HIGH_INTENT
const HIGH_INTENT_DEAL_STAGES = ['viewing', 'offer', 'conditional', 'pre_settlement'];

export interface CategorizationSignals {
    engagementScore: number;        // 0-100 engagement score
    momentum: number;               // -100 to +100 momentum
    activityCount7d: number;        // Activities in last 7 days
    daysSinceActivity: number;      // Days since last activity
    dealStages: string[];           // Active deal stages for this contact
    intelligenceSnippet?: string;   // AI-generated intelligence text
    role: string;                   // Contact role
}

export interface CategorizationResult {
    category: ZenaCategory;
    confidence: number;             // 0-1 confidence score
    reason: string;                 // Human-readable explanation
}

class ContactCategorizationService {

    /**
     * Determine category from behavioral signals
     */
    getCategoryFromSignals(signals: CategorizationSignals): CategorizationResult {
        const {
            engagementScore,
            momentum,
            activityCount7d,
            daysSinceActivity,
            dealStages,
            intelligenceSnippet,
            role
        } = signals;

        const snippetLower = (intelligenceSnippet || '').toLowerCase();

        // 1. Check for HIGH_INTENT first (explicit signals are strongest)
        const hasIntentDealStage = dealStages.some(stage =>
            HIGH_INTENT_DEAL_STAGES.includes(stage)
        );

        const hasIntentKeywords = HIGH_INTENT_KEYWORDS.some(keyword =>
            snippetLower.includes(keyword)
        );

        if (hasIntentDealStage || hasIntentKeywords) {
            const confidence = hasIntentDealStage ? 0.95 : 0.85;
            const reason = hasIntentDealStage
                ? `Active deal in ${dealStages.find(s => HIGH_INTENT_DEAL_STAGES.includes(s))} stage`
                : 'Intent signals detected in intelligence';

            return {
                category: ZenaCategory.HIGH_INTENT,
                confidence,
                reason
            };
        }

        // 2. Check for HOT_LEAD (high activity + engagement)
        const isHotLead = activityCount7d >= 3 && (engagementScore > 75 || momentum > 20);

        if (isHotLead) {
            const confidence = Math.min(0.95, 0.7 + (engagementScore / 100) * 0.25);
            return {
                category: ZenaCategory.HOT_LEAD,
                confidence,
                reason: `High activity (${activityCount7d} in 7d) with ${engagementScore}% engagement`
            };
        }

        // 3. Check for COLD_NURTURE (dormant contacts)
        const isColdNurture = daysSinceActivity > 30 && engagementScore < 40;

        if (isColdNurture) {
            const confidence = Math.min(0.9, 0.6 + (daysSinceActivity / 90) * 0.3);
            return {
                category: ZenaCategory.COLD_NURTURE,
                confidence,
                reason: `Dormant for ${daysSinceActivity} days with ${engagementScore}% engagement`
            };
        }

        // 4. Default to PULSE
        return {
            category: ZenaCategory.PULSE,
            confidence: 0.7,
            reason: 'Active contact in normal engagement cycle'
        };
    }

    /**
     * Categorize a single contact based on their activity and signals
     * BRAIN-FIRST: Uses LLM for intelligent categorization with heuristic fallback
     */
    async categorizeContact(contactId: string): Promise<CategorizationResult> {
        try {
            const contact = await prisma.contact.findUnique({
                where: { id: contactId },
                include: {
                    deals: {
                        select: { stage: true }
                    }
                }
            });

            if (!contact) {
                throw new Error(`Contact ${contactId} not found`);
            }

            // Calculate signals from contact data
            const signals = await this.calculateSignals(contact);

            // BRAIN-FIRST: Try LLM categorization first
            let result: CategorizationResult;
            try {
                result = await this.categorizeWithLLM(contact, signals);
                console.log(`[Categorization] LLM categorized ${contact.name}: ${result.category}`);
            } catch (llmError) {
                console.warn('[Categorization] LLM categorization failed, using heuristic fallback:', llmError);
                // Fallback to heuristic-based categorization
                result = this.getCategoryFromSignals(signals);
            }

            // Update contact with new category
            await prisma.contact.update({
                where: { id: contactId },
                data: {
                    zenaCategory: result.category,
                    categorizedAt: new Date(),
                    categoryConfidence: result.confidence
                }
            });

            // Broadcast update via WebSocket
            websocketService.broadcastToUser(contact.userId, 'contact.categorized', {
                contactId,
                zenaCategory: result.category,
                confidence: result.confidence,
                reason: result.reason
            });

            // Also broadcast detailed engagement metrics
            websocketService.broadcastContactEngagement(contact.userId, {
                contactId,
                engagementScore: signals.engagementScore,
                momentum: signals.momentum,
                dealStage: signals.dealStages[0] || null,
                nextBestAction: this.determineNextBestAction(signals)
            });

            console.log(`[Categorization] ${contact.name}: ${result.category} (${(result.confidence * 100).toFixed(0)}% confidence) - ${result.reason}`);

            return result;
        } catch (error) {
            console.error(`Error categorizing contact ${contactId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate behavioral signals for a contact
     */
    private async calculateSignals(contact: any): Promise<CategorizationSignals> {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Count timeline events in last 7 days
        const recentEvents = await prisma.timelineEvent.count({
            where: {
                entityType: 'contact',
                entityId: contact.id,
                timestamp: { gte: sevenDaysAgo }
            }
        });

        // Calculate days since last activity
        const lastActivity = contact.lastActivityAt || contact.updatedAt || contact.createdAt;
        const daysSinceActivity = Math.floor(
            (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
        );

        // Get deal stages
        const dealStages = contact.deals?.map((d: any) => d.stage) || [];

        // Calculate engagement score (simplified version)
        // In production, this could use the full ContactEngagementScorer logic
        const engagementScore = this.calculateQuickEngagementScore(contact, recentEvents);

        // Calculate momentum based on activity trend
        const momentum = this.calculateMomentum(contact, recentEvents, daysSinceActivity);

        return {
            engagementScore,
            momentum,
            activityCount7d: recentEvents,
            daysSinceActivity,
            dealStages,
            intelligenceSnippet: contact.intelligenceSnippet || '',
            role: contact.role
        };
    }

    /**
     * Quick engagement score calculation
     */
    private calculateQuickEngagementScore(contact: any, recentActivity: number): number {
        let score = 0;

        // Profile completeness (30 points max)
        if (contact.name) score += 10;
        if (contact.emails?.length > 0) score += 10;
        if (contact.phones?.length > 0) score += 10;

        // Recent activity (40 points max)
        score += Math.min(40, recentActivity * 10);

        // Has deals (20 points max)
        if (contact.deals?.length > 0) score += 20;

        // Has intelligence (10 points)
        if (contact.intelligenceSnippet) score += 10;

        return Math.min(100, score);
    }

    /**
     * Calculate momentum score
     */
    private calculateMomentum(contact: any, recentActivity: number, daysSinceActivity: number): number {
        // If very recent activity, positive momentum
        if (daysSinceActivity < 3 && recentActivity > 2) return 30;
        if (daysSinceActivity < 7 && recentActivity > 0) return 15;

        // If no activity but updated recently, neutral
        if (daysSinceActivity < 14) return 0;

        // Declining momentum for older contacts
        if (daysSinceActivity < 30) return -15;
        return -30;
    }

    /**
     * Determine next best action based on signals
     */
    private determineNextBestAction(signals: CategorizationSignals): string {
        const { engagementScore, daysSinceActivity, dealStages, role } = signals;

        // High priority: Unresponsive with active deal
        if (dealStages.length > 0 && daysSinceActivity > 3) {
            return 'Follow up on deal progress';
        }

        // Re-engagement
        if (engagementScore < 30 && daysSinceActivity > 30) {
            return `Send '${role === 'vendor' ? 'Market Update' : 'Just Listed'}' campaign`;
        }

        // Hot lead acceleration
        if (engagementScore > 80 && dealStages.length === 0) {
            return 'Propose meeting or appraisal';
        }

        // Nurture
        if (role === 'buyer' && engagementScore > 50) {
            return 'Share new property matches';
        }

        // Default
        return 'Review timeline and needs';
    }

    /**
     * Recategorize all contacts for a user
     */
    async recategorizeAllForUser(userId: string): Promise<{ updated: number; categories: Record<ZenaCategory, number> }> {
        const contacts = await prisma.contact.findMany({
            where: { userId },
            include: {
                deals: { select: { stage: true } }
            }
        });

        const categories: Record<ZenaCategory, number> = {
            [ZenaCategory.PULSE]: 0,
            [ZenaCategory.HOT_LEAD]: 0,
            [ZenaCategory.COLD_NURTURE]: 0,
            [ZenaCategory.HIGH_INTENT]: 0
        };

        for (const contact of contacts) {
            try {
                const result = await this.categorizeContact(contact.id);
                categories[result.category]++;
            } catch (error) {
                console.error(`Failed to categorize contact ${contact.id}:`, error);
            }
        }

        console.log(`[Categorization] Recategorized ${contacts.length} contacts for user ${userId}`);
        console.log(`  HOT_LEAD: ${categories.HOT_LEAD}, HIGH_INTENT: ${categories.HIGH_INTENT}, COLD_NURTURE: ${categories.COLD_NURTURE}, PULSE: ${categories.PULSE}`);

        return { updated: contacts.length, categories };
    }

    /**
     * BRAIN-FIRST: LLM-based contact categorization
     * Uses Gemini to analyze the full context and determine the best category
     */
    private async categorizeWithLLM(contact: any, signals: CategorizationSignals): Promise<CategorizationResult> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const dealStagesText = signals.dealStages.length > 0
            ? signals.dealStages.join(', ')
            : 'No active deals';

        const prompt = `You are a real estate CRM intelligence system. Analyze this contact and categorize them into exactly one of these 4 categories:

CATEGORIES:
- HIGH_INTENT: Contact is actively buying/selling NOW. Has explicit intent signals like pre-approval, active viewings, submitted offers, or settlement dates.
- HOT_LEAD: High engagement contact who is very likely to transact soon. Strong activity in the last 7 days, high engagement scores, or positive momentum.
- COLD_NURTURE: Dormant contact who needs re-engagement. No activity in 30+ days, low engagement, or showing signs of disengagement.
- PULSE: Active contact in normal engagement cycle. Neither hot nor cold, just regular relationship maintenance.

CONTACT DATA:
- Name: ${contact.name}
- Role: ${contact.role}
- Intelligence Summary: ${contact.intelligenceSnippet || 'No intelligence available'}
- Active Deals: ${dealStagesText}
- Engagement Score: ${signals.engagementScore}%
- Momentum: ${signals.momentum >= 0 ? '+' : ''}${signals.momentum}%
- Activities in last 7 days: ${signals.activityCount7d}
- Days since last activity: ${signals.daysSinceActivity}

Return a JSON object with exactly this structure:
{
    "category": "HIGH_INTENT" | "HOT_LEAD" | "COLD_NURTURE" | "PULSE",
    "confidence": 0.0-1.0,
    "reason": "Brief explanation of why this category was chosen"
}

Be accurate and conservative - only use HIGH_INTENT or HOT_LEAD if there's clear evidence.`;

        const text = await askZenaService.askBrain(prompt, {
            temperature: 0.2,
            jsonMode: true,
            systemPrompt: 'You are an intelligent contact categorization engine for a Real Estate CRM. Your job is to analyze contact behavior and assign precise categories based on engagement signals.'
        });

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse LLM response as JSON');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Validate and map category
        const validCategories = ['HIGH_INTENT', 'HOT_LEAD', 'COLD_NURTURE', 'PULSE'];
        const category = validCategories.includes(result.category)
            ? result.category as ZenaCategory
            : ZenaCategory.PULSE;

        return {
            category,
            confidence: Math.min(1, Math.max(0, result.confidence || 0.7)),
            reason: result.reason || 'LLM-analyzed categorization'
        };
    }
}

export const contactCategorizationService = new ContactCategorizationService();
