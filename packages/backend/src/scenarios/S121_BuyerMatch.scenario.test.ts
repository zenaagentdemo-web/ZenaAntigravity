import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S121: Buyer Match Confidence', () => {
    it('should calculate match confidence and provide reasoning', async () => {
        const userId = 'user_121';
        const buyerId = 'b121';
        const propertyId = 'p121';
        const result = await journeyService.getBuyerMatchConfidence(userId, buyerId, propertyId);

        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.reasoning).toContain('bracket');
        expect(result.status).toBe('match_calculated');
        console.log('✅ Scenario S121 Passed: Buyer Match verified');
    });
});
