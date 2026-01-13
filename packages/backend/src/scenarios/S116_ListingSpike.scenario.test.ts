import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S116: Trend Alert (New Listing Spike)', () => {
    it('should detect a listing spike in a specific area', async () => {
        const userId = 'user_116';
        const area = 'Auckland Central';
        const result = await journeyService.detectListingSpike(userId, area);

        expect(result.count).toBeGreaterThan(10);
        expect(result.status).toBe('spike_detected');
        console.log('✅ Scenario S116 Passed: Listing Spike verified');
    });
});
