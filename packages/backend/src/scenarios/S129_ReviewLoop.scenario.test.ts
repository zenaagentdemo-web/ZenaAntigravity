import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S129: Post-Sale Review Loop', () => {
    it('should trigger a review request via SMS', async () => {
        const userId = 'user_129';
        const contactId = 'c129';
        const result = await journeyService.triggerReviewRequest(userId, contactId);

        expect(result.channel).toBe('SMS');
        expect(result.status).toBe('request_sent');
        console.log('✅ Scenario S129 Passed: Review Loop verified');
    });
});
