/**
 * Action Scanner Service
 * 
 * Event-driven service that scans for actionable items when events occur.
 * Triggers pending action generation in REAL-TIME (not on page visits).
 * 
 * Events:
 * - Email received → Draft reply, extract tasks, calendar
 * - Deal updated → Finance follow-up, vendor update
 * - Voice note created → Extract tasks from transcript
 * - Property milestone → Open home prep, settlement tasks
 */

import { inboxActionsService } from './inbox-actions.service.js';
import { tasksActionsService } from './tasks-actions.service.js';
import { godmodeService } from './godmode.service.js';
import { websocketService } from './websocket.service.js';
import prisma from '../config/database.js';

export interface ScanResult {
    actionsCreated: number;
    actionIds: string[];
}

class ActionScannerService {

    /**
     * Called when a new email is received during sync.
     * Scans the email and generates pending actions.
     */
    async onEmailReceived(emailId: string, threadId: string, userId: string): Promise<ScanResult> {
        const result: ScanResult = { actionsCreated: 0, actionIds: [] };

        try {
            console.log(`[ActionScanner] Email received: ${emailId} for user ${userId}`);

            // Check if inbox features are enabled
            const replyMode = await godmodeService.getFeatureMode(userId, 'inbox:draft_reply');
            const taskMode = await godmodeService.getFeatureMode(userId, 'tasks:create_from_email');
            const calendarMode = await godmodeService.getFeatureMode(userId, 'inbox:book_calendar');

            // Generate draft reply suggestion
            if (replyMode !== 'off') {
                console.log(`[ActionScanner] Generating reply draft for thread: ${threadId}`);
                const replySuggestion = await inboxActionsService.generateReplyDraft(threadId, userId);
                if (replySuggestion) {
                    console.log(`[ActionScanner] Created reply suggestion: ${replySuggestion.title}`);
                    const action = await this.queueAction(userId, replySuggestion, replyMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            // Generate task from email
            if (taskMode !== 'off') {
                console.log(`[ActionScanner] Generating task from email for thread: ${threadId}`);
                const taskSuggestion = await tasksActionsService.generateTaskFromEmail(threadId, userId);
                if (taskSuggestion) {
                    console.log(`[ActionScanner] Created task suggestion: ${taskSuggestion.title}`);
                    const action = await this.queueTaskAction(userId, taskSuggestion, taskMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            // Extract calendar events
            if (calendarMode !== 'off') {
                const calendarSuggestion = await inboxActionsService.extractCalendarEvents(threadId, userId);
                if (calendarSuggestion) {
                    const action = await this.queueAction(userId, calendarSuggestion, calendarMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            // Broadcast to user if any actions were created
            if (result.actionsCreated > 0) {
                this.broadcastNewActions(userId, result.actionsCreated);
            }

            return result;
        } catch (error) {
            console.error(`[ActionScanner] Error processing email ${emailId}:`, error);
            return result;
        }
    }

    /**
     * Called when a deal is updated.
     * Scans the deal and generates pending actions based on stage/status.
     */
    async onDealUpdated(dealId: string, userId: string): Promise<ScanResult> {
        const result: ScanResult = { actionsCreated: 0, actionIds: [] };

        try {
            console.log(`[ActionScanner] Deal updated: ${dealId} for user ${userId}`);

            // Generate tasks from deal
            const taskMode = await godmodeService.getFeatureMode(userId, 'tasks:create_from_deal');

            if (taskMode !== 'off') {
                const taskSuggestions = await tasksActionsService.generateTaskFromDeal(dealId, userId);
                for (const suggestion of taskSuggestions) {
                    const action = await this.queueTaskAction(userId, suggestion, taskMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            // Generate deal-specific actions (vendor update, finance follow-up)
            const dealMode = await godmodeService.getFeatureMode(userId, 'deals:nudge_client');
            if (dealMode !== 'off') {
                const deal = await prisma.deal.findUnique({
                    where: { id: dealId },
                    include: { property: true, contacts: true },
                });

                if (deal && deal.stage === 'conditional') {
                    // Finance follow-up for conditional deals
                    const action = await godmodeService.queueAction({
                        userId,
                        actionType: 'finance_followup',
                        mode: dealMode,
                        title: `Follow up on finance: ${deal.property?.address?.split(',')[0] || 'Deal'}`,
                        description: 'Conditional deal requires finance confirmation. AI suggests following up with buyer.',
                        priority: 8,
                        reasoning: `Deal is in conditional stage. Finance deadline may be approaching.`,
                        propertyId: deal.propertyId || undefined,
                        payload: { dealId },
                    });
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            // Broadcast to user
            if (result.actionsCreated > 0) {
                this.broadcastNewActions(userId, result.actionsCreated);
            }

            return result;
        } catch (error) {
            console.error(`[ActionScanner] Error processing deal ${dealId}:`, error);
            return result;
        }
    }

    /**
     * Called when a voice note is created and transcribed.
     */
    async onVoiceNoteCreated(voiceNoteId: string, userId: string): Promise<ScanResult> {
        const result: ScanResult = { actionsCreated: 0, actionIds: [] };

        try {
            console.log(`[ActionScanner] Voice note created: ${voiceNoteId} for user ${userId}`);

            const taskMode = await godmodeService.getFeatureMode(userId, 'tasks:create_from_voice');

            if (taskMode !== 'off') {
                const taskSuggestion = await tasksActionsService.generateTaskFromVoiceNote(voiceNoteId, userId);
                if (taskSuggestion) {
                    const action = await this.queueTaskAction(userId, taskSuggestion, taskMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            if (result.actionsCreated > 0) {
                this.broadcastNewActions(userId, result.actionsCreated);
            }

            return result;
        } catch (error) {
            console.error(`[ActionScanner] Error processing voice note ${voiceNoteId}:`, error);
            return result;
        }
    }

    /**
     * Called when a manual note is added to a contact.
     */
    async onNoteAdded(content: string, contactId: string, userId: string): Promise<ScanResult> {
        const result: ScanResult = { actionsCreated: 0, actionIds: [] };

        try {
            console.log(`[ActionScanner] Manual note added for contact: ${contactId} for user ${userId}`);

            const taskMode = await godmodeService.getFeatureMode(userId, 'tasks:create_from_note');

            if (taskMode !== 'off') {
                const taskSuggestion = await tasksActionsService.generateTaskFromNote(content, contactId, userId);
                if (taskSuggestion) {
                    const action = await this.queueTaskAction(userId, taskSuggestion, taskMode);
                    if (action) {
                        result.actionsCreated++;
                        result.actionIds.push(action.id);
                    }
                }
            }

            if (result.actionsCreated > 0) {
                this.broadcastNewActions(userId, result.actionsCreated);
            }

            return result;
        } catch (error) {
            console.error(`[ActionScanner] Error processing manual note:`, error);
            return result;
        }
    }

    /**
     * Called when a property milestone is created/updated.
     */
    async onPropertyMilestone(propertyId: string, milestoneType: string, userId: string): Promise<ScanResult> {
        const result: ScanResult = { actionsCreated: 0, actionIds: [] };

        try {
            console.log(`[ActionScanner] Property milestone: ${milestoneType} for ${propertyId}`);

            // Generate prep tasks based on milestone type
            const milestoneTaskMap: Record<string, { title: string; priority: number; days: number }> = {
                'open_home': { title: 'Prepare for open home', priority: 7, days: 1 },
                'auction': { title: 'Prepare auction materials', priority: 9, days: 2 },
                'settlement': { title: 'Prepare settlement documentation', priority: 8, days: 3 },
            };

            const taskConfig = milestoneTaskMap[milestoneType];
            if (taskConfig) {
                const property = await prisma.property.findUnique({
                    where: { id: propertyId },
                    select: { address: true },
                });

                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + taskConfig.days);

                const action = await godmodeService.queueAction({
                    userId,
                    actionType: 'milestone_prep',
                    mode: 'demi_god',
                    title: `${taskConfig.title}: ${property?.address?.split(',')[0] || 'Property'}`,
                    description: `Upcoming ${milestoneType.replace('_', ' ')} requires preparation.`,
                    priority: taskConfig.priority,
                    reasoning: `Milestone ${milestoneType} scheduled. AI suggests preparation tasks.`,
                    propertyId,
                    scheduledFor: dueDate,
                });

                if (action) {
                    result.actionsCreated++;
                    result.actionIds.push(action.id);
                }
            }

            if (result.actionsCreated > 0) {
                this.broadcastNewActions(userId, result.actionsCreated);
            }

            return result;
        } catch (error) {
            console.error(`[ActionScanner] Error processing milestone:`, error);
            return result;
        }
    }

    /**
     * Queue an inbox action suggestion as a pending action.
     */
    private async queueAction(userId: string, suggestion: any, mode: string): Promise<any> {
        return godmodeService.queueAction({
            userId,
            actionType: suggestion.actionType,
            mode: mode as 'demi_god' | 'full_god',
            title: suggestion.title,
            description: suggestion.description,
            priority: suggestion.priority,
            reasoning: suggestion.reasoning,
            draftSubject: suggestion.draftSubject,
            draftBody: suggestion.draftBody,
            payload: { threadId: suggestion.threadId, featureKey: suggestion.featureKey },
        });
    }

    /**
     * Queue a task action suggestion as a pending action.
     */
    private async queueTaskAction(userId: string, suggestion: any, mode: string): Promise<any> {
        return godmodeService.queueAction({
            userId,
            actionType: 'create_task',
            mode: mode as 'demi_god' | 'full_god',
            title: suggestion.title,
            description: suggestion.description,
            priority: suggestion.priority === 'urgent' ? 10 : suggestion.priority === 'high' ? 8 : 5,
            reasoning: suggestion.reasoning,
            scheduledFor: suggestion.suggestedDueDate,
            payload: {
                sourceId: suggestion.sourceId,
                sourceType: suggestion.sourceType,
                featureKey: suggestion.featureKey
            },
        });
    }

    /**
     * Broadcast new pending actions to user via WebSocket.
     */
    private broadcastNewActions(userId: string, count: number): void {
        websocketService.broadcastToUser(userId, 'PENDING_ACTION_CREATED' as any, {
            count,
            message: `Zena has ${count} new suggestion${count === 1 ? '' : 's'} for you`,
            timestamp: new Date().toISOString(),
        });
    }
}

export const actionScannerService = new ActionScannerService();
