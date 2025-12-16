/**
 * NewThreadsBanner Component
 * 
 * Displays a "New threads available" banner with pulse animation
 * when new threads arrive. Handles tap to merge new threads into the list.
 * 
 * Requirements: 8.1, 8.2
 */

import React, { useCallback } from 'react';
import './NewThreadsBanner.css';

export interface NewThreadsBannerProps {
  /** Number of new threads available */
  count: number;
  /** Whether the banner should be visible */
  isVisible: boolean;
  /** Callback when banner is tapped to merge threads */
  onMerge: () => void;
  /** Optional className for styling */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * NewThreadsBanner - Notification banner for new threads
 * 
 * Features:
 * - Pulse animation to draw attention
 * - Shows count of new threads
 * - Tap to merge new threads into list
 * - Glassmorphism styling
 * - Accessible with proper ARIA attributes
 */
export const NewThreadsBanner: React.FC<NewThreadsBannerProps> = ({
  count,
  isVisible,
  onMerge,
  className = '',
  testId = 'new-threads-banner'
}) => {
  const handleClick = useCallback(() => {
    onMerge();
  }, [onMerge]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMerge();
    }
  }, [onMerge]);

  // Don't render if not visible or no new threads
  if (!isVisible || count <= 0) {
    return null;
  }

  const bannerClasses = [
    'new-threads-banner',
    className
  ].filter(Boolean).join(' ');

  const message = count === 1 
    ? '1 new thread available' 
    : `${count} new threads available`;

  return (
    <div
      className={bannerClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${message}. Tap to load.`}
      data-testid={testId}
    >
      <div className="new-threads-banner__content">
        <span className="new-threads-banner__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="new-threads-banner__text">{message}</span>
        <span className="new-threads-banner__action">Tap to load</span>
      </div>
      <div className="new-threads-banner__pulse" aria-hidden="true" />
    </div>
  );
};

export default NewThreadsBanner;
