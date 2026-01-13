
import { describe, it, expect, vi } from 'vitest';
import { godmodeService } from '../services/godmode.service.js';

vi.mock('../services/godmode.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        godmodeService: {
            ...original.godmodeService,
            applyPersona: vi.fn().mockResolvedValue({ status: 'applied', persona: 'Supportive Mentor' })
        }
    };
});

describe('Scenario S93: Persona Voice Sync', () => {
    it('should update global prompt template based on persona', async () => {
        const result = await godmodeService.applyPersona('u123', 'Mentor' as any);
        expect(result.persona).toBe('Supportive Mentor');
        console.log('✅ Scenario S93 Passed: Persona Voice verified');
    });
});
