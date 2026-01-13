/**
 * Email Triage Service
 * 
 * Performs "super level intelligence" analysis on unread emails.
 * Generates summaries, drafts, and extracts proactive actions (tasks, contacts, properties, appointments).
 */

import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { logger } from './logger.service.js';

export interface TriageAction {
    type: 'CREATE_TASK' | 'CREATE_CONTACT' | 'CREATE_PROPERTY' | 'BOOK_APPOINTMENT';
    label: string;
    details: Record<string, any>;
}

export interface EmailTriageReport {
    threadId: string;
    sender: {
        name: string;
        email: string;
    };
    subject: string;
    summary: string;
    suggestedReply: string;
    proactiveActions: TriageAction[];
    urgency: 'high' | 'medium' | 'low';
    category: 'client_request' | 'enquiry' | 'internal' | 'other';
}

export interface GlobalTriageReport {
    date: string;
    unreadCount: number;
    reports: EmailTriageReport[];
    overallBrief: string;
}

export class EmailTriageService {
    /**
     * Generate a full triage report for all unread focus emails
     */
    async generateFullTriageReport(userId: string): Promise<GlobalTriageReport> {
        logger.info(`[EmailTriageService] Generating full triage report for user ${userId}`);

        // Fetch unread threads in 'focus' category
        const unreadThreads = await prisma.thread.findMany({
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
                    take: 3 // Get context of last 3 messages
                }
            },
            take: 10 // Limit to top 10 for performance
        });

        if (unreadThreads.length === 0) {
            return {
                date: new Date().toISOString(),
                unreadCount: 0,
                reports: [],
                overallBrief: "Your inbox is looking clear! No new focus emails to triage at the moment."
            };
        }

        const reports: EmailTriageReport[] = [];

        // Process each thread in parallel for speed
        await Promise.all(unreadThreads.map(async (thread) => {
            const report = await this.triageThread(userId, thread);
            if (report) {
                reports.push(report);
            }
        }));

        // Generate an overall brief using all reports
        const overallBrief = await this.generateOverallBrief(userId, reports);

        return {
            date: new Date().toISOString(),
            unreadCount: unreadThreads.length,
            reports,
            overallBrief
        };
    }

    /**
     * Triage a single thread using Zena's "super level intelligence"
     */
    private async triageThread(userId: string, thread: any): Promise<EmailTriageReport | null> {
        const latestMessage = thread.messages[0];
        if (!latestMessage || latestMessage.isFromUser) return null;

        const sender = (latestMessage.from as any) || { name: 'Unknown', email: '' };
        const conversationHistory = thread.messages
            .reverse()
            .map((m: any) => `${m.isFromUser ? 'User' : sender.name}: ${m.body.substring(0, 300)}`)
            .join('\n---\n');

        const prompt = `You are Zena, an elite AI Real Estate Chief of Staff with "super level intelligence". 
Your task is to triage this unread email thread with absolute precision and proactivity.

CONVERSATION HISTORY (Last 3 messages):
${conversationHistory}

THREAD SUBJECT: ${thread.subject}
SENDER: ${sender.name} (${sender.email})

INSTRUCTIONS:
1. Summarize the core intent of the sender in 1 punchy sentence.
2. Draft a sophisticated, "Zena-style" reply (witty, professional, Cortana-inspired).
3. Be EXTREMELY proactive. Identify any and all subsequent actions:
   - Create a TASK if they ask for something or a deadline is implied.
   - Create/Update a CONTACT if they provide details or are new.
   - Create/Link a PROPERTY if a specific address is mentioned.
   - Suggest BOOKING AN APPOINTMENT if they want to meet/view.
4. Categorize the urgency and type.

RESPOND ONLY IN JSON FORMAT:
{
  "summary": "...",
  "suggestedReply": "...",
  "proactiveActions": [
    {
      "type": "CREATE_TASK | CREATE_CONTACT | CREATE_PROPERTY | BOOK_APPOINTMENT",
      "label": "Short descriptive label",
      "details": { ... relevant fields like title, dueDate, address, name ... }
    }
  ],
  "urgency": "high | medium | low",
  "category": "client_request | enquiry | internal | other"
}`;

        try {
            const aiResponse = await askZenaService.askBrain(prompt, { jsonMode: true });
            const parsed = JSON.parse(aiResponse);

            return {
                threadId: thread.id,
                sender: {
                    name: sender.name,
                    email: sender.email
                },
                subject: thread.subject,
                summary: parsed.summary,
                suggestedReply: parsed.suggestedReply,
                proactiveActions: parsed.proactiveActions || [],
                urgency: parsed.urgency || 'medium',
                category: parsed.category || 'other'
            };
        } catch (error) {
            logger.error(`[EmailTriageService] AI Triage failed for thread ${thread.id}:`, error);
            return null;
        }
    }

    /**
     * Generate an overall executive brief for the user's unread emails
     */
    private async generateOverallBrief(userId: string, reports: EmailTriageReport[]): Promise<string> {
        if (reports.length === 0) return "No emails to brief.";

        const summaryData = reports.map(r =>
            `- From ${r.sender.name}: ${r.summary} (${r.urgency} priority)`
        ).join('\n');

        const prompt = `You are Zena. Greet the user and provide a high-energy, executive summary of these ${reports.length} unread emails.
Be witty, confident, and proactive. Mention that you've already prepared drafts and identified key actions for each.

REPORTS:
${summaryData}

Keep it to 2-3 punchy sentences for voice mode compatibility.`;

        try {
            return await askZenaService.askBrain(prompt);
        } catch (error) {
            return `You've got ${reports.length} new emails. I've taken a look and summarized the key actions for you.`;
        }
    }
}

export const emailTriageService = new EmailTriageService();
