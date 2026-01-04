/**
 * Godmode Service - Autonomous Action Management
 * 
 * This service manages the action queue for Demi-God and Full God modes:
 * - Demi-God: Actions are queued for human approval
 * - Full God: Actions auto-execute within user's time window
 */

import { PrismaClient } from '@prisma/client';
import { oracleService } from './oracle.service.js';
import { askZenaService } from './ask-zena.service.js';
import { timelineService } from './timeline.service.js';
import { actionRegistry } from './actions/index.js';

const prisma = new PrismaClient();

// Action types that Godmode can perform
export type ActionType =
    | 'send_email'
    | 'send_sms'
    | 'schedule_followup'
    | 'archive_contact'
    | 'update_category'
    // Property-specific actions
    | 'vendor_update'
    | 'price_review'
    | 'buyer_match_intro'
    // New Autonomous Actions (Phase 3)
    | 'generate_weekly_report'
    | 'schedule_viewing'
    | 'compliance_audit';

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
    propertyId?: string;  // NEW: Support property-level actions
    actionType: ActionType;
    priority?: number;
    title: string;
    description?: string;
    draftSubject?: string;
    draftBody?: string;
    mode: 'demi_god' | 'full_god';
    scheduledFor?: Date;
    reasoning?: string;
    intelligenceSources?: any;
    // New Rich Content
    payload?: any;
    assets?: any[];
    script?: string;
    contextSummary?: string;
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
    fullGodStart?: Date | null;
    fullGodEnd?: Date | null;
    lastGodmodeScanAt?: Date | null;
}

class GodmodeService {
    /**
     * Get user's Godmode settings from preferences
     */
    async getSettings(userId: string): Promise<GodmodeSettings> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                preferences: true,
                lastGodmodeScanAt: true,
                fullGodStart: true,
                fullGodEnd: true
            },
        });

        const prefs = (user?.preferences as any) || {};
        const godmodePrefs = prefs.godmodeSettings || {};

        return {
            mode: godmodePrefs.mode || 'demi_god',
            timeWindowStart: godmodePrefs.timeWindowStart,
            timeWindowEnd: godmodePrefs.timeWindowEnd,
            enabledActionTypes: godmodePrefs.enabledActionTypes || ['send_email', 'schedule_followup'],
            fullGodStart: user?.fullGodStart,
            fullGodEnd: user?.fullGodEnd,
            lastGodmodeScanAt: user?.lastGodmodeScanAt,
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

        // Separate user fields from preferences
        const { fullGodStart, fullGodEnd, lastGodmodeScanAt, ...prefsOnly } = settings;

        const updatedGodmodePrefs = {
            ...currentGodmode,
            ...prefsOnly,
        };

        const updateData: any = {
            preferences: {
                ...currentPrefs,
                godmodeSettings: updatedGodmodePrefs,
            },
        };

        if (fullGodStart !== undefined) updateData.fullGodStart = fullGodStart;
        if (fullGodEnd !== undefined) updateData.fullGodEnd = fullGodEnd;
        if (lastGodmodeScanAt !== undefined) updateData.lastGodmodeScanAt = lastGodmodeScanAt;

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        const finalSettings = await this.getSettings(userId);
        return finalSettings;
    }

    /**
     * Queue a new autonomous action
     */
    async queueAction(input: CreateActionInput): Promise<any> {
        const action = await prisma.autonomousAction.create({
            data: {
                userId: input.userId,
                contactId: input.contactId,
                propertyId: input.propertyId,  // NEW: Support property-level actions
                actionType: input.actionType,
                priority: input.priority || 5,
                title: input.title,
                description: input.description,
                draftSubject: input.draftSubject,
                draftBody: input.draftBody,
                status: 'pending',
                mode: input.mode,
                scheduledFor: input.scheduledFor,
                reasoning: input.reasoning,
                intelligenceSources: input.intelligenceSources,
                payload: input.payload,
                assets: input.assets,
                script: input.script,
                contextSummary: input.contextSummary,
            },
            include: {
                contact: {
                    select: { id: true, name: true, emails: true },
                },
                property: {
                    select: { id: true, address: true },
                },
            },
        });

        console.log(`[Godmode] Queued action: ${action.title} (${action.mode})`);
        return action;
    }

    /**
     * Get pending actions for a user
     */
    async getPendingActions(userId: string, contactId?: string): Promise<any[]> {
        const where: any = {
            userId,
            status: 'pending',
        };
        if (contactId) {
            where.contactId = contactId;
        }
        return prisma.autonomousAction.findMany({
            where,
            include: {
                contact: {
                    select: { id: true, name: true, emails: true, role: true },
                },
                property: {
                    select: { id: true, address: true },
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
    async approveAction(actionId: string, userId: string, overrides?: { draftBody?: string; draftSubject?: string }): Promise<any> {
        const action = await prisma.autonomousAction.findFirst({
            where: { id: actionId, userId, status: 'pending' },
        });

        if (!action) {
            throw new Error('Action not found or already processed');
        }

        const updateData: any = {
            status: 'approved',
            approvedAt: new Date(),
        };

        // Apply overrides if provided
        if (overrides?.draftBody) updateData.draftBody = overrides.draftBody;
        if (overrides?.draftSubject) updateData.draftSubject = overrides.draftSubject;

        const updated = await prisma.autonomousAction.update({
            where: { id: actionId },
            data: updateData,
        });

        console.log(`[Godmode] Approved action: ${action.title} (with overrides)`);

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
                    // Try to find a strategy for this action type
                    const strategy = actionRegistry.getStrategy(action.actionType as ActionType);
                    if (strategy) {
                        result = await strategy.execute(actionId, action.payload);
                    } else {
                        result = { success: false, message: `Unknown action type: ${action.actionType}` };
                    }
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

            // 4. Log to Timeline (The "Activity Log" mentioned by user)
            if (action.contactId) {
                await timelineService.createEvent({
                    userId: action.userId,
                    type: action.actionType === 'send_email' ? 'email' : 'note',
                    entityType: 'contact',
                    entityId: action.contactId,
                    summary: action.title,
                    content: action.description || undefined,
                    metadata: {
                        godmode: true,
                        mode: action.mode,
                        actionType: action.actionType,
                        draftSubject: action.draftSubject,
                        draftBody: action.draftBody,
                        executionResult: result.data,
                        success: result.success,
                        autoExecuted: action.mode === 'full_god'
                    },
                    timestamp: new Date(),
                });
            }

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
        const now = new Date();

        // 1. Check Date Range (Specific Window)
        if (settings.fullGodStart && settings.fullGodEnd) {
            if (now >= settings.fullGodStart && now <= settings.fullGodEnd) {
                return true;
            }
        }

        // 2. Check Recurring Time Window
        if (!settings.timeWindowStart || !settings.timeWindowEnd) {
            return true; // No window set = always active if only using recurring check
        }

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

        // 1. CHURN RISK RE-ENGAGEMENT
        if (prediction?.churnRisk && prediction.churnRisk > 0.5) {
            // Generate Brain-Powered Draft
            const prompt = `Draft a friendly, low-pressure re-engagement email for ${contact.name}. 
            Context: They haven't been active recently. The goal is to start a conversation, not sell. 
            Tone: Warm, NZ professional. Max 3 sentences.`;

            const draftBody = await askZenaService.askBrain(prompt, {
                jsonMode: false,
                systemPrompt: 'You are Zena, a world-class real estate assistant. Write only the email body.'
            });

            suggestions.push({
                userId,
                contactId,
                actionType: 'send_email',
                priority: 8,
                title: `Re-engage ${contact.name} (High churn risk)`,
                description: `WHY IT MATTERS: This contact has reached a high churn risk threshold (${prediction.churnRisk.toFixed(2)}) due to recent inactivity. GAIN: Sending a personalized re-engagement email now will rebuild trust and ensure they choose you when they are ready to transact, rather than going to a competitor.`,
                reasoning: `Contact ${contact.name} has a high churn risk of ${prediction.churnRisk.toFixed(2)}. This is based on their digital behavior signatures and lack of recent engagement.`,
                intelligenceSources: [
                    { type: 'prediction', id: contact.id, summary: `Churn Risk: ${prediction.churnRisk.toFixed(2)}` }
                ],
                draftSubject: `Thinking of you - ${contact.name.split(' ')[0]}`,
                draftBody: draftBody,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        // 2. HIGH INTENT FOLLOW-UP
        if (prediction?.sellProbability && prediction.sellProbability > 0.6) {
            const prompt = `Draft a follow-up email for ${contact.name}.
             Context: Our system detected they are likely looking to sell soon (${Math.round(prediction.sellProbability * 100)}% probability).
             Goal: Offer a market appraisal or coffee chat.
             Tone: Professional, helpful, astute.`;

            const draftBody = await askZenaService.askBrain(prompt, {
                jsonMode: false,
                systemPrompt: 'You are Zena, a world-class real estate assistant. Write only the email body.'
            });

            suggestions.push({
                userId,
                contactId,
                actionType: 'schedule_followup',
                priority: 9,
                title: `Follow up with ${contact.name} (High sell intent)`,
                description: `WHY IT MATTERS: Our neural analysis detected a ${Math.round(prediction.sellProbability * 100)}% sell probability based on their specific digital behavior and engagement patterns. GAIN: By offering a market appraisal now, you establish yourself as the proactive expert, significantly increasing your chances of securing the exclusive listing.`,
                reasoning: `Predictive analysis indicates a ${Math.round(prediction.sellProbability * 100)}% probability that ${contact.name} is preparing to sell. This is triggered by specific engagement patterns with property listings and market reports.`,
                intelligenceSources: [
                    { type: 'prediction', id: contact.id, summary: `Sell Probability: ${Math.round(prediction.sellProbability * 100)}%` }
                ],
                draftSubject: `Market update for ${contact.name}`,
                draftBody: draftBody,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        return suggestions;
    }

    /**
     * Generate suggested actions for a PROPERTY based on intelligence data
     * This powers property-level Godmode actions
     */
    async generatePropertySuggestedActions(propertyId: string, userId: string): Promise<CreateActionInput[]> {
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                vendors: true,
                prediction: true,
            },
        });

        if (!property) return [];

        const suggestions: CreateActionInput[] = [];
        const settings = await this.getSettings(userId);

        const daysOnMarket = Math.floor((new Date().getTime() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const vendorName = property.vendors?.[0]?.name || 'the vendor';
        const vendorEmail = property.vendors?.[0]?.emails?.[0];

        // 1. VENDOR UPDATE OVERDUE (14+ days)
        if (daysOnMarket > 14 && vendorEmail) {
            const prompt = `Draft a vendor update email for ${vendorName} about their property at ${property.address}.
            Context: The property has been on market for ${daysOnMarket} days.
            Include: current market activity, feedback summary, and next steps.
            Tone: Professional, reassuring, NZ real estate style. Max 4 sentences.`;

            const draftBody = await askZenaService.askBrain(prompt, {
                jsonMode: false,
                systemPrompt: 'You are Zena, a world-class real estate assistant. Write only the email body.'
            });

            suggestions.push({
                userId,
                propertyId,
                actionType: 'vendor_update',
                priority: 7,
                title: `Send vendor update for ${property.address.split(',')[0]}`,
                description: `WHY IT MATTERS: With ${daysOnMarket} days on market and no formal update, ${vendorName} is likely feeling a lack of transparency and progress. GAIN: A detailed market activity report will rebuild their confidence in your marketing effort and keep them committed to the sales process.`,
                reasoning: `Property at ${property.address} has been on market for ${daysOnMarket} days without a formal vendor update. Vendor ${vendorName} requires a transparency-building touchpoint.`,
                intelligenceSources: [
                    { type: 'property', id: property.id, summary: `${daysOnMarket} Days on Market` }
                ],
                draftSubject: `Market Update - ${property.address.split(',')[0]}`,
                draftBody,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        // 2. PRICE REVIEW NEEDED (45+ DOM with low momentum)
        const momentum = property.prediction?.momentumScore || 50;
        if (daysOnMarket > 45 && momentum < 50 && vendorEmail) {
            suggestions.push({
                userId,
                propertyId,
                actionType: 'price_review',
                priority: 8,
                title: `Price review discussion for ${property.address.split(',')[0]}`,
                description: `WHY IT MATTERS: After ${daysOnMarket} days and with momentum at only ${momentum}%, the market is clearly giving feedback that the current pricing is meeting resistance. GAIN: Initiating a strategy review now allows you to stay ahead of the narrative, showing ${vendorName} that you are actively managing their sale rather than waiting for it to fail.`,
                draftSubject: `Strategy Discussion - ${property.address.split(',')[0]}`,
                draftBody: `Hi ${vendorName.split(' ')[0]},\n\nI wanted to schedule a time to discuss our marketing strategy for ${property.address}. After ${daysOnMarket} days on the market, I'd like to review our approach and explore some options to generate more interest.\n\nWould you be available for a call this week?\n\nBest regards`,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        // 3. HOT PROPERTY - BUYER MATCH INTRO (high momentum)
        if (momentum >= 80) {
            const buyerInterest = property.prediction?.buyerInterestLevel || 'High';
            suggestions.push({
                userId,
                propertyId,
                actionType: 'buyer_match_intro',
                priority: 9,
                title: `Buyer match intro for ${property.address.split(',')[0]}`,
                description: `WHY IT MATTERS: We've detected a significant surge in momentum (${momentum}%) and buyer interest level is now ${buyerInterest}. GAIN: Introducing matched buyers immediately while enthusiasm is high will create competitive tension and drive the best possible price for your vendor.`,
                mode: settings.mode === 'full_god' ? 'full_god' : 'demi_god',
            });
        }

        return suggestions;
    }

    // Private execution methods

    private async executeSendEmail(action: any): Promise<ExecutionResult> {
        const contactName = action.contact?.name || 'Contact';
        const address = action.contact?.emails?.[0] || 'Unknown address';

        console.log(`[Godmode] ⚡️ EXECUTING EMAIL: Sending to ${contactName} (${address}): ${action.draftSubject}`);

        // Record in Timeline
        await timelineService.recordEvent({
            userId: action.userId,
            entityType: 'contact',
            entityId: action.contactId,
            type: 'email',
            summary: `Automated email sent by Zena: ${action.draftSubject}`,
            content: action.draftBody,
            timestamp: new Date(),
        });

        return {
            success: true,
            message: `Email sent to ${contactName}`,
            data: {
                to: address,
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
    async runThrottledScan(userId: string): Promise<{ success: boolean; message: string; data?: any }> {
        const settings = await this.getSettings(userId);
        const lastScan = settings.lastGodmodeScanAt;
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

        if (lastScan && (Date.now() - new Date(lastScan).getTime() < SIX_HOURS_MS)) {
            const timeRemaining = Math.ceil((SIX_HOURS_MS - (Date.now() - new Date(lastScan).getTime())) / (60 * 1000));
            console.log(`[Godmode] Throttling scan for user ${userId}. Next scan possible in ${timeRemaining} minutes.`);
            return {
                success: false,
                message: `Scan throttled. Next scan available in ${timeRemaining}m.`,
                data: { nextScanPossibleIn: timeRemaining }
            };
        }

        console.log(`[Godmode] Triggering throttled scan for user ${userId}...`);

        // 1. Update last scan timestamp immediately to prevent race conditions
        await this.updateSettings(userId, { lastGodmodeScanAt: new Date() });

        // 2. Run the actual scan (this covers both contacts and properties in its current implementation)
        const result = await this.runAutoScan(userId);

        return {
            success: true,
            message: `Scan completed. ${result.queued} actions queued, ${result.executed} executed.`,
            data: result
        };
    }

    /**
     * HEARTBEAT: Run autonomous scan for a user
     * This makes Godmode truly "alive" by checking for actions without user input
     */
    async runAutoScan(userId: string): Promise<{ queued: number; executed: number }> {
        const settings = await this.getSettings(userId);
        if (settings.mode === 'off') return { queued: 0, executed: 0 };

        // 1. Get candidate contacts (active or recently updated to save tokens)
        // For '10 records' scale, we check all. For production, we'd limit.
        const contacts = await prisma.contact.findMany({
            where: { userId, archived: false },
            select: { id: true, name: true }
        });

        let queued = 0;
        let executed = 0;

        console.log(`[Godmode] Running heartbeat scan for ${userId} (${contacts.length} contacts)`);

        for (const contact of contacts) {
            try {
                // 2. Generate Suggestions (Brain Power)
                const suggestions = await this.generateSuggestedActions(contact.id, userId);

                for (const suggestion of suggestions) {
                    // 3. Duplicate Check: Don't spam
                    const recent = await prisma.autonomousAction.findFirst({
                        where: {
                            contactId: contact.id,
                            actionType: suggestion.actionType,
                            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h cooldown
                        }
                    });
                    if (recent) continue;

                    // 4. Create Action Record
                    const action = await this.queueAction(suggestion);
                    queued++;

                    // 5. AUTO-EXECUTE if Full God
                    if (settings.mode === 'full_god') {
                        // Double check confidence/priority if needed, but suggestion implies it passed threshold
                        console.log(`[Godmode] ⚡️ FULL GOD EXECUTION: ${action.title}`);
                        await this.executeAction(action.id, userId);
                        executed++;
                    }
                }
            } catch (error) {
                console.error(`[Godmode] Error scanning contact ${contact.id}:`, error);
            }
        }

        return { queued, executed };
    }
}

export const godmodeService = new GodmodeService();
