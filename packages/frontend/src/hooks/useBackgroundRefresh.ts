import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../utils/performance';

export interface BackgroundRefreshOptions {
  interval?: number; // Refresh interval in milliseconds
  enabled?: boolean; // Whether background refresh is enabled
  onRefresh?: () => Promise<void>; // Callback for refresh logic
  onError?: (error: Error) => void; // Error handler
  maxRetries?: number; // Maximum retry attempts
  retryDelay?: number; // Delay between retries
}

export interface BackgroundRefreshState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: Error | null;
  retryCount: number;
}

/**
 * Hook for background data refresh without blocking UI
 */
export function useBackgroundRefresh(options: BackgroundRefreshOptions = {}) {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    onRefresh,
    onError,
    maxRetries = 3,
    retryDelay = 5000, // 5 seconds
  } = options;

  const [state, setState] = useState<BackgroundRefreshState>({
    isRefreshing: false,
    lastRefresh: null,
    error: null,
    retryCount: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const performRefresh = useCallback(async () => {
    if (!onRefresh || state.isRefreshing || isUnmountedRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    performanceMonitor.startBackgroundRefresh();

    try {
      await onRefresh();
      
      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          lastRefresh: new Date(),
          error: null,
          retryCount: 0,
        }));
      }

      const refreshTime = performanceMonitor.endBackgroundRefresh();
      
      if (process.env.NODE_ENV === 'development' && refreshTime !== null) {
        console.log(`[Background Refresh] Completed in ${refreshTime.toFixed(2)}ms`);
      }
    } catch (error) {
      const refreshError = error instanceof Error ? error : new Error('Background refresh failed');
      
      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: refreshError,
          retryCount: prev.retryCount + 1,
        }));

        // Handle error callback
        if (onError) {
          onError(refreshError);
        }

        // Retry logic
        if (state.retryCount < maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              performRefresh();
            }
          }, retryDelay);
        }
      }

      performanceMonitor.endBackgroundRefresh();
      
      if (process.env.NODE_ENV === 'development') {
        console.error('[Background Refresh] Error:', refreshError);
      }
    }
  }, [onRefresh, state.isRefreshing, state.retryCount, maxRetries, retryDelay, onError]);

  // Set up interval for background refresh
  useEffect(() => {
    if (!enabled || !onRefresh) {
      return;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      performRefresh();
    }, interval);

    // Perform initial refresh
    performRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, performRefresh, onRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const forceRefresh = useCallback(() => {
    if (!state.isRefreshing) {
      performRefresh();
    }
  }, [performRefresh, state.isRefreshing]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, retryCount: 0 }));
  }, []);

  return {
    ...state,
    forceRefresh,
    clearError,
  };
}

/**
 * Hook for managing multiple background refresh operations
 */
export function useMultipleBackgroundRefresh(
  refreshConfigs: Array<{
    key: string;
    options: BackgroundRefreshOptions;
  }>
) {
  const [states, setStates] = useState<Record<string, BackgroundRefreshState>>({});

  const refreshHooks = refreshConfigs.map(({ key, options }) => {
    const refreshState = useBackgroundRefresh({
      ...options,
      onRefresh: async () => {
        if (options.onRefresh) {
          await options.onRefresh();
        }
      },
      onError: (error) => {
        setStates(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            error,
          },
        }));
        
        if (options.onError) {
          options.onError(error);
        }
      },
    });

    // Update state for this key
    useEffect(() => {
      setStates(prev => ({
        ...prev,
        [key]: {
          isRefreshing: refreshState.isRefreshing,
          lastRefresh: refreshState.lastRefresh,
          error: refreshState.error,
          retryCount: refreshState.retryCount,
        },
      }));
    }, [key, refreshState]);

    return { key, ...refreshState };
  });

  const isAnyRefreshing = Object.values(states).some(state => state.isRefreshing);
  const hasAnyError = Object.values(states).some(state => state.error !== null);
  const lastRefresh = Object.values(states)
    .map(state => state.lastRefresh)
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0] || null;

  const forceRefreshAll = useCallback(() => {
    refreshHooks.forEach(hook => hook.forceRefresh());
  }, [refreshHooks]);

  const clearAllErrors = useCallback(() => {
    refreshHooks.forEach(hook => hook.clearError());
  }, [refreshHooks]);

  return {
    states,
    isAnyRefreshing,
    hasAnyError,
    lastRefresh,
    forceRefreshAll,
    clearAllErrors,
    refreshHooks,
  };
}