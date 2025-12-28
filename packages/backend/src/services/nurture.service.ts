// Nurture Service - Post-settlement client nurture automation
import { PrismaClient, NurtureSequence, Deal, Contact } from '@prisma/client';
import { notificationService } from './notification.service.js';

const prisma = new PrismaClient();

// NZ Nurture schedule (days after settlement)
const NURTURE_SCHEDULE = [
    { step: 1, daysAfter: 0, label: 'Congratulations on your new home!' },
    { step: 2, daysAfter: 30, label: 'How\'s the new place? Any settling in questions?' },
    { step: 3, daysAfter: 180, label: 'Quick check-in + market update for your area' },
    { step: 4, daysAfter: 365, label: 'Happy anniversary! Here\'s your home\'s value update' },
    { step: 5, daysAfter: 730, label: 'Annual market update + review request' },
];

interface NurtureTouch {
    id: string;
    contactName: string;
    contactEmail: string;
    propertyAddress: string;
    dealId: string;
    step: number;
    label: string;
    daysSinceSettlement: number;
}

interface NurtureSequenceWithRelations extends NurtureSequence {
    contact: Contact;
    deal: Deal & { property?: { address: string } | null };
}

export class NurtureService {
    /**
     * Create nurture sequence when a deal settles
     */
    async createSequenceForDeal(dealId: string): Promise<NurtureSequence | null> {
        try {
            const deal = await prisma.deal.findUnique({
                where: { id: dealId },
                include: {
                    contacts: true,
                    property: true
                }
            });

            if (!deal || deal.stage !== 'settled') {
                console.log(`[NurtureService] Deal ${dealId} not found or not settled`);
                return null;
            }

            // Get primary contact (first contact or buyer/vendor)
            const primaryContact = deal.contacts.find(c =>
                c.role === 'buyer' || c.role === 'vendor'
            ) || deal.contacts[0];

            if (!primaryContact) {
                console.log(`[NurtureService] No contact found for deal ${dealId}`);
                return null;
            }

            // Check if sequence already exists
            const existing = await prisma.nurtureSequence.findFirst({
                where: {
                    dealId,
                    contactId: primaryContact.id
                }
            });

            if (existing) {
                console.log(`[NurtureService] Sequence already exists for deal ${dealId}`);
                return existing;
            }

            // Create new sequence with first touch due today
            const sequence = await prisma.nurtureSequence.create({
                data: {
                    userId: deal.userId,
                    dealId: deal.id,
                    contactId: primaryContact.id,
                    status: 'active',
                    currentStep: 1,
                    nextTouchDate: new Date(),
                    touchCount: 0
                }
            });

            console.log(`[NurtureService] Created nurture sequence for deal ${dealId}, contact ${primaryContact.name}`);
            return sequence;

        } catch (error) {
            console.error(`[NurtureService] Error creating sequence for deal ${dealId}:`, error);
            return null;
        }
    }

    /**
     * Get pending nurture touches for a user (due today or overdue)
     */
    async getPendingTouches(userId: string): Promise<NurtureTouch[]> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const sequences = await prisma.nurtureSequence.findMany({
            where: {
                userId,
                status: 'active',
                nextTouchDate: { lte: today }
            },
            include: {
                contact: true,
                deal: {
                    include: {
                        property: true
                    }
                }
            }
        }) as NurtureSequenceWithRelations[];

        return sequences.map(seq => {
            const scheduleItem = NURTURE_SCHEDULE.find(s => s.step === seq.currentStep)
                || NURTURE_SCHEDULE[0];

            const settlementDate = seq.deal.settlementDate || seq.createdAt;
            const daysSinceSettlement = Math.floor(
                (now.getTime() - new Date(settlementDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: seq.id,
                contactName: seq.contact.name,
                contactEmail: seq.contact.emails[0] || '',
                propertyAddress: seq.deal.property?.address || seq.deal.summary,
                dealId: seq.dealId,
                step: seq.currentStep,
                label: scheduleItem.label,
                daysSinceSettlement
            };
        });
    }

    /**
     * Record a touch and schedule the next one
     */
    async recordTouch(sequenceId: string, notes?: string): Promise<NurtureSequence | null> {
        try {
            const sequence = await prisma.nurtureSequence.findUnique({
                where: { id: sequenceId }
            });

            if (!sequence) {
                console.log(`[NurtureService] Sequence ${sequenceId} not found`);
                return null;
            }

            const nextStep = sequence.currentStep + 1;
            const nextSchedule = NURTURE_SCHEDULE.find(s => s.step === nextStep);

            // Calculate next touch date
            let nextTouchDate: Date | null = null;
            let status = sequence.status;

            if (nextSchedule) {
                // Get settlement date from deal
                const deal = await prisma.deal.findUnique({
                    where: { id: sequence.dealId },
                    select: { settlementDate: true, createdAt: true }
                });

                const settlementDate = deal?.settlementDate || deal?.createdAt || new Date();
                nextTouchDate = new Date(settlementDate);
                nextTouchDate.setDate(nextTouchDate.getDate() + nextSchedule.daysAfter);
            } else if (nextStep > 5) {
                // After step 5, continue annual touches
                nextTouchDate = new Date();
                nextTouchDate.setFullYear(nextTouchDate.getFullYear() + 1);
            }

            // Update sequence
            const updated = await prisma.nurtureSequence.update({
                where: { id: sequenceId },
                data: {
                    currentStep: nextStep,
                    nextTouchDate: nextTouchDate || undefined,
                    lastTouchAt: new Date(),
                    touchCount: { increment: 1 },
                    notes: notes ? (sequence.notes ? `${sequence.notes}\n\n${notes}` : notes) : sequence.notes,
                    status
                }
            });

            console.log(`[NurtureService] Recorded touch for sequence ${sequenceId}, next step: ${nextStep}`);
            return updated;

        } catch (error) {
            console.error(`[NurtureService] Error recording touch for ${sequenceId}:`, error);
            return null;
        }
    }

    /**
     * Pause a nurture sequence
     */
    async pauseSequence(sequenceId: string): Promise<NurtureSequence | null> {
        try {
            return await prisma.nurtureSequence.update({
                where: { id: sequenceId },
                data: { status: 'paused' }
            });
        } catch (error) {
            console.error(`[NurtureService] Error pausing sequence ${sequenceId}:`, error);
            return null;
        }
    }

    /**
     * Resume a paused nurture sequence
     */
    async resumeSequence(sequenceId: string): Promise<NurtureSequence | null> {
        try {
            return await prisma.nurtureSequence.update({
                where: { id: sequenceId },
                data: {
                    status: 'active',
                    nextTouchDate: new Date() // Due immediately when resumed
                }
            });
        } catch (error) {
            console.error(`[NurtureService] Error resuming sequence ${sequenceId}:`, error);
            return null;
        }
    }

    /**
     * Get all sequences for a user
     */
    async getSequencesForUser(userId: string, status?: string): Promise<NurtureSequence[]> {
        return prisma.nurtureSequence.findMany({
            where: {
                userId,
                ...(status ? { status } : {})
            },
            include: {
                contact: true,
                deal: {
                    include: {
                        property: true
                    }
                }
            },
            orderBy: { nextTouchDate: 'asc' }
        });
    }

    /**
     * Generate AI message for a nurture touch
     */
    async generateTouchMessage(sequenceId: string): Promise<string | null> {
        try {
            const sequence = await prisma.nurtureSequence.findUnique({
                where: { id: sequenceId },
                include: {
                    contact: true,
                    deal: {
                        include: {
                            property: true
                        }
                    }
                }
            }) as NurtureSequenceWithRelations | null;

            if (!sequence) return null;

            const scheduleItem = NURTURE_SCHEDULE.find(s => s.step === sequence.currentStep)
                || NURTURE_SCHEDULE[0];

            // Simple template-based message (can be enhanced with AI later)
            const propertyAddress = sequence.deal.property?.address || 'your new home';
            const contactName = sequence.contact.name.split(' ')[0]; // First name

            const templates: Record<number, string> = {
                1: `Hi ${contactName}! 🎉\n\nCongratulations on completing the purchase of ${propertyAddress}! It was an absolute pleasure helping you through the process.\n\nIf you need anything at all as you settle in - recommendations for local services, questions about the area, or just want to chat - I'm here for you.\n\nEnjoy your new home!`,
                2: `Hi ${contactName}!\n\nIt's been about a month since you moved into ${propertyAddress} - how's everything going? I hope you're settling in nicely!\n\nIf there's anything I can help with, or if you know anyone else looking to buy or sell, I'd love to be of service.\n\nWarm regards`,
                3: `Hi ${contactName}!\n\nCan you believe it's been 6 months since you moved into ${propertyAddress}? Time flies!\n\nI wanted to check in and share that property values in your area have been [positive/stable]. I'd be happy to provide a more detailed market update if you're interested.\n\nHope all is well!`,
                4: `Hi ${contactName}!\n\nHappy one-year anniversary at ${propertyAddress}! 🎂\n\nI hope the past year has been wonderful in your new home. If you'd like, I can prepare a current market appraisal showing how your home's value has changed - no obligation, just useful information for your records.\n\nAll the best`,
                5: `Hi ${contactName}!\n\nAnother year, another check-in from your friendly neighbourhood real estate agent! 😊\n\nI hope you're still loving ${propertyAddress}. If you ever think about upgrading, downsizing, or investing - I'm always here to help.\n\nWould love to stay in touch!`
            };

            return templates[sequence.currentStep] || templates[1];

        } catch (error) {
            console.error(`[NurtureService] Error generating message for ${sequenceId}:`, error);
            return null;
        }
    }

    /**
     * Send notification for pending nurture touches
     */
    async notifyPendingTouches(userId: string): Promise<void> {
        const pending = await this.getPendingTouches(userId);

        if (pending.length === 0) return;

        await notificationService.sendNotification(userId, {
            title: `💌 ${pending.length} client follow-up${pending.length > 1 ? 's' : ''} due`,
            body: pending.length === 1
                ? `Time to reach out to ${pending[0].contactName}`
                : `${pending[0].contactName} and ${pending.length - 1} other${pending.length > 2 ? 's' : ''}`,
            data: {
                type: 'nurture_reminder',
                count: pending.length
            },
            tag: 'nurture-reminder'
        });
    }
}

export const nurtureService = new NurtureService();
