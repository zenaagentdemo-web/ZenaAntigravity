
import { describe, it, expect, vi } from 'vitest';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

describe('Scenario S23: Timeline Forecast', () => {
    it('should predict auction date based on first open event', () => {
        // --- STEP 1: TRIGGER (Analyze Event) ---
        const property = { status: 'active' };
        const events = [{ summary: 'First Open Home held', timestamp: '2025-01-01T10:00:00Z' }];

        // --- STEP 2: REASONING (Predict Date) ---
        const forecasts = propertyIntelligenceService.predictMilestones(property, events);

        // --- STEP 3: CONSEQUENCE (Dash Display) ---
        expect(forecasts).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'Auction', confidence: 0.8 })
        ]));

        console.log("✅ Scenario S23 Passed: Event Detected -> AI Milestone Predicted");
    });
});
