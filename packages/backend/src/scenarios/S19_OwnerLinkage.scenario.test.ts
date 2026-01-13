
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../controllers/properties.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findUnique: vi.fn(), update: vi.fn() },
        contact: { update: vi.fn(), findMany: vi.fn() }
    }
}));

vi.mock('../services/thread-linking.service.js', () => ({
    threadLinkingService: { linkThreadsToProperty: vi.fn() }
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

describe('Scenario S19: Owner Linkage', () => {
    const mockUserId = 'user-owner-1';
    const propertiesController = new PropertiesController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should cross-update contact details when linked as a vendor', async () => {
        // --- STEP 1: TRIGGER (Link Vendor) ---
        const propId = 'prop-123';
        const vendorId = 'contact-v1';
        const req = mockRequest(propId, { vendorContactIds: [vendorId] }, mockUserId);
        const res = mockResponse();

        (prisma.property.findUnique as any).mockResolvedValue({
            id: propId,
            address: "123 Test Lane"
        });

        (prisma.property.update as any).mockResolvedValue({ id: propId });
        (prisma.contact.update as any).mockResolvedValue({ id: vendorId });

        // --- STEP 2: REASONING (Contact Update) ---
        // --- STEP 3: CONSEQUENCE (Dash Logic) ---
        await propertiesController.updateProperty(req, res);

        expect(prisma.contact.update).toHaveBeenCalled();

        console.log("✅ Scenario S19 Passed: Link Vendor -> Contact Cross-Enrich Success");
    });
});
