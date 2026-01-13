/**
 * Tasks Actions Service
 * 
 * Generates autonomous actions for the Tasks module:
 * - Create tasks from email content
 * - Create tasks from deal progression
 * - Create tasks from voice notes
 * - Smart rescheduling of overdue tasks
 */

import { askZenaService } from './ask-zena.service.js';
import { godmodeService } from './godmode.service.js';
import prisma from '../config/database.js';

export interface TaskActionSuggestion {
    featureKey: string;
    sourceId: string;
    sourceType: 'email' | 'deal' | 'voice_note' | 'note';
    title: string;
    description: string;
    suggestedDueDate?: Date;
    priority: 'urgent' | 'high' | 'normal' | 'low';
    reasoning: string;
}

class TasksActionsService {

    /**
     * Generate a task from email content
     */
    async generateTaskFromEmail(threadId: string, userId: string): Promise<TaskActionSuggestion | null> {
        const featureKey = 'tasks:create_from_email';
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
        const participants = thread.participants as any[] || [];
        const externalParticipant = participants.find(p => p.email !== 'agent@zena.ai');
        const contactName = externalParticipant?.name || 'Unknown';

        // Use AI to extract action items
        const prompt = `Analyze this email and extract any action items or tasks for the real estate agent.
        
From: ${contactName}
Subject: ${thread.subject}
Content: ${content.substring(0, 800)}

If there's a clear action item, respond with JSON:
{ "hasTask": true, "title": "short task title", "description": "what needs to be done", "priority": "urgent|high|normal|low", "daysUntilDue": 1-7 }

If no clear action, respond with: { "hasTask": false }`;

        try {
            const result = await askZenaService.askBrain(prompt, {
                jsonMode: true,
                systemPrompt: 'You are a task extraction AI. Respond only with the JSON format specified.'
            });

            const parsed = JSON.parse(result);

            if (!parsed.hasTask) {
                return null;
            }

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (parsed.daysUntilDue || 3));

            return {
                featureKey,
                sourceId: threadId,
                sourceType: 'email',
                title: parsed.title,
                description: parsed.description,
                suggestedDueDate: dueDate,
                priority: parsed.priority || 'normal',
                reasoning: `Task extracted from email: "${thread.subject}" from ${contactName}.`,
            };
        } catch (error) {
            console.error('[TasksActions] Failed to extract task from email:', error);
            return null;
        }
    }

    /**
     * Generate tasks from deal progression
     */
    async generateTaskFromDeal(dealId: string, userId: string): Promise<TaskActionSuggestion[]> {
        const featureKey = 'tasks:create_from_deal';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return [];
        }

        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                property: true,
                contacts: true,
            },
        });

        if (!deal) {
            return [];
        }

        const suggestions: TaskActionSuggestion[] = [];
        const propertyAddress = deal.property?.address || 'Unknown Property';

        // Stage-based task suggestions
        const stageTaskMap: Record<string, { title: string; priority: 'urgent' | 'high' | 'normal' | 'low'; days: number }[]> = {
            'conditional': [
                { title: `Order LIM report for ${propertyAddress}`, priority: 'high', days: 2 },
                { title: `Confirm finance status for ${propertyAddress}`, priority: 'urgent', days: 1 },
            ],
            'pre_settlement': [
                { title: `Coordinate key handover for ${propertyAddress}`, priority: 'high', days: 3 },
                { title: `Remind buyer about house insurance`, priority: 'normal', days: 5 },
                { title: `Confirm lawyer has all documents`, priority: 'high', days: 2 },
            ],
            'marketing': [
                { title: `Schedule professional photography for ${propertyAddress}`, priority: 'normal', days: 3 },
                { title: `Send vendor weekly update`, priority: 'normal', days: 7 },
            ],
        };

        const tasksForStage = stageTaskMap[deal.stage] || [];

        for (const task of tasksForStage) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + task.days);

            suggestions.push({
                featureKey,
                sourceId: dealId,
                sourceType: 'deal',
                title: task.title,
                description: `Auto-suggested task based on deal stage: ${deal.stage}`,
                suggestedDueDate: dueDate,
                priority: task.priority,
                reasoning: `Deal at ${propertyAddress} is in "${deal.stage}" stage. This task is recommended for this stage.`,
            });
        }

        return suggestions;
    }

    /**
     * Generate tasks from voice notes
     */
    async generateTaskFromVoiceNote(voiceNoteId: string, userId: string): Promise<TaskActionSuggestion | null> {
        const featureKey = 'tasks:create_from_voice';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return null;
        }

        const voiceNote = await prisma.voiceNote.findUnique({
            where: { id: voiceNoteId },
        });

        if (!voiceNote || !voiceNote.transcript) {
            return null;
        }

        // Use AI to extract action items from transcript
        const prompt = `Analyze this voice note transcript and extract any action items or tasks.
        
Transcript: ${voiceNote.transcript.substring(0, 1000)}

If there's a clear action item, respond with JSON:
{ "hasTask": true, "title": "short task title", "description": "what needs to be done", "priority": "urgent|high|normal|low", "daysUntilDue": 1-7 }

If no clear action, respond with: { "hasTask": false }`;

        try {
            const result = await askZenaService.askBrain(prompt, {
                jsonMode: true,
                systemPrompt: 'You are a task extraction AI. Respond only with the JSON format specified.'
            });

            const parsed = JSON.parse(result);

            if (!parsed.hasTask) {
                return null;
            }

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (parsed.daysUntilDue || 3));

            return {
                featureKey,
                sourceId: voiceNoteId,
                sourceType: 'voice_note',
                title: parsed.title,
                description: parsed.description,
                suggestedDueDate: dueDate,
                priority: parsed.priority || 'normal',
                reasoning: `Task extracted from voice note recorded at ${voiceNote.createdAt.toISOString()}.`,
            };
        } catch (error) {
            console.error('[TasksActions] Failed to extract task from voice note:', error);
            return null;
        }
    }

    /**
     * Generate tasks from a manual note
     */
    async generateTaskFromNote(content: string, contactId: string, userId: string): Promise<TaskActionSuggestion | null> {
        const featureKey = 'tasks:create_from_note';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return null;
        }

        // Use AI to extract action items from note content
        const prompt = `Analyze this note and extract any action items or tasks for the real estate agent.
        
Note Content: ${content.substring(0, 1000)}

If there's a clear action item, respond with JSON:
{ "hasTask": true, "title": "short task title", "description": "what needs to be done", "priority": "urgent|high|normal|low", "daysUntilDue": 1-7 }

If no clear action, respond with: { "hasTask": false }`;

        try {
            const result = await askZenaService.askBrain(prompt, {
                jsonMode: true,
                systemPrompt: 'You are a task extraction AI. Respond only with the JSON format specified.'
            });

            const parsed = JSON.parse(result);

            if (!parsed.hasTask) {
                return null;
            }

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (parsed.daysUntilDue || 3));

            return {
                featureKey,
                sourceId: contactId,
                sourceType: 'note',
                title: parsed.title,
                description: parsed.description,
                suggestedDueDate: dueDate,
                priority: parsed.priority || 'normal',
                reasoning: `Task extracted from contact note.`,
            };
        } catch (error) {
            console.error('[TasksActions] Failed to extract task from note:', error);
            return null;
        }
    }
}

export const tasksActionsService = new TasksActionsService();
