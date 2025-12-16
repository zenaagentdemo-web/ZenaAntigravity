/**
 * useAccessibility Hook
 * 
 * Provides comprehensive accessibility features including:
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation
 * - Reduced motion detection
 * - High contrast mode detection
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  announce,
  announceError,
  announceLoading,
  announceSuccess,
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  trapFocus,
  restoreFocus,
  moveFocus,
  prefersReducedMotion,
  prefersHighContrast,
  createAriaExpanded,
  createAriaLoading,
  createAriaModal,
  createAriaPressed,
  createAriaValidation,
} from '../utils/accessibility';

export interface UseAccessibilityOptions {
  /** Enable focus trapping (for modals) */
  trapFocus?: boolean;
  /** Enable keyboard navigation */
  enableKeyboardNav?: boolean;
  /** Restore focus on unmount */
  restoreFocusOnUnmount?: boolean;
  /** Auto-focus first element on mount */
  autoFocusFirst?: boolean;
}

export interface UseAccessibilityReturn {
  // Refs
  containerRef: React.RefObject<HTMLElement>;
  
  // Focus management
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  getFocusableElements: () => HTMLElement[];
  
  // Announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceLoading: (isLoading: boolean, context?: string) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  
  // User preferences
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  getAnimationDuration: (defaultDuration: number) => number;
  
  // ARIA helpers
  getAriaExpanded: (isExpanded: boolean, controlsId?: string) => Record<string, unknown>;
  getAriaLoading: (isLoading: boolean, loadingText?: string) => Record<string, unknown>;
  getAriaModal: (labelledBy?: string, describedBy?: string) => Record<string, unknown>;
  getAriaPressed: (isPressed: boolean) => Record<string, unknown>;
  getAriaValidation: (isInvalid: boolean, errorId?: string, describedBy?: string) => Record<string, unknown>;
  
  // Keyboard navigation state
  isKeyboardNavigation: boolean;
}

export function useAccessibility(
  options: UseAccessibilityOptions = {}
): UseAccessibilityReturn {
  const {
    trapFocus: shouldTrapFocus = false,
    enableKeyboardNav = true,
    restoreFocusOnUnmount = true,
    autoFocusFirst = false,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());
  const [highContrast, setHighContrast] = useState(prefersHighContrast());

  // Track keyboard vs mouse navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardNavigation(true);
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardNavigation(false);
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Listen for preference changes
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Store previous focus on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      if (restoreFocusOnUnmount && previousFocusRef.current) {
        restoreFocus(previousFocusRef.current);
      }
    };
  }, [restoreFocusOnUnmount]);

  // Auto-focus first element
  useEffect(() => {
    if (autoFocusFirst && containerRef.current) {
      const firstElement = getFirstFocusableElement(containerRef.current);
      if (firstElement) {
        requestAnimationFrame(() => {
          firstElement.focus();
        });
      }
    }
  }, [autoFocusFirst]);

  // Focus trap handler
  useEffect(() => {
    if (!shouldTrapFocus || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (containerRef.current) {
        trapFocus(containerRef.current, event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shouldTrapFocus]);

  // Keyboard navigation handler
  useEffect(() => {
    if (!enableKeyboardNav || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(containerRef.current, 'next');
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(containerRef.current, 'previous');
          break;
        case 'Home':
          event.preventDefault();
          getFirstFocusableElement(containerRef.current)?.focus();
          break;
        case 'End':
          event.preventDefault();
          getLastFocusableElement(containerRef.current)?.focus();
          break;
      }
    };

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNav]);

  // Focus management functions
  const focusFirst = useCallback(() => {
    if (containerRef.current) {
      getFirstFocusableElement(containerRef.current)?.focus();
    }
  }, []);

  const focusLast = useCallback(() => {
    if (containerRef.current) {
      getLastFocusableElement(containerRef.current)?.focus();
    }
  }, []);

  const focusNext = useCallback(() => {
    if (containerRef.current) {
      moveFocus(containerRef.current, 'next');
    }
  }, []);

  const focusPrevious = useCallback(() => {
    if (containerRef.current) {
      moveFocus(containerRef.current, 'previous');
    }
  }, []);

  const getFocusable = useCallback(() => {
    if (containerRef.current) {
      return getFocusableElements(containerRef.current);
    }
    return [];
  }, []);

  // Animation duration helper
  const getAnimDuration = useCallback(
    (defaultDuration: number) => {
      return reducedMotion ? 0 : defaultDuration;
    },
    [reducedMotion]
  );

  return {
    containerRef,
    
    // Focus management
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getFocusableElements: getFocusable,
    
    // Announcements
    announce,
    announceLoading,
    announceError,
    announceSuccess,
    
    // User preferences
    prefersReducedMotion: reducedMotion,
    prefersHighContrast: highContrast,
    getAnimationDuration: getAnimDuration,
    
    // ARIA helpers
    getAriaExpanded: createAriaExpanded,
    getAriaLoading: createAriaLoading,
    getAriaModal: createAriaModal,
    getAriaPressed: createAriaPressed,
    getAriaValidation: createAriaValidation,
    
    // Keyboard navigation state
    isKeyboardNavigation,
  };
}

export default useAccessibility;
