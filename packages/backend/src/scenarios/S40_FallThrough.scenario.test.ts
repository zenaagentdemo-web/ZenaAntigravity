
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import prisma from '../config/database.js';

vi.mock('../services/deal-flow.service.js', () => ({
    dealFlowService: {},
    BUYER_STAGES: ['nurture', 'offer', 'conditional', 'unconditional', 'settled'],
    SELLER_STAGES: ['nurture', 'offer', 'conditional', 'unconditional', 'settled'],
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
    body: { stage: 'nurture', reason: 'Finance failed' },
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S40: Fall-through', () => {
    it('should log fall-through when deal moves back to nurture', async () => {
        // --- STEP 1: TRIGGER (Contract Fails) ---
        const req = mockRequest('deal-40', {}, 'user-abc');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-40', pipelineType: 'buyer', stage: 'conditional' });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-40', stage: 'nurture' });

        // --- STEP 2: REASONING (Revert to Nurture) ---
        // --- STEP 3: CONSEQUENCE (Log Impact) ---
        await dealsController.updateDealStage(req, res);

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                summary: 'Deal Fall-through: Moved to Nurture'
            })
        }));
        console.log("✅ Scenario S40 Passed: Fall-through Logged");
    });
});
