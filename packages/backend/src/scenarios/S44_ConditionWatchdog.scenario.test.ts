
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

describe('Scenario S44: Condition Watchdog', () => {
    it('should alert via timeline when conditions are close to expiry', async () => {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24); // 24 hours away

        const req = mockRequest('deal-44', { summary: 'Update deal' }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-44' });
        (prisma.deal.findUnique as any).mockResolvedValue({
            id: 'deal-44',
            conditions: [{ title: 'Finance', dueDate: expiryDate.toISOString(), satisfied: false }]
        });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-44' });

        await dealsController.updateDeal(req, res);

        // Give async automation a tick
        await new Promise(r => setTimeout(r, 10));

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                summary: expect.stringContaining('URGENT: Condition "Finance" expires soon!')
            })
        }));
        console.log("✅ Scenario S44 Passed: Condition Watchdog Alerted");
    });
});
