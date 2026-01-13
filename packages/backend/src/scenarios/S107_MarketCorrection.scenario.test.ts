import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S107: Market Correction Suggestions', () => {
    it('should suggest a price drop based on market performance', async () => {
        const userId = 'user_107';
        const propertyId = 'prop_107';

        const result = await journeyService.suggestMarketCorrection(userId, propertyId);

        expect(result.suggestedPriceDrop).toBe(50000);
        expect(result.status).toBe('correction_suggested');
        console.log('✅ Scenario S107 Passed: Market Correction verified');
    });
});
