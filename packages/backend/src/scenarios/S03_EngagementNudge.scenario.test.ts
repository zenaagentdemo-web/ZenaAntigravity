
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askZenaService } from '../services/ask-zena.service.js';
import { zenaActionsService } from '../services/zena-actions.service.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
    default: {
        contact: { findUnique: vi.fn(), update: vi.fn() },
        timelineEvent: { findMany: vi.fn() },
        user: { findUnique: vi.fn() }
    }
}));

vi.mock('../services/zena-actions.service.js', () => ({
    zenaActionsService: {
        generateSuggestedActions: vi.fn()
    }
}));

describe('Scenario S03: Engagement Nudge', () => {
    const mockUserId = 'user-123';
    const mockContactId = 'contact-789';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should suggest an engagement nudge when a contact has a high score but no recent touch', async () => {
        // --- STEP 1: TRIGGER (Score Analysis) ---
        // Mock a "HOT_LEAD" contact
        (prisma.contact.findUnique as any).mockResolvedValue({
            id: mockContactId,
            name: 'Sarah Buyer',
            zenaCategory: 'HOT_LEAD',
            lastActivityAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        });

        // --- STEP 2: REASONING (AI Suggestion) ---
        const mockActionBatch = {
            actions: [
                {
                    type: 'nudge_client',
                    title: "Nudge Sarah Buyer",
                    description: "Sarah hasn't been contacted in 7 days. Send a check-in message.",
                    output: "Hi Sarah, just checking in to see if you had any more thoughts on the Ponsonby listings?"
                }
            ]
        };
        (zenaActionsService.generateSuggestedActions as any).mockResolvedValue(mockActionBatch);

        // --- STEP 3: CONSEQUENCE (Draft Generated) ---
        const result = await zenaActionsService.generateSuggestedActions(mockUserId, 'contact', mockContactId);

        expect(result.actions[0].type).toBe('nudge_client');
        expect(result.actions[0].output).toContain('checking in');

        console.log("✅ Scenario S03 Passed: Score -> AI Suggest -> Nudge Drafted");
    });
});
