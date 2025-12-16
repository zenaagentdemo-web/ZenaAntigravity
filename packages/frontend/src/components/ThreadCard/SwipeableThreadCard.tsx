/**
 * SwipeableThreadCard Component
 * 
 * Wraps ThreadCard with swipe gesture support for mobile interactions.
 * Implements left swipe (snooze - amber) and right swipe (view - cyan) actions
 * with proportional opacity indicators.
 * 
 * Requirements: 5.1, 5.2, 5.5
 */

import React, { useCallback, useMemo } from 'react';
import { SwipeDirection } from '../../models/newPage.types';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import ThreadCard, { ThreadCardProps } from './ThreadCard';
import './ThreadCard.css';
import './SwipeableThreadCard.css';

export interface SwipeableThreadCardProps extends Omit<ThreadCardProps, 'onAction'> {
  /** Callback when swipe action is triggered */
  onSwipeAction?: (threadId: string, direction: SwipeDirection) => void;
  /** Callback for non-swipe actions (view, send_draft) */
  onAction?: (threadId: string, action: 'view' | 'snooze' | 'send_draft') => void;
  /** Whether swipe gestures are enabled (disabled in batch mode) */
  enableSwipe?: boolean;
}

/**
 * SwipeableThreadCard - ThreadCard with swipe gesture support
 */
export const SwipeableThreadCard: React.FC<SwipeableThreadCardProps> = ({
  thread,
  onSwipeAction,
  onAction,
  enableSwipe = true,
  isBatchMode = false,
  ...threadCardProps
}) => {
  // Disable swipe in batch mode
  const swipeEnabled = enableSwipe && !isBatchMode;

  // Handle swipe action completion
  const handleSwipeAction = useCallback((threadId: string, direction: SwipeDirection) => {
    if (onSwipeAction) {
      onSwipeAction(threadId, direction);
    } else if (onAction) {
      // Map swipe direction to action
      if (direction === 'left') {
        onAction(threadId, 'snooze');
      } else if (direction === 'right') {
        onAction(threadId, 'view');
      }
    }
  }, [onSwipeAction, onAction]);

  // Initialize swipe gesture hook
  const {
    swipeState,
    handlers,
    getSwipeOffset,
    getIndicatorOpacity,
    isThresholdExceeded
  } = useSwipeGesture({
    threshold: 80,
    onSwipeAction: swipeEnabled ? handleSwipeAction : undefined,
    enableHapticFeedback: true
  });

  // Calculate transform style based on swipe offset
  const transformStyle = useMemo(() => {
    if (!swipeEnabled || !swipeState.isSwiping || swipeState.threadId !== thread.id) {
      return {};
    }
    const offset = getSwipeOffset();
    return {
      transform: `translateX(${offset}px)`,
      transition: 'none'
    };
  }, [swipeEnabled, swipeState.isSwiping, swipeState.threadId, thread.id, getSwipeOffset]);

  // Calculate indicator opacity
  const indicatorOpacity = useMemo(() => {
    if (!swipeEnabled || !swipeState.isSwiping || swipeState.threadId !== thread.id) {
      return 0;
    }
    return getIndicatorOpacity();
  }, [swipeEnabled, swipeState.isSwiping, swipeState.threadId, thread.id, getIndicatorOpacity]);

  // Determine which indicator to show
  const showLeftIndicator = swipeState.direction === 'left' && swipeState.threadId === thread.id;
  const showRightIndicator = swipeState.direction === 'right' && swipeState.threadId === thread.id;
  const thresholdExceeded = isThresholdExceeded() && swipeState.threadId === thread.id;

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (swipeEnabled) {
      handlers.onTouchStart(e, thread.id);
    }
  }, [swipeEnabled, handlers, thread.id]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeEnabled) {
      handlers.onTouchMove(e);
    }
  }, [swipeEnabled, handlers]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeEnabled) {
      handlers.onTouchEnd(e);
    }
  }, [swipeEnabled, handlers]);

  return (
    <div 
      className="swipeable-thread-card"
      data-testid="swipeable-thread-card"
    >
      {/* Left swipe indicator (Snooze - Amber) */}
      <div 
        className={`swipe-indicator swipe-indicator--left ${showLeftIndicator ? 'swipe-indicator--visible' : ''} ${thresholdExceeded && showLeftIndicator ? 'swipe-indicator--active' : ''}`}
        style={{ opacity: showLeftIndicator ? indicatorOpacity : 0 }}
        data-testid="swipe-indicator-left"
        aria-hidden="true"
      >
        <div className="swipe-indicator__content">
          <svg className="swipe-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="swipe-indicator__label">Snooze</span>
        </div>
      </div>

      {/* Right swipe indicator (View - Cyan) */}
      <div 
        className={`swipe-indicator swipe-indicator--right ${showRightIndicator ? 'swipe-indicator--visible' : ''} ${thresholdExceeded && showRightIndicator ? 'swipe-indicator--active' : ''}`}
        style={{ opacity: showRightIndicator ? indicatorOpacity : 0 }}
        data-testid="swipe-indicator-right"
        aria-hidden="true"
      >
        <div className="swipe-indicator__content">
          <svg className="swipe-indicator__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="swipe-indicator__label">View</span>
        </div>
      </div>

      {/* ThreadCard with swipe transform */}
      <div
        className="swipeable-thread-card__content"
        style={transformStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ThreadCard
          thread={thread}
          onAction={onAction}
          isBatchMode={isBatchMode}
          {...threadCardProps}
        />
      </div>
    </div>
  );
};

export default SwipeableThreadCard;
