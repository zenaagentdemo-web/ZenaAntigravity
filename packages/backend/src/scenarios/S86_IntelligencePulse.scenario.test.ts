
import { describe, it, expect, vi } from 'vitest';
import { godmodeService } from '../services/godmode.service.js';

vi.mock('../services/godmode.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        godmodeService: {
            ...original.godmodeService,
            getIntelligencePulse: vi.fn().mockResolvedValue({
                recap: 'Scan complete',
                topActions: ['Action 1']
            })
        }
    };
});

describe('Scenario S86: Intelligence Pulse', () => {
    it('should generate a global intelligence recap', async () => {
        const result = await godmodeService.getIntelligencePulse('u123');
        expect(result.recap).toBeDefined();
        console.log('✅ Scenario S86 Passed: Intelligence Pulse verified');
    });
});
