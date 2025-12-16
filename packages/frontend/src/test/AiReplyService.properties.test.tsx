/**
 * Property-based tests for AiReplyService
 * 
 * Verifies robustness:
 * 1. generateReply never throws for any inputs (Robustness)
 * 2. Always returns a non-empty string
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { aiReplyService } from '../services/aiReplyService';
import { ReplyStyle, Thread } from '../models/newPage.types';

describe('AiReplyService Robustness', () => {

    it('should never throw and always return string for any thread/style input', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    // Fuzz subject with extreme inputs (empty, very long, symbols)
                    subject: fc.string(),
                    // Fuzz participants (empty list, missing names, nulls if type allows)
                    participants: fc.array(fc.record({
                        name: fc.oneof(fc.string(), fc.constant(undefined)),
                        email: fc.string()
                    })),
                    propertyAddress: fc.option(fc.string()),
                    summary: fc.option(fc.string()),
                    aiSummary: fc.option(fc.string())
                }),
                fc.constantFrom('Friendly', 'Professional', 'Casual'),
                async (thread, style) => {
                    try {
                        const reply = await aiReplyService.generateReply(thread as unknown as Thread, style as ReplyStyle);

                        // Invariant: Must return a string
                        expect(typeof reply).toBe('string');

                        // Invariant: Must not be empty
                        expect(reply.length).toBeGreaterThan(0);

                        // Invariant: Should contain safe fallbacks if data missing (e.g., 'there' default)
                        if (!thread.participants[0]?.name) {
                            expect(reply).not.toContain('undefined');
                            expect(reply).not.toContain('null');
                        }

                        return true;
                    } catch (error) {
                        // Should catch any internal errors and fallback
                        console.error('Property Test Caught Error:', error);
                        return false;
                    }
                }
            ),
            { numRuns: 20, timeout: 50000 } // Run 20 iterations, allow long timeout for mock delays
        );
    }, 60000); // 60s test limit
});
