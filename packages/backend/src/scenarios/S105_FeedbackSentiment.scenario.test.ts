import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S105: Feedback Sentiment Analysis', () => {
    it('should analyze sentiment and extract keywords from feedback', async () => {
        const userId = 'user_105';
        const feedbackId = 'fb_105';

        const result = await journeyService.analyzeFeedbackSentiment(userId, feedbackId);

        expect(result.sentiment).toBe('positive');
        expect(result.score).toBeGreaterThan(0.7);
        expect(result.keywords).toContain('responsive');
        console.log('✅ Scenario S105 Passed: Feedback Sentiment verified');
    });
});
