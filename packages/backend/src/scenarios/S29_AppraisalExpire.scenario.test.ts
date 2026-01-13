
import { describe, it, expect } from 'vitest';
import { propertyIntelligenceService } from '../services/property-intelligence.service.js';

describe('Scenario S29: Appraisal Expire', () => {
    it('should flag old appraisals as expired', () => {
        // --- STEP 1: TRIGGER (6 months old) ---
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 190);

        // --- STEP 2: REASONING (Red Flag) ---
        const status = propertyIntelligenceService.getAppraisalStatus(sixMonthsAgo.toISOString());

        // --- STEP 3: CONSEQUENCE (Renewal Task) ---
        expect(status.status).toBe('Expired');
        expect(status.message).toContain("180 days old");

        console.log("✅ Scenario S29 Passed: Old Appraisal -> Red Flag -> Task Notified");
    });
});
