/**
 * useReducedMotion Hook
 * 
 * Detects user's preference for reduced motion and provides
 * utilities for respecting this preference in animations.
 * 
 * Requirements: 10.1
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseReducedMotionReturn {
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Get animation duration (returns 0 if reduced motion is preferred) */
  getAnimationDuration: (defaultDuration: number) => number;
  /** Get transition duration (returns 0.01ms if reduced motion is preferred) */
  getTransitionDuration: (defaultDuration: string) => string;
  /** Check if animations should be disabled */
  shouldDisableAnimations: boolean;
}

/**
 * Hook to detect and respond to user's reduced motion preference
 * 
 * @returns Object with reduced motion state and utility functions
 * 
 * @example
 * ```tsx
 * const { prefersReducedMotion, getAnimationDuration } = useReducedMotion();
 * 
 * const animationStyle = {
 *   animationDuration: `${getAnimationDuration(300)}ms`
 * };
 * ```
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  /**
   * Get animation duration based on user preference
   * Returns 0 if user prefers reduced motion
   */
  const getAnimationDuration = useCallback(
    (defaultDuration: number): number => {
      return prefersReducedMotion ? 0 : defaultDuration;
    },
    [prefersReducedMotion]
  );

  /**
   * Get transition duration string based on user preference
   * Returns '0.01ms' if user prefers reduced motion (CSS minimum)
   */
  const getTransitionDuration = useCallback(
    (defaultDuration: string): string => {
      return prefersReducedMotion ? '0.01ms' : defaultDuration;
    },
    [prefersReducedMotion]
  );

  return {
    prefersReducedMotion,
    getAnimationDuration,
    getTransitionDuration,
    shouldDisableAnimations: prefersReducedMotion,
  };
}

export default useReducedMotion;
