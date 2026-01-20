import { describe, it, expect } from 'vitest';
import { marketScraperService } from '../../services/market-scraper.service.js';
import { proactiveContextService } from '../../services/proactive-context.service.js';

describe('Property Scraping Reliability (Phase 6)', () => {

    it('should return mock details for "22 Boundary Road, Taupo"', async () => {
        const address = '22 Boundary Road, Taupo';
        const result = await marketScraperService.getPropertyDetails(address);

        expect(result).not.toBeNull();
        expect(result?.bedrooms).toBe(3);
        expect(result?.bathrooms).toBe(2);
        expect(result?.landArea).toBe('620m²');
        expect(result?.floorArea).toBe('160m²');
        expect(result?.inferred).toBe(true);
    });

    it('should trigger web enrichment in proactiveContextService for 22 Boundary Road', async () => {
        const userId = 'test-user-scraping';
        const params = { address: '22 Boundary Road, Taupo' };

        const result = await proactiveContextService.scanForContext(userId, 'create', 'property', params);

        expect(result.hasMatches).toBe(true);
        // The mock property search returns a match with relevance 95
        const webMatch = result.matches.find(m => m.id === 'web_search');
        expect(webMatch).toBeDefined();
        expect(webMatch?.relevance).toBeGreaterThanOrEqual(85);

        // Suggested data should be populated from the web match
        expect(result.suggestedData.bedrooms).toBe(3);
        expect(result.suggestedData.bathrooms).toBe(2);
        expect(result.suggestedData.landArea).toBe('620m²');
    });
});
