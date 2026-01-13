import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S118: Vendor Sentiment Dip Warning', () => {
    it('should issue a warning when vendor sentiment starts declining', async () => {
        const userId = 'user_118';
        const propertyId = 'p118';
        const result = await journeyService.monitorVendorSentiment(userId, propertyId);

        expect(result.sentiment).toBe('declining');
        expect(result.status).toBe('warning_issued');
        console.log('✅ Scenario S118 Passed: Vendor Sentiment verified');
    });
});
