
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { ThreadCard } from '../components/ThreadCard/ThreadCard';
import { Thread } from '../models/newPage.types';

// Mock dependencies
vi.mock('../utils/hapticFeedback', () => ({
    hapticFeedback: {
        light: vi.fn()
    }
}));

vi.mock('../utils/animationPerformance', () => ({
    useAnimationPerformance: () => ({
        requestAnimation: (id: string, cb: () => void) => cb(),
        isPerformanceAcceptable: true
    }),
    applyAnimationOptimizations: vi.fn(),
    cleanupAnimationOptimizations: vi.fn()
}));

describe('ThreadCard Safety Properties', () => {
    it('invariant: should render expanded state without crashing for any thread object shape', () => {
        fc.assert(
            fc.property(
                fc.object(),
                (unsafeThread) => {
                    const thread = unsafeThread as unknown as Thread;

                    try {
                        render(
                            <ThreadCard
                                thread={thread}
                                isDropdownExpanded={true} // Force expanded state to test sensitive rendering logic
                                isSelected={false}
                                isBatchMode={false}
                                onDropdownToggle={vi.fn()}
                            />
                        );
                    } catch (e) {
                        // If it throws, the test fails
                        throw new Error(`ThreadCard expanded crashed with thread: ${JSON.stringify(thread)}. Error: ${e}`);
                    }
                    expect(true).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
