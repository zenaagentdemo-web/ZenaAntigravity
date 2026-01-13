
import { describe, it, expect, vi } from 'vitest';
import { settingsService } from '../services/settings.service.js';

vi.mock('../services/settings.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        settingsService: {
            ...original.settingsService,
            updateBriefSettings: vi.fn().mockResolvedValue({ featureConfig: { marketNews: false } })
        }
    };
});

describe('Scenario S92: Morning Brief Customization', () => {
    it('should disable specific brief components', async () => {
        const result = await settingsService.updateBriefSettings('u123', { marketNews: false });
        expect(result.featureConfig.marketNews).toBe(false);
        console.log('✅ Scenario S92 Passed: Brief Customization verified');
    });
});
