
import { PrismaClient, Prisma, Task, Contact, TimelineEvent } from '@prisma/client';
import prisma from '../config/database.js';

interface DriveTaskItem {
    id: string;
    type: 'call' | 'voice_note' | 'navigate' | 'email_triage' | 'strategy_session' | 'task_triage';
    title: string;
    subtitle?: string;
    context?: string;
    duration?: string;
    phoneNumber?: string;
    address?: string;
    priority: number; // Higher is earlier in queue
    entityId?: string; // ContactId or PropertyId
    actions?: string[]; // Available actions for the UI
    data?: any; // Extra payload (e.g. email body)
}

export class DriveModeService {

    // Main entry point to get the intelligent queue
    async getDriveQueue(userId: string): Promise<DriveTaskItem[]> {
        const queue: DriveTaskItem[] = [];

        // 1. Get Approaching Appointments (Navigate)
        const navigationTasks = await this.getNavigationTasks(userId);
        queue.push(...navigationTasks);

        // 2. Get Email Triage Items (High Priority)
        const emailTasks = await this.getEmailTriageItems(userId);
        queue.push(...emailTasks);

        // 3. Get Pending Calls (Call)
        const callTasks = await this.getCallTasks(userId);
        queue.push(...callTasks);

        // 4. Get Strategy Sessions
        const strategyTasks = await this.getStrategyItems(userId);
        queue.push(...strategyTasks);

        // 5. Get General Task Triage (Due Today/Overdue)
        const taskTriageItems = await this.getTaskTriageItems(userId);
        queue.push(...taskTriageItems);

        // 6. Get Admin Dictation items (Voice Note)
        const dictationTasks = await this.getDictationTasks(userId);
        queue.push(...dictationTasks);

        // Sort by priority
        return queue.sort((a, b) => b.priority - a.priority);
    }

    private async getNavigationTasks(userId: string): Promise<DriveTaskItem[]> {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // Find next calendar event with a location
        const nextEvent = await prisma.timelineEvent.findFirst({
            where: {
                userId,
                timestamp: { gte: now, lte: twoHoursFromNow }
            },
            orderBy: { timestamp: 'asc' }
        });

        if (nextEvent) {
            const location = (nextEvent.metadata as any)?.location;
            if (location) {
                return [{
                    id: `nav-${nextEvent.id}`,
                    type: 'navigate',
                    title: `Drive to ${nextEvent.summary}`,
                    subtitle: location,
                    address: location,
                    context: `Next Appt: ${nextEvent.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    priority: 100 // Highest priority
                }];
            }
        }
        return [];
    }

    private async getEmailTriageItems(userId: string): Promise<DriveTaskItem[]> {
        // MOCKED for Phase 3 - In real implementation, this would query the EmailAccount/Thread models
        return [
            {
                id: 'email-1',
                type: 'email_triage',
                title: 'Margaret Thompson: Feedback 24 Ponsonby Rd',
                subtitle: '"The buyers loved the kitchen and the natural light!"',
                context: 'Unread - High Priority',
                priority: 95,
                actions: ['read', 'reply', 'archive', 'skip'],
                data: { body: "Hi Agent, just wanted to pass on the feedback from the Open Home. One couple specifically mentioned the kitchen renovation and the natural light in the master bedroom. They seemed very keen!" }
            },
            {
                id: 'email-2',
                type: 'email_triage',
                title: 'Charlie Stevens (Lawyer): Settlement Update',
                subtitle: '"Compiling documents for the Mission Bay settlement."',
                context: 'Unread - Urgent',
                priority: 92,
                actions: ['read', 'reply', 'archive', 'skip'],
                data: { body: "Please find attached the draft settlement statement for 102 Tamaki Drive. We are on track for Friday. Please confirm you have received the deposit confirmation." }
            },
            {
                id: 'email-3',
                type: 'email_triage',
                title: 'Bob Richards: Ready to Move',
                subtitle: '"We are ready to sign a conditional offer for Herne Bay."',
                context: 'Unread - Deal Potential',
                priority: 90,
                actions: ['read', 'reply', 'archive', 'skip'],
                data: { body: "Hey, Emily and I have discussed it and we want to move forward with 12 Jervois Road. We are ready to sign a conditional offer at $2.95M. Can we meet this afternoon?" }
            },
            {
                id: 'email-4',
                type: 'email_triage',
                title: 'Photography Team: Photos 45 Mt Eden',
                subtitle: '"The listing photos are ready for your review."',
                context: 'Unread - Listing Prep',
                priority: 88,
                actions: ['read', 'reply', 'archive', 'skip'],
                data: { body: "The professional photos for 45 Mount Eden Road are now available on the portal. They look fantastic! Please let us know if you want any retouched before we push them to the portal." }
            },
            {
                id: 'email-5',
                type: 'email_triage',
                title: 'Diana Prince: Market Update',
                subtitle: '"Rates are dropping - good news for our Herne Bay buyer."',
                context: 'Unread - Intel',
                priority: 85,
                actions: ['read', 'reply', 'archive', 'skip'],
                data: { body: "Hi, just a heads up that we've seen some movement on fixed rates this morning. This gives Bob Richards about $150k more borrowing power. Might be a good time to push for a higher offer." }
            }
        ];
    }

    private async getStrategyItems(userId: string): Promise<DriveTaskItem[]> {
        const tasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                OR: [
                    { label: { contains: 'Strategy', mode: 'insensitive' } },
                    { label: { contains: 'Plan', mode: 'insensitive' } },
                    { label: { contains: 'Review', mode: 'insensitive' } }
                ]
            },
            take: 2
        });

        return tasks.map(t => ({
            id: t.id,
            type: 'strategy_session',
            title: t.label,
            subtitle: 'Start brainstorming session',
            context: 'Deep Work',
            duration: '15 min',
            priority: 60,
            actions: ['start_session', 'skip']
        }));
    }

    private async getTaskTriageItems(userId: string): Promise<DriveTaskItem[]> {
        // Tasks due today or overdue, excluding calls/emails which are handled elsewhere
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                dueDate: { lte: endOfDay },
                NOT: [
                    { label: { contains: 'Call', mode: 'insensitive' } },
                    { label: { contains: 'Phone', mode: 'insensitive' } },
                    { label: { contains: 'Email', mode: 'insensitive' } },
                    { label: { contains: 'Draft', mode: 'insensitive' } },
                    { label: { contains: 'Strategy', mode: 'insensitive' } }
                ]
            },
            take: 5
        });

        return tasks.map(t => ({
            id: t.id,
            type: 'task_triage',
            title: t.label,
            subtitle: t.dueDate ? `Due: ${t.dueDate.toLocaleDateString()}` : 'No due date',
            context: 'Quick Triage',
            priority: 45,
            actions: ['complete', 'snooze', 'skip']
        }));
    }

    private async getCallTasks(userId: string): Promise<DriveTaskItem[]> {
        const tasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                OR: [
                    { context: 'drive' },
                    { label: { contains: 'Call', mode: 'insensitive' } },
                    { label: { contains: 'Phone', mode: 'insensitive' } }
                ]
            },
            take: 5
        });

        const items: DriveTaskItem[] = [];

        for (const task of tasks) {
            let phoneNumber = '';
            let subtitle = 'Tap to call';

            if (task.contactId) {
                const contact = await prisma.contact.findUnique({ where: { id: task.contactId } });
                if (contact && contact.phones.length > 0) {
                    phoneNumber = contact.phones[0];
                    subtitle = `${contact.name} - ${contact.role}`;
                }
            }

            items.push({
                id: task.id,
                type: 'call',
                title: task.label,
                subtitle: subtitle,
                phoneNumber: phoneNumber || undefined,
                context: task.context || 'Call',
                duration: task.estimatedDuration ? `${task.estimatedDuration} min` : '5 min',
                priority: 50,
                entityId: task.contactId || undefined,
                actions: ['call', 'skip', 'complete']
            });
        }

        return items;
    }

    private async getDictationTasks(userId: string): Promise<DriveTaskItem[]> {
        const tasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'open',
                OR: [
                    { label: { contains: 'Draft', mode: 'insensitive' } },
                    { label: { contains: 'Write', mode: 'insensitive' } },
                    { label: { contains: 'Email', mode: 'insensitive' } }
                ]
            },
            take: 3
        });

        return tasks.map(t => ({
            id: t.id,
            type: 'voice_note',
            title: t.label,
            subtitle: 'Dictate to complete',
            context: 'Admin',
            duration: '5 min',
            priority: 40,
            actions: ['dictate', 'skip']
        }));
    }
}

export const driveModeService = new DriveModeService();
