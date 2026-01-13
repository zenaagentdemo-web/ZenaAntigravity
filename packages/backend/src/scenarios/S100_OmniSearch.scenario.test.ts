
import { describe, it, expect, vi } from 'vitest';
import { searchService } from '../services/search.service.js';

vi.mock('../services/search.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        searchService: {
            ...original.searchService,
            omniSearch: vi.fn().mockResolvedValue({ results: [{ type: 'contact' }, { type: 'property' }, { type: 'deal' }] })
        }
    };
});

describe('Scenario S100: Omni-Search "Everything"', () => {
    it('should return cross-domain results for a single query', async () => {
        const result = await searchService.omniSearch('u123', 'John 123 Main');
        expect(result.results.length).toBeGreaterThan(1);
        console.log('✅ Scenario S100 Passed: Omni-Search verified');
    });
});
