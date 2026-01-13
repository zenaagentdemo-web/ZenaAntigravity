import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S125: Deal Fatigue Detection', () => {
    it('should issue a warning when a deal is stagnant', async () => {
        const userId = 'user_125';
        const dealId = 'deal_125';
        const result = await journeyService.monitorDealFatigue(userId, dealId);

        expect(result.risk).toBe('High');
        expect(result.daysAtStage).toBeGreaterThan(15);
        expect(result.status).toBe('fatigue_warning_issued');
        console.log('✅ Scenario S125 Passed: Deal Fatigue verified');
    });
});
