
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsController } from '../controllers/contacts.controller.js';
import prisma from '../config/database.js';
import { websocketService } from '../services/websocket.service.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: {
            findMany: vi.fn(),
            update: vi.fn()
        },
        timelineEvent: {
            createMany: vi.fn()
        },
        $transaction: vi.fn((promises) => Promise.all(promises))
    }
}));

vi.mock('../services/websocket.service.js', () => ({
    websocketService: {
        broadcastToUser: vi.fn()
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

describe('Scenario S05: Batch Intelligence', () => {
    const mockUserId = 'user-batch-1';
    const contactsController = new ContactsController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update multiple contacts and broadcast batch update event', async () => {
        // --- STEP 1: TRIGGER (Select 10 -> Batch Action) ---
        const contactIds = Array.from({ length: 10 }, (_, i) => `contact-${i}`);
        const updateData = {
            zenaIntelligence: { timeline: 'ASAP (Looking to buy)' },
            role: 'buyer'
        };
        const req = mockRequest({ ids: contactIds, data: updateData }, mockUserId);
        const res = mockResponse();

        // Mock finding all contacts
        (prisma.contact.findMany as any).mockResolvedValue(contactIds.map(id => ({
            id,
            name: `Contact ${id}`,
            role: 'other',
            zenaCategory: 'PULSE'
        })));

        // --- STEP 2: REASONING (Logic Update) ---
        // --- STEP 3: CONSEQUENCE (Multiple Updates / Broadcast) ---
        await contactsController.bulkUpdateContacts(req, res);

        // Verify transaction was called for each contact
        expect(prisma.contact.update).toHaveBeenCalledTimes(10);

        // Verify inferred category (ASAP -> HIGH_INTENT)
        expect(prisma.contact.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                zenaCategory: 'HIGH_INTENT'
            })
        }));

        // Verify WebSocket broadcast
        expect(websocketService.broadcastToUser).toHaveBeenCalledWith(
            mockUserId,
            'batch.contacts.updated',
            expect.objectContaining({
                updates: expect.arrayContaining([
                    expect.objectContaining({ zenaCategory: 'HIGH_INTENT' })
                ])
            })
        );

        console.log("✅ Scenario S05 Passed: Select 10 -> Batch Action -> Multiple Updates");
    });
});
