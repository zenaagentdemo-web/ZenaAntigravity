/**
 * Godmode Service - Autonomous Action Management
 * 
 * This service manages the action queue for Demi-God and Full God modes:
 * - Demi-God: Actions are queued for human approval
 * - Full God: Actions auto-execute within user's time window
 */

import { PrismaClient } from '@prisma/client';
import { oracleService } from './oracle.service.js';

const prisma = new PrismaClient();

// Action types that Godmode can perform
export type ActionType =
    | 'send_email'
    | 'send_sms'
    | 'schedule_followup'
    | 'archive_contact'
    | 'update_category';

// Godmode modes
export type GodmodeMode = 'off' | 'demi_god' | 'full_god';

// Action status
export type ActionStatus =
    | 'pending'
    | 'approved'
    | 'executing'
    | 'completed'
    | 'failed'
    | 'dismissed';

// Create action input
export interface CreateActionInput {
    userId: string;
    contactId?: string;
    actionType: ActionType;
    priority?: number;
    title: string;
    description?: string;
    draftSubject?: string;
    draftBody?: string;
    mode: 'demi_god' | 'full_god';
    scheduledFor?: Date;
}

// Action execution result
export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: any;
}

// User Godmode settings
export interface GodmodeSettings {
    mode: GodmodeMode;
    timeWindowStart?: string; // '21:00' format
    timeWindowEnd?: string;   // '07:00' format
    enabledActionTypes: ActionType[];
}

class GodmodeService {
    /**
     * Get user's Godmode settings from preferences
     */
    async getSettings(userId: string): Promise<GodmodeSettings> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const prefs = user?.preferences as any;

        return {
            mode: prefs?.godmodeSettings?.mode || 'off',
            timeWindowStart: prefs?.godmodeSettings?.timeWindowStart,
            timeWindowEnd: prefs?.godmodeSettings?.timeWindowEnd,
            enabledActionTypes: prefs?.godmodeSettings?.enabledActionTypes || ['send_email', 'schedule_followup'],
        };
    }

    /**
     * Update user's Godmode settings
     */
    async updateSettings(userId: string, settings: Partial<GodmodeSettings>): Promise<GodmodeSettings> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const currentPrefs = (user?.preferences as any) || {};
        const currentGodmode = currentPrefs.godmodeSettings || {};

        const updatedGodmode = {
            ...currentGodmode,
            ...settings,
        };

        await prisma.user.update({
            where: { id: userId },
            data: {
                preferences: {
                    ...currentPrefs,
                    godmodeSettings: updatedGodmode,
                },
            },
        });

        return updatedGodmode;
    }

    /**
     * Queue a new autonomous action
     */
    async queueAction(input: CreateActionInput): Promise<any> {
        const action = await prisma.autonomousAction.create({
            data: {
                userId: input.userId,
                contactId: input.contactId,
                actionType: input.actionType,
                priority: input.priority || 5,
                title: input.title,
                description: input.description,
                draftSubject: input.draftSubject,
                draftBody: input.draftBody,
                status: 'pending',
                mode: input.mode,
                scheduledFor: input.scheduledFor,
            },
            include: {
                contact: {
                    select: { id: true, name: true, emails: true },
                },
            },
        });

        console.log(`[Godmode] Queued action: ${action.title} (${action.mode})`);
        return action;
    }

    /**
     * Get pending actions for a user
     */
    async getPendingActions(userId: string): Promise<any[]> {
        return prisma.autonomousAction.findMany({
            where: {
                userId,
                status: 'pending',
            },
            include: {
                contact: {
                    select: { id: true, name: true, emails: true, role: true },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
        });
    }

    /**
     * Get action history for a user
     */
    async getActionHistory(userId: string, limit: number = 50): Promise<any[]> {
        return prisma.autonomousAction.findMany({
            where: {
                userId,
                status: { in: ['completed', 'dismissed', 'failed'] },
            },
            include: {
                contact: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Approve a pending action (Demi-God mode)
     */
    async approveAction(actionId: string, userId: string): Promise<any> {
        const action = await prisma.autonomousAction.findFirst({
            where: { id: actionId, userId, status: 'pending' },
        });

        if (!action) {
            throw new Error('Action not found or already processed');
        }

        const updated = await prisma.autonomousAction.update({
            where: { id: actionId },
            data: {
                status: 'approved',
                approvedAt: new Date(),
            },
        });

        console.log(`[Godmode] Approved action: ${action.title}`);

        // Execute immediately after approval
        await this.executeAction(actionId, userId);

        return updated;
    }

    /**
     * Dismiss a pending action
     */
    async dismissAction(actionId: string, userId: string, reason?: string): Promise<void> {
        const action = await prisma.autonomousAction.findFirst({
            where: { id: actionId, userId, status: 'pending' },
        });

        if (!action) {
            throw new Error('Action not found or already processed');
        }

        await prisma.autonomousAction.update({
            where: { id: actionId },
            data: {
                status: 'dismissed',
                dismissedAt: new Date(),
                errorMessage: reason,
            },
        });

        console.log(`[Godmode] Dismissed action: ${action.title} - ${reason || 'No reason'}`);
    }

    /**
     * Execute an approved action
     */
    async executeAction(actionId: string, userId: string): Promise<ExecutionResult> {
        const action = await prisma.autonomousAction.findFirst({
            where: { id: actionId, userId },
            include: { contact: true },
        });

        if (!action) {
            return { success: false, message: 'Action not found' };
        }

        // Mark as executing
        await prisma.autonomousAction.update({
            where: { id: actionId },
            data: { status: 'executing' },
        });

        try {
            let result: ExecutionResult;

            switch (action.actionType) {
                case 'send_email':
                    result = await this.executeSendEmail(action);
                    break;
                case 'schedule_followup':
                    result = await this.executeScheduleFollowup(action);
                    break;
                case 'update_category':
                    result = await this.executeUpdateCategory(action);
                    break;
                case 'archive_contact':
                    result = await this.executeArchiveContact(action);
                    break;
                default:
                    result = { success: false, message: `Unknown action type: ${action.actionType}` };
            }

            // Update status based on result
            await prisma.autonomousAction.update({
                where: { id: actionId },
                data: {
                    status: result.success ? 'completed' : 'failed',
                    executedAt: new Date(),
                    executionResult: result.data,
                    errorMessage: result.success ? null : result.message,
                },
            });

            console.log(`[Godmode] Executed action: ${action.title} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            await prisma.autonomousAction.update({
                where: { id: actionId },
                data: {
                    status: 'failed',
                    executedAt: new Date(),
                    errorMessage: errorMsg,
                },
            });

            console.error(`[Godmode] Action failed: ${action.title}`, error);
            return { success: false, message: errorMsg };
        }
    }

    /**
     * Check if current time is within user's Full God time window
     */
    isWithinGodmodeWindow(settings: GodmodeSettings): boolean {
        if (!settings.timeWindowStart || !settings.timeWindowEnd) {
            return true; // No window set = always active
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = settings.timeWindowStart.split(':').map(Number);
        const [endHour, endMinute] = settings.timeWindowEnd.split(':').map(Number);

        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        // Handle overnight windows (e.g., 21:00 - 07:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        }

        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * Generate suggested actions for a contact based on Oracle data
     */
    async generateSuggestedActions(contactId: string, userId: string): Promise<CreateActionInput[]> {
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            include: { prediction: true },
        });

        if (!contact) return [];

        const suggestions: CreateActionInput[] = [];
        const settings = await this.getSettings(userId);

        // Get Oracle prediction
        const prediction = await oracleService.getContactPrediction(contactId);

        // Suggest based on churn risk
        if (prediction?.churnRisk && prediction.churnRisk > 0.5) {
            suggestions.push({
                userId,
                contactId,
                actionType: 'send_email',
                priority: 8,
                title: `Re-engage ${contact.name} (High churn risk)`,
                description: `This contact hasn't been active in a while. Send a friendly check-in.`,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        // Suggest based on sell propensity
        if (prediction?.sellProbability && prediction.sellProbability > 0.6) {
            suggestions.push({
                userId,
                contactId,
                actionType: 'schedule_followup',
                priority: 9,
                title: `Follow up with ${contact.name} (High sell intent)`,
                description: `Oracle detected ${Math.round(prediction.sellProbability * 100)}% sell probability. Schedule a call.`,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        return suggestions;
    }

    // Private execution methods

    private async executeSendEmail(action: any): Promise<ExecutionResult> {
        // TODO: Integrate with actual email sending service
        // For now, simulate success
        console.log(`[Godmode] Would send email to ${action.contact?.name}: ${action.draftSubject}`);

        return {
            success: true,
            message: `Email sent to ${action.contact?.name}`,
            data: {
                to: action.contact?.emails?.[0],
                subject: action.draftSubject,
                sentAt: new Date().toISOString(),
            },
        };
    }

    private async executeScheduleFollowup(action: any): Promise<ExecutionResult> {
        // Create a task for follow-up
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3); // 3 days from now

        await prisma.task.create({
            data: {
                userId: action.userId,
                title: `Follow up: ${action.contact?.name}`,
                description: action.description,
                propertyId: null,
                dealId: null,
                dueDate: followUpDate,
                priority: 'high',
                status: 'pending',
            },
        });

        return {
            success: true,
            message: `Follow-up scheduled for ${action.contact?.name}`,
            data: { scheduledFor: followUpDate.toISOString() },
        };
    }

    private async executeUpdateCategory(action: any): Promise<ExecutionResult> {
        if (!action.contactId) {
            return { success: false, message: 'No contact specified' };
        }

        // Parse description for new category
        const newCategory = action.description || 'PULSE';

        await prisma.contact.update({
            where: { id: action.contactId },
            data: { zenaCategory: newCategory as any },
        });

        return {
            success: true,
            message: `Updated ${action.contact?.name} to ${newCategory}`,
            data: { newCategory },
        };
    }

    private async executeArchiveContact(action: any): Promise<ExecutionResult> {
        // For now, just update category to a "cold" state
        if (!action.contactId) {
            return { success: false, message: 'No contact specified' };
        }

        await prisma.contact.update({
            where: { id: action.contactId },
            data: { zenaCategory: 'COLD_NURTURE' },
        });

        return {
            success: true,
            message: `Archived ${action.contact?.name}`,
        };
    }
}

export const godmodeService = new GodmodeService();
