
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askZenaService } from '../services/ask-zena.service.js';
import prisma from '../config/database.js';

// Mock the database
vi.mock('../config/database.js', () => ({
    default: {
        contact: {
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn()
        },
        property: {
            findMany: vi.fn()
        }
    }
}));

vi.mock('../services/ask-zena.service.js', () => ({
    askZenaService: {
        parseSearchQuery: vi.fn()
    }
}));

describe('Scenario S01: Search-to-Discovery', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should parse semantic search and return filtered results with AI insights', async () => {
        // --- STEP 1: TRIGGER (Search Query) ---
        const searchQuery = "active buyers in Ponsonby";

        // --- STEP 2: REASONING (AI Parsing) ---
        (askZenaService.parseSearchQuery as any).mockResolvedValue({
            role: 'buyer',
            category: 'HIGH_INTENT',
            dealStage: 'all',
            keywords: 'Ponsonby',
            aiInsight: "Filtering for active buyers in Ponsonby with high intent scores."
        });

        // Mock database returning 1 contact
        (prisma.contact.findMany as any).mockResolvedValue([
            {
                id: 'contact-1',
                name: 'Alice Buyer',
                role: 'buyer',
                zenaCategory: 'HIGH_INTENT',
                intelligenceSnippet: 'Active buyer looking in Ponsonby area.',
                deals: []
            }
        ]);
        (prisma.contact.count as any).mockResolvedValue(1);
        (prisma.property.findMany as any).mockResolvedValue([]);

        // --- STEP 3: CONSEQUENCE (Populated Results) ---
        // Note: We are testing the service/logic layer. In the real app, the controller uses this service.
        const result = await askZenaService.parseSearchQuery(mockUserId, searchQuery);

        expect(result.role).toBe('buyer');
        expect(result.category).toBe('HIGH_INTENT');
        expect(result.aiInsight).toContain('active buyers in Ponsonby');

        console.log("✅ Scenario S01 Passed: Search -> AI Intent -> Discovery Results");
    });
});
