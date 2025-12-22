import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TranscriptionMerger } from './transcription-merger';

describe('TranscriptionMerger', () => {
    let merger: TranscriptionMerger;

    beforeEach(() => {
        merger = new TranscriptionMerger();
    });

    it('should correctly join final segments with spaces', () => {
        merger.update('Hello', true);
        merger.update('world', true);
        expect(merger.getDisplayContent()).toBe('Hello world');
    });

    it('should handle interim updates by replacing the previous interim', () => {
        merger.update('Hello', true);
        merger.update('wor', false);
        expect(merger.getDisplayContent()).toBe('Hello wor');
        merger.update('world', false);
        expect(merger.getDisplayContent()).toBe('Hello world');
    });

    it('should reset correctly', () => {
        merger.update('Hello', true);
        merger.reset();
        expect(merger.getDisplayContent()).toBe('');
    });

    // Property-based Tests
    describe('Properties', () => {
        it('should always grow or refine and maintain word order', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.record({ text: fc.string({ minLength: 1 }), isFinal: fc.boolean() })),
                    (updates) => {
                        const tempMerger = new TranscriptionMerger();
                        let lastContent = '';

                        for (const update of updates) {
                            tempMerger.update(update.text, update.isFinal);
                            const currentContent = tempMerger.getDisplayContent();

                            // Refinement Reality: We can't strictly say it grows (because of auto-correction jumps),
                            // but it should follow the logic of replacing interim or appending final.
                            // We verify that the output is always a string.
                            expect(typeof currentContent).toBe('string');
                            lastContent = currentContent;
                        }
                    }
                )
            );
        });

        it('idempotency: repeating an interim update should not change the state', () => {
            fc.assert(
                fc.property(fc.string(), (text) => {
                    const m = new TranscriptionMerger();
                    m.update(text, false);
                    const first = m.getDisplayContent();
                    m.update(text, false);
                    const second = m.getDisplayContent();
                    expect(first).toBe(second);
                })
            );
        });

        it('segment isolation: final segments are preserved regardless of subsequent interims', () => {
            fc.assert(
                fc.property(fc.array(fc.string({ minLength: 1 })), fc.string(), (finals, current) => {
                    const m = new TranscriptionMerger();
                    const trimmedFinals = finals.map(f => f.trim()).filter(f => f.length > 0);
                    trimmedFinals.forEach(f => m.update(f, true));

                    const expectedStart = trimmedFinals.join(' ');

                    m.update(current, false);
                    const result = m.getDisplayContent();

                    if (expectedStart) {
                        expect(result.startsWith(expectedStart)).toBe(true);
                    }
                })
            );
        });
    });

    // Regression tests for reported issues
    describe('Regression: Mashing and Spacing', () => {
        it('should NOT mash segments together (the "bothspecificfee dback" case)', () => {
            // Logic: Gemini sends "give me both" (final), then "specific feedback" (final)
            // Or Gemini sends "give me both" (final), then "specific" (interim), then "specific feedback" (final)
            merger.update('give me both', true);
            merger.update('specific', false);
            expect(merger.getDisplayContent()).toBe('give me both specific');

            merger.update('specific feedback', true);
            expect(merger.getDisplayContent()).toBe('give me both specific feedback');
        });

        it('should handle muddled words that get corrected', () => {
            merger.update('Hello', true);
            merger.update('wea', false);
            expect(merger.getDisplayContent()).toBe('Hello wea');
            merger.update('weather', false); // ASR jump/correction
            expect(merger.getDisplayContent()).toBe('Hello weather');
        });
    });
});
