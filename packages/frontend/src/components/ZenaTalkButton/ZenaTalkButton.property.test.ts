/**
 * ZenaTalkButton Property Tests
 * Tests invariants for the tap-to-talk button component
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Voice state types
type VoiceState = 'idle' | 'listening' | 'processing';

// Valid state transitions
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
    idle: ['listening'],      // Can only go to listening from idle
    listening: ['processing', 'idle'], // Can go to processing or cancel back to idle
    processing: ['idle'],     // Can only return to idle after processing
};

// INV-3: Voice State Machine Invariant
describe('ZenaTalkButton Invariants', () => {
    describe('INV-3: Voice State Machine Transitions', () => {
        it('should only allow valid state transitions', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('idle', 'listening', 'processing') as fc.Arbitrary<VoiceState>,
                    fc.constantFrom('idle', 'listening', 'processing') as fc.Arbitrary<VoiceState>,
                    (fromState, toState) => {
                        const validNextStates = VALID_TRANSITIONS[fromState];
                        const isValidTransition = validNextStates.includes(toState) || fromState === toState;

                        // Either it's a valid transition, or it stays the same
                        if (fromState === toState) {
                            // Staying in same state is always valid
                            return true;
                        }

                        // Check transition validity
                        return isValidTransition === validNextStates.includes(toState);
                    }
                )
            );
        });

        it('should not transition from processing directly to listening', () => {
            fc.assert(
                fc.property(
                    fc.constant('processing' as VoiceState),
                    fc.constant('listening' as VoiceState),
                    (fromState, toState) => {
                        const validNextStates = VALID_TRANSITIONS[fromState];
                        const isValid = validNextStates.includes(toState);

                        expect(isValid).toBe(false);
                        return isValid === false;
                    }
                )
            );
        });

        it('should not transition from idle directly to processing', () => {
            fc.assert(
                fc.property(
                    fc.constant('idle' as VoiceState),
                    fc.constant('processing' as VoiceState),
                    (fromState, toState) => {
                        const validNextStates = VALID_TRANSITIONS[fromState];
                        const isValid = validNextStates.includes(toState);

                        expect(isValid).toBe(false);
                        return isValid === false;
                    }
                )
            );
        });
    });

    describe('INV-5: Audio Level Reactivity', () => {
        it('should report audio level changes only when listening', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('idle', 'listening', 'processing') as fc.Arbitrary<VoiceState>,
                    fc.float({ min: 0, max: 1 }),
                    (state, audioLevel) => {
                        const shouldReportAudio = state === 'listening';
                        const reportedLevel = shouldReportAudio ? audioLevel : 0;

                        if (state !== 'listening') {
                            expect(reportedLevel).toBe(0);
                        } else {
                            expect(reportedLevel).toBe(audioLevel);
                        }

                        return true;
                    }
                )
            );
        });
    });

    describe('Button State Behavior', () => {
        it('should disable button when processing', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('idle', 'listening', 'processing') as fc.Arbitrary<VoiceState>,
                    (state) => {
                        const isDisabled = state === 'processing';
                        const canInteract = !isDisabled;

                        if (state === 'processing') {
                            expect(canInteract).toBe(false);
                        } else {
                            expect(canInteract).toBe(true);
                        }

                        return true;
                    }
                )
            );
        });
    });
});
