import prisma from '../config/database.js';

export interface EngagementStats {
    engagementScore: number;
    momentum: number;
    dealStage: string | null;
    activityCount7d: number;
    nextBestAction: string;
    reasoning?: string;
    daysSinceActivity: number;
}

class NeuralScorerService {
    /**
     * Calculate detailed engagement signals for a contact
     * Consolidates logic from AskZenaService and ContactsController
     */
    async calculateEngagement(contactId: string): Promise<EngagementStats> {
        try {
            const contact = await prisma.contact.findUnique({
                where: { id: contactId },
                include: {
                    deals: {
                        orderBy: { updatedAt: 'desc' },
                        take: 1
                    }
                }
            });

            if (!contact) {
                throw new Error('Contact not found');
            }

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // Get recent timeline events
            const recentEvents = await prisma.timelineEvent.findMany({
                where: {
                    entityType: 'contact',
                    entityId: contactId,
                    timestamp: { gte: fourteenDaysAgo }
                },
                orderBy: { timestamp: 'desc' }
            });

            const events7d = recentEvents.filter(e => e.timestamp >= sevenDaysAgo).length;
            const events14d = recentEvents.length;
            const eventsPrevWeek = events14d - events7d;

            // Calculate days since last activity
            const lastActivity = contact.lastActivityAt || contact.updatedAt || contact.createdAt;
            const daysSinceActivity = Math.floor(
                (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
            );

            const dealStage = contact.deals?.[0]?.stage || null;

            // --- SCORING ALGORITHM ---
            let score = 0;

            // 1. Profile completeness (20 points)
            if (contact.name) score += 5;
            if (contact.emails.length > 0) score += 8;
            if (contact.phones.length > 0) score += 5;
            if (contact.role && contact.role !== 'other') score += 2;

            // 2. Recent activity (30 points)
            score += Math.min(30, events7d * 6);

            // 3. Engagement depth (25 points)
            const notes = (contact.relationshipNotes as any[]) || [];
            score += Math.min(25, notes.length * 5);

            // 4. Deal stage bonus (25 points)
            if (dealStage === 'offer' || dealStage === 'conditional') score += 25;
            else if (dealStage === 'viewing') score += 20;
            else if (dealStage === 'qualified') score += 15;
            else if (dealStage === 'lead') score += 10;

            // 5. Brain Intelligence Bonus (Up to 15 points)
            const intel = (contact.intelligenceSnippet || '').toLowerCase();
            if (intel.includes('asap') || intel.includes('high urgency') || intel.includes('ready to buy')) {
                score += 15;
            } else if (intel.includes('active') || intel.includes('searching')) {
                score += 8;
            }

            score = Math.min(100, score);

            // --- MOMENTUM ---
            let momentum = 0;
            if (eventsPrevWeek > 0) {
                momentum = Math.round(((events7d - eventsPrevWeek) / eventsPrevWeek) * 100);
            } else if (events7d > 0) {
                momentum = 50; // New activity from zero
            } else if (daysSinceActivity > 14) {
                momentum = -Math.min(50, Math.floor(daysSinceActivity / 7) * 10);
            }
            momentum = Math.max(-100, Math.min(100, momentum));

            // --- NEXT BEST ACTION ---
            let nextBestAction = 'Schedule a check-in call';
            if (events7d === 0 && daysSinceActivity > 7) {
                nextBestAction = 'Send a touchpoint email - engagement dropping';
            } else if (contact.role === 'buyer' && dealStage === 'viewing') {
                nextBestAction = 'Follow up on recent viewings';
            } else if (contact.role === 'vendor') {
                nextBestAction = 'Provide campaign update';
            } else if (score < 30) {
                nextBestAction = 'Complete profile information';
            }

            return {
                engagementScore: score,
                momentum,
                dealStage,
                activityCount7d: events7d,
                daysSinceActivity,
                nextBestAction,
                reasoning: contact.engagementReasoning || undefined
            };
        } catch (error) {
            console.error('[NeuralScorer] Error:', error);
            return {
                engagementScore: 50,
                momentum: 0,
                dealStage: null,
                activityCount7d: 0,
                daysSinceActivity: 0,
                nextBestAction: 'Add more contact information'
            };
        }
    }

    /**
     * Calculate batch engagement for multiple contacts
     * Optimized to avoid N+1 queries where possible
     */
    async calculateBatch(userId: string, contactIds: string[]): Promise<Record<string, EngagementStats>> {
        try {
            const contacts = await prisma.contact.findMany({
                where: {
                    id: { in: contactIds },
                    userId
                },
                include: {
                    deals: {
                        orderBy: { updatedAt: 'desc' },
                        take: 1
                    }
                }
            });

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // Get timeline events for all contacts in one go
            const timelineEvents = await prisma.timelineEvent.findMany({
                where: {
                    entityType: 'contact',
                    entityId: { in: contactIds },
                    timestamp: { gte: fourteenDaysAgo }
                }
            });

            // Group events by contact
            const eventsByContact: Record<string, any[]> = {};
            timelineEvents.forEach(event => {
                if (!eventsByContact[event.entityId]) eventsByContact[event.entityId] = [];
                eventsByContact[event.entityId].push(event);
            });

            const engagementData: Record<string, EngagementStats> = {};

            for (const contact of contacts) {
                const contactEvents = eventsByContact[contact.id] || [];
                const events7d = contactEvents.filter(e => e.timestamp >= sevenDaysAgo).length;
                const events14d = contactEvents.length;
                const eventsPrevWeek = events14d - events7d;

                const lastActivity = contact.lastActivityAt || contact.updatedAt || contact.createdAt;
                const daysSinceActivity = Math.floor(
                    (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
                );

                const dealStage = contact.deals?.[0]?.stage || null;

                // Reuse the same logic as single calculation
                // Profile completeness (20 pts)
                let score = 0;
                if (contact.name) score += 5;
                if (contact.emails.length > 0) score += 8;
                if (contact.phones.length > 0) score += 5;
                if (contact.role && contact.role !== 'other') score += 2;
                score += Math.min(30, events7d * 6);
                const notes = (contact.relationshipNotes as any[]) || [];
                score += Math.min(25, notes.length * 5);
                if (dealStage === 'offer' || dealStage === 'conditional') score += 25;
                else if (dealStage === 'viewing') score += 20;
                else if (dealStage === 'qualified') score += 15;
                else if (dealStage === 'lead') score += 10;

                const intel = (contact.intelligenceSnippet || '').toLowerCase();
                if (intel.includes('asap') || intel.includes('high urgency') || intel.includes('ready to buy')) {
                    score += 15;
                }

                score = Math.min(100, score);

                let momentum = 0;
                if (eventsPrevWeek > 0) {
                    momentum = Math.round(((events7d - eventsPrevWeek) / eventsPrevWeek) * 100);
                } else if (events7d > 0) {
                    momentum = 50;
                } else if (daysSinceActivity > 14) {
                    momentum = -Math.min(50, Math.floor(daysSinceActivity / 7) * 10);
                }
                momentum = Math.max(-100, Math.min(100, momentum));

                let nextBestAction = 'Schedule a check-in call';
                if (events7d === 0 && daysSinceActivity > 7) {
                    nextBestAction = 'Send a touchpoint email - engagement dropping';
                } else if (contact.role === 'buyer' && dealStage === 'viewing') {
                    nextBestAction = 'Follow up on recent viewings';
                } else if (contact.role === 'vendor') {
                    nextBestAction = 'Provide campaign update';
                }

                engagementData[contact.id] = {
                    engagementScore: score,
                    momentum,
                    dealStage,
                    activityCount7d: events7d,
                    daysSinceActivity,
                    nextBestAction,
                    reasoning: contact.engagementReasoning || undefined
                };
            }

            return engagementData;
        } catch (error) {
            console.error('[NeuralScorer] Batch Error:', error);
            return {};
        }
    }
}

export const neuralScorerService = new NeuralScorerService();
