/**
 * QuickActionsCarousel Component
 * 
 * Horizontal swipeable action buttons with neon glow on active/hover states.
 * 
 * Requirements: 6.1, 6.2
 */

import React, { useRef, useState, useCallback } from 'react';
import './QuickActionsCarousel.css';

export type ActionColor = 'cyan' | 'magenta' | 'purple' | 'green' | 'orange' | string;

export interface CarouselAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon (emoji or character) */
  icon: string;
  /** Optional image path for custom icon */
  iconImage?: string;
  /** Color theme */
  color: ActionColor;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

export interface QuickActionsCarouselProps {
  /** Array of actions to display */
  actions: CarouselAction[];
  /** Callback when an action is clicked */
  onActionClick?: (actionId: string) => void;
  /** Layout variant */
  variant?: 'carousel' | 'grid';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * QuickActionsCarousel - Horizontal swipeable quick actions
 */
export const QuickActionsCarousel: React.FC<QuickActionsCarouselProps> = ({
  actions,
  onActionClick,
  variant = 'carousel',
  className = '',
  testId = 'quick-actions-carousel',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle action click
  const handleActionClick = useCallback((actionId: string, disabled?: boolean, loading?: boolean) => {
    if (disabled || loading || isDragging) return;

    setActiveAction(actionId);

    // Provide haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    if (onActionClick) {
      onActionClick(actionId);
    }

    // Reset active state after animation
    setTimeout(() => setActiveAction(null), 300);
  }, [onActionClick, isDragging]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, actionId: string, disabled?: boolean, loading?: boolean) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActionClick(actionId, disabled, loading);
    }
  }, [handleActionClick]);

  // Touch/Mouse drag handlers for swipe
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [startX, scrollLeft]);

  return (
    <div
      className={`quick-actions-carousel ${className}`}
      data-testid={testId}
    >
      <h3 className="quick-actions-carousel__title">Quick Actions</h3>

      <div
        ref={scrollRef}
        className={`quick-actions-carousel__scroll quick-actions-carousel__scroll--${variant} ${isDragging ? 'quick-actions-carousel__scroll--dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        role="list"
        aria-label="Quick actions"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            className={`carousel-action carousel-action--${action.color} ${activeAction === action.id ? 'carousel-action--active' : ''
              } ${action.disabled ? 'carousel-action--disabled' : ''} ${action.loading ? 'carousel-action--loading' : ''
              }`}
            onClick={() => handleActionClick(action.id, action.disabled, action.loading)}
            onKeyDown={(e) => handleKeyDown(e, action.id, action.disabled, action.loading)}
            disabled={action.disabled || action.loading}
            role="listitem"
            aria-label={action.label}
            data-testid={`carousel-action-${action.id}`}
          >
            <span className="carousel-action__glow" aria-hidden="true" />
            <span className="carousel-action__icon" aria-hidden="true">
              {action.loading ? (
                <span className="carousel-action__spinner" />
              ) : action.iconImage ? (
                <img src={action.iconImage} alt="" className="carousel-action__icon-img" />
              ) : (
                action.icon
              )}
            </span>
            <span className="carousel-action__label">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Scroll indicators - only for carousel */}
      {variant === 'carousel' && (
        <div className="quick-actions-carousel__indicators" aria-hidden="true">
          <span className="scroll-indicator scroll-indicator--left" />
          <span className="scroll-indicator scroll-indicator--right" />
        </div>
      )}
    </div>
  );
};

export default QuickActionsCarousel;
