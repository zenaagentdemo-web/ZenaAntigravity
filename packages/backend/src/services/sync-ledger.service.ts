import prisma from '../config/database.js';

export interface UnsyncedChanges {
    contacts: number;
    properties: number;
    total: number;
    samples: {
        type: 'contact' | 'property';
        name: string;
        reason: string;
    }[];
}

export class SyncLedgerService {
    /**
     * Find all records that have been updated since they were last synced to CRM
     */
    async getUnsyncedChanges(userId: string): Promise<UnsyncedChanges> {
        // 1. Find unsynced contacts
        // Logic: updatedAt > lastCrmExportAt (if present) OR lastCrmExportAt is null
        const unsyncedContacts = await prisma.contact.findMany({
            where: {
                userId,
                OR: [
                    { lastCrmExportAt: null },
                    { updatedAt: { gt: prisma.contact.fields.lastCrmExportAt } }
                ]
            },
            select: { name: true, updatedAt: true, lastCrmExportAt: true },
            take: 5,
            orderBy: { updatedAt: 'desc' }
        });

        const contactCount = await prisma.contact.count({
            where: {
                userId,
                OR: [
                    { lastCrmExportAt: null },
                    { updatedAt: { gt: prisma.contact.fields.lastCrmExportAt } }
                ]
            }
        });

        // 2. Find unsynced properties
        const unsyncedProperties = await prisma.property.findMany({
            where: {
                userId,
                OR: [
                    { lastCrmExportAt: null },
                    { updatedAt: { gt: prisma.property.fields.lastCrmExportAt } }
                ]
            },
            select: { address: true, updatedAt: true, lastCrmExportAt: true },
            take: 5,
            orderBy: { updatedAt: 'desc' }
        });

        const propertyCount = await prisma.property.count({
            where: {
                userId,
                OR: [
                    { lastCrmExportAt: null },
                    { updatedAt: { gt: prisma.property.fields.lastCrmExportAt } }
                ]
            }
        });

        const samples: UnsyncedChanges['samples'] = [
            ...unsyncedContacts.map(c => ({
                type: 'contact' as const,
                name: c.name,
                reason: c.lastCrmExportAt === null ? 'New Record' : 'Updated'
            })),
            ...unsyncedProperties.map(p => ({
                type: 'property' as const,
                name: p.address,
                reason: p.lastCrmExportAt === null ? 'New Record' : 'Updated'
            }))
        ].slice(0, 5);

        return {
            contacts: contactCount,
            properties: propertyCount,
            total: contactCount + propertyCount,
            samples
        };
    }

    /**
     * Record a sync event in the ledger
     */
    async recordSync(userId: string, entityType: string, entityId: string, status: 'sent' | 'failed', messageId?: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { crmType: true }
        });

        return prisma.crmSyncLedger.create({
            data: {
                userId,
                entityType,
                entityId,
                crmTarget: user?.crmType || 'generic',
                syncMethod: 'email',
                syncStatus: status,
                emailMessageId: messageId
            }
        });
    }
}

export const syncLedgerService = new SyncLedgerService();
