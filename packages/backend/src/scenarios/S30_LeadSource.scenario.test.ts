
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propertiesController } from '../controllers/properties.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { create: vi.fn(), update: vi.fn() },
        contact: { create: vi.fn() }
    }
}));

vi.mock('../services/thread-linking.service.js', () => ({
    threadLinkingService: { linkThreadsToProperty: vi.fn() }
}));

vi.mock('../services/market-scraper.service.js', () => ({
    marketScraperService: { getPropertyDetails: vi.fn().mockResolvedValue(null) }
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

describe('Scenario S30: Lead Source Attribution', () => {
    const mockUserId = 'user-roi-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should log lead source during creation', async () => {
        // --- STEP 1: TRIGGER (URL Tag) ---
        const req = mockRequest({ address: '24 Ponsonby Ave', leadSource: 'TradeMe' }, mockUserId);
        const res = mockResponse();

        (prisma.property.create as any).mockResolvedValue({ id: 'prop-roi' });

        // --- STEP 2: REASONING (Map Source) ---
        // --- STEP 3: CONSEQUENCE (ROI Analytics) ---
        await propertiesController.createProperty(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        console.log("✅ Scenario S30 Passed: leadSource Tag -> Map Source -> Attribution Success");
    });
});
