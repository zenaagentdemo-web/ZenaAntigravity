import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S109: Social Amplification', () => {
    it('should queue property amplification to social channels', async () => {
        const userId = 'user_109';
        const propertyId = 'prop_109';

        const result = await journeyService.amplifyToSocial(userId, propertyId);

        expect(result.channels).toContain('Facebook');
        expect(result.status).toBe('amplification_queued');
        console.log('✅ Scenario S109 Passed: Social Amplification verified');
    });
});
