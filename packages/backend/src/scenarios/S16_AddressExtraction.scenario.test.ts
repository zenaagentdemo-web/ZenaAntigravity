
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../controllers/properties.controller.js';
import { marketScraperService } from '../services/market-scraper.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { create: vi.fn() },
        property: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
        timelineEvent: { createMany: vi.fn() }
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

describe('Scenario S16: Address Extraction', () => {
    const mockUserId = 'user-addr-1';
    const propertiesController = new PropertiesController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should auto-enrich property details when a valid address is typed', async () => {
        // --- STEP 1: TRIGGER (Type Address) ---
        const address = "24 Ponsonby Road, Ponsonby";
        const req = mockRequest({ address }, mockUserId);
        const res = mockResponse();

        (prisma.property.create as any).mockResolvedValue({
            id: 'prop-123',
            address
        });

        // --- STEP 2: REASONING (Market Pull) ---
        (marketScraperService.getPropertyDetails as any).mockResolvedValue({
            bedrooms: 4,
            bathrooms: 2,
            landArea: '500sqm',
            inferred: true
        });

        // --- STEP 3: CONSEQUENCE (Map Update) ---
        await propertiesController.createProperty(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        // Wait for background enrichment promise
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(prisma.property.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'prop-123' },
            data: expect.objectContaining({
                bedrooms: 4,
                bathrooms: 2,
                landSize: '500sqm'
            })
        }));

        console.log("✅ Scenario S16 Passed: Address Type -> Market Pull -> Auto-Enrich Success");
    });
});
