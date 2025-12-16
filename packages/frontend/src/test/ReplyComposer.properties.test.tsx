
import { render } from '@testing-library/react';
import { ReplyComposer } from '../components/ReplyComposer/ReplyComposer';
import fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { Thread } from '../models/newPage.types';

/**
 * Property-Based Safety Test for ReplyComposer
 * 
 * Invariant: Render Safety
 * The component must NEVER throw an exception during render, regardless of the 
 * shape of the 'thread' prop passed to it. It should gracefully handle null/undefined/missing fields.
 */
describe('ReplyComposer Safety Properties', () => {

    it('invariant: should render without crashing for any thread object shape', () => {
        fc.assert(
            fc.property(
                // Generate a random object that vaguely resembles a Thread
                // AND randomly generate templates (or undefined/null) to test robustness there too
                fc.tuple(
                    fc.record({
                        id: fc.string(),
                        subject: fc.string(),
                        // Explicitly generate participants that MIGHT have missing email
                        participants: fc.array(fc.record({
                            name: fc.string(),
                            email: fc.option(fc.string(), { nil: undefined }) // 50% chance of undefined email
                        }, { requiredKeys: ['name'] }))
                    }, { requiredKeys: ['id'] }),
                    fc.option(fc.array(fc.object()), { nil: undefined })
                ),
                ([unsafeThread, unsafeTemplates]) => {
                    // We cast to Thread/Templates to simulate TypeScript runtime unsafe data (e.g. from API)
                    const thread = unsafeThread as unknown as Thread;
                    const templates = unsafeTemplates as any; // Cast to any to allow undefined if prop expects array

                    try {
                        render(
                            <ReplyComposer
                                isOpen={true}
                                thread={thread}
                                templates={templates}
                                onClose={vi.fn()}
                                onSend={vi.fn()}
                                onTemplateSelect={vi.fn()}
                            />
                        );
                    } catch (e) {
                        // If it throws, the test fails
                        throw new Error(`ReplyComposer crashed with thread: ${JSON.stringify(thread)} and templates: ${JSON.stringify(templates)}. Error: ${e}`);
                    }
                    // If we get here, it didn't throw
                    expect(true).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
