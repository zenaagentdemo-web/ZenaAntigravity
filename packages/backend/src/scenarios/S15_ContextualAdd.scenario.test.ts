
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsController } from '../controllers/contacts.controller.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findMany: vi.fn(), count: vi.fn() },
        property: { findMany: vi.fn() }
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

describe('Scenario S15: Contextual Add', () => {
    const mockUserId = 'user-context-1';
    const contactsController = new ContactsController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should suggest adding a new contact when a name-like search returns 0 results', async () => {
        // --- STEP 1: TRIGGER (Search Name) ---
        const searchQuery = "Bob Builder";
        const req = mockRequest({ search: searchQuery }, mockUserId);
        const res = mockResponse();

        // Mock zero results
        (prisma.contact.findMany as any).mockResolvedValue([]);
        (prisma.contact.count as any).mockResolvedValue(0);
        (prisma.property.findMany as any).mockResolvedValue([]);

        // --- STEP 2: REASONING (Suggest Add) ---
        // --- STEP 3: CONSEQUENCE (Pre-fill Action) ---
        await contactsController.listContacts(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            suggestion: expect.objectContaining({
                type: 'add_contact',
                name: 'Bob Builder'
            })
        }));

        console.log("✅ Scenario S15 Passed: Search Name -> Suggest Add -> Action Prompted");
    });
});
