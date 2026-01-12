import prisma from '../config/database.js';
import { dealIntelligenceService } from './deal-intelligence.service.js';
import { contactIntelligenceService } from './contact-intelligence.service.js';

export class IntelligenceHeartbeatService {
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    /**
     * Start the heartbeat service.
     * Runs every 24 hours to refresh intelligence for active entities.
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[Heartbeat] Intelligence Heartbeat Service started.');

        // Run immediately on start, then every 24 hours
        this.pulse();
        this.interval = setInterval(() => this.pulse(), 24 * 60 * 60 * 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('[Heartbeat] Intelligence Heartbeat Service stopped.');
    }

    /**
     * Trigger a manual pulse refresh.
     */
    async pulse() {
        console.log('[Heartbeat] Starting intelligence pulse...');

        try {
            // 1. Refresh Active Deals
            // We target deals that are NOT 'CLOSED' or 'SETTLED'
            const activeDeals = await prisma.deal.findMany({
                where: {
                    status: { notIn: ['CLOSED', 'SETTLED'] },
                },
                select: { id: true, userId: true },
            });

            console.log(`[Heartbeat] Refreshing ${activeDeals.length} active deals...`);
            for (const deal of activeDeals) {
                try {
                    await dealIntelligenceService.analyzeDeal(deal.userId, deal.id, true);
                } catch (err) {
                    console.error(`[Heartbeat] Failed to refresh deal ${deal.id}:`, err);
                }
            }

            // 2. Refresh "Hot" Contacts
            // We target contacts that are categorized as 'HOT_LEAD' or 'HIGH_INTENT'
            const hotContacts = await prisma.contact.findMany({
                where: {
                    zenaCategory: { in: ['HOT_LEAD', 'HIGH_INTENT'] },
                },
                select: { id: true, userId: true },
            });

            console.log(`[Heartbeat] Refreshing ${hotContacts.length} hot contacts...`);
            for (const contact of hotContacts) {
                try {
                    await contactIntelligenceService.analyzeContact(contact.userId, contact.id, true);
                } catch (err) {
                    console.error(`[Heartbeat] Failed to refresh contact ${contact.id}:`, err);
                }
            }

            console.log('[Heartbeat] Intelligence pulse complete.');
        } catch (error) {
            console.error('[Heartbeat] Critical failure during pulse:', error);
        }
    }
}

export const intelligenceHeartbeatService = new IntelligenceHeartbeatService();
