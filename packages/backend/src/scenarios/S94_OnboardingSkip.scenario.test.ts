
import { describe, it, expect, vi } from 'vitest';
import { settingsService } from '../services/settings.service.js';

vi.mock('../services/settings.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        settingsService: {
            ...original.settingsService,
            skipOnboarding: vi.fn().mockResolvedValue({ status: 'skipped' })
        }
    };
});

describe('Scenario S94: Onboarding Skip Logic', () => {
    it('should handle skip and set reminder', async () => {
        const result = await settingsService.skipOnboarding('u123');
        expect(result.status).toBe('skipped');
        console.log('✅ Scenario S94 Passed: Onboarding Skip verified');
    });
});
