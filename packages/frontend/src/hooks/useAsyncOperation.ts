import { useState, useCallback, useRef, useEffect } from 'react';
import { errorHandlingService } from '../services/errorHandlingService';

export interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  progress: number;
  stage: string;
  isComplete: boolean;
  hasStarted: boolean;
}

export interface AsyncOperationOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  onProgress?: (progress: number, stage: string) => void;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
  errorContext?: string;
}

export interface AsyncOperationControls<T> {
  execute: (operation: () => Promise<T>, options?: Partial<AsyncOperationOptions>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  cancel: () => void;
  reset: () => void;
  updateProgress: (progress: number, stage?: string) => void;
}

/**
 * Hook for managing async operations with loading states, error handling, and progress tracking
 */
export function useAsyncOperation<T = any>(
  defaultOptions: AsyncOperationOptions = {}
): [AsyncOperationState<T>, AsyncOperationControls<T>] {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    progress: 0,
    stage: '',
    isComplete: false,
    hasStarted: false,
  });

  const operationRef = useRef<(() => Promise<T>) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);
  const retryCountRef = useRef(0);
  const optionsRef = useRef(defaultOptions);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const updateProgress = useCallback((progress: number, stage: string = '') => {
    if (cancelledRef.current) return;
    
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      stage,
    }));

    optionsRef.current.onProgress?.(progress, stage);
  }, []);

  const setError = useCallback((error: Error) => {
    if (cancelledRef.current) return;

    // Report error to error handling service
    errorHandlingService.reportError(error, {
      component: optionsRef.current.errorContext || 'AsyncOperation',
    }, 'medium');

    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      isComplete: true,
    }));

    optionsRef.current.onError?.(error);
    clearTimeout();
  }, [clearTimeout]);

  const setSuccess = useCallback((data: T) => {
    if (cancelledRef.current) return;

    setState(prev => ({
      ...prev,
      data,
      isLoading: false,
      error: null,
      progress: 100,
      isComplete: true,
    }));

    optionsRef.current.onSuccess?.(data);
    clearTimeout();
  }, [clearTimeout]);

  const executeOperation = useCallback(async (
    operation: () => Promise<T>,
    options: Partial<AsyncOperationOptions> = {}
  ): Promise<T | null> => {
    // Merge options
    optionsRef.current = { ...defaultOptions, ...options };
    operationRef.current = operation;
    cancelledRef.current = false;
    retryCountRef.current = 0;

    // Set initial loading state
    setState({
      data: null,
      isLoading: true,
      error: null,
      progress: 0,
      stage: 'Starting...',
      isComplete: false,
      hasStarted: true,
    });

    // Set timeout if specified
    if (optionsRef.current.timeout) {
      timeoutRef.current = setTimeout(() => {
        if (!cancelledRef.current) {
          setError(new Error(`Operation timed out after ${optionsRef.current.timeout}ms`));
        }
      }, optionsRef.current.timeout);
    }

    try {
      updateProgress(10, 'Initializing...');
      const result = await operation();
      
      if (!cancelledRef.current) {
        updateProgress(100, 'Complete');
        setSuccess(result);
        return result;
      }
      
      return null;
    } catch (error) {
      if (!cancelledRef.current) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        const shouldRetry = 
          optionsRef.current.retryCount && 
          retryCountRef.current < optionsRef.current.retryCount;
        
        if (shouldRetry) {
          retryCountRef.current++;
          updateProgress(0, `Retrying... (${retryCountRef.current}/${optionsRef.current.retryCount})`);
          
          // Wait before retry
          if (optionsRef.current.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, optionsRef.current.retryDelay));
          }
          
          return executeOperation(operation, options);
        } else {
          setError(err);
        }
      }
      
      return null;
    }
  }, [defaultOptions, updateProgress, setError, setSuccess]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!operationRef.current) {
      throw new Error('No operation to retry');
    }
    
    retryCountRef.current = 0;
    return executeOperation(operationRef.current);
  }, [executeOperation]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    clearTimeout();
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      stage: 'Cancelled',
    }));
  }, [clearTimeout]);

  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      isLoading: false,
      error: null,
      progress: 0,
      stage: '',
      isComplete: false,
      hasStarted: false,
    });
    operationRef.current = null;
    retryCountRef.current = 0;
  }, [cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const controls: AsyncOperationControls<T> = {
    execute: executeOperation,
    retry,
    cancel,
    reset,
    updateProgress,
  };

  return [state, controls];
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations<T extends Record<string, any>>(
  keys: (keyof T)[],
  defaultOptions: AsyncOperationOptions = {}
) {
  const operations = keys.reduce((acc, key) => {
    acc[key] = useAsyncOperation(defaultOptions);
    return acc;
  }, {} as Record<keyof T, ReturnType<typeof useAsyncOperation>>);

  const isAnyLoading = Object.values(operations).some(([state]) => state.isLoading);
  const hasAnyError = Object.values(operations).some(([state]) => state.error);
  const areAllComplete = Object.values(operations).every(([state]) => state.isComplete);

  const executeAll = useCallback(async (
    operationsMap: Record<keyof T, () => Promise<any>>,
    options?: Partial<AsyncOperationOptions>
  ) => {
    const promises = Object.entries(operationsMap).map(([key, operation]) => {
      const [, controls] = operations[key as keyof T];
      return controls.execute(operation as () => Promise<any>, options);
    });

    return Promise.allSettled(promises);
  }, [operations]);

  const resetAll = useCallback(() => {
    Object.values(operations).forEach(([, controls]) => {
      controls.reset();
    });
  }, [operations]);

  const cancelAll = useCallback(() => {
    Object.values(operations).forEach(([, controls]) => {
      controls.cancel();
    });
  }, [operations]);

  return {
    operations,
    isAnyLoading,
    hasAnyError,
    areAllComplete,
    executeAll,
    resetAll,
    cancelAll,
  };
}