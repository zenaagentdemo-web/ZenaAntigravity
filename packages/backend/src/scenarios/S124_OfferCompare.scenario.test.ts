import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S124: Smart Offer Comparison', () => {
    it('should compare offers and highlight the best terms', async () => {
        const userId = 'user_124';
        const dealId = 'deal_124';
        const result = await journeyService.compareOffers(userId, dealId);

        expect(result.comparisonTable.length).toBe(2);
        expect(result.bestTerms).toBe('Offer 1');
        expect(result.status).toBe('comparison_ready');
        console.log('✅ Scenario S124 Passed: Offer Comparison verified');
    });
});
