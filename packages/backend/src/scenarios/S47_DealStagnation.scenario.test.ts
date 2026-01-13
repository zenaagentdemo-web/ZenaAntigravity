
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        timelineEvent: { create: vi.fn() },
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

describe('Scenario S47: Deal Stagnation', () => {
    it('should alert via timeline when a deal has not moved for 21 days', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 25); // 25 days ago

        const req = mockRequest('deal-47', { summary: 'Pinging deal' }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-47' });
        (prisma.deal.findUnique as any).mockResolvedValue({
            id: 'deal-47',
            updatedAt: oldDate
        });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-47' });

        await dealsController.updateDeal(req, res);

        // Give async automation a tick
        await new Promise(r => setTimeout(r, 10));

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                summary: 'Deal Stagnation: No progress for 21 days'
            })
        }));
        console.log("✅ Scenario S47 Passed: stagnation Alerted");
    });
});
