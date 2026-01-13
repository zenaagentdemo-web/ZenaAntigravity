import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S104: Bulk Personalization', () => {
    it('should generate personalized drafts for multiple contacts', async () => {
        const userId = 'user_104';
        const contactIds = ['c1', 'c2', 'c3'];
        const templateId = 'temp_listing_update';

        const result = await journeyService.bulkPersonalizeCommunications(userId, contactIds, templateId);

        expect(result.draftsReady).toBe(3);
        expect(result.status).toBe('drafts_generated');
        console.log('✅ Scenario S104 Passed: Bulk Personalization verified');
    });
});
