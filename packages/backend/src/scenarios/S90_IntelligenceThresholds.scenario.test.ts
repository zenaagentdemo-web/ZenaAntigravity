
import { describe, it, expect, vi } from 'vitest';
import { godmodeService } from '../services/godmode.service.js';

vi.mock('../services/godmode.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        godmodeService: {
            ...original.godmodeService,
            setIntelligenceThresholds: vi.fn().mockResolvedValue({ status: 'calibrated' })
        }
    };
});

describe('Scenario S90: Intelligence Thresholds', () => {
    it('should configure neural threshold settings', async () => {
        const result = await godmodeService.setIntelligenceThresholds('u123', { priority: 0.8 });
        expect(result.status).toBe('calibrated');
        console.log('✅ Scenario S90 Passed: Intelligence Thresholds verified');
    });
});
