import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reminderSchedulerService } from './reminder-scheduler.service.js';
import { notificationService } from './notification.service.js';
import prisma from '../config/database.js';

vi.mock('./notification.service.js', () => ({
    notificationService: {
        notifyCalendarReminder: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('../config/database.js', () => ({
    default: {
        timelineEvent: {
            findMany: vi.fn(),
            update: vi.fn()
        },
        property: {
            findMany: vi.fn(),
            update: vi.fn()
        }
    }
}));

describe('ReminderSchedulerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger reminder if current time is within window', async () => {
        const now = new Date();
        const eventTime = new Date(now.getTime() + 4 * 60 * 1000 + 30 * 1000); // 4.5 minutes from now

        // Mock a timeline event with a 5m reminder
        (prisma.timelineEvent.findMany as any).mockResolvedValue([{
            id: 'event-1',
            userId: 'user-1',
            summary: 'Test Meeting',
            timestamp: eventTime,
            metadata: { reminder: '5m' }
        }]);

        (prisma.property.findMany as any).mockResolvedValue([]);

        await reminderSchedulerService.checkReminders();

        expect(notificationService.notifyCalendarReminder).toHaveBeenCalled();
        expect(prisma.timelineEvent.update).toHaveBeenCalledWith({
            where: { id: 'event-1' },
            data: expect.objectContaining({
                metadata: expect.objectContaining({
                    reminderSent: true
                })
            })
        });
    });

    it('should NOT trigger reminder if event is too far in future', async () => {
        const now = new Date();
        const eventTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now (for 5m reminder)

        (prisma.timelineEvent.findMany as any).mockResolvedValue([{
            id: 'event-2',
            userId: 'user-1',
            summary: 'Future Meeting',
            timestamp: eventTime,
            metadata: { reminder: '5m' }
        }]);

        (prisma.property.findMany as any).mockResolvedValue([]);

        await reminderSchedulerService.checkReminders();

        expect(notificationService.notifyCalendarReminder).not.toHaveBeenCalled();
    });

    it('should NOT trigger reminder if already sent', async () => {
        const now = new Date();
        const eventTime = new Date(now.getTime() + 4 * 60 * 1000);

        (prisma.timelineEvent.findMany as any).mockResolvedValue([{
            id: 'event-3',
            userId: 'user-1',
            summary: 'Already Sent',
            timestamp: eventTime,
            metadata: { reminder: '5m', reminderSent: true }
        }]);

        (prisma.property.findMany as any).mockResolvedValue([]);

        await reminderSchedulerService.checkReminders();

        expect(notificationService.notifyCalendarReminder).not.toHaveBeenCalled();
    });

    it('should correctly handle property milestones', async () => {
        const now = new Date();
        const milestoneTime = new Date(now.getTime() + 14 * 60 * 1000); // 14 mins out for 15m reminder

        (prisma.timelineEvent.findMany as any).mockResolvedValue([]);
        (prisma.property.findMany as any).mockResolvedValue([{
            id: 'prop-1',
            userId: 'user-2',
            address: '123 Fake St',
            milestones: [
                { id: 'm-1', title: 'Open Home', date: milestoneTime.toISOString(), reminder: '15m' }
            ]
        }]);

        await reminderSchedulerService.checkReminders();

        expect(notificationService.notifyCalendarReminder).toHaveBeenCalledWith(
            'user-2',
            'm-1',
            'Open Home',
            expect.any(Date)
        );
        expect(prisma.property.update).toHaveBeenCalled();
    });
});
