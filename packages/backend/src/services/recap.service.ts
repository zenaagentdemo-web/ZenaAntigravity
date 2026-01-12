/**
 * Recap Service - End-of-Day Summary Generation
 * 
 * Generates AI-powered daily summaries of all activity to cement
 * Zena as the agent's "Daily Operating System".
 */

import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { logger } from './logger.service.js';

export interface DailyRecap {
    date: string;
    summary: string;
    accomplishments: string[];
    suggestedTomorrow: string[];
    dealsNeedingAttention: Array<{
        dealId: string;
        propertyAddress: string;
        reason: string;
    }>;
    stats: {
        emailsSent: number;
        emailsReceived: number;
        tasksCompleted: number;
        meetingsAttended: number;
        voiceNotesCreated: number;
        dealsUpdated: number;
    };
}

export class RecapService {
    /**
     * Generate a daily recap for a user
     */
    async generateRecap(userId: string, date?: Date): Promise<DailyRecap> {
        const targetDate = date || new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        logger.info(`[RecapService] Generating daily recap for user ${userId} on ${startOfDay.toISOString().split('T')[0]}`);

        // Gather all activity data for the day
        const [
            emailsSent,
            emailsReceived,
            tasksCompleted,
            meetingsAttended,
            voiceNotesCreated,
            dealsUpdated,
            atRiskDeals,
            pendingTasks,
            timelineEvents
        ] = await Promise.all([
            this.countEmailsSent(userId, startOfDay, endOfDay),
            this.countEmailsReceived(userId, startOfDay, endOfDay),
            this.getCompletedTasks(userId, startOfDay, endOfDay),
            this.getMeetingsAttended(userId, startOfDay, endOfDay),
            this.countVoiceNotes(userId, startOfDay, endOfDay),
            this.getDealsUpdated(userId, startOfDay, endOfDay),
            this.getAtRiskDeals(userId),
            this.getPendingTasks(userId),
            this.getTimelineEvents(userId, startOfDay, endOfDay)
        ]);

        // Build context for LLM
        const context = this.buildRecapContext({
            emailsSent,
            emailsReceived,
            tasksCompleted,
            meetingsAttended,
            voiceNotesCreated,
            dealsUpdated,
            atRiskDeals,
            pendingTasks,
            timelineEvents
        });

        // Generate AI summary
        const aiSummary = await this.generateAISummary(context);

        const recap: DailyRecap = {
            date: startOfDay.toISOString().split('T')[0],
            summary: aiSummary.summary,
            accomplishments: aiSummary.accomplishments,
            suggestedTomorrow: aiSummary.suggestedTomorrow,
            dealsNeedingAttention: atRiskDeals.map(deal => ({
                dealId: deal.id,
                propertyAddress: deal.property?.address || 'Unknown Property',
                reason: deal.riskFlags?.[0] || `Risk level: ${deal.riskLevel}`
            })),
            stats: {
                emailsSent,
                emailsReceived,
                tasksCompleted: tasksCompleted.length,
                meetingsAttended: meetingsAttended.length,
                voiceNotesCreated,
                dealsUpdated: dealsUpdated.length
            }
        };

        logger.info(`[RecapService] Generated recap with ${recap.accomplishments.length} accomplishments`);
        return recap;
    }

    /**
     * Count emails sent by user today
     */
    private async countEmailsSent(userId: string, start: Date, end: Date): Promise<number> {
        return prisma.message.count({
            where: {
                thread: { userId },
                isFromUser: true,
                sentAt: { gte: start, lte: end }
            }
        });
    }

    /**
     * Count emails received today
     */
    private async countEmailsReceived(userId: string, start: Date, end: Date): Promise<number> {
        return prisma.message.count({
            where: {
                thread: { userId },
                isFromUser: false,
                receivedAt: { gte: start, lte: end }
            }
        });
    }

    /**
     * Get tasks completed today
     */
    private async getCompletedTasks(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.task.findMany({
            where: {
                userId,
                status: 'completed',
                completedAt: { gte: start, lte: end }
            }
        });
    }

    /**
     * Get meetings attended today (calendar events)
     */
    private async getMeetingsAttended(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.timelineEvent.findMany({
            where: {
                userId,
                type: 'meeting',
                timestamp: { gte: start, lte: end }
            }
        });
    }

    /**
     * Count voice notes created today
     */
    private async countVoiceNotes(userId: string, start: Date, end: Date): Promise<number> {
        return prisma.voiceNote.count({
            where: {
                userId,
                createdAt: { gte: start, lte: end }
            }
        });
    }

    /**
     * Get deals that were updated today
     */
    private async getDealsUpdated(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.deal.findMany({
            where: {
                userId,
                updatedAt: { gte: start, lte: end }
            },
            include: { property: true }
        });
    }

    /**
     * Get deals that are at risk
     */
    private async getAtRiskDeals(userId: string): Promise<any[]> {
        return prisma.deal.findMany({
            where: {
                userId,
                riskLevel: { in: ['high', 'critical'] },
                status: 'active'
            },
            include: { property: true }
        });
    }

    /**
     * Get pending tasks (overdue or due tomorrow)
     */
    private async getPendingTasks(userId: string): Promise<any[]> {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        return prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                OR: [
                    { dueDate: { lte: tomorrow } },
                    { dueDate: null }
                ]
            },
            orderBy: { dueDate: 'asc' }
        });
    }

    /**
     * Get timeline events for context
     */
    private async getTimelineEvents(userId: string, start: Date, end: Date): Promise<any[]> {
        return prisma.timelineEvent.findMany({
            where: {
                userId,
                timestamp: { gte: start, lte: end }
            },
            orderBy: { timestamp: 'desc' },
            take: 20
        });
    }

    /**
     * Build context string for LLM
     */
    private buildRecapContext(data: {
        emailsSent: number;
        emailsReceived: number;
        tasksCompleted: any[];
        meetingsAttended: any[];
        voiceNotesCreated: number;
        dealsUpdated: any[];
        atRiskDeals: any[];
        pendingTasks: any[];
        timelineEvents: any[];
    }): string {
        let context = `## Today's Activity Summary\n\n`;

        context += `### Communication\n`;
        context += `- Emails sent: ${data.emailsSent}\n`;
        context += `- Emails received: ${data.emailsReceived}\n`;
        context += `- Voice notes recorded: ${data.voiceNotesCreated}\n\n`;

        if (data.tasksCompleted.length > 0) {
            context += `### Tasks Completed (${data.tasksCompleted.length})\n`;
            data.tasksCompleted.slice(0, 5).forEach(task => {
                context += `- ${task.label}\n`;
            });
            if (data.tasksCompleted.length > 5) {
                context += `- ...and ${data.tasksCompleted.length - 5} more\n`;
            }
            context += `\n`;
        }

        if (data.meetingsAttended.length > 0) {
            context += `### Meetings (${data.meetingsAttended.length})\n`;
            data.meetingsAttended.forEach(meeting => {
                context += `- ${meeting.summary}\n`;
            });
            context += `\n`;
        }

        if (data.dealsUpdated.length > 0) {
            context += `### Deals Updated (${data.dealsUpdated.length})\n`;
            data.dealsUpdated.slice(0, 5).forEach(deal => {
                context += `- ${deal.property?.address || 'Unknown'}: Stage ${deal.stage}\n`;
            });
            context += `\n`;
        }

        if (data.atRiskDeals.length > 0) {
            context += `### ⚠️ Deals Needing Attention (${data.atRiskDeals.length})\n`;
            data.atRiskDeals.forEach(deal => {
                context += `- ${deal.property?.address || 'Unknown'}: ${deal.riskLevel} risk - ${deal.riskFlags?.[0] || 'needs review'}\n`;
            });
            context += `\n`;
        }

        if (data.pendingTasks.length > 0) {
            context += `### Pending Tasks for Tomorrow (${data.pendingTasks.length})\n`;
            data.pendingTasks.slice(0, 8).forEach(task => {
                const dueStr = task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString()})` : '';
                context += `- ${task.label}${dueStr}\n`;
            });
            context += `\n`;
        }

        return context;
    }

    /**
     * Generate AI summary using LLM
     */
    private async generateAISummary(context: string): Promise<{
        summary: string;
        accomplishments: string[];
        suggestedTomorrow: string[];
    }> {
        const prompt = `You are Zena, the AI assistant. Generate an End-of-Day recap for a real estate agent based on their activity.

${context}

Generate a JSON response with:
1. "summary": A 2-3 sentence punchy summary of their day (celebratory tone, acknowledge their hard work)
2. "accomplishments": Array of 3-5 key accomplishments (bullet-point style, start with action verbs)
3. "suggestedTomorrow": Array of 2-4 suggested priorities for tomorrow based on pending tasks and at-risk deals

Keep it professional but warm. Be specific - reference actual deal addresses and task names where possible.

Respond with valid JSON only:
{
  "summary": "...",
  "accomplishments": ["...", "..."],
  "suggestedTomorrow": ["...", "..."]
}`;

        try {
            const response = await askZenaService.askBrain(prompt, {
                temperature: 0.7,
                jsonMode: true
            });

            const parsed = JSON.parse(response);
            return {
                summary: parsed.summary || 'Great work today! Keep the momentum going.',
                accomplishments: parsed.accomplishments || ['Stayed on top of your inbox', 'Progressed active deals'],
                suggestedTomorrow: parsed.suggestedTomorrow || ['Review pending tasks', 'Check deal deadlines']
            };
        } catch (error) {
            logger.error('[RecapService] Failed to generate AI summary:', error);
            return {
                summary: 'Another productive day in the books. Check your pending tasks for tomorrow.',
                accomplishments: ['Managed communications', 'Stayed organized'],
                suggestedTomorrow: ['Review your inbox', 'Check on at-risk deals']
            };
        }
    }
}

export const recapService = new RecapService();
