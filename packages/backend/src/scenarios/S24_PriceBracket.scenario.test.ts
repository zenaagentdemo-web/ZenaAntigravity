
import { describe, it, expect } from 'vitest';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

describe('Scenario S24: Price Bracket', () => {
    it('should suggest price adjustment for stale listings', () => {
        // --- STEP 1: TRIGGER (Analyze Trend) ---
        const property = {
            listingPrice: 1000000,
            daysOnMarket: 35,
            viewingCount: 2
        };

        // --- STEP 2: REASONING (Suggest Adjustment) ---
        const suggestion = propertyIntelligenceService.calculatePriceBracket(property, 1000000);

        // --- STEP 3: CONSEQUENCE (UI Prompt) ---
        expect(suggestion.suggested).toBeLessThan(1000000);
        expect(suggestion.reason).toContain("Stale listing");

        console.log("✅ Scenario S24 Passed: Trend Analyzed -> Price Realignment Suggested");
    });
});
