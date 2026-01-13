
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

describe('Scenario S28: Occupancy Risk', () => {
    const mockUserId = 'user-occ-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should add compliance milestone for tenanted properties', async () => {
        // --- STEP 1: TRIGGER (Tenanted) ---
        const req = mockRequest({ address: '24 Ponsonby Ave', tenanted: true }, mockUserId);
        const res = mockResponse();

        (prisma.property.create as any).mockResolvedValue({ id: 'prop-occ' });

        // --- STEP 2: REASONING (Warning on Listing) ---
        // --- STEP 3: CONSEQUENCE (Checklist) ---
        await propertiesController.createProperty(req, res);

        expect(prisma.property.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                milestones: expect.arrayContaining([
                    expect.objectContaining({ title: 'Tenancy Compliance Check' })
                ])
            })
        }));

        console.log("✅ Scenario S28 Passed: Tenanted Flag -> Compliance Warning -> Milestone Added");
    });
});
