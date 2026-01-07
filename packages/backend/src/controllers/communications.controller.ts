import { Request, Response } from 'express';
import prisma from '../config/database.js';

class CommunicationsController {

    /**
     * Send an email (mock implementation for now, but logs it)
     */
    async sendEmail(req: Request, res: Response) {
        try {
            const { recipients, subject, body, trackingId } = req.body;
            const userId = (req as any).user.userId;

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                return res.status(400).json({ error: 'Recipients are required' });
            }

            console.log(`[Communications] Sending email to ${recipients.length} recipients`);
            console.log(`[Communications] Subject: ${subject}`);

            // In a real implementation:
            // 1. Use Gmail API or SendGrid to send
            // 2. Log to database as activity

            // Log activity for each contact
            const activities = await Promise.all(recipients.map(async (recipientEmail: string) => {
                // Find contact by email
                // Note: This is simplistic, assumes 1:1 email to contact
                const contacts = await prisma.contact.findMany({
                    where: {
                        userId,
                        emails: { has: recipientEmail }
                    }
                });

                if (contacts.length > 0) {
                    const contact = contacts[0];
                    // Create timeline event
                    await prisma.timelineEvent.create({
                        data: {
                            userId,
                            entityType: 'contact',
                            entityId: contact.id,
                            type: 'email',
                            summary: `Sent email: ${subject}`,
                            content: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
                            timestamp: new Date()
                        }
                    });
                    return contact.id;
                }
                return null;
            }));

            res.json({
                success: true,
                message: `Email queued for ${recipients.length} recipients`,
                processedCount: activities.filter(Boolean).length
            });

        } catch (error) {
            console.error('[Communications] Error sending email:', error);
            res.status(500).json({ error: 'Failed to send email' });
        }
    }
}

export const communicationsController = new CommunicationsController();
