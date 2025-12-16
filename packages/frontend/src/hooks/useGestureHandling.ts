import { useEffect, useRef, useCallback } from 'react';

export interface GestureConfig {
  onSwipeLeft?: (element: HTMLElement) => void;
  onSwipeRight?: (element: HTMLElement) => void;
  onLongPress?: (element: HTMLElement) => void;
  onPullDown?: (element: HTMLElement) => void;
  enableHapticFeedback?: boolean;
  swipeThreshold?: number;
  longPressThreshold?: number;
  pullDownThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isLongPress: boolean;
  longPressTimer?: NodeJS.Timeout;
}

export const useGestureHandling = (config: GestureConfig) => {
  const touchStateRef = useRef<TouchState | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const {
    onSwipeLeft,
    onSwipeRight,
    onLongPress,
    onPullDown,
    enableHapticFeedback = true,
    swipeThreshold = 50,
    longPressThreshold = 500,
    pullDownThreshold = 100
  } = config;

  const triggerHapticFeedback = useCallback((intensity: number = 50) => {
    if (enableHapticFeedback && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  }, [enableHapticFeedback]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    const element = event.currentTarget as HTMLElement;
    
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isLongPress: false
    };

    // Set up long press detection
    if (onLongPress) {
      touchStateRef.current.longPressTimer = setTimeout(() => {
        if (touchStateRef.current) {
          touchStateRef.current.isLongPress = true;
          triggerHapticFeedback(100);
          onLongPress(element);
        }
      }, longPressThreshold);
    }
  }, [onLongPress, longPressThreshold, triggerHapticFeedback]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStateRef.current) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
    const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);

    // Cancel long press if finger moves too much
    if ((deltaX > 10 || deltaY > 10) && touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current.longPressTimer = undefined;
    }
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStateRef.current) return;

    const touch = event.changedTouches[0];
    const element = event.currentTarget as HTMLElement;
    const deltaX = touch.clientX - touchStateRef.current.startX;
    const deltaY = touch.clientY - touchStateRef.current.startY;
    const deltaTime = Date.now() - touchStateRef.current.startTime;

    // Clear long press timer
    if (touchStateRef.current.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
    }

    // Don't process swipes if it was a long press
    if (touchStateRef.current.isLongPress) {
      touchStateRef.current = null;
      return;
    }

    // Check for pull down gesture
    if (onPullDown && deltaY > pullDownThreshold && Math.abs(deltaX) < swipeThreshold && touchStateRef.current.startY < 100) {
      triggerHapticFeedback(75);
      onPullDown(element);
    }
    // Check for horizontal swipes
    else if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < swipeThreshold && deltaTime < 500) {
      if (deltaX > 0 && onSwipeRight) {
        triggerHapticFeedback(50);
        onSwipeRight(element);
      } else if (deltaX < 0 && onSwipeLeft) {
        triggerHapticFeedback(50);
        onSwipeLeft(element);
      }
    }

    touchStateRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onPullDown, swipeThreshold, pullDownThreshold, triggerHapticFeedback]);

  const attachGestureHandlers = useCallback((element: HTMLElement) => {
    if (elementRef.current === element) return; // Already attached

    // Remove previous handlers
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
    }

    // Attach new handlers
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    elementRef.current = element;
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const detachGestureHandlers = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current = null;
    }

    // Clear any pending timers
    if (touchStateRef.current?.longPressTimer) {
      clearTimeout(touchStateRef.current.longPressTimer);
      touchStateRef.current = null;
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detachGestureHandlers();
    };
  }, [detachGestureHandlers]);

  return {
    attachGestureHandlers,
    detachGestureHandlers
  };
};