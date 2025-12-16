/**
 * useSwipeGesture Hook
 * 
 * Handles touch-based swipe gestures for ThreadCard components.
 * Implements 80px threshold for action reveal, calculates swipe direction
 * and offset, and prevents vertical scroll interference during swipe.
 * 
 * Requirements: 5.1, 5.2, 5.6
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SwipeState, SwipeDirection, DEFAULT_SWIPE_STATE } from '../models/newPage.types';

export interface UseSwipeGestureConfig {
  /** Threshold in pixels to trigger action (default: 80) */
  threshold?: number;
  /** Callback when swipe exceeds threshold and is released */
  onSwipeAction?: (threadId: string, direction: SwipeDirection) => void;
  /** Callback when swipe is cancelled (released before threshold) */
  onSwipeCancel?: (threadId: string) => void;
  /** Enable haptic feedback on action trigger */
  enableHapticFeedback?: boolean;
}

export interface UseSwipeGestureReturn {
  /** Current swipe state */
  swipeState: SwipeState;
  /** Touch event handlers to attach to swipeable elements */
  handlers: {
    onTouchStart: (e: React.TouchEvent, threadId: string) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  /** Calculate the current swipe offset (positive = right, negative = left) */
  getSwipeOffset: () => number;
  /** Calculate indicator opacity based on swipe distance (0-1) */
  getIndicatorOpacity: () => number;
  /** Check if swipe has exceeded threshold */
  isThresholdExceeded: () => boolean;
  /** Reset swipe state manually */
  resetSwipe: () => void;
}

/**
 * Custom hook for handling swipe gestures on thread cards
 * 
 * @param config - Configuration options for swipe behavior
 * @returns Swipe state and handlers
 */
export const useSwipeGesture = (config: UseSwipeGestureConfig = {}): UseSwipeGestureReturn => {
  const {
    threshold = 80,
    onSwipeAction,
    onSwipeCancel,
    enableHapticFeedback = true
  } = config;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    ...DEFAULT_SWIPE_STATE,
    threshold
  });

  // Track if we've already triggered haptic feedback for this swipe
  const hapticTriggeredRef = useRef(false);
  // Track the initial touch Y position to detect vertical scrolling
  const initialTouchYRef = useRef(0);
  // Track if this is a horizontal swipe (to prevent vertical scroll)
  const isHorizontalSwipeRef = useRef(false);

  /**
   * Trigger haptic feedback if supported and enabled
   */
  const triggerHapticFeedback = useCallback((intensity: number = 50) => {
    if (enableHapticFeedback && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  }, [enableHapticFeedback]);

  /**
   * Handle touch start - initialize swipe tracking
   */
  const handleTouchStart = useCallback((e: React.TouchEvent, threadId: string) => {
    const touch = e.touches[0];
    
    initialTouchYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = false;
    hapticTriggeredRef.current = false;

    setSwipeState({
      threadId,
      startX: touch.clientX,
      currentX: touch.clientX,
      direction: null,
      isSwiping: true,
      threshold
    });
  }, [threshold]);

  /**
   * Handle touch move - update swipe position and direction
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isSwiping || !swipeState.threadId) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = Math.abs(touch.clientY - initialTouchYRef.current);

    // Determine if this is a horizontal swipe on first significant movement
    if (!isHorizontalSwipeRef.current && (Math.abs(deltaX) > 10 || deltaY > 10)) {
      // If horizontal movement is greater, treat as swipe
      if (Math.abs(deltaX) > deltaY) {
        isHorizontalSwipeRef.current = true;
      } else {
        // Vertical scroll - cancel swipe
        setSwipeState(prev => ({
          ...prev,
          isSwiping: false,
          direction: null
        }));
        return;
      }
    }

    // Prevent vertical scroll during horizontal swipe (Requirement 5.6)
    if (isHorizontalSwipeRef.current) {
      e.preventDefault();
    }

    // Calculate direction
    const direction: SwipeDirection | null = deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : null;

    // Trigger haptic feedback when crossing threshold
    if (!hapticTriggeredRef.current && Math.abs(deltaX) >= threshold) {
      hapticTriggeredRef.current = true;
      triggerHapticFeedback(30);
    }

    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      direction
    }));
  }, [swipeState.isSwiping, swipeState.threadId, swipeState.startX, threshold, triggerHapticFeedback]);

  /**
   * Handle touch end - execute action or cancel
   */
  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (!swipeState.isSwiping || !swipeState.threadId) return;

    const offset = swipeState.currentX - swipeState.startX;
    const absOffset = Math.abs(offset);
    const direction = swipeState.direction;

    if (absOffset >= threshold && direction) {
      // Threshold exceeded - trigger action (Requirement 5.3)
      triggerHapticFeedback(50);
      onSwipeAction?.(swipeState.threadId, direction);
    } else {
      // Below threshold - cancel and reset (Requirement 5.4)
      onSwipeCancel?.(swipeState.threadId);
    }

    // Reset state
    setSwipeState({
      ...DEFAULT_SWIPE_STATE,
      threshold
    });
    
    isHorizontalSwipeRef.current = false;
    hapticTriggeredRef.current = false;
  }, [swipeState, threshold, onSwipeAction, onSwipeCancel, triggerHapticFeedback]);

  /**
   * Get current swipe offset (positive = right, negative = left)
   */
  const getSwipeOffset = useCallback((): number => {
    if (!swipeState.isSwiping) return 0;
    return swipeState.currentX - swipeState.startX;
  }, [swipeState]);

  /**
   * Calculate indicator opacity based on swipe distance
   * Opacity is proportional to swipe distance up to threshold (Requirement 5.5)
   * Formula: min(1, |swipeOffset| / threshold)
   */
  const getIndicatorOpacity = useCallback((): number => {
    const offset = Math.abs(getSwipeOffset());
    return Math.min(1, offset / threshold);
  }, [getSwipeOffset, threshold]);

  /**
   * Check if swipe has exceeded threshold
   */
  const isThresholdExceeded = useCallback((): boolean => {
    return Math.abs(getSwipeOffset()) >= threshold;
  }, [getSwipeOffset, threshold]);

  /**
   * Reset swipe state manually
   */
  const resetSwipe = useCallback(() => {
    setSwipeState({
      ...DEFAULT_SWIPE_STATE,
      threshold
    });
    isHorizontalSwipeRef.current = false;
    hapticTriggeredRef.current = false;
  }, [threshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSwipe();
    };
  }, [resetSwipe]);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    getSwipeOffset,
    getIndicatorOpacity,
    isThresholdExceeded,
    resetSwipe
  };
};

export default useSwipeGesture;
