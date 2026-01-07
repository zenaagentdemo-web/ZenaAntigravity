// Deal Scheduler Service - Background job for proactive deal monitoring
import { Deal } from '@prisma/client';
import { notificationService } from './notification.service.js';
import { ZenaActionType } from './zena-actions.service.js';
import { DealCondition } from '../models/types.js';
import { nurtureService } from './nurture.service.js';
import prisma from '../config/database.js';

// Scheduler configuration
const SCAN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MORNING_BRIEFING_HOUR = 8; // 8 AM local time
const STALE_DEAL_THRESHOLD_DAYS = 14;
const SETTLEMENT_COUNTDOWN_START_DAYS = 7;

interface ScanResult {
    conditionsChecked: number;
    actionsTriggered: number;
    notificationsSent: number;
}

interface DealWithRelations extends Deal {
    property?: { address: string } | null;
}

export class DealSchedulerService {
    private scanIntervalId: NodeJS.Timeout | null = null;
    private morningBriefingIntervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.isRunning) {
            console.log('[DealScheduler] Already running');
            return;
        }

        console.log('[DealScheduler] Starting scheduler...');
        this.isRunning = true;

        // Run initial scan after 1 minute (allow server to fully start)
        setTimeout(() => {
            this.checkAllDeadlines().catch(console.error);
        }, 60 * 1000);

        // Schedule hourly scans
        this.scanIntervalId = setInterval(() => {
            this.checkAllDeadlines().catch(console.error);
        }, SCAN_INTERVAL_MS);

        // Schedule morning briefing check every 30 minutes
        this.morningBriefingIntervalId = setInterval(() => {
            this.checkMorningBriefingTime().catch(console.error);
        }, 30 * 60 * 1000);

        console.log('[DealScheduler] Scheduler started');
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        console.log('[DealScheduler] Stopping scheduler...');

        if (this.scanIntervalId) {
            clearInterval(this.scanIntervalId);
            this.scanIntervalId = null;
        }

        if (this.morningBriefingIntervalId) {
            clearInterval(this.morningBriefingIntervalId);
            this.morningBriefingIntervalId = null;
        }

        this.isRunning = false;
        console.log('[DealScheduler] Scheduler stopped');
    }

    /**
     * Check all deadlines for all users
     */
    async checkAllDeadlines(): Promise<void> {
        console.log('[DealScheduler] Running deadline scan...');

        try {
            // Get all users (we check preferences in the query if they exist)
            const users = await prisma.user.findMany({
                select: { id: true }
            });

            for (const user of users) {
                await this.scanConditions(user.id);
            }

            console.log(`[DealScheduler] Scan complete. Checked ${users.length} users.`);
        } catch (error) {
            console.error('[DealScheduler] Error in deadline scan:', error);
        }
    }

    /**
     * Scan conditions for upcoming/overdue deadlines
     */
    async scanConditions(userId: string): Promise<ScanResult> {
        const result: ScanResult = {
            conditionsChecked: 0,
            actionsTriggered: 0,
            notificationsSent: 0
        };

        try {
            // Get all active deals with conditions
            const deals = await prisma.deal.findMany({
                where: {
                    userId,
                    stage: {
                        notIn: ['settled', 'nurture']
                    }
                },
                include: {
                    property: { select: { address: true } }
                }
            }) as DealWithRelations[];

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            for (const deal of deals) {
                if (!deal.conditions) continue;

                const conditions = deal.conditions as unknown as DealCondition[];
                const propertyAddress = deal.property?.address || deal.summary;

                for (const condition of conditions) {
                    if (condition.status !== 'pending') continue;
                    result.conditionsChecked++;

                    const dueDate = new Date(condition.dueDate);
                    const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                    const daysRemaining = Math.ceil((dueDateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    // Check if notification is needed
                    if (daysRemaining <= 3 && daysRemaining >= 0) {
                        // Check if we've already notified today
                        const existingNotification = await this.hasRecentNotification(
                            userId,
                            deal.id,
                            condition.type,
                            24 // hours
                        );

                        if (!existingNotification) {
                            // Send notification
                            await this.notifyDealDeadline(
                                userId,
                                deal.id,
                                propertyAddress,
                                condition.label,
                                daysRemaining
                            );
                            result.notificationsSent++;

                            // Create/update Zena action
                            const actionType = this.getActionTypeForCondition(condition.type);
                            if (actionType) {
                                result.actionsTriggered++;
                            }
                        }
                    }
                }

                // Check settlement countdown
                if (deal.settlementDate) {
                    const settlementDays = Math.ceil(
                        (deal.settlementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (settlementDays <= SETTLEMENT_COUNTDOWN_START_DAYS && settlementDays >= 0) {
                        const existingNotification = await this.hasRecentNotification(
                            userId,
                            deal.id,
                            'settlement_countdown',
                            24
                        );

                        if (!existingNotification) {
                            await this.notifySettlementCountdown(
                                userId,
                                deal.id,
                                propertyAddress,
                                settlementDays
                            );
                            result.notificationsSent++;
                        }
                    }
                }
            }

            // Check for stale deals
            const staleDeals = await this.detectStaleDeals(userId, STALE_DEAL_THRESHOLD_DAYS);
            for (const deal of staleDeals) {
                const existingNotification = await this.hasRecentNotification(
                    userId,
                    deal.id,
                    'stale_deal',
                    24 * 7 // Only remind once per week
                );

                if (!existingNotification) {
                    await this.notifyStaleDeal(userId, deal);
                    result.notificationsSent++;
                }
            }

        } catch (error) {
            console.error(`[DealScheduler] Error scanning conditions for user ${userId}:`, error);
        }

        return result;
    }

    /**
     * Detect deals stuck in same stage > threshold days
     */
    async detectStaleDeals(userId: string, thresholdDays: number): Promise<DealWithRelations[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

        const staleDeals = await prisma.deal.findMany({
            where: {
                userId,
                stage: {
                    notIn: ['settled', 'nurture']
                },
                stageEnteredAt: {
                    lte: cutoffDate
                }
            },
            include: {
                property: { select: { address: true } }
            }
        }) as DealWithRelations[];

        return staleDeals;
    }

    /**
     * Check if it's time for morning briefing
     */
    private async checkMorningBriefingTime(): Promise<void> {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Check if it's between 8:00 and 8:30 AM
        if (hour === MORNING_BRIEFING_HOUR && minute < 30) {
            await this.sendAllMorningBriefings();
        }
    }

    /**
     * Send morning briefings to all enabled users
     */
    private async sendAllMorningBriefings(): Promise<void> {
        try {
            // Get all users
            const users = await prisma.user.findMany({
                select: { id: true }
            });

            for (const user of users) {
                // Check if briefing already sent today
                const existingBriefing = await this.hasRecentNotification(
                    user.id,
                    'morning_briefing',
                    'morning_briefing',
                    20 // hours - ensure one per day
                );

                if (!existingBriefing) {
                    await this.sendMorningBriefing(user.id);
                }
            }
        } catch (error) {
            console.error('[DealScheduler] Error sending morning briefings:', error);
        }
    }

    /**
     * Send morning briefing to a user
     */
    async sendMorningBriefing(userId: string): Promise<void> {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get deal counts
            const deals = await prisma.deal.findMany({
                where: {
                    userId,
                    stage: { notIn: ['settled', 'nurture'] }
                }
            });

            let todayCount = 0;
            let overdueCount = 0;
            let atRiskCount = 0;

            for (const deal of deals) {
                if (deal.riskLevel && ['critical', 'high'].includes(deal.riskLevel)) {
                    atRiskCount++;
                }

                if (deal.conditions) {
                    const conditions = deal.conditions as unknown as DealCondition[];
                    for (const condition of conditions) {
                        if (condition.status !== 'pending') continue;

                        const dueDate = new Date(condition.dueDate);
                        const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

                        if (dueDateNormalized.getTime() === today.getTime()) {
                            todayCount++;
                        } else if (dueDateNormalized < today) {
                            overdueCount++;
                        }
                    }
                }
            }

            // Get pending nurture touches
            const pendingTouches = await nurtureService.getPendingTouches(userId);
            const nurtureCount = pendingTouches.length;

            // Only send if there's something to report
            if (todayCount > 0 || overdueCount > 0 || atRiskCount > 0 || nurtureCount > 0) {
                await this.notifyMorningBriefing(userId, { todayCount, overdueCount, atRiskCount, nurtureCount });

                // Log the notification
                await this.logNotification(userId, 'morning_briefing', 'morning_briefing');
            }

        } catch (error) {
            console.error(`[DealScheduler] Error sending morning briefing for user ${userId}:`, error);
        }
    }

    // ============ Notification Methods ============

    private async notifyDealDeadline(
        userId: string,
        dealId: string,
        propertyAddress: string,
        conditionLabel: string,
        daysRemaining: number
    ): Promise<void> {
        const urgency = daysRemaining === 0 ? '🚨' : daysRemaining === 1 ? '⚠️' : '📅';
        const timeText = daysRemaining === 0
            ? 'today'
            : daysRemaining === 1
                ? 'tomorrow'
                : `in ${daysRemaining} days`;

        await notificationService.sendNotification(userId, {
            title: `${urgency} ${conditionLabel} Due`,
            body: `${propertyAddress}: ${conditionLabel} is due ${timeText}`,
            data: {
                type: 'deal_deadline',
                dealId,
                conditionLabel
            },
            tag: `deadline-${dealId}-${conditionLabel}`,
            requireInteraction: daysRemaining <= 1
        });

        await this.logNotification(userId, dealId, conditionLabel);
    }

    private async notifySettlementCountdown(
        userId: string,
        dealId: string,
        propertyAddress: string,
        daysRemaining: number
    ): Promise<void> {
        const emoji = daysRemaining <= 2 ? '🔑' : '📅';

        await notificationService.sendNotification(userId, {
            title: `${emoji} Settlement in ${daysRemaining} days`,
            body: propertyAddress,
            data: {
                type: 'settlement_countdown',
                dealId
            },
            tag: `settlement-${dealId}`
        });

        await this.logNotification(userId, dealId, 'settlement_countdown');
    }

    private async notifyStaleDeal(userId: string, deal: DealWithRelations): Promise<void> {
        const daysInStage = Math.floor(
            (Date.now() - deal.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const propertyAddress = deal.property?.address || deal.summary;

        await notificationService.sendNotification(userId, {
            title: '⏰ Deal needs attention',
            body: `${propertyAddress} has been in ${deal.stage} for ${daysInStage} days`,
            data: {
                type: 'stale_deal',
                dealId: deal.id
            },
            tag: `stale-${deal.id}`
        });

        await this.logNotification(userId, deal.id, 'stale_deal');
    }

    private async notifyMorningBriefing(
        userId: string,
        summary: { todayCount: number; overdueCount: number; atRiskCount: number; nurtureCount?: number }
    ): Promise<void> {
        const parts: string[] = [];

        if (summary.overdueCount > 0) {
            parts.push(`${summary.overdueCount} overdue`);
        }
        if (summary.todayCount > 0) {
            parts.push(`${summary.todayCount} due today`);
        }
        if (summary.atRiskCount > 0) {
            parts.push(`${summary.atRiskCount} at risk`);
        }
        if (summary.nurtureCount && summary.nurtureCount > 0) {
            parts.push(`${summary.nurtureCount} client follow-up${summary.nurtureCount > 1 ? 's' : ''}`);
        }

        await notificationService.sendNotification(userId, {
            title: '☀️ Good morning!',
            body: `Your deals: ${parts.join(', ')}`,
            data: {
                type: 'morning_briefing',
                ...summary
            },
            tag: 'morning-briefing',
            requireInteraction: summary.overdueCount > 0
        });
    }

    // ============ Helper Methods ============

    private getPriority(daysRemaining: number): 'critical' | 'high' | 'medium' {
        if (daysRemaining <= 0) return 'critical';
        if (daysRemaining === 1) return 'high';
        return 'medium';
    }

    private getActionTypeForCondition(conditionType: string): ZenaActionType | null {
        const mapping: Record<string, ZenaActionType> = {
            finance: 'finance_followup',
            lim: 'lim_reminder',
            building_report: 'lim_reminder' // Similar action
        };
        return mapping[conditionType] || null;
    }

    private async hasRecentNotification(
        userId: string,
        dealIdOrType: string,
        notificationType: string,
        hoursAgo: number
    ): Promise<boolean> {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hoursAgo);

        // Check notification log (using ZenaAction as a log for now)
        const recent = await prisma.zenaAction.findFirst({
            where: {
                userId,
                OR: [
                    { dealId: dealIdOrType },
                    { type: notificationType }
                ],
                triggeredAt: { gte: cutoff }
            }
        });

        return !!recent;
    }

    private async logNotification(
        userId: string,
        dealIdOrType: string,
        notificationType: string
    ): Promise<void> {
        // For non-deal notifications, use a placeholder deal ID
        const dealId = dealIdOrType.includes('-') ? dealIdOrType : dealIdOrType;

        try {
            // Verify the deal exists before creating the log
            const dealExists = await prisma.deal.findUnique({
                where: { id: dealId }
            });

            if (dealExists) {
                await prisma.zenaAction.create({
                    data: {
                        userId,
                        dealId,
                        type: `notification_${notificationType}`,
                        status: 'executed',
                        output: `Notification sent: ${notificationType}`,
                        executedAt: new Date()
                    }
                });
            }
        } catch {
            // Silently fail logging - notifications are more important
        }
    }
}

export const dealSchedulerService = new DealSchedulerService();
