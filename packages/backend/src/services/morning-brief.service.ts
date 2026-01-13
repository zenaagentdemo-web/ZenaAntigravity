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

export interface MorningBriefEmail {
    threadId: string;
    sender: string;
    subject: string;
    summary: string;
    receivedAt: string;
    suggestedAction: string;
    draftSnippet?: string;
}

export interface AwaitingReply {
    contactId: string;
    contactName: string;
    lastEmailSentAt: string;
    subject: string;
    suggestedFollowUp: string;
}

export interface MorningBrief {
    date: string;
    priorityContacts: MorningBriefContact[];
    unreadEmails: MorningBriefEmail[];
    awaitingReplies: AwaitingReply[];
    tasksDueToday: any[];
    dealEvents: any[]; // New: Auctions, settlements, conditions
    stats: {
        totalPriorityContacts: number;
        overdueTasks: number;
        nurtureTouchesDue: number;
        atRiskDeals: number;
        unreadEmails: number;
    };
    calendarSummary: any[]; // Full objects including title, time, location
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
            tasksDueToday,
            nurtureTouches,
            highRiskContacts,
            highIntentContacts,
            staleContacts,
            todayCalendar,
            unreadEmails,
            awaitingReplies,
            dealEvents
        ] = await Promise.all([
            this.getOverdueTaskContacts(userId),
            this.getTasksDueToday(userId),
            this.getNurtureTouchesDue(userId),
            this.getHighChurnRiskContacts(userId),
            this.getHighIntentContacts(userId),
            this.getStaleContacts(userId),
            this.getTodayCalendarEvents(userId, today, endOfDay),
            this.getUnreadEmails(userId),
            this.getAwaitingReplies(userId),
            this.getDealEventTriggers(userId)
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
            overdueTasks.length + tasksDueToday.length,
            unreadEmails.length
        );

        const brief: MorningBrief = {
            date: today.toISOString().split('T')[0],
            priorityContacts,
            unreadEmails,
            awaitingReplies,
            tasksDueToday,
            dealEvents,
            stats: {
                totalPriorityContacts: priorityContacts.length,
                overdueTasks: overdueTasks.length,
                nurtureTouchesDue: nurtureTouches.length,
                atRiskDeals: highRiskContacts.length,
                unreadEmails: unreadEmails.length
            },
            calendarSummary: todayCalendar,
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
     * Get today's calendar events (ALL events)
     */
    private async getTodayCalendarEvents(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.timelineEvent.findMany({
            where: {
                userId,
                entityType: 'calendar_event',
                timestamp: { gte: start, lte: end }
            },
            select: {
                summary: true,
                timestamp: true,
                content: true,
                metadata: true
            },
            orderBy: { timestamp: 'asc' }
        });
    }

    /**
     * Get critical deal flow triggers for today
     */
    private async getDealEventTriggers(userId: string): Promise<any[]> {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Fetch deals with key dates today
        const deals = await prisma.deal.findMany({
            where: {
                userId,
                OR: [
                    { auctionDate: { gte: startOfToday, lte: endOfToday } },
                    { settlementDate: { gte: startOfToday, lte: endOfToday } },
                    { tenderCloseDate: { gte: startOfToday, lte: endOfToday } },
                    { goLiveDate: { gte: startOfToday, lte: endOfToday } }
                ]
            },
            include: { property: true }
        });

        const events: any[] = [];
        for (const deal of deals) {
            if (deal.auctionDate && deal.auctionDate >= startOfToday && deal.auctionDate <= endOfToday) {
                events.push({ type: 'auction', label: 'Auction', address: deal.property?.address, date: deal.auctionDate });
            }
            if (deal.settlementDate && deal.settlementDate >= startOfToday && deal.settlementDate <= endOfToday) {
                events.push({ type: 'settlement', label: 'Settlement', address: deal.property?.address, date: deal.settlementDate });
            }
            if (deal.tenderCloseDate && deal.tenderCloseDate >= startOfToday && deal.tenderCloseDate <= endOfToday) {
                events.push({ type: 'tender', label: 'Tender Close', address: deal.property?.address, date: deal.tenderCloseDate });
            }
            if (deal.goLiveDate && deal.goLiveDate >= startOfToday && deal.goLiveDate <= endOfToday) {
                events.push({ type: 'go_live', label: 'Marketing Go-Live', address: deal.property?.address, date: deal.goLiveDate });
            }
        }

        // Check for conditions due today
        const dealsWithConditions = await prisma.deal.findMany({
            where: {
                userId,
                stage: { notIn: ['settled', 'nurture'] }
            },
            include: { property: true }
        });

        for (const deal of dealsWithConditions) {
            if (deal.conditions) {
                const conditions = deal.conditions as any[];
                for (const cond of conditions) {
                    if (cond.dueDate && !cond.satisfied) {
                        const dueDate = new Date(cond.dueDate);
                        if (dueDate >= startOfToday && dueDate <= endOfToday) {
                            events.push({
                                type: 'condition',
                                label: `Condition Due: ${cond.label || cond.title}`,
                                address: deal.property?.address,
                                date: dueDate
                            });
                        }
                    }
                }
            }
        }

        return events;
    }

    /**
     * Get unread focus emails
     */
    private async getUnreadEmails(userId: string): Promise<MorningBriefEmail[]> {
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                category: 'focus',
                OR: [
                    { lastReplyAt: null },
                    { lastMessageAt: { gt: prisma.thread.fields.lastReplyAt } }
                ]
            },
            include: {
                messages: {
                    orderBy: { sentAt: 'desc' },
                    take: 1
                }
            },
            take: 5
        });

        const result: MorningBriefEmail[] = [];
        for (const thread of threads) {
            const latestMessage = thread.messages[0];
            if (latestMessage && !latestMessage.isFromUser) {
                // Generate suggested action and draft via AI
                const prompt = `You are Zena, an elite Real Estate Chief of Staff. Analyze this unread email and provide:
1. A 1-sentence summary.
2. The recommended next action.
3. A brief draft response (1-2 sentences).

EMAIL:
From: ${JSON.stringify(latestMessage.from)}
Subject: ${thread.subject}
Body: ${latestMessage.body.substring(0, 500)}

Respond with JSON:
{
  "summary": "...",
  "suggestedAction": "...",
  "draftSnippet": "..."
}`;

                try {
                    const aiResult = await askZenaService.askBrain(prompt, { jsonMode: true });
                    const parsed = JSON.parse(aiResult);
                    // 🔥 ZENA INTEL: Persist the draft to the database so the user can "find" it in the UI
                    await prisma.thread.update({
                        where: { id: thread.id },
                        data: { draftResponse: parsed.draftSnippet }
                    });

                    result.push({
                        threadId: thread.id,
                        sender: (latestMessage.from as any).name || (latestMessage.from as any).email || 'Unknown',
                        subject: thread.subject,
                        summary: parsed.summary,
                        receivedAt: latestMessage.receivedAt.toISOString(),
                        suggestedAction: parsed.suggestedAction,
                        draftSnippet: parsed.draftSnippet
                    });
                } catch (e) {
                    result.push({
                        threadId: thread.id,
                        sender: (latestMessage.from as any).name || 'Unknown',
                        subject: thread.subject,
                        summary: thread.summary,
                        receivedAt: latestMessage.receivedAt.toISOString(),
                        suggestedAction: 'Reply to client'
                    });
                }
            }
        }
        return result;
    }

    /**
     * Get emails we sent but haven't received a reply for > 24h
     */
    private async getAwaitingReplies(userId: string): Promise<AwaitingReply[]> {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const threads = await prisma.thread.findMany({
            where: {
                userId,
                category: 'focus',
                lastMessageAt: { lt: twentyFourHoursAgo },
                messages: {
                    some: {
                        isFromUser: true,
                        sentAt: { lt: twentyFourHoursAgo }
                    }
                }
            },
            include: {
                messages: {
                    orderBy: { sentAt: 'desc' },
                    take: 1
                }
            },
            take: 5
        });

        const result: AwaitingReply[] = [];
        for (const thread of threads) {
            const latestMessage = thread.messages[0];
            if (latestMessage && latestMessage.isFromUser) {
                // It's been > 24h since our last message and NO new message has arrived
                result.push({
                    contactId: '', // Would need to resolve contact from participants
                    contactName: (thread.participants as any[])[0]?.name || 'Client',
                    lastEmailSentAt: latestMessage.sentAt.toISOString(),
                    subject: thread.subject,
                    suggestedFollowUp: `Follow up on "${thread.subject}" (last sent ${Math.floor((Date.now() - latestMessage.sentAt.getTime()) / (1000 * 60 * 60 * 24))} days ago)`
                });
            }
        }
        return result;
    }

    /**
     * Get tasks due today
     */
    private async getTasksDueToday(userId: string): Promise<any[]> {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        return prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                dueDate: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            },
            orderBy: { dueDate: 'asc' }
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
        taskCount: number,
        emailCount: number
    ): Promise<string> {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

        if (emailCount > 0) {
            return `Good ${timeOfDay}! You've got ${emailCount} new emails that need your attention. I've already drafted some replies for you.`;
        } else if (taskCount > 3) {
            return `Good ${timeOfDay}! Busy day with ${taskCount} tasks on your plate. Let's get through them.`;
        } else if (meetingCount > 2) {
            return `Good ${timeOfDay}! Packed schedule with ${meetingCount} meetings. I'll help you prep for each one.`;
        } else {
            return `Good ${timeOfDay}! Everything looks under control. Here's a quick rundown for you.`;
        }
    }
}

export const morningBriefService = new MorningBriefService();
