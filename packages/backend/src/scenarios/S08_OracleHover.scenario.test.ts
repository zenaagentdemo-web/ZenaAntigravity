
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askZenaService } from '../services/ask-zena.service.js';

describe('Scenario S08: Oracle Hover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should predict contact role as "agent" for a real estate domain and provide a tooltip hint', async () => {
        // --- STEP 1: TRIGGER (UI Hover / Pre-creation Analysis) ---
        const testEmail = "sarah@barfoot.co.nz";

        // --- STEP 2: REASONING (Prediction Logic) ---
        const prediction = await askZenaService.predictContactType(testEmail);

        // --- STEP 3: CONSEQUENCE (Tooltip Display) ---
        expect(prediction.suggestedRole).toBe('agent');
        expect(prediction.confidence).toBeGreaterThan(0.9);
        expect(prediction.intelligenceHint).toContain('Fellow real estate professional');

        console.log("✅ Scenario S08 Passed: UI Hover -> Prediction -> Tooltip Hint");
    });
});
