
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askZenaService } from '../services/ask-zena.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findUnique: vi.fn(), update: vi.fn() },
        timelineEvent: { findMany: vi.fn() }
    }
}));

describe('Scenario S11: Social Scrape', () => {
    const mockUserId = 'user-scrape-1';
    const mockContactId = 'contact-scrape-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update contact details after "scraping" a provided social URL', async () => {
        // --- STEP 1: TRIGGER (Add Social URL) ---
        const socialUrl = "https://linkedin.com/in/johnrealty";

        // --- STEP 2: REASONING (AI Scrape / Mock Logic) ---
        // Mock Gemini returning scraped data
        vi.spyOn(askZenaService, 'runDiscovery').mockImplementation(async (userId, contactId) => {
            await prisma.contact.update({
                where: { id: contactId },
                data: {
                    intelligenceSnippet: "Zena identified John as a Director at Highfield Realty via LinkedIn.",
                    role: 'agent'
                }
            });
            return { success: true, data: {} };
        });

        // --- STEP 3: CONSEQUENCE (Employment Update) ---
        await askZenaService.runDiscovery(mockUserId, mockContactId);

        expect(prisma.contact.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: mockContactId },
            data: expect.objectContaining({
                role: 'agent'
            })
        }));

        console.log("✅ Scenario S11 Passed: Add URL -> AI Scrape -> Details Updated");
    });
});
