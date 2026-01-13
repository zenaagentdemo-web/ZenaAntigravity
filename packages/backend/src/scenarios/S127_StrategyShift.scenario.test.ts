import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S127: Strategic Nudge', () => {
    it('should suggest a strategy shift based on listing age', async () => {
        const userId = 'user_127';
        const propertyId = 'p127';
        const result = await journeyService.suggestStrategyShift(userId, propertyId);

        expect(result.suggestion).toBe('Switch to Auction');
        expect(result.status).toBe('strategy_suggested');
        console.log('✅ Scenario S127 Passed: Strategic Nudge verified');
    });
});
