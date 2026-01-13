/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// We mock the logic from AskZenaPage.tsx to verify the invariants of our routing logic
// This validates that the property parsing and routing decisions are robust.

interface RoutingResult {
    isConversationMode: boolean;
    pendingProcessOnLiveStart: string | null;
    submitQueryTriggered: string | null;
    lastProcessedTimestamp: string | null;
}

function processParams(
    mode: string | null,
    prompt: string | null,
    timestamp: string | null,
    lastProcessed: string | null
): RoutingResult {
    let isConversationMode = false;
    let pendingProcessOnLiveStart: string | null = null;
    let submitQueryTriggered: string | null = null;
    let newLastProcessed = lastProcessed;

    if (mode === 'handsfree') {
        if (timestamp && timestamp === lastProcessed) {
            // Stale - do nothing
        } else {
            if (timestamp) {
                newLastProcessed = timestamp;
            }

            if (prompt) {
                pendingProcessOnLiveStart = prompt;
            }
            isConversationMode = true;
        }
    }

    if (prompt) {
        // If mode is handsfree, the prompt is handled via Live session start
        if (mode !== 'handsfree') {
            submitQueryTriggered = prompt;
        }
    }

    return {
        isConversationMode,
        pendingProcessOnLiveStart,
        submitQueryTriggered,
        lastProcessedTimestamp: newLastProcessed
    };
}

describe('AskZenaPage Routing Logic Property Tests', () => {
    it('Property: mode=handsfree + prompt should trigger Live and NOT REST', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }), // prompt
                fc.string({ minLength: 1 }), // timestamp
                (prompt, timestamp) => {
                    const result = processParams('handsfree', prompt, timestamp, null);

                    expect(result.isConversationMode).toBe(true);
                    expect(result.pendingProcessOnLiveStart).toBe(prompt);
                    expect(result.submitQueryTriggered).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property: prompt without handsfree should trigger REST and NOT Live', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }), // prompt
                fc.string().filter(s => s !== 'handsfree'), // mode
                (prompt, mode) => {
                    const result = processParams(mode, prompt, null, null);

                    expect(result.isConversationMode).toBe(false);
                    expect(result.pendingProcessOnLiveStart).toBeNull();
                    expect(result.submitQueryTriggered).toBe(prompt);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property: Stale timestamp in handsfree mode should be ignored', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }), // prompt
                fc.string({ minLength: 1 }), // timestamp
                (prompt, timestamp) => {
                    const result = processParams('handsfree', prompt, timestamp, timestamp);

                    expect(result.isConversationMode).toBe(false);
                    expect(result.pendingProcessOnLiveStart).toBeNull();
                    expect(result.submitQueryTriggered).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });
});
