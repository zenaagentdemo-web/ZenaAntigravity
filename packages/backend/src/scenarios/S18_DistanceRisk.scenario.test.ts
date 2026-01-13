
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../controllers/properties.controller.js';
import { marketScraperService } from '../services/market-scraper.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findUnique: vi.fn() }
    }
}));

vi.mock('../services/market-scraper.service.js', () => ({
    marketScraperService: { findComparableSales: vi.fn() }
}));

const mockRequest = (params: any, userId: string) => ({
    params,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S18: Distance Risk', () => {
    const mockUserId = 'user-dist-1';
    const propertiesController = new PropertiesController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should flag comparables that are too far away', async () => {
        // --- STEP 1: TRIGGER (CMA Search) ---
        const req = mockRequest({ id: 'prop-123' }, mockUserId);
        const res = mockResponse();

        (prisma.property.findUnique as any).mockResolvedValue({
            id: 'prop-123',
            address: "24 Ponsonby Road, Auckland",
            bedrooms: 3
        });

        // --- STEP 2: REASONING (Distance Check) ---
        (marketScraperService.findComparableSales as any).mockResolvedValue({
            comparables: [
                { address: "10 Nearby St", distance: "0.5km" },
                { address: "99 Far Away Rd", distance: "4.5km" }
            ],
            sourceUrls: []
        });

        // --- STEP 3: CONSEQUENCE (UI Warning) ---
        await propertiesController.generateComparables(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            comparables: expect.arrayContaining([
                expect.objectContaining({ address: "10 Nearby St", risk: null }),
                expect.objectContaining({
                    address: "99 Far Away Rd",
                    risk: expect.objectContaining({ level: 'High' })
                })
            ])
        }));

        console.log("✅ Scenario S18 Passed: CMA Search -> Distance Risk Detected -> Warning Flagged");
    });
});
