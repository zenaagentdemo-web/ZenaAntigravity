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
}

export const relationshipService = new RelationshipService();
