import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S115: Team Performance Insight', () => {
    it('should fetch high-level team velocity and deal stats', async () => {
        const userId = 'user_115';
        const result = await journeyService.getTeamPerformance(userId);

        expect(result.velocity).toBeDefined();
        expect(result.status).toBe('insight_ready');
        console.log('✅ Scenario S115 Passed: Team Performance verified');
    });
});
