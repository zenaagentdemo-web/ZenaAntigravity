
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findFirst: vi.fn(), update: vi.fn() },
        timelineEvent: { create: vi.fn() }
    }
}));

const mockRequest = (id: string, body: any, userId: string) => ({
    params: { id },
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S39: Sale Method Change', () => {
    it('should log sale method changes to timeline', async () => {
        // --- STEP 1: TRIGGER (Auction Failed) ---
        const req = mockRequest('deal-39', {
            saleMethod: 'negotiation'
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-39', saleMethod: 'auction' });

        // --- STEP 2: REASONING (Switch to Neg) ---
        // --- STEP 3: CONSEQUENCE (Log Impact) ---
        await dealsController.updateDeal(req, res);

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                summary: 'Sale Method changed to NEGOTIATION'
            })
        }));
        console.log("✅ Scenario S39 Passed: Auction -> Negotiation Logged");
    });
});
