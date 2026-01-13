import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S117: Client Anniversary Sequence', () => {
    it('should initiate a client anniversary sequence', async () => {
        const userId = 'user_117';
        const contactId = 'c117';
        const result = await journeyService.triggerAnniversarySequence(userId, contactId);

        expect(result.sequence).toContain('Gift box');
        expect(result.status).toBe('sequence_initiated');
        console.log('✅ Scenario S117 Passed: Anniversary Sequence verified');
    });
});
