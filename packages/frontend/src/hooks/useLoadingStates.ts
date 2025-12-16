import { useState, useCallback, useRef, useEffect } from 'react';
import { performanceMonitor } from '../utils/performance';

export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  progress: number; // 0-100
  stage: string;
  startTime: number;
  duration: number;
}

export interface LoadingStatesManager {
  states: Record<string, LoadingState>;
  startLoading: (key: string, stage?: string) => void;
  updateProgress: (key: string, progress: number, stage?: string) => void;
  finishLoading: (key: string) => void;
  setError: (key: string, error: Error) => void;
  clearError: (key: string) => void;
  isAnyLoading: boolean;
  getLoadingProgress: () => number;
  reset: () => void;
}

/**
 * Hook for managing multiple loading states with progress tracking
 */
export function useLoadingStates(keys: string[] = []): LoadingStatesManager {
  const [states, setStates] = useState<Record<string, LoadingState>>(() => {
    const initialStates: Record<string, LoadingState> = {};
    keys.forEach(key => {
      initialStates[key] = {
        isLoading: false,
        error: null,
        progress: 0,
        stage: '',
        startTime: 0,
        duration: 0,
      };
    });
    return initialStates;
  });

  const performanceTimers = useRef<Record<string, number>>({});

  const startLoading = useCallback((key: string, stage: string = 'Loading...') => {
    const startTime = performance.now();
    performanceTimers.current[key] = startTime;
    
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        error: null,
        progress: 0,
        stage,
        startTime,
        duration: 0,
      },
    }));

    // Track performance
    performanceMonitor.startInteraction(`loading-${key}`);
  }, []);

  const updateProgress = useCallback((key: string, progress: number, stage?: string) => {
    setStates(prev => {
      const currentState = prev[key];
      if (!currentState || !currentState.isLoading) return prev;

      const now = performance.now();
      return {
        ...prev,
        [key]: {
          ...currentState,
          progress: Math.max(0, Math.min(100, progress)),
          stage: stage || currentState.stage,
          duration: now - currentState.startTime,
        },
      };
    });
  }, []);

  const finishLoading = useCallback((key: string) => {
    const endTime = performance.now();
    const startTime = performanceTimers.current[key];
    
    setStates(prev => {
      const currentState = prev[key];
      if (!currentState) return prev;

      return {
        ...prev,
        [key]: {
          ...currentState,
          isLoading: false,
          progress: 100,
          duration: startTime ? endTime - startTime : 0,
        },
      };
    });

    // Track performance
    const loadingTime = performanceMonitor.endInteraction(`loading-${key}`);
    
    if (process.env.NODE_ENV === 'development' && loadingTime !== null) {
      console.log(`[Loading] ${key} completed in ${loadingTime.toFixed(2)}ms`);
    }

    delete performanceTimers.current[key];
  }, []);

  const setError = useCallback((key: string, error: Error) => {
    setStates(prev => {
      const currentState = prev[key];
      if (!currentState) return prev;

      return {
        ...prev,
        [key]: {
          ...currentState,
          isLoading: false,
          error,
        },
      };
    });

    // End performance tracking on error
    performanceMonitor.endInteraction(`loading-${key}`);
    delete performanceTimers.current[key];
  }, []);

  const clearError = useCallback((key: string) => {
    setStates(prev => {
      const currentState = prev[key];
      if (!currentState) return prev;

      return {
        ...prev,
        [key]: {
          ...currentState,
          error: null,
        },
      };
    });
  }, []);

  const reset = useCallback(() => {
    // Clear all performance timers
    Object.keys(performanceTimers.current).forEach(key => {
      performanceMonitor.endInteraction(`loading-${key}`);
    });
    performanceTimers.current = {};

    setStates(prev => {
      const resetStates: Record<string, LoadingState> = {};
      Object.keys(prev).forEach(key => {
        resetStates[key] = {
          isLoading: false,
          error: null,
          progress: 0,
          stage: '',
          startTime: 0,
          duration: 0,
        };
      });
      return resetStates;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(performanceTimers.current).forEach(key => {
        performanceMonitor.endInteraction(`loading-${key}`);
      });
    };
  }, []);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  
  const getLoadingProgress = useCallback(() => {
    const loadingStates = Object.values(states).filter(state => state.isLoading);
    if (loadingStates.length === 0) return 100;
    
    const totalProgress = loadingStates.reduce((sum, state) => sum + state.progress, 0);
    return totalProgress / loadingStates.length;
  }, [states]);

  return {
    states,
    startLoading,
    updateProgress,
    finishLoading,
    setError,
    clearError,
    isAnyLoading,
    getLoadingProgress,
    reset,
  };
}

/**
 * Hook for managing a single loading state with automatic timeout
 */
export function useLoadingState(
  key: string,
  timeout: number = 30000 // 30 seconds default timeout
) {
  const manager = useLoadingStates([key]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((stage?: string) => {
    manager.startLoading(key, stage);
    
    // Set timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      manager.setError(key, new Error(`Loading timeout after ${timeout}ms`));
    }, timeout);
  }, [manager, key, timeout]);

  const finishLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    manager.finishLoading(key);
  }, [manager, key]);

  const setError = useCallback((error: Error) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    manager.setError(key, error);
  }, [manager, key]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const state = manager.states[key];

  return {
    ...state,
    startLoading,
    updateProgress: (progress: number, stage?: string) => manager.updateProgress(key, progress, stage),
    finishLoading,
    setError,
    clearError: () => manager.clearError(key),
  };
}

/**
 * Hook for managing sequential loading states
 */
export function useSequentialLoading(stages: string[]) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const manager = useLoadingStates(['sequential']);

  const startSequence = useCallback(() => {
    setCurrentStageIndex(0);
    setIsComplete(false);
    manager.startLoading('sequential', stages[0]);
  }, [manager, stages]);

  const nextStage = useCallback(() => {
    const nextIndex = currentStageIndex + 1;
    
    if (nextIndex >= stages.length) {
      setIsComplete(true);
      manager.finishLoading('sequential');
      return;
    }

    setCurrentStageIndex(nextIndex);
    const progress = (nextIndex / stages.length) * 100;
    manager.updateProgress('sequential', progress, stages[nextIndex]);
  }, [currentStageIndex, stages, manager]);

  const setError = useCallback((error: Error) => {
    manager.setError('sequential', error);
  }, [manager]);

  const reset = useCallback(() => {
    setCurrentStageIndex(0);
    setIsComplete(false);
    manager.reset();
  }, [manager]);

  const state = manager.states['sequential'];
  const currentStage = stages[currentStageIndex] || '';
  const progress = stages.length > 0 ? (currentStageIndex / stages.length) * 100 : 0;

  return {
    ...state,
    currentStage,
    currentStageIndex,
    totalStages: stages.length,
    progress,
    isComplete,
    startSequence,
    nextStage,
    setError,
    reset,
  };
}