/**
 * PageTransition Component
 * 
 * Provides smooth fade and slide transitions between pages
 * with optional glow effects for the high-tech aesthetic.
 * 
 * Requirements: 3.3
 */

import React, { useEffect, useState, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export type TransitionType = 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'glow-fade';
export type TransitionDuration = 'instant' | 'fast' | 'normal' | 'slow';

export interface PageTransitionProps {
  /** Child content to animate */
  children: React.ReactNode;
  /** Type of transition animation */
  transitionType?: TransitionType;
  /** Duration of the transition */
  duration?: TransitionDuration;
  /** Enable glow effect during transition */
  enableGlow?: boolean;
  /** Custom transition key (defaults to location pathname) */
  transitionKey?: string;
  /** Callback when transition starts */
  onTransitionStart?: () => void;
  /** Callback when transition ends */
  onTransitionEnd?: () => void;
  /** Test ID for testing */
  testId?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = memo(({
  children,
  transitionType = 'glow-fade',
  duration = 'normal',
  enableGlow = true,
  transitionKey,
  onTransitionStart,
  onTransitionEnd,
  testId = 'page-transition',
}) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionPhase, setTransitionPhase] = useState<'enter' | 'exit' | 'idle'>('idle');
  const previousPathRef = useRef(location.pathname);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get duration in ms based on duration prop (optimized for speed)
  const getDurationMs = (): number => {
    switch (duration) {
      case 'instant': return 80;
      case 'fast': return 100;
      case 'slow': return 250;
      default: return 150; // normal
    }
  };

  // Handle route changes
  useEffect(() => {
    const key = transitionKey || location.pathname;
    const previousKey = previousPathRef.current;

    if (key !== previousKey) {
      // Start exit transition
      setIsTransitioning(true);
      setTransitionPhase('exit');
      onTransitionStart?.();

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // After exit animation, update content and start enter animation
      timeoutRef.current = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionPhase('enter');

        // After enter animation, complete transition
        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setTransitionPhase('idle');
          onTransitionEnd?.();
        }, getDurationMs());
      }, getDurationMs());

      previousPathRef.current = key;
    } else {
      // Same route, just update children
      setDisplayChildren(children);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, transitionKey, children, onTransitionStart, onTransitionEnd]);

  // Build class names
  const classNames = [
    'page-transition',
    `page-transition--${transitionType}`,
    `page-transition--${duration}`,
    isTransitioning && 'page-transition--transitioning',
    transitionPhase !== 'idle' && `page-transition--${transitionPhase}`,
    enableGlow && 'page-transition--glow',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      data-testid={testId}
      data-transitioning={isTransitioning}
      data-phase={transitionPhase}
    >
      <div className="page-transition__content">
        {displayChildren}
      </div>

      {/* Glow overlay during transitions */}
      {enableGlow && isTransitioning && (
        <div className="page-transition__glow-overlay" aria-hidden="true" />
      )}
    </div>
  );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
