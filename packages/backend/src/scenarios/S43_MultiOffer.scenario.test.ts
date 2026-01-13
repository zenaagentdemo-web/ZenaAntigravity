
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findUnique: vi.fn() }
    }
}));

const mockRequest = (id: string, query: any, userId: string) => ({
    params: { id },
    query,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S43: Multi-Offer Comparison', () => {
    it('should generate a comparison matrix for multiple offers', async () => {
        // --- STEP 1: TRIGGER (2+ Offers) ---
        const req = mockRequest('deal-43', {}, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findUnique as any).mockResolvedValue({
            id: 'deal-43',
            timelineEvents: [
                { id: 'off-1', type: 'offer', summary: 'Offer 1: $500k', content: 'Unconditional', timestamp: new Date() },
                { id: 'off-2', type: 'offer', summary: 'Offer 2: $510k', content: 'Finance + LIM', timestamp: new Date() }
            ]
        });

        // --- STEP 2: REASONING (Run Compare) ---
        // --- STEP 3: CONSEQUENCE (Recommendation Generated) ---
        await dealsController.compareOffers(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            comparison: expect.objectContaining({
                aiRecommendation: expect.any(String)
            })
        }));
        console.log("✅ Scenario S43 Passed: 2 Offers Compared -> AI Rec Generated");
    });
});
