import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S111: Morning Focus Assistant', () => {
    it('should generate a morning focus and priority', async () => {
        const userId = 'user_111';
        const result = await journeyService.generateMorningFocus(userId);

        expect(result.topPriority).toBeDefined();
        expect(result.status).toBe('focus_generated');
        console.log('✅ Scenario S111 Passed: Morning Focus verified');
    });
});
