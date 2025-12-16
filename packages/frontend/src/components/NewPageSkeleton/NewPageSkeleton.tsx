/**
 * NewPageSkeleton Component
 * 
 * Loading skeleton for the New page that displays 3-5 shimmer skeleton cards
 * with animated gradient sweep effect.
 * 
 * Requirements: 9.1
 * Validates: Property 24 - Loading Skeleton Count
 */

import React from 'react';
import { ShimmerSkeleton } from '../LoadingStates/ShimmerSkeleton';
import './NewPageSkeleton.css';

export interface NewPageSkeletonProps {
  /** Number of skeleton cards to display (3-5) */
  count?: number;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * NewPageSkeleton - Loading state for the New page
 * 
 * Renders 3-5 shimmer skeleton cards that mimic the ThreadCard layout.
 * Each skeleton has staggered animation delay for visual interest.
 */
export const NewPageSkeleton: React.FC<NewPageSkeletonProps> = ({
  count = 4,
  className = '',
  testId = 'new-page-skeleton',
}) => {
  // Clamp count between 3 and 5 as per requirements
  const skeletonCount = Math.max(3, Math.min(5, count));
  
  const baseClass = 'new-page-skeleton';
  const combinedClassName = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div 
      className={combinedClassName} 
      data-testid={testId}
      role="status"
      aria-label="Loading threads..."
      aria-busy="true"
    >
      {Array.from({ length: skeletonCount }, (_, index) => (
        <div 
          key={index}
          className={`${baseClass}__card`}
          style={{ animationDelay: `${index * 100}ms` }}
          data-testid={`${testId}-card-${index}`}
        >
          {/* Header row: classification badge + timestamp */}
          <div className={`${baseClass}__header`}>
            <ShimmerSkeleton 
              variant="rounded" 
              width={80} 
              height={24} 
              accentColor="cyan"
              aria-label="Loading classification"
            />
            <ShimmerSkeleton 
              variant="text" 
              width={60} 
              height={14} 
              accentColor="cyan"
              aria-label="Loading timestamp"
            />
          </div>

          {/* Subject line */}
          <div className={`${baseClass}__subject`}>
            <ShimmerSkeleton 
              variant="text" 
              width="85%" 
              height={20} 
              accentColor="cyan"
              aria-label="Loading subject"
            />
          </div>

          {/* Participants */}
          <div className={`${baseClass}__participants`}>
            <ShimmerSkeleton 
              variant="circular" 
              width={24} 
              height={24} 
              accentColor="purple"
              aria-label="Loading participant avatar"
            />
            <ShimmerSkeleton 
              variant="text" 
              width={120} 
              height={14} 
              accentColor="cyan"
              aria-label="Loading participant name"
            />
          </div>

          {/* Summary preview */}
          <div className={`${baseClass}__summary`}>
            <ShimmerSkeleton 
              variant="text" 
              width="100%" 
              height={14} 
              accentColor="cyan"
              aria-label="Loading summary line 1"
            />
            <ShimmerSkeleton 
              variant="text" 
              width="70%" 
              height={14} 
              accentColor="cyan"
              aria-label="Loading summary line 2"
            />
          </div>

          {/* Action buttons placeholder */}
          <div className={`${baseClass}__actions`}>
            <ShimmerSkeleton 
              variant="rounded" 
              width={100} 
              height={36} 
              accentColor="cyan"
              aria-label="Loading action button"
            />
            <ShimmerSkeleton 
              variant="rounded" 
              width={80} 
              height={36} 
              accentColor="purple"
              aria-label="Loading action button"
            />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading threads, please wait...</span>
    </div>
  );
};

export default NewPageSkeleton;
