
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsController } from '../controllers/contacts.controller.js';
import prisma from '../config/database.js';

// Mock Express Request/Response
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

vi.mock('../config/database.js', () => ({
    default: {
        contact: {
            findFirst: vi.fn(),
            create: vi.fn()
        }
    }
}));

vi.mock('../services/ask-zena.service.js', () => ({
    askZenaService: {
        runDiscovery: vi.fn().mockResolvedValue({})
    }
}));

describe('Scenario S07: Duplicate Block', () => {
    const mockUserId = 'user-111';
    const contactsController = new ContactsController();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should block creation of a duplicate contact and return the existing ID', async () => {
        // --- STEP 1: TRIGGER (Input Duplicate) ---
        const duplicateEmail = "john@example.com";
        const req = mockRequest({
            firstName: "John",
            lastName: "Duplicate",
            email: duplicateEmail
        }, mockUserId);
        const res = mockResponse();

        // --- STEP 2: REASONING (Logic Block) ---
        // Mock prisma finding an existing record
        (prisma.contact.findFirst as any).mockResolvedValue({
            id: 'existing-contact-999',
            name: 'John Original',
            emails: [duplicateEmail]
        });

        // --- STEP 3: CONSEQUENCE (Blocking/Navigation) ---
        await contactsController.createContact(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                code: 'DUPLICATE_FOUND',
                existingContactId: 'existing-contact-999'
            })
        }));

        console.log("✅ Scenario S07 Passed: Input Dup -> Logic Block -> Conflict Response");
    });
});
