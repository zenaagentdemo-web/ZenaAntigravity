import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S130: Omni-Channel Amplification', () => {
    it('should amplify a property listing globally across channels', async () => {
        const userId = 'user_130';
        const propertyId = 'p130';
        const result = await journeyService.amplifyListingGlobally(userId, propertyId);

        expect(result.channels).toContain('Facebook');
        expect(result.channels.length).toBe(4);
        expect(result.status).toBe('amplification_complete');
        console.log('✅ Scenario S130 Passed: Global Amplification verified');
    });
});
