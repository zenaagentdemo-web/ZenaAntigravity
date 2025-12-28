/**
 * useThreadActions Hook
 * 
 * Manages thread actions (snooze, send draft, archive) with visual feedback
 * including toast notifications and animations.
 * 
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import { useState, useCallback, useRef } from 'react';
import { SnoozeOptions, ActionResult } from '../models/newPage.types';
import { ToastData, ToastType } from '../components/Toast/Toast';

export interface ThreadActionState {
  /** Currently animating thread IDs with their animation type */
  animatingThreads: Map<string, 'slide-out' | 'pulse-glow' | 'fade-out'>;
  /** Active toasts */
  toasts: ToastData[];
  /** Whether snooze overlay is open */
  isSnoozeOpen: boolean;
  /** Thread ID being snoozed */
  snoozeThreadId: string | null;
  /** Thread subject being snoozed */
  snoozeThreadSubject: string | null;
}

export interface UseThreadActionsReturn {
  /** Current action state */
  state: ThreadActionState;
  /** Execute snooze action */
  snoozeThread: (threadId: string, options: SnoozeOptions) => Promise<ActionResult>;
  /** Execute send draft action */
  sendDraft: (threadId: string) => Promise<ActionResult>;
  /** Execute archive action */
  archiveThread: (threadId: string) => Promise<ActionResult>;
  /** Execute mark as read action */
  markAsRead: (threadId: string) => Promise<ActionResult>;
  /** Open snooze overlay for a thread */
  openSnoozeOverlay: (threadId: string, subject?: string) => void;
  /** Close snooze overlay */
  closeSnoozeOverlay: () => void;
  /** Dismiss a toast */
  dismissToast: (toastId: string) => void;
  /** Check if a thread is animating */
  isThreadAnimating: (threadId: string) => boolean;
  /** Get animation type for a thread */
  getThreadAnimation: (threadId: string) => string | undefined;
  /** Add a manual toast notification */
  addToast: (type: ToastType, message: string, action?: ToastData['action']) => string;
}

/**
 * Generate unique ID for toasts
 */
const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * useThreadActions Hook
 */
export const useThreadActions = (
  onThreadRemoved?: (threadId: string) => void
): UseThreadActionsReturn => {
  const [animatingThreads, setAnimatingThreads] = useState<Map<string, 'slide-out' | 'pulse-glow' | 'fade-out'>>(new Map());
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [snoozeThreadId, setSnoozeThreadId] = useState<string | null>(null);
  const [snoozeThreadSubject, setSnoozeThreadSubject] = useState<string | null>(null);

  // Track pending actions for retry
  const pendingActionsRef = useRef<Map<string, () => Promise<ActionResult>>>(new Map());

  /**
   * Add a toast notification
   */
  const addToast = useCallback((type: ToastType, message: string, action?: ToastData['action']) => {
    const toast: ToastData = {
      id: generateToastId(),
      type,
      message,
      action,
      duration: type === 'error' ? 6000 : 4000
    };
    setToasts(prev => [...prev, toast]);
    return toast.id;
  }, []);

  /**
   * Dismiss a toast
   */
  const dismissToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  /**
   * Start animation for a thread
   */
  const startAnimation = useCallback((threadId: string, type: 'slide-out' | 'pulse-glow' | 'fade-out') => {
    setAnimatingThreads(prev => new Map(prev).set(threadId, type));
  }, []);

  /**
   * End animation for a thread
   */
  const endAnimation = useCallback((threadId: string) => {
    setAnimatingThreads(prev => {
      const next = new Map(prev);
      next.delete(threadId);
      return next;
    });
  }, []);

  /**
   * Open snooze overlay
   */
  const openSnoozeOverlay = useCallback((threadId: string, subject?: string) => {
    setSnoozeThreadId(threadId);
    setSnoozeThreadSubject(subject || null);
    setIsSnoozeOpen(true);
  }, []);

  /**
   * Close snooze overlay
   */
  const closeSnoozeOverlay = useCallback(() => {
    setIsSnoozeOpen(false);
    setSnoozeThreadId(null);
    setSnoozeThreadSubject(null);
  }, []);

  /**
   * Execute snooze action
   */
  const snoozeThread = useCallback(async (threadId: string, options: SnoozeOptions): Promise<ActionResult> => {
    const timestamp = new Date().toISOString();

    try {
      // Start slide-out animation
      startAnimation(threadId, 'slide-out');

      // Simulate API call (replace with actual API)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Close overlay
      closeSnoozeOverlay();

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove thread from list
      endAnimation(threadId);
      onThreadRemoved?.(threadId);

      // Show success toast
      const durationLabel = options.duration === 'custom'
        ? 'custom time'
        : options.duration === '1h' ? '1 hour'
          : options.duration === '4h' ? '4 hours'
            : options.duration === 'tomorrow' ? 'tomorrow'
              : 'next week';

      addToast('success', `Thread snoozed until ${durationLabel}`);

      return {
        success: true,
        threadId,
        action: 'snooze',
        timestamp
      };
    } catch (error) {
      endAnimation(threadId);

      // Store retry action
      const retryAction = () => snoozeThread(threadId, options);
      pendingActionsRef.current.set(threadId, retryAction);

      addToast('error', 'Failed to snooze thread', {
        label: 'Retry',
        onClick: () => {
          pendingActionsRef.current.get(threadId)?.();
          pendingActionsRef.current.delete(threadId);
        }
      });

      return {
        success: false,
        threadId,
        action: 'snooze',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }, [startAnimation, endAnimation, closeSnoozeOverlay, onThreadRemoved, addToast]);

  /**
   * Execute send draft action
   */
  const sendDraft = useCallback(async (threadId: string): Promise<ActionResult> => {
    const timestamp = new Date().toISOString();

    try {
      // Start pulsing glow animation
      startAnimation(threadId, 'pulse-glow');

      // Simulate API call (replace with actual API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // End animation
      endAnimation(threadId);

      // Remove thread from list after successful send
      onThreadRemoved?.(threadId);

      // Show success toast
      addToast('success', 'Draft sent successfully');

      return {
        success: true,
        threadId,
        action: 'send_draft',
        timestamp
      };
    } catch (error) {
      endAnimation(threadId);

      // Store retry action
      const retryAction = () => sendDraft(threadId);
      pendingActionsRef.current.set(threadId, retryAction);

      addToast('error', 'Failed to send draft', {
        label: 'Retry',
        onClick: () => {
          pendingActionsRef.current.get(threadId)?.();
          pendingActionsRef.current.delete(threadId);
        }
      });

      return {
        success: false,
        threadId,
        action: 'send_draft',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }, [startAnimation, endAnimation, onThreadRemoved, addToast]);

  /**
   * Execute archive action
   */
  const archiveThread = useCallback(async (threadId: string): Promise<ActionResult> => {
    const timestamp = new Date().toISOString();

    try {
      // Start fade-out animation
      startAnimation(threadId, 'fade-out');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove thread
      endAnimation(threadId);
      onThreadRemoved?.(threadId);

      addToast('success', 'Thread archived');

      return {
        success: true,
        threadId,
        action: 'archive',
        timestamp
      };
    } catch (error) {
      endAnimation(threadId);

      addToast('error', 'Failed to archive thread', {
        label: 'Retry',
        onClick: () => archiveThread(threadId)
      });

      return {
        success: false,
        threadId,
        action: 'archive',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }, [startAnimation, endAnimation, onThreadRemoved, addToast]);

  /**
   * Execute mark as read action
   */
  const markAsRead = useCallback(async (threadId: string): Promise<ActionResult> => {
    const timestamp = new Date().toISOString();

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));

      addToast('success', 'Marked as read');

      return {
        success: true,
        threadId,
        action: 'mark_read',
        timestamp
      };
    } catch (error) {
      addToast('error', 'Failed to mark as read');

      return {
        success: false,
        threadId,
        action: 'mark_read',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }, [addToast]);

  /**
   * Check if a thread is animating
   */
  const isThreadAnimating = useCallback((threadId: string): boolean => {
    return animatingThreads.has(threadId);
  }, [animatingThreads]);

  /**
   * Get animation type for a thread
   */
  const getThreadAnimation = useCallback((threadId: string): string | undefined => {
    return animatingThreads.get(threadId);
  }, [animatingThreads]);

  return {
    state: {
      animatingThreads,
      toasts,
      isSnoozeOpen,
      snoozeThreadId,
      snoozeThreadSubject
    },
    snoozeThread,
    sendDraft,
    archiveThread,
    markAsRead,
    openSnoozeOverlay,
    closeSnoozeOverlay,
    dismissToast,
    isThreadAnimating,
    getThreadAnimation,
    addToast
  };
};

export default useThreadActions;
