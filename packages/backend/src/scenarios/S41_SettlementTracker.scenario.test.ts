
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import { dealFlowService } from '../services/deal-flow.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        task: { create: vi.fn() },
        commissionFormula: { findUnique: vi.fn() }
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

describe('Scenario S41: Settlement Tracker', () => {
    it('should create a pre-settlement task when settlement is near', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        const req = mockRequest('deal-41', { settlementDate: futureDate.toISOString() }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-41', settlementDate: futureDate });
        (prisma.deal.findUnique as any).mockResolvedValue({ id: 'deal-41', settlementDate: futureDate });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-41', settlementDate: futureDate });

        await dealsController.updateDeal(req, res);

        // Give async automation a tick
        await new Promise(r => setTimeout(r, 10));

        expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                label: 'Pre-settlement walkthrough',
                priority: 'high'
            })
        }));
        console.log("✅ Scenario S41 Passed: Settlement Approaching -> Task Created");
    });
});
