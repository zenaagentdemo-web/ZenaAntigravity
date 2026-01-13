import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propertiesController } from '../controllers/properties.controller.js';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

vi.mock('../services/property-intelligence.service.js', () => ({
    propertyIntelligenceService: { refreshIntelligence: vi.fn() }
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

describe('Scenario S21: Batch Position', () => {
    const mockUserId = 'user-batch-1';
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should run batch analysis on multiple properties', async () => {
        // --- STEP 1: TRIGGER (Select 5 -> Market Analysis) ---
        const ids = ['p1', 'p2', 'p3'];
        const req = mockRequest({ ids }, mockUserId);
        const res = mockResponse();

        // --- STEP 2: REASONING (LLM Positioning Sweep) ---
        (propertyIntelligenceService.refreshIntelligence as any).mockImplementation((id: string) => {
            return Promise.resolve({
                momentumScore: id === 'p1' ? 85 : 40,
                buyerInterestLevel: 'High'
            });
        });

        // --- STEP 3: CONSEQUENCE (Batch Tag Update) ---
        await propertiesController.bulkAnalyzeProperties(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            results: expect.arrayContaining([
                expect.objectContaining({ id: 'p1', momentum: 85 }),
                expect.objectContaining({ id: 'p2', momentum: 40 })
            ])
        }));

        console.log("✅ Scenario S21 Passed: Batch Select -> Positioning Sweep -> Data Enriched");
    });
});
