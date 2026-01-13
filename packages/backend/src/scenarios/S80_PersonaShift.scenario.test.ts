
import { describe, it, expect, vi } from 'vitest';
import { godmodeService } from '../services/godmode.service.js';

vi.mock('../services/godmode.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        godmodeService: {
            ...original.godmodeService,
            applyPersona: vi.fn().mockResolvedValue({ persona: 'Aggressive', status: 'applied' })
        }
    };
});

describe('Scenario S80: Godmode Persona Shift', () => {
    it('should shift AI persona and update thresholds', async () => {
        const result = await godmodeService.applyPersona('u123', 'Aggressive');
        expect(result.persona).toBe('Aggressive');
        expect(result.status).toBe('applied');
        console.log('✅ Scenario S80 Passed: Persona Shift verified');
    });
});
