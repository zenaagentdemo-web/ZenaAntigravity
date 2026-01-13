
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../controllers/properties.controller.js';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { create: vi.fn(), update: vi.fn() },
        contact: { create: vi.fn() },
        timelineEvent: { create: vi.fn() }
    }
}));

vi.mock('../services/property-intelligence.service.js', () => ({
    propertyIntelligenceService: { findSmartMatches: vi.fn() }
}));

vi.mock('../services/thread-linking.service.js', () => ({
    threadLinkingService: { linkThreadsToProperty: vi.fn() }
}));

vi.mock('../services/market-scraper.service.js', () => ({
    marketScraperService: {
        getPropertyDetails: vi.fn().mockResolvedValue(null),
        findComparableSales: vi.fn()
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

describe('Scenario S22: Geo-Fenced Alert', () => {
    const mockUserId = 'user-geo-1';
    const propertiesController = new PropertiesController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should notify buyers when a matching listing goes live', async () => {
        // --- STEP 1: TRIGGER (Listing Live) ---
        const address = "24 Ponsonby Road";
        const req = mockRequest({ address, status: 'active' }, mockUserId);
        const res = mockResponse();

        (prisma.property.create as any).mockResolvedValue({ id: 'prop-123', address });

        // --- STEP 2: REASONING (Match Buyers) ---
        (propertyIntelligenceService.findSmartMatches as any).mockResolvedValue([
            { contactId: 'c1', name: 'Alfie', matchScore: 90 }
        ]);

        // --- STEP 3: CONSEQUENCE (Notification) ---
        await propertiesController.createProperty(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

        // Wait for background pulse
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(prisma.timelineEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                type: 'alert',
                entityId: 'c1',
                summary: expect.stringContaining("Geo-Fenced Match")
            })
        }));

        console.log("✅ Scenario S22 Passed: Listing Live -> Smart Match -> Buyer Notified");
    });
});
