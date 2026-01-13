
import { describe, it, expect } from 'vitest';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

describe('Scenario S25: Sentiment Map', () => {
    it('should calculate positive sentiment for hot interest', () => {
        // --- STEP 1: TRIGGER (Notes) ---
        const events = [
            { type: 'note', summary: 'Buyers loved the garden' },
            { type: 'message', content: 'This is a hot property' }
        ];

        // --- STEP 2: REASONING (Sentiment Logic) ---
        const map = propertyIntelligenceService.calculateSentimentMap(events);

        // --- STEP 3: CONSEQUENCE (Orb Glow) ---
        expect(map.sentiment).toBe('Positive');
        expect(map.score).toBeGreaterThan(50);

        console.log("✅ Scenario S25 Passed: Notes Aggregated -> Sentiment Scored");
    });
});
