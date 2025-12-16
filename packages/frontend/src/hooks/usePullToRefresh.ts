import { useCallback, useRef, useState } from 'react';

export interface PullToRefreshConfig {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  enableHapticFeedback?: boolean;
}

interface PullState {
  startY: number;
  currentY: number;
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

export const usePullToRefresh = (config: PullToRefreshConfig) => {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 120,
    enableHapticFeedback = true
  } = config;

  const [pullState, setPullState] = useState<PullState>({
    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const hapticTriggeredRef = useRef(false);

  const triggerHapticFeedback = useCallback((intensity: number = 50) => {
    if (enableHapticFeedback && navigator.vibrate) {
      navigator.vibrate(intensity);
    }
  }, [enableHapticFeedback]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    const element = event.currentTarget as HTMLElement;
    
    // Only start pull-to-refresh if we're at the top of the scrollable area
    if (element.scrollTop === 0) {
      setPullState(prev => ({
        ...prev,
        startY: touch.clientY,
        currentY: touch.clientY,
        isPulling: true,
        pullDistance: 0
      }));
      hapticTriggeredRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!pullState.isPulling || pullState.isRefreshing) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - pullState.startY;

    // Only allow pulling down
    if (deltaY > 0) {
      // Prevent default scrolling when pulling
      event.preventDefault();

      // Apply resistance curve - gets harder to pull as distance increases
      const resistance = Math.max(0.3, 1 - (deltaY / maxPullDistance) * 0.7);
      const pullDistance = Math.min(deltaY * resistance, maxPullDistance);

      setPullState(prev => ({
        ...prev,
        currentY: touch.clientY,
        pullDistance
      }));

      // Trigger haptic feedback when threshold is reached
      if (pullDistance >= threshold && !hapticTriggeredRef.current) {
        triggerHapticFeedback(75);
        hapticTriggeredRef.current = true;
      }
    }
  }, [pullState.isPulling, pullState.isRefreshing, pullState.startY, threshold, maxPullDistance, triggerHapticFeedback]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullState.isPulling || pullState.isRefreshing) return;

    const shouldRefresh = pullState.pullDistance >= threshold;

    if (shouldRefresh) {
      setPullState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false
      }));

      triggerHapticFeedback(100);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh failed:', error);
      } finally {
        setPullState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0
        }));
      }
    } else {
      setPullState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0
      }));
    }

    hapticTriggeredRef.current = false;
  }, [pullState.isPulling, pullState.isRefreshing, pullState.pullDistance, threshold, onRefresh, triggerHapticFeedback]);

  const attachPullToRefresh = useCallback((element: HTMLElement) => {
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

  const detachPullToRefresh = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current = null;
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getPullIndicatorStyle = useCallback(() => {
    const opacity = Math.min(pullState.pullDistance / threshold, 1);
    const scale = Math.min(pullState.pullDistance / threshold, 1);
    const rotation = (pullState.pullDistance / threshold) * 180;

    return {
      opacity,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      transition: pullState.isPulling ? 'none' : 'all 0.3s ease-out'
    };
  }, [pullState.pullDistance, pullState.isPulling, threshold]);

  const getPullContainerStyle = useCallback(() => {
    return {
      transform: `translateY(${pullState.pullDistance}px)`,
      transition: pullState.isPulling ? 'none' : 'transform 0.3s ease-out'
    };
  }, [pullState.pullDistance, pullState.isPulling]);

  return {
    attachPullToRefresh,
    detachPullToRefresh,
    pullState,
    getPullIndicatorStyle,
    getPullContainerStyle,
    isRefreshing: pullState.isRefreshing,
    isPulling: pullState.isPulling,
    pullDistance: pullState.pullDistance
  };
};