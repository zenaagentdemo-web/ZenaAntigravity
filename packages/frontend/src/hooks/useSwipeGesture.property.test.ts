/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for useSwipeGesture hook
 * 
 * Feature: enhanced-new-page
 * Property 11: Swipe Threshold Action Reveal
 * Property 12: Swipe Action Execution
 * Property 13: Swipe Cancel Reset
 * Property 14: Swipe Indicator Opacity Proportionality
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useSwipeGesture } from './useSwipeGesture';
import { SwipeDirection } from '../models/newPage.types';

// Mock navigator.vibrate
const mockVibrate = vi.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true
});

// Helper to create mock touch events
const createTouchEvent = (clientX: number, clientY: number = 100): React.TouchEvent => ({
  touches: [{ clientX, clientY }] as unknown as React.TouchList,
  changedTouches: [{ clientX, clientY }] as unknown as React.TouchList,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn()
} as unknown as React.TouchEvent);

describe('useSwipeGesture Property Tests', () => {
  beforeEach(() => {
    mockVibrate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 11: Swipe Threshold Action Reveal', () => {
    /**
     * Feature: enhanced-new-page, Property 11: Swipe Threshold Action Reveal
     * Validates: Requirements 5.1, 5.2
     * 
     * For any swipe gesture on a Thread_Card, when |swipeOffset| exceeds 80px,
     * the corresponding action indicator SHALL be visible 
     * (left swipe → snooze indicator, right swipe → view indicator).
     */
    it('should reveal left action indicator when swiping left beyond threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 81, max: 300 }), // Swipe distance beyond threshold
          fc.uuid(), // Thread ID
          (swipeDistance, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            // Start swipe at position 200
            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            // Move left (negative direction)
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX - swipeDistance));
            });

            // Verify swipe state
            expect(result.current.swipeState.isSwiping).toBe(true);
            expect(result.current.swipeState.direction).toBe('left');
            expect(result.current.isThresholdExceeded()).toBe(true);
            expect(Math.abs(result.current.getSwipeOffset())).toBeGreaterThanOrEqual(80);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reveal right action indicator when swiping right beyond threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 81, max: 300 }), // Swipe distance beyond threshold
          fc.uuid(), // Thread ID
          (swipeDistance, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            // Start swipe at position 100
            const startX = 100;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            // Move right (positive direction)
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + swipeDistance));
            });

            // Verify swipe state
            expect(result.current.swipeState.isSwiping).toBe(true);
            expect(result.current.swipeState.direction).toBe('right');
            expect(result.current.isThresholdExceeded()).toBe(true);
            expect(result.current.getSwipeOffset()).toBeGreaterThanOrEqual(80);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT reveal action indicator when swipe is below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 79 }), // Swipe distance below threshold
          fc.uuid(),
          fc.boolean(), // Direction: true = right, false = left
          (swipeDistance, threadId, isRight) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            const endX = isRight ? startX + swipeDistance : startX - swipeDistance;
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(endX));
            });

            // Threshold should NOT be exceeded
            expect(result.current.isThresholdExceeded()).toBe(false);
            expect(Math.abs(result.current.getSwipeOffset())).toBeLessThan(80);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Swipe Action Execution', () => {
    /**
     * Feature: enhanced-new-page, Property 12: Swipe Action Execution
     * Validates: Requirements 5.3
     * 
     * For any swipe gesture released with |swipeOffset| > 80px, 
     * the corresponding action SHALL be executed (left → snooze, right → navigate to thread).
     */
    it('should execute action callback when swipe exceeds threshold and is released', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 81, max: 300 }),
          fc.uuid(),
          fc.boolean(), // Direction
          (swipeDistance, threadId, isRight) => {
            const onSwipeAction = vi.fn();
            const { result } = renderHook(() => useSwipeGesture({ 
              threshold: 80,
              onSwipeAction 
            }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            const endX = isRight ? startX + swipeDistance : startX - swipeDistance;
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(endX));
            });

            act(() => {
              result.current.handlers.onTouchEnd(createTouchEvent(endX));
            });

            // Action should be called with correct parameters
            expect(onSwipeAction).toHaveBeenCalledTimes(1);
            expect(onSwipeAction).toHaveBeenCalledWith(
              threadId,
              isRight ? 'right' : 'left'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT execute action when swipe is below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 79 }),
          fc.uuid(),
          fc.boolean(),
          (swipeDistance, threadId, isRight) => {
            const onSwipeAction = vi.fn();
            const onSwipeCancel = vi.fn();
            const { result } = renderHook(() => useSwipeGesture({ 
              threshold: 80,
              onSwipeAction,
              onSwipeCancel
            }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            const endX = isRight ? startX + swipeDistance : startX - swipeDistance;
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(endX));
            });

            act(() => {
              result.current.handlers.onTouchEnd(createTouchEvent(endX));
            });

            // Action should NOT be called
            expect(onSwipeAction).not.toHaveBeenCalled();
            // Cancel should be called instead
            expect(onSwipeCancel).toHaveBeenCalledWith(threadId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Swipe Cancel Reset', () => {
    /**
     * Feature: enhanced-new-page, Property 13: Swipe Cancel Reset
     * Validates: Requirements 5.4
     * 
     * For any swipe gesture released with |swipeOffset| <= 80px, 
     * the Thread_Card transform SHALL return to translateX(0) within 300ms.
     */
    it('should reset swipe state when released below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 79 }),
          fc.uuid(),
          fc.boolean(),
          (swipeDistance, threadId, isRight) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            const endX = isRight ? startX + swipeDistance : startX - swipeDistance;
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(endX));
            });

            // Before release, should have offset
            expect(result.current.getSwipeOffset()).not.toBe(0);

            act(() => {
              result.current.handlers.onTouchEnd(createTouchEvent(endX));
            });

            // After release, state should be reset
            expect(result.current.swipeState.isSwiping).toBe(false);
            expect(result.current.swipeState.threadId).toBeNull();
            expect(result.current.getSwipeOffset()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset swipe state after action execution', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 81, max: 300 }),
          fc.uuid(),
          (swipeDistance, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + swipeDistance));
            });

            act(() => {
              result.current.handlers.onTouchEnd(createTouchEvent(startX + swipeDistance));
            });

            // State should be reset after action
            expect(result.current.swipeState.isSwiping).toBe(false);
            expect(result.current.swipeState.threadId).toBeNull();
            expect(result.current.getSwipeOffset()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Swipe Indicator Opacity Proportionality', () => {
    /**
     * Feature: enhanced-new-page, Property 14: Swipe Indicator Opacity Proportionality
     * Validates: Requirements 5.5
     * 
     * For any active swipe gesture, the action indicator opacity 
     * SHALL equal min(1, |swipeOffset| / 80).
     */
    it('should calculate opacity proportional to swipe distance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          fc.uuid(),
          (swipeDistance, threadId) => {
            const threshold = 80;
            const { result } = renderHook(() => useSwipeGesture({ threshold }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + swipeDistance));
            });

            const expectedOpacity = Math.min(1, swipeDistance / threshold);
            const actualOpacity = result.current.getIndicatorOpacity();

            // Allow small floating point tolerance
            expect(Math.abs(actualOpacity - expectedOpacity)).toBeLessThan(0.001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cap opacity at 1 when swipe exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 81, max: 500 }),
          fc.uuid(),
          (swipeDistance, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + swipeDistance));
            });

            // Opacity should be capped at 1
            expect(result.current.getIndicatorOpacity()).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 opacity when not swiping', () => {
      const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

      // Without any swipe, opacity should be 0
      expect(result.current.getIndicatorOpacity()).toBe(0);
    });

    it('should calculate opacity correctly for left swipes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          fc.uuid(),
          (swipeDistance, threadId) => {
            const threshold = 80;
            const { result } = renderHook(() => useSwipeGesture({ threshold }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            // Swipe left (negative direction)
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX - swipeDistance));
            });

            const expectedOpacity = Math.min(1, swipeDistance / threshold);
            const actualOpacity = result.current.getIndicatorOpacity();

            expect(Math.abs(actualOpacity - expectedOpacity)).toBeLessThan(0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Swipe Direction Detection', () => {
    it('should correctly detect swipe direction', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 200 }),
          fc.uuid(),
          fc.boolean(),
          (swipeDistance, threadId, isRight) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            const endX = isRight ? startX + swipeDistance : startX - swipeDistance;
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(endX));
            });

            const expectedDirection: SwipeDirection = isRight ? 'right' : 'left';
            expect(result.current.swipeState.direction).toBe(expectedDirection);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Custom Threshold', () => {
    it('should respect custom threshold values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 150 }), // Custom threshold
          fc.uuid(),
          (customThreshold, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: customThreshold }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            // Swipe exactly at threshold
            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + customThreshold));
            });

            expect(result.current.isThresholdExceeded()).toBe(true);

            // Reset and swipe just below threshold
            act(() => {
              result.current.resetSwipe();
            });

            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + customThreshold - 1));
            });

            expect(result.current.isThresholdExceeded()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Manual Reset', () => {
    it('should reset state when resetSwipe is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 200 }),
          fc.uuid(),
          (swipeDistance, threadId) => {
            const { result } = renderHook(() => useSwipeGesture({ threshold: 80 }));

            const startX = 200;
            act(() => {
              result.current.handlers.onTouchStart(createTouchEvent(startX), threadId);
            });

            act(() => {
              result.current.handlers.onTouchMove(createTouchEvent(startX + swipeDistance));
            });

            // Verify swipe is active
            expect(result.current.swipeState.isSwiping).toBe(true);

            // Reset manually
            act(() => {
              result.current.resetSwipe();
            });

            // Verify reset
            expect(result.current.swipeState.isSwiping).toBe(false);
            expect(result.current.swipeState.threadId).toBeNull();
            expect(result.current.getSwipeOffset()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
