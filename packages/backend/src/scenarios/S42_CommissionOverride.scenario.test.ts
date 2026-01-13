
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findFirst: vi.fn(), update: vi.fn() },
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

describe('Scenario S42: Commission Override', () => {
    it('should allow manual adjustment to estimated commission', async () => {
        // --- STEP 1: TRIGGER (Set Override) ---
        const req = mockRequest('deal-42', {
            commissionOverride: 15000
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-42', commissionFormulaId: 'form-123', dealValue: 500000 });
        (prisma.commissionFormula.findUnique as any).mockResolvedValue({ id: 'form-123', tiers: [] });

        // --- STEP 2: REASONING (Calculate and Lock) ---
        // --- STEP 3: CONSEQUENCE (Override Persisted) ---
        await dealsController.updateDeal(req, res);

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                estimatedCommission: 15000
            })
        }));
        console.log("✅ Scenario S42 Passed: Commission Override Applied");
    });
});
