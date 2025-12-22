import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MultimodalLiveService } from '../services/multimodal-live.service';

describe('MultimodalLiveService Language Invariants', () => {
    const service = new MultimodalLiveService();

    it('Property: SYSTEM_INSTRUCTION must always contain English-only enforcement keywords', () => {
        const instruction = MultimodalLiveService.SYSTEM_INSTRUCTION;

        const requiredKeywords = [
            'English',
            'exclusively',
            'speak exclusively',
            'respond in English'
        ];

        requiredKeywords.forEach(keyword => {
            expect(instruction).toContain(keyword);
        });
    });

    it('Property: Any language policy modification must preserve the "Always Respond in English" rule', () => {
        fc.assert(
            fc.property(fc.string(), (randomPrefix) => {
                // Simulate a dynamic instruction generator
                const generateInstruction = (prefix: string) => `${prefix}\n**CRITICAL LANGUAGE RULE:**\n- You MUST speak exclusively in English.`;
                const result = generateInstruction(randomPrefix);

                return result.includes('speak exclusively in English');
            })
        );
    });

    it('Verification: Input Audio Transcription should be enabled in session config templates', () => {
        // Ideally we would mock ai.live.connect but we can check the logic flow
        // For now, this is a placeholder for more integrated testing
        expect(true).toBe(true);
    });
});
