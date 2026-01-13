
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../controllers/properties.controller.js';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findUnique: vi.fn() }
    }
}));

vi.mock('../services/property-intelligence.service.js', () => ({
    propertyIntelligenceService: { generateListingCopy: vi.fn() }
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

describe('Scenario S17: Listing Copy', () => {
    const mockUserId = 'user-copy-1';
    const propertiesController = new PropertiesController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate AI listing copy for a property', async () => {
        // --- STEP 1: TRIGGER (Open -> Copy Gen) ---
        const req = mockRequest({ id: 'prop-123' }, mockUserId);
        const res = mockResponse();

        // --- STEP 2: REASONING (LLM Logic in generateListingCopy) ---
        (propertyIntelligenceService.generateListingCopy as any).mockResolvedValue({
            headline: "Modern Luxury in Ponsonby",
            copy: "Step into this exquisite..."
        });

        // --- STEP 3: CONSEQUENCE (AI Draft Display) ---
        await propertiesController.generateListingCopy(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            headline: "Modern Luxury in Ponsonby"
        }));

        console.log("✅ Scenario S17 Passed: Request Copy -> AI Reasoning -> Result Returned");
    });
});
