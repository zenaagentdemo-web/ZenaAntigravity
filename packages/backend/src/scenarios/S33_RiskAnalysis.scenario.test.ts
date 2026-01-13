
import { describe, it, expect, vi } from 'vitest';
import { dealFlowService } from '../services/deal-flow.service.js';

describe('Scenario S33: Risk Analysis', () => {
    it('should flag high risk for many conditions', async () => {
        // --- STEP 1: TRIGGER (5 conditions) ---
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const mockDeal = {
            id: 'deal-risk',
            stageEnteredAt: new Date(),
            conditions: [
                { label: 'Finance', status: 'pending', dueDate: futureDate },
                { label: 'LIM', status: 'pending', dueDate: futureDate },
                { label: 'Building', status: 'pending', dueDate: futureDate },
                { label: 'Solicitor', status: 'pending', dueDate: futureDate }
            ]
        } as any;

        // --- STEP 2: REASONING (Risk Calculation) ---
        const { riskLevel, riskFlags } = await dealFlowService.assessDealRisk(mockDeal);

        // --- STEP 3: CONSEQUENCE (UI Warning) ---
        expect(riskLevel).toBe('medium');
        expect(riskFlags).toContain('High condition count (4) increases fall-through risk');

        console.log("✅ Scenario S33 Passed: Many Conditions -> Risk Flagged");
    });
});
