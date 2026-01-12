import prisma from '../config/database.js';

export interface ContactRelationship {
    targetContactId: string;
    targetName: string;
    type: 'shared_deal' | 'property_link' | 'co_vendor' | 'co_buyer';
    context: string;
}

class RelationshipService {
    /**
     * Find all contacts linked to a specific contact via deals or properties
     */
    async discoverLinks(contactId: string): Promise<ContactRelationship[]> {
        const links: ContactRelationship[] = [];

        try {
            // 1. Fetch contact with deals and properties
            const contact = await prisma.contact.findUnique({
                where: { id: contactId },
                include: {
                    deals: {
                        include: {
                            contacts: {
                                where: { id: { not: contactId } },
                                select: { id: true, name: true }
                            }
                        }
                    },
                    vendorProperties: {
                        include: {
                            vendors: {
                                where: { id: { not: contactId } },
                                select: { id: true, name: true }
                            },
                            buyers: {
                                select: { id: true, name: true }
                            }
                        }
                    },
                    buyerProperties: {
                        include: {
                            vendors: {
                                select: { id: true, name: true }
                            },
                            buyers: {
                                where: { id: { not: contactId } },
                                select: { id: true, name: true }
                            }
                        }
                    }
                }
            });

            if (!contact) return [];

            // 2. Process Deals (Shared Deal)
            contact.deals.forEach(deal => {
                deal.contacts.forEach(other => {
                    links.push({
                        targetContactId: other.id,
                        targetName: other.name,
                        type: 'shared_deal',
                        context: `Linked via deal at ${deal.summary.substring(0, 30)}...`
                    });
                });
            });

            // 3. Process Properties (Co-Vendors / Co-Buyers / Cross Links)
            contact.vendorProperties.forEach(prop => {
                prop.vendors.forEach(other => {
                    links.push({
                        targetContactId: other.id,
                        targetName: other.name,
                        type: 'co_vendor',
                        context: `Co-vendors for ${prop.address}`
                    });
                });
                prop.buyers.forEach(other => {
                    links.push({
                        targetContactId: other.id,
                        targetName: other.name,
                        type: 'property_link',
                        context: `Vendor/Buyer link for ${prop.address}`
                    });
                });
            });

            contact.buyerProperties.forEach(prop => {
                prop.buyers.forEach(other => {
                    links.push({
                        targetContactId: other.id,
                        targetName: other.name,
                        type: 'co_buyer',
                        context: `Co-buyers for ${prop.address}`
                    });
                });
                prop.vendors.forEach(other => {
                    links.push({
                        targetContactId: other.id,
                        targetName: other.name,
                        type: 'property_link',
                        context: `Buyer/Vendor link for ${prop.address}`
                    });
                });
            });

            // Deduplicate (keep the strongest link)
            const uniqueLinks = new Map<string, ContactRelationship>();
            links.forEach(l => {
                if (!uniqueLinks.has(l.targetContactId)) {
                    uniqueLinks.set(l.targetContactId, l);
                }
            });

            return Array.from(uniqueLinks.values());
        } catch (error) {
            console.error('[RelationshipService] Discovery failed:', error);
            return [];
        }
    }

    /**
     * Batch discover links for multiple contacts (for grid view)
     */
    async batchDiscoverLinks(contactIds: string[]): Promise<Record<string, ContactRelationship[]>> {
        const results: Record<string, ContactRelationship[]> = {};
        for (const id of contactIds) {
            results[id] = await this.discoverLinks(id);
        }
        return results;
    }

    // ============================================
    // GLOBAL PROACTIVITY - FEATURE 4
    // Relationship Decay / Nurture Score
    // ============================================

    /**
     * Calculate nurture score for a contact based on interaction recency
     * Returns: { score: 0-100, status: 'hot' | 'warm' | 'cold' | 'stale', daysSinceContact: number }
     */
    async calculateNurtureScore(contactId: string): Promise<{
        score: number;
        status: 'hot' | 'warm' | 'cold' | 'stale';
        daysSinceContact: number;
        recommendation?: string;
    }> {
        try {
            // Get contact with latest timeline events
            const contact = await prisma.contact.findUnique({
                where: { id: contactId },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    lastActivityAt: true,
                    zenaCategory: true
                }
            });

            if (!contact) {
                return { score: 0, status: 'stale', daysSinceContact: 999 };
            }

            // Calculate days since last activity
            const lastActivity = contact.lastActivityAt ? new Date(contact.lastActivityAt) : null;
            const now = new Date();
            const daysSinceContact = lastActivity
                ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
                : 999;

            // Score calculation based on recency and engagement
            let score = 100;
            let status: 'hot' | 'warm' | 'cold' | 'stale' = 'hot';
            let recommendation: string | undefined;

            // Decay based on days since contact
            if (daysSinceContact <= 3) {
                score = 100;
                status = 'hot';
            } else if (daysSinceContact <= 7) {
                score = 80;
                status = 'warm';
                recommendation = `Consider a quick check-in with ${contact.name}`;
            } else if (daysSinceContact <= 14) {
                score = 50;
                status = 'cold';
                recommendation = `${contact.name} hasn't heard from you in ${daysSinceContact} days`;
            } else {
                score = Math.max(10, 100 - daysSinceContact * 2);
                status = 'stale';
                recommendation = `Urgent: Re-engage with ${contact.name} - relationship at risk`;
            }

            // Boost score for high-intent contacts
            if (contact.zenaCategory === 'HIGH_INTENT') {
                score = Math.min(100, score + 20);
            }

            return {
                score,
                status,
                daysSinceContact,
                recommendation: status !== 'hot' ? recommendation : undefined
            };
        } catch (error) {
            console.error('[RelationshipService] Nurture score calculation failed:', error);
            return { score: 0, status: 'stale', daysSinceContact: 999 };
        }
    }

    /**
     * Batch calculate nurture scores for multiple contacts
     */
    async batchCalculateNurtureScores(contactIds: string[]): Promise<Record<string, {
        score: number;
        status: 'hot' | 'warm' | 'cold' | 'stale';
        daysSinceContact: number;
        recommendation?: string;
    }>> {
        const results: Record<string, any> = {};
        for (const id of contactIds) {
            results[id] = await this.calculateNurtureScore(id);
        }
        return results;
    }
}

export const relationshipService = new RelationshipService();
