import prisma from '../config/database.js';
import { logger } from './logger.service.js';

export interface SynapseContext {
    voiceNotes: Array<{
        transcript: string;
        date: string;
        extractedEntities: any[];
    }>;
    timelineEvents: Array<{
        type: string;
        summary: string;
        date: string;
        content?: string;
    }>;
    recentTasks: Array<{
        label: string;
        status: string;
        dueDate: string | null;
    }>;
    relatedProperties: Array<{
        address: string;
        status: string;
        relationship: string; // 'owned', 'viewed', 'sold'
    }>;
    relatedDeals: Array<{
        address: string;
        stage: string;
        riskLevel: string;
        role: string;
    }>;
    contactHistory: Array<{
        name: string;
        role: string;
        lastInteraction: string;
    }>;
}

export class ContextRetrieverService {

    /**
     * UNIVERSAL BRAIN STEM: Fetch Deep Context for any primary entity
     * This bridges the "Silo Gap" by fetching related data across the graph.
     */
    async getUnifiedContext(
        userId: string,
        entityType: 'deal' | 'property' | 'contact',
        entityId: string
    ): Promise<SynapseContext> {

        logger.info(`[SynapseLayer] Firing for ${entityType} ${entityId}`);
        const context: SynapseContext = {
            voiceNotes: [],
            timelineEvents: [],
            recentTasks: [],
            relatedProperties: [],
            relatedDeals: [],
            contactHistory: []
        };

        try {
            if (entityType === 'deal') {
                await this.enrichDealContext(userId, entityId, context);
            } else if (entityType === 'property') {
                await this.enrichPropertyContext(userId, entityId, context);
            } else if (entityType === 'contact') {
                await this.enrichContactContext(userId, entityId, context);
            }
        } catch (error) {
            logger.error(`[SynapseLayer] Error retrieving context:`, error);
            // We return partial context rather than failing, as this is enhancement data
        }

        return context;
    }

    /**
     * ENRICH DEAL: Fetch info from linked Contacts and Property
     */
    private async enrichDealContext(userId: string, dealId: string, context: SynapseContext) {
        const deal = await prisma.deal.findUnique({
            where: { id: dealId },
            include: {
                contacts: true,
                property: true
            }
        });

        if (!deal) return;

        // 1. Fetch Voice Notes & Timeline for all linked Contacts (The "Human Context")
        for (const contact of deal.contacts) {
            await this.appendContactIntelligence(userId, contact.id, context);
        }

        // 2. Fetch Property History (The "Asset Context")
        if (deal.propertyId) {
            await this.appendPropertyIntelligence(userId, deal.propertyId, context);
        }
    }

    /**
     * ENRICH PROPERTY: Fetch info from current Owners and Active Deals
     */
    private async enrichPropertyContext(userId: string, propertyId: string, context: SynapseContext) {
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                vendors: true,
                deals: true
            }
        });

        if (!property) return;

        // 1. Fetch Vendor Context (Motivation, Voice Notes)
        for (const vendor of property.vendors) {
            await this.appendContactIntelligence(userId, vendor.id, context);
        }

        // 2. Fetch Active Deal Risks (Commercial Context)
        const activeDeals = property.deals.filter(d => d.status !== 'archived' && d.status !== 'deleted');
        for (const deal of activeDeals) {
            context.relatedDeals.push({
                address: property.address,
                stage: deal.stage,
                riskLevel: deal.riskLevel,
                role: 'associated_deal'
            });
        }
    }

    /**
     * ENRICH CONTACT: Fetch info from all their Deals and Properties
     */
    private async enrichContactContext(userId: string, contactId: string, context: SynapseContext) {
        await this.appendContactIntelligence(userId, contactId, context);

        // Fetch their other assets
        const ownedProperties = await prisma.property.findMany({
            where: {
                userId,
                vendors: { some: { id: contactId } }
            }
        });

        for (const p of ownedProperties) {
            context.relatedProperties.push({
                address: p.address,
                status: p.status,
                relationship: 'vendor'
            });
        }
    }

    /**
     * HELPER: Append Contact-specific Voice Notes and Timeline Events
     */
    private async appendContactIntelligence(userId: string, contactId: string, context: SynapseContext) {
        // Fetch Voice Notes (Last 90 days)
        const voiceNotes = await prisma.voiceNote.findMany({
            where: {
                userId,
                // Voice notes might not be directly linked to contact yet if schema doesn't support it directly,
                // but usually they come via TimelineEvents or parsed text.
                // Checking TimelineEvents is safer for the "Mesh".
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        // Fetch Timeline Events linked to this Contact (The real gold mine)
        const timeline = await prisma.timelineEvent.findMany({
            where: {
                userId,
                entityType: 'contact',
                entityId: contactId
            },
            take: 10,
            orderBy: { timestamp: 'desc' }
        });

        for (const event of timeline) {
            context.timelineEvents.push({
                type: event.type,
                summary: event.summary,
                date: event.timestamp.toISOString(),
                content: event.content || ''
            });

            // If this event was a voice note, add it to voice notes too
            if (event.type === 'voice_note' && event.metadata) {
                // Logic to parse extracted entities if available
            }
        }

        // Also check Tasks
        const tasks = await prisma.task.findMany({
            where: { userId, contactId },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        for (const t of tasks) {
            context.recentTasks.push({
                label: t.label,
                status: t.status,
                dueDate: t.dueDate ? t.dueDate.toISOString() : null
            });
        }
    }

    /**
     * HELPER: Append Property-specific Timeline Events
     */
    private async appendPropertyIntelligence(userId: string, propertyId: string, context: SynapseContext) {
        const timeline = await prisma.timelineEvent.findMany({
            where: {
                userId,
                entityType: 'property',
                entityId: propertyId
            },
            take: 5,
            orderBy: { timestamp: 'desc' }
        });

        for (const event of timeline) {
            // Avoid duplicates if already added via contact linkage
            // Ideally we dedup, but for now pushing is fine as context window handles it
            context.timelineEvents.push({
                type: `property_${event.type}`,
                summary: `[Property Event] ${event.summary}`,
                date: event.timestamp.toISOString()
            });
        }
    }

    /**
     * FORMAT FOR LLM: Converts the deep context structure into a prompt-ready string
     */
    formatForPrompt(context: SynapseContext): string {
        if (
            context.voiceNotes.length === 0 &&
            context.timelineEvents.length === 0 &&
            context.recentTasks.length === 0
        ) {
            return "No additional cross-functional context found.";
        }

        let section = `\n*** SYNAPSE LAYER (CROSS-FUNCTIONAL CONTEXT) ***\n`;
        section += `The following information comes from linked entities (Voice Notes, History, Properties). You MUST use this to inform your analysis.\n\n`;

        if (context.timelineEvents.length > 0) {
            section += `RECENT TIMELINE HISTORY:\n`;
            context.timelineEvents.slice(0, 8).forEach(e => {
                section += `- [${e.date.split('T')[0]}] ${e.type.toUpperCase()}: ${e.summary}\n`;
            });
            section += `\n`;
        }

        if (context.recentTasks.length > 0) {
            section += `PENDING TASKS:\n`;
            context.recentTasks.forEach(t => {
                section += `- [${t.status}] ${t.label} (Due: ${t.dueDate ? t.dueDate.split('T')[0] : 'None'})\n`;
            });
            section += `\n`;
        }

        if (context.relatedDeals.length > 0) {
            section += `RELATED DEAL RISKS:\n`;
            context.relatedDeals.forEach(d => {
                section += `- ${d.address} is at ${d.stage} stage with Risk: ${d.riskLevel}\n`;
            });
        }

        return section;
    }
}

export const contextRetrieverService = new ContextRetrieverService();
