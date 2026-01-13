
import { describe, it, expect } from 'vitest';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

describe('Scenario S26: Multi-Unit Portfolio', () => {
    it('should aggregate portfolio stats for multiple properties', () => {
        // --- STEP 1: TRIGGER (Group by Suburb) ---
        const properties = [
            { id: '1', listingPrice: 1000000, momentumScore: 80, riskLevel: 'Low' },
            { id: '2', listingPrice: 2000000, momentumScore: 40, riskLevel: 'High' }
        ];

        // --- STEP 2: REASONING (Aggregated Heat) ---
        const summary = propertyIntelligenceService.summarizePortfolio(properties);

        // --- STEP 3: CONSEQUENCE (Risk Summary) ---
        expect(summary.totalValue).toBe(3000000);
        expect(summary.healthScore).toBe(60);
        expect(summary.riskCount).toBe(1);

        console.log("✅ Scenario S26 Passed: Grouping -> Aggregated Stats -> Risk Summary Displayed");
    });
});
