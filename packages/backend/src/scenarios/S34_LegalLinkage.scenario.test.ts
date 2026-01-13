
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

describe('Scenario S34: Legal Linkage', () => {
    it('should link solicitor details to a deal', async () => {
        // --- STEP 1: TRIGGER (Link Attorney) ---
        const req = mockRequest('deal-789', {
            solicitorName: 'John Legal',
            solicitorEmail: 'john@legal.com'
        }, 'user-abc');
        const res = mockResponse();

        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-789', legalDetails: { solicitorName: 'John Legal' } });

        // --- STEP 2: REASONING (Verify Details) ---
        // --- STEP 3: CONSEQUENCE (Unconditional Prep) ---
        await dealsController.updateLegalDetails(req, res);

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                legalDetails: expect.objectContaining({ solicitorName: 'John Legal' })
            })
        }));
        expect(res.status).toHaveBeenCalledWith(200);
        console.log("✅ Scenario S34 Passed: Solicitor Linked -> Details Verified");
    });
});
