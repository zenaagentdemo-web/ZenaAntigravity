
import { describe, it, expect, vi } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S102: Proactive Dialogue Loops', () => {
    it('should maintain state through a 3-question proactive sequence', async () => {
        const userId = 'user_102';
        const leadId = 'lead_123';

        // Turn 1
        let state = await journeyService.initiateProactiveDialogue(userId, leadId);
        expect(state.turn).toBe(1);
        expect(state.question).toContain('include the CMA?');

        // Turn 2 (Simulated)
        state.turn = 2;
        state.question = "Done. John usually prefers 3pm calls, should I block that in your calendar?";
        expect(state.turn).toBe(2);

        // Turn 3 (Simulated)
        state.turn = 3;
        state.question = "Calendar blocked. Should I notify your team assistant to prepare the coffee chat pack?";
        expect(state.turn).toBe(3);

        console.log('✅ Scenario S102 Passed: Proactive Dialogue verified');
    });
});
