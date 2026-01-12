/**
 * Morning Brief Service - Next Best Contact Prioritization
 * 
 * Generates a prioritized list of contacts to reach out to each morning,
 * with AI-generated coaching tips for each one.
 */

import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { nurtureService } from './nurture.service.js';
import { logger } from './logger.service.js';

export interface MorningBriefContact {
    contactId: string;
    name: string;
    email: string;
    role: string;
    reason: string;           // "Overdue task: Follow up on finance"
    coachingTip: string;      // AI-generated personalized tip
    score: number;            // Priority score (higher = more urgent)
    category: string;         // 'task' | 'nurture' | 'churn_risk' | 'high_intent' | 'stale'
    linkedDealId?: string;
    linkedPropertyAddress?: string;
}

export interface MorningBrief {
    date: string;
    priorityContacts: MorningBriefContact[];
    stats: {
        totalPriorityContacts: number;
        overdueTasks: number;
        nurtureTouchesDue: number;
        atRiskDeals: number;
    };
    calendarSummary: string[];
    aiGreeting: string;
}

export class MorningBriefService {
    /**
     * Generate the morning brief for a user
     */
    async generateMorningBrief(userId: string): Promise<MorningBrief> {
        logger.info(`[MorningBriefService] Generating morning brief for user ${userId}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Gather all priority signals in parallel
        const [
            overdueTasks,
            nurtureTouches,
            highRiskContacts,
            highIntentContacts,
            staleContacts,
            todayCalendar
        ] = await Promise.all([
            this.getOverdueTaskContacts(userId),
            this.getNurtureTouchesDue(userId),
            this.getHighChurnRiskContacts(userId),
            this.getHighIntentContacts(userId),
            this.getStaleContacts(userId),
            this.getTodayCalendarEvents(userId, today, endOfDay)
        ]);

        // Score and deduplicate contacts
        const contactScores = new Map<string, MorningBriefContact>();

        // Process overdue tasks (highest priority)
        for (const item of overdueTasks) {
            this.addOrUpdateContact(contactScores, {
                contactId: item.contactId,
                name: item.contactName,
                email: item.contactEmail,
                role: item.contactRole,
                reason: `Overdue task: ${item.taskLabel}`,
                coachingTip: '', // Will be generated later
                score: 100,
                category: 'task',
                linkedDealId: item.dealId,
                linkedPropertyAddress: item.propertyAddress
            });
        }

        // Process nurture touches due
        for (const touch of nurtureTouches) {
            this.addOrUpdateContact(contactScores, {
                contactId: touch.contactId!,
                name: touch.contactName,
                email: touch.contactEmail,
                role: 'client',
                reason: `Nurture touch due: ${touch.label}`,
                coachingTip: '',
                score: 80,
                category: 'nurture',
                linkedPropertyAddress: touch.propertyAddress
            });
        }

        // Process high churn risk contacts
        for (const contact of highRiskContacts) {
            this.addOrUpdateContact(contactScores, {
                contactId: contact.id,
                name: contact.name,
                email: contact.emails[0] || '',
                role: contact.role,
                reason: `High churn risk (${Math.round((contact.prediction?.churnRisk || 0) * 100)}%)`,
                coachingTip: '',
                score: 50,
                category: 'churn_risk'
            });
        }

        // Process high intent contacts
        for (const contact of highIntentContacts) {
            const intent = contact.prediction?.sellProbability! > contact.prediction?.buyProbability!
                ? 'sell'
                : 'buy';
            const probability = Math.max(
                contact.prediction?.sellProbability || 0,
                contact.prediction?.buyProbability || 0
            );
            this.addOrUpdateContact(contactScores, {
                contactId: contact.id,
                name: contact.name,
                email: contact.emails[0] || '',
                role: contact.role,
                reason: `High ${intent} intent (${Math.round(probability * 100)}%)`,
                coachingTip: '',
                score: 40,
                category: 'high_intent'
            });
        }

        // Process stale contacts (no contact in 7+ days)
        for (const contact of staleContacts) {
            const daysSince = contact.daysSinceContact;
            this.addOrUpdateContact(contactScores, {
                contactId: contact.id,
                name: contact.name,
                email: contact.emails[0] || '',
                role: contact.role,
                reason: `No contact in ${daysSince} days`,
                coachingTip: '',
                score: 30,
                category: 'stale'
            });
        }

        // Sort by score and take top 10
        const priorityContacts = Array.from(contactScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // Generate AI coaching tips for top 5
        const topContacts = priorityContacts.slice(0, 5);
        if (topContacts.length > 0) {
            const tipsMap = await this.generateCoachingTips(topContacts);
            for (const contact of priorityContacts) {
                if (tipsMap.has(contact.contactId)) {
                    contact.coachingTip = tipsMap.get(contact.contactId)!;
                }
            }
        }

        // Generate AI greeting
        const aiGreeting = await this.generateGreeting(
            priorityContacts.length,
            todayCalendar.length,
            overdueTasks.length
        );

        const brief: MorningBrief = {
            date: today.toISOString().split('T')[0],
            priorityContacts,
            stats: {
                totalPriorityContacts: priorityContacts.length,
                overdueTasks: overdueTasks.length,
                nurtureTouchesDue: nurtureTouches.length,
                atRiskDeals: highRiskContacts.length
            },
            calendarSummary: todayCalendar.map(e => e.summary),
            aiGreeting
        };

        logger.info(`[MorningBriefService] Generated brief with ${priorityContacts.length} priority contacts`);
        return brief;
    }

    /**
     * Add or update a contact in the scores map
     */
    private addOrUpdateContact(
        map: Map<string, MorningBriefContact>,
        contact: MorningBriefContact
    ): void {
        const existing = map.get(contact.contactId);
        if (existing) {
            // Combine scores and reasons
            existing.score += contact.score;
            if (!existing.reason.includes(contact.reason.split(':')[0])) {
                existing.reason += ` + ${contact.reason}`;
            }
        } else {
            map.set(contact.contactId, contact);
        }
    }

    /**
     * Get contacts with overdue tasks
     */
    private async getOverdueTaskContacts(userId: string): Promise<Array<{
        contactId: string;
        contactName: string;
        contactEmail: string;
        contactRole: string;
        taskLabel: string;
        dealId?: string;
        propertyAddress?: string;
    }>> {
        const now = new Date();
        const tasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                contactId: { not: null },
                dueDate: { lt: now }
            },
            include: {
                // Need to manually join since Prisma doesn't have direct relation
            }
        });

        const result: Array<{
            contactId: string;
            contactName: string;
            contactEmail: string;
            contactRole: string;
            taskLabel: string;
            dealId?: string;
            propertyAddress?: string;
        }> = [];

        for (const task of tasks) {
            if (task.contactId) {
                const contact = await prisma.contact.findUnique({
                    where: { id: task.contactId }
                });
                if (contact) {
                    result.push({
                        contactId: contact.id,
                        contactName: contact.name,
                        contactEmail: contact.emails[0] || '',
                        contactRole: contact.role,
                        taskLabel: task.label,
                        dealId: task.dealId || undefined,
                        propertyAddress: undefined
                    });
                }
            }
        }
        return result;
    }

    /**
     * Get nurture touches due today or overdue
     */
    private async getNurtureTouchesDue(userId: string): Promise<Array<{
        contactId: string;
        contactName: string;
        contactEmail: string;
        propertyAddress: string;
        label: string;
    }>> {
        const touches = await nurtureService.getPendingTouches(userId);
        return touches.map(t => ({
            contactId: t.id, // Note: This is the touch ID, we need contact ID
            contactName: t.contactName,
            contactEmail: t.contactEmail,
            propertyAddress: t.propertyAddress,
            label: t.label
        }));
    }

    /**
     * Get contacts with high churn risk
     */
    private async getHighChurnRiskContacts(userId: string): Promise<any[]> {
        return prisma.contact.findMany({
            where: {
                userId,
                prediction: {
                    churnRisk: { gte: 0.6 }
                }
            },
            include: { prediction: true },
            take: 10
        });
    }

    /**
     * Get contacts with high buy/sell intent
     */
    private async getHighIntentContacts(userId: string): Promise<any[]> {
        return prisma.contact.findMany({
            where: {
                userId,
                OR: [
                    { zenaCategory: 'HIGH_INTENT' },
                    { zenaCategory: 'HOT_LEAD' }
                ]
            },
            include: { prediction: true },
            take: 10
        });
    }

    /**
     * Get contacts with no recent activity
     */
    private async getStaleContacts(userId: string): Promise<Array<any & { daysSinceContact: number }>> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const contacts = await prisma.contact.findMany({
            where: {
                userId,
                OR: [
                    { lastActivityAt: { lt: sevenDaysAgo } },
                    { lastActivityAt: null }
                ],
                role: { in: ['buyer', 'vendor'] } // Only active roles
            },
            take: 10
        });

        return contacts.map(c => ({
            ...c,
            daysSinceContact: c.lastActivityAt
                ? Math.floor((Date.now() - c.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
                : 30
        }));
    }

    /**
     * Get today's calendar events
     */
    private async getTodayCalendarEvents(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.timelineEvent.findMany({
            where: {
                userId,
                entityType: 'calendar_event',
                timestamp: { gte: start, lte: end }
            },
            orderBy: { timestamp: 'asc' }
        });
    }

    /**
     * Generate AI coaching tips for priority contacts
     */
    private async generateCoachingTips(contacts: MorningBriefContact[]): Promise<Map<string, string>> {
        const contactSummaries = contacts.map(c =>
            `- ${c.name} (${c.role}): ${c.reason}`
        ).join('\n');

        const prompt = `You are Zena, a real estate AI coach. Generate brief, actionable coaching tips for each contact.

Priority Contacts:
${contactSummaries}

For each contact, provide ONE sentence of tactical advice (e.g., "Open with congratulations on their new job before discussing the listing" or "They respond better to morning calls - try 9am").

Respond with JSON:
{
  "tips": {
    "ContactName1": "tip...",
    "ContactName2": "tip..."
  }
}`;

        try {
            const response = await askZenaService.askBrain(prompt, {
                temperature: 0.7,
                jsonMode: true
            });

            const parsed = JSON.parse(response);
            const tipsMap = new Map<string, string>();

            // Map tips back to contact IDs
            for (const contact of contacts) {
                const tip = parsed.tips?.[contact.name];
                if (tip) {
                    tipsMap.set(contact.contactId, tip);
                }
            }

            return tipsMap;
        } catch (error) {
            logger.error('[MorningBriefService] Failed to generate coaching tips:', error);
            return new Map();
        }
    }

    /**
     * Generate personalized morning greeting
     */
    private async generateGreeting(
        contactCount: number,
        meetingCount: number,
        overdueCount: number
    ): Promise<string> {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

        if (overdueCount > 3) {
            return `Good ${timeOfDay}! You've got ${overdueCount} overdue items—let's tackle them first.`;
        } else if (meetingCount > 2) {
            return `Good ${timeOfDay}! Busy day ahead with ${meetingCount} meetings. Here's who to prioritise in between.`;
        } else if (contactCount === 0) {
            return `Good ${timeOfDay}! Your priority list is clear—great time to nurture your pipeline.`;
        } else {
            return `Good ${timeOfDay}! Here are your ${contactCount} priority contacts for today.`;
        }
    }
}

export const morningBriefService = new MorningBriefService();
