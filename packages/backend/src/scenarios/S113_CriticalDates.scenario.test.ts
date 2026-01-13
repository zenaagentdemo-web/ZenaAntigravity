import { describe, it, expect } from 'vitest';
import { journeyService } from '../services/journey.service.js';

describe('Scenario S113: Critical Date Reminder', () => {
    it('should fetch and notify regarding critical upcoming dates', async () => {
        const userId = 'user_113';
        const result = await journeyService.notifyCriticalDates(userId);

        expect(result.reminders.length).toBeGreaterThan(0);
        expect(result.status).toBe('reminders_sent');
        console.log('✅ Scenario S113 Passed: Critical Dates verified');
    });
});
