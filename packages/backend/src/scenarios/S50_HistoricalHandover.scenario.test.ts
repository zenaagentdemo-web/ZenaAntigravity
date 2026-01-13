
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findUnique: vi.fn(), update: vi.fn() }
    }
}));

const mockRequest = (id: string, userId: string) => ({
    params: { id },
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S50: Historical Handover', () => {
    it('should move deal to historical archive and update status', async () => {
        // --- STEP 1: TRIGGER (Finish Deal) ---
        const req = mockRequest('deal-50', 'user-abc');
        const res = mockResponse();

        (prisma.deal.findUnique as any).mockResolvedValue({ id: 'deal-50', contacts: [] });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-50', status: 'historical' });

        // --- STEP 2: REASONING (Trigger Archive) ---
        // --- STEP 3: CONSEQUENCE (Status Historical) ---
        await dealsController.archiveDeal(req, res);

        expect(prisma.deal.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'historical',
                archived: true
            })
        }));
        console.log("✅ Scenario S50 Passed: Historical Handover Complete");
    });
});
