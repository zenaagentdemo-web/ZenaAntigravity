
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { neuralScorerService } from '../services/neural-scorer.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: {
            findUnique: vi.fn()
        },
        timelineEvent: {
            findMany: vi.fn(),
            count: vi.fn()
        },
        deal: {
            findMany: vi.fn()
        }
    }
}));

describe('Scenario S09: Score Breakdown', () => {
    const mockContactId = 'contact-score-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate engagement score and provide detailed reasoning for the breakdown modal', async () => {
        // --- STEP 1: TRIGGER (Click Score / Analysis Request) ---
        // Mock contact and activities
        (prisma.contact.findUnique as any).mockResolvedValue({
            id: mockContactId,
            name: 'Active Buyer',
            emails: ['buyer@example.com'],
            phones: [],
            zenaCategory: 'HOT_LEAD',
            engagementReasoning: "High activity in the last 7 days.",
            deals: []
        });
        (prisma.timelineEvent.findMany as any).mockResolvedValue([
            { id: '1', summary: 'Inquiry', timestamp: new Date() }
        ]);
        (prisma.timelineEvent.count as any).mockResolvedValue(1);
        (prisma.deal.findMany as any).mockResolvedValue([]);

        // --- STEP 2: REASONING (Score Calculation) ---
        const stats = await neuralScorerService.calculateEngagement(mockContactId);

        // --- STEP 3: CONSEQUENCE (Reasoning Modal) ---
        expect(stats.engagementScore).toBeDefined();
        // Since engagementReasoning is mocked in the DB, it should be returned or calculated
        expect(stats.reasoning).toBeDefined();

        console.log("✅ Scenario S09 Passed: Click Score -> Reasoning Modal -> Data Populated");
    });
});
