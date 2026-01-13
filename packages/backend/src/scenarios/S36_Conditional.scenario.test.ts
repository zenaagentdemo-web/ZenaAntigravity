
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

describe('Scenario S36: Conditional Period', () => {
    it('should auto-propagate milestone to property when deal goes conditional', async () => {
        // --- STEP 1: TRIGGER (Conditional) ---
        const req = mockRequest('deal-36', { stage: 'conditional' }, 'user-36');
        const res = mockResponse();

        (prisma.deal.findFirst as any).mockResolvedValue({ id: 'deal-36', pipelineType: 'buyer', stage: 'prospecting', propertyId: 'prop-36' });
        (prisma.deal.update as any).mockResolvedValue({ id: 'deal-36', stage: 'conditional', propertyId: 'prop-36' });
        (prisma.property.findUnique as any).mockResolvedValue({ id: 'prop-36', milestones: [] });

        // --- STEP 2: REASONING (Map Milestone) ---
        // --- STEP 3: CONSEQUENCE (Green Glow) ---
        await dealsController.updateDealStage(req, res);

        expect(prisma.property.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'prop-36' },
            data: expect.objectContaining({
                milestones: expect.objectContaining({
                    push: expect.objectContaining({ title: 'Deal Went Conditional' })
                })
            })
        }));
        console.log("✅ Scenario S36 Passed: Deal Conditional -> Property Milestone Added");
    });
});
