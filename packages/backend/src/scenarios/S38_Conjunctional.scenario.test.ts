
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import { dealFlowService } from '../services/deal-flow.service.js';
import prisma from '../config/database.js';

vi.mock('../services/deal-flow.service.js', () => ({
    dealFlowService: {
        calculateCommission: vi.fn().mockReturnValue(10000)
    }
}));

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

describe('Scenario S38: Conjunctional Split', () => {
    it('should calculate agent share for conjunctional deals', async () => {
        // --- STEP 1: TRIGGER (Mark Conjunctional) ---
        const req = mockRequest('deal-38', {
            isConjunctional: true,
            conjunctionalSplit: 0.5,
            dealValue: 500000
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-38', commissionFormulaId: 'form-123', dealValue: 500000 });
        (prisma.commissionFormula.findUnique as any).mockResolvedValue({ id: 'form-123', tiers: [] });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-38', estimatedCommission: 5000 });

        // --- STEP 2: REASONING (Apply Split) ---
        // --- STEP 3: CONSEQUENCE (Commission Halved) ---
        await dealsController.updateDeal(req, res);

        console.log("Update Calls:", JSON.stringify((prisma.deal.update as any).mock.calls, null, 2));

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                estimatedCommission: 5000,
                isConjunctional: true,
                conjunctionalSplit: 0.5
            })
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        console.log("✅ Scenario S38 Passed: Conjunctional Split -> Commission Halved");
    });
});
