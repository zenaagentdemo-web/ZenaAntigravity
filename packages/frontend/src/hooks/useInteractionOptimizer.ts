import { useCallback, useRef, useEffect } from 'react';
import { performanceMonitor } from '../utils/performance';

export interface InteractionOptimizerOptions {
  debounceMs?: number;
  throttleMs?: number;
  enableHapticFeedback?: boolean;
  enableVisualFeedback?: boolean;
  maxResponseTime?: number; // ms
}

export interface OptimizedInteraction {
  execute: (callback: () => void | Promise<void>) => Promise<void>;
  executeImmediate: (callback: () => void) => void;
  cancel: () => void;
  isExecuting: boolean;
}

/**
 * Hook for optimizing interaction response times
 */
export function useInteractionOptimizer(
  actionType: string,
  options: InteractionOptimizerOptions = {}
): OptimizedInteraction {
  const {
    debounceMs = 0,
    throttleMs = 0,
    enableHapticFeedback = true,
    enableVisualFeedback = true,
    maxResponseTime = 100,
  } = options;

  const isExecutingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionRef = useRef<number>(0);

  const triggerHapticFeedback = useCallback(() => {
    if (!enableHapticFeedback) return;
    
    // Use Web Vibration API if available
    if ('vibrator' in navigator || 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(10); // Short vibration
      } catch (error) {
        // Ignore vibration errors
      }
    }
  }, [enableHapticFeedback]);

  const triggerVisualFeedback = useCallback((element?: HTMLElement) => {
    if (!enableVisualFeedback) return;

    const target = element || document.activeElement as HTMLElement;
    if (!target) return;

    // Add visual feedback class
    target.classList.add('interaction-feedback');
    
    // Remove after animation
    setTimeout(() => {
      target.classList.remove('interaction-feedback');
    }, 150);
  }, [enableVisualFeedback]);

  const executeImmediate = useCallback((callback: () => void) => {
    if (isExecutingRef.current) return;

    const startTime = performance.now();
    performanceMonitor.startInteraction(actionType);
    
    try {
      // Provide immediate feedback
      triggerHapticFeedback();
      triggerVisualFeedback();
      
      // Execute callback
      callback();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Log warning if response time exceeds threshold
      if (responseTime > maxResponseTime && process.env.NODE_ENV === 'development') {
        console.warn(`[Interaction] ${actionType} took ${responseTime.toFixed(2)}ms (>${maxResponseTime}ms threshold)`);
      }
      
    } finally {
      performanceMonitor.endInteraction(actionType);
    }
  }, [actionType, triggerHapticFeedback, triggerVisualFeedback, maxResponseTime]);

  const execute = useCallback(async (callback: () => void | Promise<void>) => {
    if (isExecutingRef.current) return;

    // Handle throttling
    if (throttleMs > 0) {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutionRef.current;
      
      if (timeSinceLastExecution < throttleMs) {
        return; // Skip execution due to throttling
      }
      
      lastExecutionRef.current = now;
    }

    // Handle debouncing
    if (debounceMs > 0) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      return new Promise<void>((resolve) => {
        debounceTimeoutRef.current = setTimeout(async () => {
          await executeCallback();
          resolve();
        }, debounceMs);
      });
    }

    await executeCallback();

    async function executeCallback() {
      if (isExecutingRef.current) return;
      
      isExecutingRef.current = true;
      const startTime = performance.now();
      performanceMonitor.startInteraction(actionType);
      
      try {
        // Provide immediate feedback
        triggerHapticFeedback();
        triggerVisualFeedback();
        
        // Execute callback
        const result = callback();
        
        // Handle async callbacks
        if (result instanceof Promise) {
          await result;
        }
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Log warning if response time exceeds threshold
        if (responseTime > maxResponseTime && process.env.NODE_ENV === 'development') {
          console.warn(`[Interaction] ${actionType} took ${responseTime.toFixed(2)}ms (>${maxResponseTime}ms threshold)`);
        }
        
      } catch (error) {
        console.error(`[Interaction] Error in ${actionType}:`, error);
        throw error;
      } finally {
        isExecutingRef.current = false;
        performanceMonitor.endInteraction(actionType);
      }
    }
  }, [actionType, debounceMs, throttleMs, triggerHapticFeedback, triggerVisualFeedback, maxResponseTime]);

  const cancel = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    
    isExecutingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    execute,
    executeImmediate,
    cancel,
    isExecuting: isExecutingRef.current,
  };
}

/**
 * Hook for optimizing multiple interactions
 */
export function useMultipleInteractionOptimizer(
  interactions: Record<string, InteractionOptimizerOptions>
) {
  const optimizers = useRef<Record<string, OptimizedInteraction>>({});

  // Initialize optimizers
  Object.entries(interactions).forEach(([actionType, options]) => {
    if (!optimizers.current[actionType]) {
      // We can't use hooks in a loop, so we'll create a simpler version
      optimizers.current[actionType] = createInteractionOptimizer(actionType, options);
    }
  });

  const executeInteraction = useCallback(async (
    actionType: string, 
    callback: () => void | Promise<void>
  ) => {
    const optimizer = optimizers.current[actionType];
    if (optimizer) {
      await optimizer.execute(callback);
    } else {
      // Fallback to direct execution
      await callback();
    }
  }, []);

  const executeImmediate = useCallback((
    actionType: string, 
    callback: () => void
  ) => {
    const optimizer = optimizers.current[actionType];
    if (optimizer) {
      optimizer.executeImmediate(callback);
    } else {
      // Fallback to direct execution
      callback();
    }
  }, []);

  const cancelInteraction = useCallback((actionType: string) => {
    const optimizer = optimizers.current[actionType];
    if (optimizer) {
      optimizer.cancel();
    }
  }, []);

  const cancelAllInteractions = useCallback(() => {
    Object.values(optimizers.current).forEach(optimizer => {
      optimizer.cancel();
    });
  }, []);

  return {
    executeInteraction,
    executeImmediate,
    cancelInteraction,
    cancelAllInteractions,
  };
}

// Helper function to create interaction optimizer without hooks
function createInteractionOptimizer(
  actionType: string,
  options: InteractionOptimizerOptions
): OptimizedInteraction {
  let isExecuting = false;
  let debounceTimeout: NodeJS.Timeout | null = null;
  let lastExecution = 0;

  const {
    debounceMs = 0,
    throttleMs = 0,
    enableHapticFeedback = true,
    enableVisualFeedback = true,
    maxResponseTime = 100,
  } = options;

  const triggerHapticFeedback = () => {
    if (!enableHapticFeedback) return;
    
    if ('vibrator' in navigator || 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(10);
      } catch (error) {
        // Ignore vibration errors
      }
    }
  };

  const triggerVisualFeedback = (element?: HTMLElement) => {
    if (!enableVisualFeedback) return;

    const target = element || document.activeElement as HTMLElement;
    if (!target) return;

    target.classList.add('interaction-feedback');
    setTimeout(() => {
      target.classList.remove('interaction-feedback');
    }, 150);
  };

  const executeImmediate = (callback: () => void) => {
    if (isExecuting) return;

    const startTime = performance.now();
    performanceMonitor.startInteraction(actionType);
    
    try {
      triggerHapticFeedback();
      triggerVisualFeedback();
      callback();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (responseTime > maxResponseTime && process.env.NODE_ENV === 'development') {
        console.warn(`[Interaction] ${actionType} took ${responseTime.toFixed(2)}ms (>${maxResponseTime}ms threshold)`);
      }
    } finally {
      performanceMonitor.endInteraction(actionType);
    }
  };

  const execute = async (callback: () => void | Promise<void>) => {
    if (isExecuting) return;

    // Handle throttling
    if (throttleMs > 0) {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecution;
      
      if (timeSinceLastExecution < throttleMs) {
        return;
      }
      
      lastExecution = now;
    }

    // Handle debouncing
    if (debounceMs > 0) {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      return new Promise<void>((resolve) => {
        debounceTimeout = setTimeout(async () => {
          await executeCallback();
          resolve();
        }, debounceMs);
      });
    }

    await executeCallback();

    async function executeCallback() {
      if (isExecuting) return;
      
      isExecuting = true;
      const startTime = performance.now();
      performanceMonitor.startInteraction(actionType);
      
      try {
        triggerHapticFeedback();
        triggerVisualFeedback();
        
        const result = callback();
        if (result instanceof Promise) {
          await result;
        }
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        if (responseTime > maxResponseTime && process.env.NODE_ENV === 'development') {
          console.warn(`[Interaction] ${actionType} took ${responseTime.toFixed(2)}ms (>${maxResponseTime}ms threshold)`);
        }
      } catch (error) {
        console.error(`[Interaction] Error in ${actionType}:`, error);
        throw error;
      } finally {
        isExecuting = false;
        performanceMonitor.endInteraction(actionType);
      }
    }
  };

  const cancel = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    isExecuting = false;
  };

  return {
    execute,
    executeImmediate,
    cancel,
    get isExecuting() { return isExecuting; },
  };
}