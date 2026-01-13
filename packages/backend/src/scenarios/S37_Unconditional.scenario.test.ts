
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
        property: { update: vi.fn(), findUnique: vi.fn() },
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

describe('Scenario S37: Unconditional', () => {
    it('should auto-propagate milestone when deal goes unconditional', async () => {
        // --- STEP 1: TRIGGER (All Conditions Met) ---
        const req = mockRequest('deal-37', { stage: 'unconditional' }, 'user-37');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-37', pipelineType: 'buyer', stage: 'conditional', propertyId: 'prop-37' });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-37', stage: 'unconditional', propertyId: 'prop-37' });
        (prisma.property.findUnique as any).mockResolvedValue({ id: 'prop-37', milestones: [] });

        // --- STEP 2: REASONING (Map Milestone) ---
        // --- STEP 3: CONSEQUENCE (Unconditional Tag) ---
        await dealsController.updateDealStage(req, res);

        expect(prisma.property.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'prop-37' },
            data: expect.objectContaining({
                milestones: expect.objectContaining({
                    push: expect.objectContaining({ title: 'Deal Went Unconditional' })
                })
            })
        }));
        console.log("✅ Scenario S37 Passed: Deal Unconditional -> Milestone Added");
    });
});
