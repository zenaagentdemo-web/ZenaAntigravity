/**
 * Inbox Actions Service
 * 
 * Generates autonomous actions for the Inbox module:
 * - Draft replies to emails
 * - Suggest archive for noise/spam
 * - Extract calendar events from emails
 * - Flag urgent emails
 */

import { askZenaService } from './ask-zena.service.js';
import { godmodeService, GodmodeMode } from './godmode.service.js';
import prisma from '../config/database.js';

export interface InboxActionSuggestion {
    featureKey: string;
    threadId: string;
    actionType: string;
    title: string;
    description: string;
    draftSubject?: string;
    draftBody?: string;
    priority: number;
    reasoning: string;
}

class InboxActionsService {

    /**
     * Generate a reply draft for a thread
     */
    async generateReplyDraft(threadId: string, userId: string): Promise<InboxActionSuggestion | null> {
        const featureKey = 'inbox:draft_reply';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return null;
        }

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: {
                messages: { orderBy: { receivedAt: 'desc' }, take: 3 },
            },
        });

        if (!thread || thread.messages.length === 0) {
            return null;
        }

        const latestEmail = thread.messages[0];
        const participants = thread.participants as any[] || [];
        const externalParticipant = participants.find(p => p.email !== 'agent@zena.ai'); // Assuming agent email
        const contactName = externalParticipant?.name || 'the sender';

        // Fetch property context if linked
        let propertyContext = '';
        if (thread.propertyId) {
            const property = await prisma.property.findUnique({ where: { id: thread.propertyId } });
            if (property) {
                propertyContext = `Property: ${property.address} (Status: ${property.status}, Price: $${property.listingPrice})`;
            }
        }

        // Generate draft using Zena Brain
        const prompt = `Draft a professional reply to this email from ${contactName}.
        
Subject: ${thread.subject}
Latest Message: ${latestEmail.body?.substring(0, 500) || latestEmail.bodyHtml?.substring(0, 500)}
${propertyContext ? `\nRelated ${propertyContext}` : ''}

Context: This is a real estate professional responding to a client. 
Tone: Warm, professional, NZ style.
Keep it concise (max 4 sentences).
Only output the email body, no subject line.`;

        const draftBody = await askZenaService.askBrain(prompt, {
            jsonMode: false,
            systemPrompt: 'You are Zena, an AI assistant for a real estate agent. Write only the email reply body.'
        });

        return {
            featureKey,
            threadId,
            actionType: 'send_email',
            title: `Reply to ${contactName}: "${thread.subject}"`,
            description: `Draft a response to the latest email in this thread. AI has analyzed the context and generated a professional reply.`,
            draftSubject: `Re: ${thread.subject}`,
            draftBody,
            priority: 7,
            reasoning: `Email from ${contactName} requires a response. AI-generated draft ready for review.`,
        };
    }

    /**
     * Suggest threads to archive (noise/spam)
     */
    async suggestArchiveActions(userId: string): Promise<InboxActionSuggestion[]> {
        const featureKey = 'inbox:archive_noise';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return [];
        }

        // Find threads that look like marketing/noise
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                classification: { in: ['marketing', 'newsletter', 'notification'] },
                archivedAt: null,
            },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        });

        return threads.map(thread => ({
            featureKey,
            threadId: thread.id,
            actionType: 'archive_thread',
            title: `Archive: "${thread.subject}"`,
            description: `This thread was classified as ${thread.classification}. Consider archiving to reduce inbox clutter.`,
            priority: 3,
            reasoning: `Thread classified as ${thread.classification}. Low priority for response.`,
        }));
    }

    /**
     * Extract calendar events from email content
     */
    async extractCalendarEvents(threadId: string, userId: string): Promise<InboxActionSuggestion | null> {
        const featureKey = 'inbox:book_calendar';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return null;
        }

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: {
                messages: { orderBy: { receivedAt: 'desc' }, take: 1 },
            },
        });

        if (!thread || thread.messages.length === 0) {
            return null;
        }

        const latestEmail = thread.messages[0];
        const content = latestEmail.body || latestEmail.bodyHtml || '';

        // Use AI to extract date/time mentions
        const prompt = `Analyze this email and extract any meeting/viewing/appointment requests.
        
Email Content: ${content.substring(0, 1000)}

If there's a date/time mentioned, respond with JSON:
{ "hasEvent": true, "title": "event title", "suggestedDate": "YYYY-MM-DD", "suggestedTime": "HH:MM", "notes": "any relevant context" }

If no event is mentioned, respond with:
{ "hasEvent": false }`;

        try {
            const result = await askZenaService.askBrain(prompt, {
                jsonMode: true,
                systemPrompt: 'You are a date/time extraction AI. Respond only with the JSON format specified.'
            });

            const parsed = JSON.parse(result);

            if (!parsed.hasEvent) {
                return null;
            }

            return {
                featureKey,
                threadId,
                actionType: 'add_calendar',
                title: `Schedule: ${parsed.title}`,
                description: `AI detected a potential appointment: "${parsed.title}" on ${parsed.suggestedDate} at ${parsed.suggestedTime}. ${parsed.notes || ''}`,
                priority: 6,
                reasoning: `Date/time detected in email from "${thread.subject}".`,
            };
        } catch (error) {
            console.error('[InboxActions] Failed to extract calendar event:', error);
            return null;
        }
    }

    /**
     * Scan inbox for high-priority emails
     */
    async flagUrgentEmails(userId: string): Promise<InboxActionSuggestion[]> {
        const featureKey = 'inbox:flag_urgent';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return [];
        }

        // Find threads with high risk or urgent keywords
        const threads = await prisma.thread.findMany({
            where: {
                userId,
                riskLevel: { in: ['high', 'critical'] },
                archivedAt: null,
            },
            take: 5,
            orderBy: { updatedAt: 'desc' },
        });

        return threads.map(thread => ({
            featureKey,
            threadId: thread.id,
            actionType: 'flag_urgent',
            title: `URGENT: "${thread.subject}"`,
            description: `This thread has been flagged as ${thread.riskLevel} priority. Immediate attention recommended.`,
            priority: 10,
            reasoning: `Thread risk level: ${thread.riskLevel}. May contain deadline or critical information.`,
        }));
    }

    /**
     * Extract tasks from email content (Scenario S53)
     */
    async extractTasks(threadId: string, userId: string): Promise<InboxActionSuggestion | null> {
        const featureKey = 'inbox:create_task';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') return null;

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: { messages: { orderBy: { receivedAt: 'desc' }, take: 1 } }
        });

        if (!thread || thread.messages.length === 0) return null;

        const content = thread.messages[0].body || '';
        if (!content.toLowerCase().includes('follow up') && !content.toLowerCase().includes('task')) {
            return null;
        }

        return {
            featureKey,
            threadId,
            actionType: 'create_task',
            title: `Create Task: Follow up on "${thread.subject}"`,
            description: `AI detected a task request in this email.`,
            priority: 8,
            reasoning: `Keywords "follow up" detected in email body.`
        };
    }
}

export const inboxActionsService = new InboxActionsService();
