
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { update: vi.fn() },
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

describe('Scenario S35: Financial Health', () => {
    it('should scale deal as cashflow confirmed when deposit is received', async () => {
        // --- STEP 1: TRIGGER (Deposit Received) ---
        const req = mockRequest('deal-789', {
            amount: 50000,
            date: '2026-01-20'
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-789', depositStatus: 'received' });

        // --- STEP 2: REASONING (Record Update) ---
        // --- STEP 3: CONSEQUENCE (Cashflow Confirmed) ---
        await dealsController.markDepositReceived(req, res);

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                depositStatus: 'received',
                depositAmount: 50000
            })
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        console.log("✅ Scenario S35 Passed: Deposit Logged -> Cashflow Confirmed");
    });
});
