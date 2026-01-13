
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsController } from '../controllers/contacts.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findMany: vi.fn(), update: vi.fn() },
        timelineEvent: { createMany: vi.fn() },
        $transaction: vi.fn((promises) => Promise.all(promises))
    }
}));

const mockRequest = (body: any, userId: string) => ({
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S13: CSV Mapping', () => {
    const mockUserId = 'user-csv-1';
    const contactsController = new ContactsController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should map flat CSV fields to structured contact updates', async () => {
        // --- STEP 1: TRIGGER (Upload -> Data Mapping) ---
        const csvData = {
            ids: ['c1', 'c2'],
            data: {
                zenaIntelligence: { timeline: 'ASAP' },
                role: 'vendor'
            }
        };
        const req = mockRequest(csvData, mockUserId);
        const res = mockResponse();

        (prisma.contact.findMany as any).mockResolvedValue([
            { id: 'c1', name: 'John', role: 'other' },
            { id: 'c2', name: 'Jane', role: 'other' }
        ]);

        // --- STEP 2: REASONING (Logic Map) ---
        // --- STEP 3: CONSEQUENCE (Record Update) ---
        await contactsController.bulkUpdateContacts(req, res);

        expect(prisma.contact.update).toHaveBeenCalledTimes(2);
        expect(prisma.contact.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'vendor',
                zenaCategory: 'HIGH_INTENT'
            })
        }));

        console.log("✅ Scenario S13 Passed: CSV Upload -> AI Mapping -> Bulk Created/Updated");
    });
});
