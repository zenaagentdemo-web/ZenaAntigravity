import nodemailer from 'nodemailer';
import prisma from '../config/database.js';
import { Contact, Property } from '@prisma/client';

export interface CrmSyncResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export class CrmDeliveryService {
    private transporter: nodemailer.Transporter | null = null;
    private isDevelopment: boolean;

    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST;

        // Only create real transporter if SMTP is configured
        if (!this.isDevelopment && process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
    }

    /**
     * Simulate email send in development mode
     */
    private async simulateSend(to: string, subject: string): Promise<{ messageId: string }> {
        console.log(`[CrmDeliveryService] 📧 DEV MODE - Simulating email to: ${to}`);
        console.log(`[CrmDeliveryService] 📧 Subject: ${subject}`);
        // Return a mock message ID
        return { messageId: `dev-mock-${Date.now()}@zena.ai` };
    }

    /**
     * Sync a contact to the user's CRM via email bridge (sends to all configured addresses)
     */
    async syncContact(userId: string, contact: Contact): Promise<CrmSyncResult> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { crmEmails: true, crmType: true, email: true }
            });

            const crmEmails = (user?.crmEmails as Array<{ email: string, type?: string }>) || [];

            if (crmEmails.length === 0) {
                throw new Error('CRM Email Bridge not configured for this user');
            }

            const subject = `[ZENA SYNC] Contact Update — ${contact.name}`;
            const body = this.generateContactEmailBody(contact, user?.crmType || 'generic');
            const allMessageIds: string[] = [];

            // Send to ALL configured CRM emails
            for (const crmConfig of crmEmails) {
                const mailOptions = {
                    from: `"Zena AI" <sync@zena.ai>`,
                    to: crmConfig.email,
                    replyTo: user?.email,
                    subject,
                    text: body,
                };

                const info = this.isDevelopment
                    ? await this.simulateSend(crmConfig.email, subject)
                    : await this.transporter!.sendMail(mailOptions);

                allMessageIds.push(info.messageId);

                // Record each send in sync ledger
                await prisma.crmSyncLedger.create({
                    data: {
                        userId,
                        entityType: 'contact',
                        entityId: contact.id,
                        crmTarget: crmConfig.type || user?.crmType || 'generic',
                        syncMethod: 'email',
                        syncStatus: 'sent',
                        emailMessageId: info.messageId,
                    }
                });
            }

            // Update contact's last synchronized timestamp
            await prisma.contact.update({
                where: { id: contact.id },
                data: { lastCrmExportAt: new Date() }
            });

            return { success: true, messageId: allMessageIds.join(', ') };
        } catch (error) {
            console.error('[CrmDeliveryService] Contact sync failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }


    /**
     * Sync a property to the user's CRM via email bridge (sends to all configured addresses)
     */
    async syncProperty(userId: string, property: Property): Promise<CrmSyncResult> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { crmEmails: true, crmType: true, email: true }
            });

            const crmEmails = (user?.crmEmails as Array<{ email: string, type?: string }>) || [];

            if (crmEmails.length === 0) {
                throw new Error('CRM Email Bridge not configured for this user');
            }

            const subject = `[ZENA SYNC] Property Update — ${property.address}`;
            const body = this.generatePropertyEmailBody(property, user?.crmType || 'generic');
            const allMessageIds: string[] = [];

            // Send to ALL configured CRM emails
            for (const crmConfig of crmEmails) {
                const mailOptions = {
                    from: `"Zena AI" <sync@zena.ai>`,
                    to: crmConfig.email,
                    replyTo: user?.email,
                    subject,
                    text: body,
                };

                const info = this.isDevelopment
                    ? await this.simulateSend(crmConfig.email, subject)
                    : await this.transporter!.sendMail(mailOptions);

                allMessageIds.push(info.messageId);

                // Record each send in sync ledger
                await prisma.crmSyncLedger.create({
                    data: {
                        userId,
                        entityType: 'property',
                        entityId: property.id,
                        crmTarget: crmConfig.type || user?.crmType || 'generic',
                        syncMethod: 'email',
                        syncStatus: 'sent',
                        emailMessageId: info.messageId,
                    }
                });
            }

            // Update property's last synchronized timestamp
            await prisma.property.update({
                where: { id: property.id },
                data: { lastCrmExportAt: new Date() }
            });

            return { success: true, messageId: allMessageIds.join(', ') };
        } catch (error) {
            console.error('[CrmDeliveryService] Property sync failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }


    private generateContactEmailBody(contact: any, crmType: string): string {
        const divider = '─────────────────────────────';

        // In a real implementation, we would use entity-specific fragments for Rex/Vault
        // For now, we use a high-quality universal format that Rex likes
        return `${divider}
ZENA CRM SYNC — Contact Record
${divider}

Contact Details:
• Name: ${contact.name}
• Email: ${contact.emailAddresses || 'N/A'}
• Mobile: ${contact.phoneNumbers || 'N/A'}
• Type: ${contact.role || 'Contact'}

Activity & Intelligence:
${contact.notes || 'No recent notes captured.'}

Zena Smart Intel:
• Status: Synced via Zena Bridge
• Sync Date: ${new Date().toLocaleString()}

${divider}
Synced by Zena AI • zena.ai
${divider}`;
    }

    private generatePropertyEmailBody(property: any, crmType: string): string {
        const divider = '─────────────────────────────';

        return `${divider}
ZENA CRM SYNC — Property Record
${divider}

Property Details:
• Address: ${property.address}
• Stage: ${property.stage || 'N/A'}
• Bedrooms: ${property.bedrooms || 'N/A'}

Vendor Information:
• Vendor: ${property.vendorNames || 'N/A'}

Recent Activity:
${property.notes || 'No specific activity notes.'}

${divider}
Synced by Zena AI • zena.ai
${divider}`;
    }
}

export const crmDeliveryService = new CrmDeliveryService();
