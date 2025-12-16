import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../utils/performance';

/**
 * Hook to track navigation performance
 */
export function useNavigationPerformance(pageName: string) {
  useEffect(() => {
    performanceMonitor.startNavigation();

    return () => {
      const navigationTime = performanceMonitor.endNavigation();
      
      if (navigationTime !== null && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Navigation to ${pageName}: ${navigationTime.toFixed(2)}ms`);
      }
    };
  }, [pageName]);
}

/**
 * Hook to track initial load performance
 */
export function useLoadPerformance() {
  useEffect(() => {
    // Wait for load event
    if (document.readyState === 'complete') {
      const loadTime = performanceMonitor.measureLoadTime();
      
      if (loadTime !== null && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Initial load: ${loadTime}ms`);
      }
    } else {
      window.addEventListener('load', () => {
        const loadTime = performanceMonitor.measureLoadTime();
        
        if (loadTime !== null && process.env.NODE_ENV === 'development') {
          console.log(`[Performance] Initial load: ${loadTime}ms`);
        }
      });
    }
  }, []);
}

/**
 * Hook to track dashboard performance metrics
 */
export function useDashboardPerformance() {
  const componentRenderTimes = useRef<Map<string, number>>(new Map());

  const measureComponentRender = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      componentRenderTimes.current.set(componentName, renderTime);
      performanceMonitor.measureComponentRender(componentName, renderTime);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }
    };
  }, []);

  const measureInteraction = useCallback((actionType: string) => {
    performanceMonitor.startInteraction(actionType);
    
    return () => {
      const interactionTime = performanceMonitor.endInteraction(actionType);
      
      if (interactionTime !== null && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${actionType} interaction: ${interactionTime.toFixed(2)}ms`);
      }
      
      return interactionTime;
    };
  }, []);

  const updateWidgetProgress = useCallback((totalWidgets: number, loadedWidgets: number) => {
    performanceMonitor.updateWidgetProgress(totalWidgets, loadedWidgets);
  }, []);

  const getDashboardMetrics = useCallback(() => {
    return performanceMonitor.getDashboardMetrics();
  }, []);

  const checkPerformanceRequirements = useCallback(() => {
    return performanceMonitor.checkPerformanceRequirements();
  }, []);

  return {
    measureComponentRender,
    measureInteraction,
    updateWidgetProgress,
    getDashboardMetrics,
    checkPerformanceRequirements,
  };
}

/**
 * Hook to track component render performance
 */
export function useComponentPerformance(componentName: string) {
  const { measureComponentRender } = useDashboardPerformance();
  
  useEffect(() => {
    const endMeasurement = measureComponentRender(componentName);
    return endMeasurement;
  }, [componentName, measureComponentRender]);
}

/**
 * Hook to track interaction response times
 */
export function useInteractionPerformance() {
  const { measureInteraction } = useDashboardPerformance();
  
  const trackInteraction = useCallback((actionType: string, callback?: () => void) => {
    const endMeasurement = measureInteraction(actionType);
    
    // Execute callback immediately for UI responsiveness
    if (callback) {
      callback();
    }
    
    // End measurement after a microtask to capture immediate UI updates
    Promise.resolve().then(() => {
      endMeasurement();
    });
  }, [measureInteraction]);

  return { trackInteraction };
}
