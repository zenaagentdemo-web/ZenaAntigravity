import { gmailConnectorService } from './gmail-connector.service.js';
import { emailAccountService } from './email-account.service.js';
import { exportService } from './export.service.js';
import prisma from '../config/database.js';

export interface DraftEmailParams {
    userId: string;
    to: string;
    subject: string;
    body: string;
}

export interface CalendarEventParams {
    userId: string;
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    location?: string;
}

export class ActionService {
    /**
     * Draft an email using the user's primary connected account
     */
    async draftEmail(params: DraftEmailParams): Promise<{ draftId: string }> {
        const { userId, to, subject, body } = params;

        // Get primary email account
        const accounts = await emailAccountService.getEmailAccountsByUserId(userId);
        if (!accounts || accounts.length === 0) {
            throw new Error('No email accounts connected');
        }

        const primaryAccount = accounts[0]; // Assuming first for now
        const accessToken = await emailAccountService.getValidAccessToken(primaryAccount.id);

        const draftId = await gmailConnectorService.createDraft(accessToken, {
            to,
            subject,
            body
        });

        return { draftId };
    }

    /**
     * Create a simulated PDF report
     */
    async generateReport(userId: string, address: string): Promise<{ exportId: string }> {
        const exportId = await exportService.createMarketReport(userId, address);
        return { exportId };
    }

    /**
     * Mock calendar event creation
     */
    async addCalendarEvent(params: CalendarEventParams): Promise<{ success: true }> {
        console.log('[ActionService] Mocking calendar event creation:', params);

        // In a real implementation, this would use calendarAccountService and google/microsoft connectors
        // For now, we'll store it in the timeline as a "meeting"
        await prisma.timelineEvent.create({
            data: {
                userId: params.userId,
                type: 'meeting',
                entityType: 'manual_action',
                entityId: `action_${Date.now()}`,
                summary: params.summary,
                content: params.description,
                timestamp: new Date(params.startTime),
                metadata: {
                    endTime: params.endTime,
                    location: params.location,
                    source: 'manual_action'
                }
            }
        });

        return { success: true };
    }
}

export const actionService = new ActionService();
