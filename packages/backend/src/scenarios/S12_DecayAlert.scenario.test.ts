
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { neuralScorerService } from '../services/neural-scorer.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findUnique: vi.fn() },
        timelineEvent: { findMany: vi.fn(), count: vi.fn() },
        deal: { findMany: vi.fn() }
    }
}));

describe('Scenario S12: Decay Alert', () => {
    const mockContactId = 'contact-stale-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should flag a contact as stale when there is no activity for 30 days', async () => {
        // --- STEP 1: TRIGGER (Date > 30 days stagnant) ---
        const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
        (prisma.contact.findUnique as any).mockResolvedValue({
            id: mockContactId,
            name: 'Stale Contact',
            emails: ['stale@example.com'],
            phones: [],
            lastActivityAt: fortyDaysAgo,
            updatedAt: fortyDaysAgo,
            createdAt: fortyDaysAgo,
            deals: []
        });
        (prisma.timelineEvent.findMany as any).mockResolvedValue([]);
        (prisma.timelineEvent.count as any).mockResolvedValue(0);
        (prisma.deal.findMany as any).mockResolvedValue([]);

        // --- STEP 2: REASONING (Logic Detect) ---
        const stats = await neuralScorerService.calculateEngagement(mockContactId);

        // --- STEP 3: CONSEQUENCE (Stale Indicator) ---
        expect(stats.daysSinceActivity).toBeGreaterThanOrEqual(30);
        expect(stats.momentum).toBeLessThan(0); // Negative momentum for stale contacts
        expect(stats.engagementScore).toBeLessThan(40); // Baseline should drop

        console.log("✅ Scenario S12 Passed: 30 days stagnant -> Logic Detect -> Stale Indicator");
    });
});
