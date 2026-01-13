import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S112: Low Activity Alert', () => {
    it('should detect activity leaks and suggest actions', async () => {
        const userId = 'user_112';
        const result = await journeyService.checkActivityLeaks(userId);

        expect(result.alert).toContain('leads');
        expect(result.status).toBe('leaks_detected');
        console.log('✅ Scenario S112 Passed: Activity Leaks verified');
    });
});
