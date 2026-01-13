
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../services/deal-flow.service.js', () => ({
    dealFlowService: {
        calculateCommission: vi.fn()
    },
    BUYER_STAGES: ['offer'],
    SELLER_STAGES: ['offer'],
    STAGE_LABELS: {}
}));

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

describe('Scenario S32: Offer Intake', () => {
    it('should record an offer and update deal stage', async () => {
        // --- STEP 1: TRIGGER (Offer Signal) ---
        const req = mockRequest('deal-789', {
            price: 1500000,
            conditions: ['Finance', 'LIM'],
            expiryDate: '2026-02-01'
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-789', userId: 'user-abc' });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-789', stage: 'offer' });

        // --- STEP 2: REASONING (Stage Update) ---
        // --- STEP 3: CONSEQUENCE (Timeline Event) ---
        await dealsController.recordOffer(req, res);

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'deal-789' },
            data: expect.objectContaining({
                dealValue: 1500000,
                stage: 'offer'
            })
        }));
        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                type: 'offer',
                summary: expect.stringContaining('$1,500,000')
            })
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        console.log("✅ Scenario S32 Passed: Offer Signal -> Stage Update -> Timeline Logged");
    });
});
