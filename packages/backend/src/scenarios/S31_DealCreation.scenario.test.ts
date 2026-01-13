
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dealsController } from '../controllers/deals.controller.js';
import { dealFlowService } from '../services/deal-flow.service.js';
import prisma from '../config/database.js';

vi.mock('../services/deal-flow.service.js', () => ({
    dealFlowService: {
        createDeal: vi.fn(),
        calculateCommission: vi.fn()
    },
    BUYER_STAGES: ['prospecting', 'offer'],
    SELLER_STAGES: ['listing', 'sold'],
    STAGE_LABELS: {}
}));

vi.mock('../config/database.js', () => ({
    default: {
        deal: { findFirst: vi.fn(), update: vi.fn() }
    }
}));

const mockRequest = (body: any, userId: string) => ({
    body,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S31: Deal Creation', () => {
    it('should create a deal record linking property and contact', async () => {
        // --- STEP 1: TRIGGER (Property -> Contact) ---
        const req = mockRequest({
            pipelineType: 'buyer',
            stage: 'prospecting',
            summary: 'First time buyer for Ponsonby Ave',
            propertyId: 'prop-123',
            contactIds: ['cont-456']
        }, 'user-abc');
        const res = mockResponse();

        (dealFlowService.createDeal as any).mockResolvedValue({ id: 'deal-789', summary: 'First time buyer for Ponsonby Ave' });

        // --- STEP 2: REASONING (Deal Record) ---
        // --- STEP 3: CONSEQUENCE (Persistent Entry) ---
        await dealsController.createDeal(req, res);

        expect(dealFlowService.createDeal).toHaveBeenCalledWith(expect.objectContaining({
            propertyId: 'prop-123',
            contactIds: ['cont-456']
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        console.log("✅ Scenario S31 Passed: Property + Contact -> Deal Entry Created");
    });
});
