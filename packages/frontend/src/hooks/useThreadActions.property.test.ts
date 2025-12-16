/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for useThreadActions hook
 * 
 * Feature: enhanced-new-page
 * Property 9: Snooze Action Thread Removal
 * Property 10: Action Feedback Toast Display
 * Validates: Requirements 4.3, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { useThreadActions } from './useThreadActions';
import { SnoozeOptions } from '../models/newPage.types';

// Arbitrary for generating valid snooze durations
const snoozeDurationArb = fc.constantFrom('1h', '4h', 'tomorrow', 'next_week') as fc.Arbitrary<SnoozeOptions['duration']>;

// Arbitrary for generating thread IDs
const threadIdArb = fc.uuid();

// Arbitrary for generating thread subjects
const threadSubjectArb = fc.string({ minLength: 1, maxLength: 100 });

// Arbitrary for generating snooze options
const snoozeOptionsArb = fc.record({
  duration: snoozeDurationArb,
  customDate: fc.constant(undefined)
});

describe('useThreadActions Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Property 9: Snooze Action Thread Removal', () => {
    /**
     * Feature: enhanced-new-page, Property 9: Snooze Action Thread Removal
     * Validates: Requirements 4.3
     * 
     * For any thread that receives a successful snooze action, the thread 
     * SHALL be removed from the displayed thread list within 500ms.
     */
    it('should call onThreadRemoved callback after successful snooze', async () => {
      // Generate test data upfront
      const testCases = fc.sample(
        fc.tuple(threadIdArb, snoozeOptionsArb),
        5
      );

      for (const [threadId, options] of testCases) {
        const onThreadRemoved = vi.fn();
        
        const { result, unmount } = renderHook(() => 
          useThreadActions(onThreadRemoved)
        );

        // Execute snooze action
        let actionPromise: Promise<unknown>;
        await act(async () => {
          actionPromise = result.current.snoozeThread(threadId, options);
          // Advance timers to complete the async operations
          await vi.advanceTimersByTimeAsync(700);
        });

        await actionPromise!;

        // Property: onThreadRemoved should be called with the correct threadId
        expect(onThreadRemoved).toHaveBeenCalledWith(threadId);

        unmount();
        vi.clearAllMocks();
      }
    }, 30000);

    it('should return success result after snooze action', async () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, snoozeOptionsArb),
        5
      );

      for (const [threadId, options] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        let actionResult: Awaited<ReturnType<typeof result.current.snoozeThread>> | undefined;
        await act(async () => {
          const promise = result.current.snoozeThread(threadId, options);
          await vi.advanceTimersByTimeAsync(700);
          actionResult = await promise;
        });

        // Property: Snooze action should return a success result
        expect(actionResult).toBeDefined();
        expect(actionResult!.success).toBe(true);
        expect(actionResult!.threadId).toBe(threadId);
        expect(actionResult!.action).toBe('snooze');
        expect(actionResult!.timestamp).toBeDefined();

        unmount();
      }
    }, 30000);

    it('should close snooze overlay after successful snooze', async () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, threadSubjectArb, snoozeOptionsArb),
        5
      );

      for (const [threadId, subject, options] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Open snooze overlay first
        act(() => {
          result.current.openSnoozeOverlay(threadId, subject);
        });

        expect(result.current.state.isSnoozeOpen).toBe(true);
        expect(result.current.state.snoozeThreadId).toBe(threadId);

        // Execute snooze
        await act(async () => {
          const promise = result.current.snoozeThread(threadId, options);
          await vi.advanceTimersByTimeAsync(700);
          await promise;
        });

        // Property: Snooze overlay should be closed after successful snooze
        expect(result.current.state.isSnoozeOpen).toBe(false);
        expect(result.current.state.snoozeThreadId).toBeNull();

        unmount();
      }
    }, 30000);
  });

  describe('Property 10: Action Feedback Toast Display', () => {
    /**
     * Feature: enhanced-new-page, Property 10: Action Feedback Toast Display
     * Validates: Requirements 4.5, 4.6
     * 
     * For any action (snooze, send_draft, archive) that completes, the system 
     * SHALL display a toast notification. Success actions display success styling; 
     * failed actions display error styling with retry option.
     */
    it('should display success toast after successful snooze action', async () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, snoozeOptionsArb),
        5
      );

      for (const [threadId, options] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Execute snooze action
        await act(async () => {
          const promise = result.current.snoozeThread(threadId, options);
          await vi.advanceTimersByTimeAsync(700);
          await promise;
        });

        // Property: A success toast should be displayed after successful snooze
        const toasts = result.current.state.toasts;
        expect(toasts.length).toBeGreaterThan(0);
        
        const successToast = toasts.find(t => t.type === 'success');
        expect(successToast).toBeDefined();
        expect(successToast!.message).toContain('snoozed');

        unmount();
      }
    }, 30000);

    it('should display success toast after successful send draft action', async () => {
      const testCases = fc.sample(threadIdArb, 5);

      for (const threadId of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Execute send draft action
        await act(async () => {
          const promise = result.current.sendDraft(threadId);
          await vi.advanceTimersByTimeAsync(2000);
          await promise;
        });

        // Property: A success toast should be displayed after successful send draft
        const toasts = result.current.state.toasts;
        expect(toasts.length).toBeGreaterThan(0);
        
        const successToast = toasts.find(t => t.type === 'success');
        expect(successToast).toBeDefined();
        expect(successToast!.message).toContain('sent');

        unmount();
      }
    }, 30000);

    it('should display success toast after successful archive action', async () => {
      const testCases = fc.sample(threadIdArb, 5);

      for (const threadId of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Execute archive action
        await act(async () => {
          const promise = result.current.archiveThread(threadId);
          await vi.advanceTimersByTimeAsync(700);
          await promise;
        });

        // Property: A success toast should be displayed after successful archive
        const toasts = result.current.state.toasts;
        expect(toasts.length).toBeGreaterThan(0);
        
        const successToast = toasts.find(t => t.type === 'success');
        expect(successToast).toBeDefined();
        expect(successToast!.message).toContain('archived');

        unmount();
      }
    }, 30000);

    it('should allow dismissing toasts', async () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, snoozeOptionsArb),
        5
      );

      for (const [threadId, options] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Execute action to create a toast
        await act(async () => {
          const promise = result.current.snoozeThread(threadId, options);
          await vi.advanceTimersByTimeAsync(700);
          await promise;
        });

        const initialToastCount = result.current.state.toasts.length;
        expect(initialToastCount).toBeGreaterThan(0);

        const toastId = result.current.state.toasts[0].id;

        // Dismiss the toast
        act(() => {
          result.current.dismissToast(toastId);
        });

        // Property: Toast should be removed after dismissal
        expect(result.current.state.toasts.length).toBe(initialToastCount - 1);
        expect(result.current.state.toasts.find(t => t.id === toastId)).toBeUndefined();

        unmount();
      }
    }, 30000);

    it('should include duration label in snooze success message', async () => {
      const durationLabels: Record<string, string> = {
        '1h': '1 hour',
        '4h': '4 hours',
        'tomorrow': 'tomorrow',
        'next_week': 'next week'
      };

      for (const [duration, expectedLabel] of Object.entries(durationLabels)) {
        const { result, unmount } = renderHook(() => useThreadActions());

        await act(async () => {
          const promise = result.current.snoozeThread('test-thread', { 
            duration: duration as SnoozeOptions['duration'] 
          });
          await vi.advanceTimersByTimeAsync(700);
          await promise;
        });

        const successToast = result.current.state.toasts.find(t => t.type === 'success');
        expect(successToast).toBeDefined();
        expect(successToast!.message).toContain(expectedLabel);

        unmount();
      }
    }, 30000);
  });

  describe('Snooze Overlay State Management', () => {
    /**
     * Tests for snooze overlay open/close state management
     */
    it('should open snooze overlay with correct thread info', () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, threadSubjectArb),
        20
      );

      for (const [threadId, subject] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Initially closed
        expect(result.current.state.isSnoozeOpen).toBe(false);
        expect(result.current.state.snoozeThreadId).toBeNull();

        // Open overlay
        act(() => {
          result.current.openSnoozeOverlay(threadId, subject);
        });

        // Property: Overlay should be open with correct thread info
        expect(result.current.state.isSnoozeOpen).toBe(true);
        expect(result.current.state.snoozeThreadId).toBe(threadId);
        expect(result.current.state.snoozeThreadSubject).toBe(subject);

        unmount();
      }
    });

    it('should close snooze overlay and clear thread info', () => {
      const testCases = fc.sample(
        fc.tuple(threadIdArb, threadSubjectArb),
        20
      );

      for (const [threadId, subject] of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Open overlay first
        act(() => {
          result.current.openSnoozeOverlay(threadId, subject);
        });

        expect(result.current.state.isSnoozeOpen).toBe(true);

        // Close overlay
        act(() => {
          result.current.closeSnoozeOverlay();
        });

        // Property: Overlay should be closed and thread info cleared
        expect(result.current.state.isSnoozeOpen).toBe(false);
        expect(result.current.state.snoozeThreadId).toBeNull();
        expect(result.current.state.snoozeThreadSubject).toBeNull();

        unmount();
      }
    });
  });

  describe('Animation State Management', () => {
    /**
     * Tests for thread animation state tracking
     */
    it('should track animating threads correctly', async () => {
      const testCases = fc.sample(threadIdArb, 5);

      for (const threadId of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        // Initially not animating
        expect(result.current.isThreadAnimating(threadId)).toBe(false);
        expect(result.current.getThreadAnimation(threadId)).toBeUndefined();

        // Start send draft action (which triggers pulse-glow animation)
        await act(async () => {
          const promise = result.current.sendDraft(threadId);
          await vi.advanceTimersByTimeAsync(2000);
          await promise;
        });

        // After completion, animation should be cleared
        expect(result.current.isThreadAnimating(threadId)).toBe(false);

        unmount();
      }
    }, 30000);
  });

  describe('Action Result Structure', () => {
    /**
     * Tests that action results have the correct structure
     */
    it('should return properly structured action results', async () => {
      const testCases = fc.sample(threadIdArb, 10);

      for (const threadId of testCases) {
        const { result, unmount } = renderHook(() => useThreadActions());

        let actionResult: Awaited<ReturnType<typeof result.current.markAsRead>> | undefined;
        await act(async () => {
          const promise = result.current.markAsRead(threadId);
          await vi.advanceTimersByTimeAsync(300);
          actionResult = await promise;
        });

        // Property: Action result should have all required fields
        expect(actionResult).toHaveProperty('success');
        expect(actionResult).toHaveProperty('threadId');
        expect(actionResult).toHaveProperty('action');
        expect(actionResult).toHaveProperty('timestamp');
        
        expect(typeof actionResult!.success).toBe('boolean');
        expect(actionResult!.threadId).toBe(threadId);
        expect(typeof actionResult!.timestamp).toBe('string');

        unmount();
      }
    }, 30000);
  });
});
