import { useState, useEffect, useCallback } from 'react';

/**
 * Responsive Design Hook
 * Provides responsive utilities for components
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5
 */

// Breakpoint values matching CSS
export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  breakpoint: Breakpoint;
  isTouchDevice: boolean;
  pixelRatio: number;
}

/**
 * Get device type based on viewport width
 */
const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
};

/**
 * Get current breakpoint based on viewport width
 */
const getBreakpoint = (width: number): Breakpoint => {
  if (width < BREAKPOINTS.sm) return 'xs';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS.xxl) return 'xl';
  return 'xxl';
};

/**
 * Get orientation based on viewport dimensions
 */
const getOrientation = (width: number, height: number): Orientation => {
  return width > height ? 'landscape' : 'portrait';
};

/**
 * Check if device supports touch
 */
const checkTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE specific
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Get current responsive state
 */
const getResponsiveState = (): ResponsiveState => {
  if (typeof window === 'undefined') {
    // SSR fallback
    return {
      width: 1024,
      height: 768,
      deviceType: 'desktop',
      orientation: 'landscape',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPortrait: false,
      isLandscape: true,
      breakpoint: 'lg',
      isTouchDevice: false,
      pixelRatio: 1,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const deviceType = getDeviceType(width);
  const orientation = getOrientation(width, height);

  return {
    width,
    height,
    deviceType,
    orientation,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    breakpoint: getBreakpoint(width),
    isTouchDevice: checkTouchDevice(),
    pixelRatio: window.devicePixelRatio || 1,
  };
};

/**
 * Hook for responsive design utilities
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(getResponsiveState);

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState());
    };

    // Debounce resize handler for performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial state
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
};

/**
 * Hook for media query matching
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
};

/**
 * Hook for breakpoint-based values
 */
export const useBreakpointValue = <T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T => {
  const { breakpoint } = useResponsive();
  
  // Find the closest matching breakpoint value
  const breakpointOrder: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return defaultValue;
};

/**
 * Hook for grid columns based on viewport
 */
export const useGridColumns = (minItemWidth: number = 140, maxColumns: number = 4): number => {
  const { width, deviceType } = useResponsive();
  
  // Calculate natural columns based on width
  const naturalColumns = Math.floor(width / minItemWidth);
  
  // Apply device-specific constraints
  let deviceMaxColumns: number;
  switch (deviceType) {
    case 'mobile':
      deviceMaxColumns = 2;
      break;
    case 'tablet':
      deviceMaxColumns = 3;
      break;
    case 'desktop':
    default:
      deviceMaxColumns = maxColumns;
      break;
  }
  
  return Math.max(1, Math.min(naturalColumns, deviceMaxColumns));
};

/**
 * Hook for responsive padding
 */
export const useResponsivePadding = (): number => {
  const { width } = useResponsive();
  
  if (width < BREAKPOINTS.sm) return 8;
  if (width < BREAKPOINTS.md) return 16;
  if (width < BREAKPOINTS.lg) return 20;
  return 24;
};

/**
 * Hook for touch target size
 */
export const useTouchTargetSize = (): number => {
  const { isTouchDevice } = useResponsive();
  return isTouchDevice ? 44 : 32;
};

/**
 * Utility function to generate responsive class names
 */
export const getResponsiveClassName = (
  baseClass: string,
  responsive: ResponsiveState
): string => {
  const classes = [baseClass];
  
  classes.push(`${baseClass}--${responsive.deviceType}`);
  classes.push(`${baseClass}--${responsive.orientation}`);
  classes.push(`${baseClass}--${responsive.breakpoint}`);
  
  if (responsive.isTouchDevice) {
    classes.push(`${baseClass}--touch`);
  }
  
  return classes.join(' ');
};

export default useResponsive;
