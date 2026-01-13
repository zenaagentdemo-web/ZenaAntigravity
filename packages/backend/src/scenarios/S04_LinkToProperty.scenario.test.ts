
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { portfolioIntelligenceService } from '../services/portfolio-intelligence.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        property: { findMany: vi.fn() },
        contact: { update: vi.fn() }
    }
}));

describe('Scenario S04: Link-to-Property', () => {
    const mockUserId = 'user-123';
    const mockContactId = 'contact-link-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should auto-link a contact to a property when the address is mentioned in relationship notes', async () => {
        // --- STEP 1: TRIGGER (Create Contact with Context) ---
        const contextNote = "Sarah is interested in the listing at 24 Ponsonby Road.";

        // --- STEP 2: REASONING (Auto-Link Logic) ---
        // Mock property search finding a match
        const mockProperty = { id: 'prop-ponsonby', address: '24 Ponsonby Road, Ponsonby' };
        (prisma.property.findMany as any).mockResolvedValue([mockProperty]);

        // --- STEP 3: CONSEQUENCE (Detail Update) ---
        // In Zena, the PortfolioIntelligenceService handles semantic linking
        await portfolioIntelligenceService.linkContactToProperties(mockUserId, mockContactId, contextNote);

        // Verify that the contact was updated to include the buyer relationship
        expect(prisma.contact.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: mockContactId },
            data: expect.objectContaining({
                buyerProperties: { connect: [{ id: 'prop-ponsonby' }] }
            })
        }));

        console.log("✅ Scenario S04 Passed: Create -> Auto-Link Property -> Detail Update");
    });
});
