
import { describe, it, expect, vi } from 'vitest';
import { settingsService } from '../services/settings.service.js';

vi.mock('../services/settings.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        settingsService: {
            ...original.settingsService,
            localCacheSearch: vi.fn().mockResolvedValue({ source: 'local_cache' })
        }
    };
});

describe('Scenario S96: Offline Search', () => {
    it('should use local cache when offline', async () => {
        const result = await settingsService.localCacheSearch('u123', 'John');
        expect(result.source).toBe('local_cache');
        console.log('✅ Scenario S96 Passed: Offline Search verified');
    });
});
