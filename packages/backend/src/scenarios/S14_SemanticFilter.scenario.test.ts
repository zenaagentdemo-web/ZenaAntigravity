
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsController } from '../controllers/contacts.controller.js';
import { askZenaService } from '../services/ask-zena.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findMany: vi.fn(), count: vi.fn() },
        property: { findMany: vi.fn() }
    }
}));

vi.mock('../services/ask-zena.service.js', () => ({
    askZenaService: {
        parseSearchQuery: vi.fn()
    }
}));

const mockRequest = (query: any, userId: string) => ({
    query,
    user: { userId }
} as any);

const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

describe('Scenario S14: Semantic Filter', () => {
    const mockUserId = 'user-semantic-1';
    const contactsController = new ContactsController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should parse complex semantic query and apply filters to database call', async () => {
        // --- STEP 1: TRIGGER (Query Text) ---
        const searchQuery = "urgent buyers in Ponsonby";
        const req = mockRequest({ search: searchQuery }, mockUserId);
        const res = mockResponse();

        // --- STEP 2: REASONING (Filter Logic) ---
        (askZenaService.parseSearchQuery as any).mockResolvedValue({
            role: 'buyer',
            category: 'HIGH_INTENT',
            dealStage: 'all',
            keywords: 'Ponsonby',
            aiInsight: "Filtering for urgent buyers in Ponsonby."
        });

        (prisma.contact.findMany as any).mockResolvedValue([]);
        (prisma.contact.count as any).mockResolvedValue(0);
        (prisma.property.findMany as any).mockResolvedValue([]);

        // --- STEP 3: CONSEQUENCE (Result Set) ---
        await contactsController.listContacts(req, res);

        // Verify database call used semantic roles and categories
        expect(prisma.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                role: 'buyer',
                zenaCategory: 'HIGH_INTENT'
            })
        }));

        console.log("✅ Scenario S14 Passed: Query Text -> Filter Logic -> Correct Result Set");
    });
});
