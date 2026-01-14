import prisma from '../config/database.js';
import { notificationService } from './notification.service.js';

/**
 * Reminder Scheduler Service
 * 
 * Periodically checks for upcoming appointments and property milestones
 * that have reminders configured and triggers push notifications.
 */
class ReminderSchedulerService {
    private interval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the reminder polling service
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[ReminderScheduler] Background service started.');

        // Initial check on start
        this.checkReminders();

        // Poll every minute
        this.interval = setInterval(() => this.checkReminders(), 60 * 1000);
    }

    /**
     * Stop the reminder polling service
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('[ReminderScheduler] Background service stopped.');
    }

    /**
     * Main loop to check for pending reminders
     */
    async checkReminders() {
        const now = new Date();
        // Look ahead 25 hours to cover all possible reminder intervals (max 1 day)
        const lookahead = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        try {
            // 1. Process Timeline Events (General Appointments)
            const events = await prisma.timelineEvent.findMany({
                where: {
                    type: 'meeting',
                    timestamp: {
                        gte: now,
                        lte: lookahead
                    }
                    // Note: We can't easily filter by JSON metadata content in a cross-DB way via Prisma directly
                    // so we filter by time and type first, then check metadata in memory.
                }
            });

            for (const event of events) {
                const metadata = (event.metadata as any) || {};

                // If there's a reminder interval and it hasn't been sent yet
                if (metadata.reminder && !metadata.reminderSent) {
                    const eventTime = new Date(event.timestamp);
                    if (this.shouldTrigger(eventTime, metadata.reminder)) {
                        console.log(`[ReminderScheduler] Triggering reminder for event: ${event.summary} (${event.id})`);

                        await notificationService.notifyCalendarReminder(
                            event.userId,
                            event.id,
                            event.summary,
                            eventTime
                        );

                        // Persist sent status
                        await prisma.timelineEvent.update({
                            where: { id: event.id },
                            data: {
                                metadata: {
                                    ...metadata,
                                    reminderSent: true,
                                    reminderSentAt: new Date().toISOString()
                                }
                            }
                        });
                    }
                }
            }

            // 2. Process Property Milestones
            // Again, we fetch properties with milestones and filter in memory
            const properties = await prisma.property.findMany({
                where: {
                    milestones: { not: [] }
                }
            });

            for (const property of properties) {
                const milestones = (property.milestones as any[]) || [];
                let hasUpdates = false;

                for (const milestone of milestones) {
                    // Milestone matches if it has a reminder that hasn't been sent
                    if (milestone.reminder && !milestone.reminderSent) {
                        const eventTime = new Date(milestone.date);

                        // Check if it's within our lookahead window and time to trigger
                        if (eventTime >= now && eventTime <= lookahead && this.shouldTrigger(eventTime, milestone.reminder)) {
                            console.log(`[ReminderScheduler] Triggering reminder for milestone: ${milestone.title} at ${property.address}`);

                            await notificationService.notifyCalendarReminder(
                                property.userId,
                                milestone.id,
                                milestone.title || `Appointment at ${property.address}`,
                                eventTime
                            );

                            milestone.reminderSent = true;
                            milestone.reminderSentAt = new Date().toISOString();
                            hasUpdates = true;
                        }
                    }
                }

                if (hasUpdates) {
                    // Update the property's milestone JSON array
                    await prisma.property.update({
                        where: { id: property.id },
                        data: { milestones }
                    });
                }
            }
        } catch (error) {
            console.error('[ReminderScheduler] Critical error in check cycle:', error);
        }
    }

    /**
     * Determine if a reminder should be triggered based on interval
     */
    private shouldTrigger(eventTime: Date, interval: string): boolean {
        const now = new Date();
        const eventMs = eventTime.getTime();
        let offsetMs = 0;

        switch (interval) {
            case '5m': offsetMs = 5 * 60 * 1000; break;
            case '15m': offsetMs = 15 * 60 * 1000; break;
            case '30m': offsetMs = 30 * 60 * 1000; break;
            case '1h': offsetMs = 60 * 60 * 1000; break;
            case '1d': offsetMs = 24 * 60 * 60 * 1000; break;
            default: return false;
        }

        const triggerTime = eventMs - offsetMs;

        // Trigger if:
        // 1. Current time is >= triggerTime
        // 2. We haven't passed the event time yet (don't send reminders for past events)
        return now.getTime() >= triggerTime && now.getTime() < eventMs;
    }
}

export const reminderSchedulerService = new ReminderSchedulerService();
