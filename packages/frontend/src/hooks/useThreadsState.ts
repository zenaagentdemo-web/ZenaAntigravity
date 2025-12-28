/**
 * useThreadsState Hook
 * 
 * Manages thread state including fetching, caching, and real-time updates.
 * Provides functions for refreshing, updating, removing, and merging threads.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Thread, SyncStatus } from '../models/newPage.types';
import { api } from '../utils/apiClient';
import { calculatePriorityScore } from '../utils/threadPriorityCalculator';

export interface UseThreadsStateReturn {
  /** Current list of threads */
  threads: Thread[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Number of new threads available */
  newThreadsCount: number;
  /** Refresh threads from server */
  refresh: () => Promise<void>;
  /** Update a specific thread */
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  /** Remove a thread from the list */
  removeThread: (threadId: string) => void;
  /** Merge new threads into the list */
  mergeNewThreads: () => void;
  /** Set threads directly (for testing) */
  setThreads: (threads: Thread[]) => void;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ThreadCache {
  threads: Thread[];
  timestamp: number;
}

/**
 * Sort threads by priority score in descending order
 */
function sortThreadsByPriority(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    const scoreA = a.priorityScore ?? calculatePriorityScore(a).score;
    const scoreB = b.priorityScore ?? calculatePriorityScore(b).score;
    return scoreB - scoreA;
  });
}

/**
 * Hook for managing thread state with caching and real-time updates
 * @param options - Hook options
 * @param options.filter - Category filter ('focus' | 'waiting' | 'all')
 */
export function useThreadsState(options: { filter?: 'focus' | 'waiting' | 'all' } = {}): UseThreadsStateReturn {
  const { filter = 'all' } = options;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [newThreadsCount, setNewThreadsCount] = useState(0);

  // Store pending new threads
  const pendingThreadsRef = useRef<Thread[]>([]);

  // Cache reference
  const cacheRef = useRef<ThreadCache | null>(null);

  /**
   * Fetch threads from the API
   */
  const fetchThreads = useCallback(async (): Promise<Thread[]> => {
    try {
      // Use the specified filter in the API call
      // If filter is 'all', we don't send the filter param to get everything
      const filterParam = filter === 'all' ? '' : `?filter=${filter}`;
      const response = await api.get<{ threads: Thread[] }>(`/api/threads${filterParam}`);
      const threadsData = response.data.threads || [];

      // Calculate priority scores for threads that don't have them
      const threadsWithScores = threadsData.map(thread => ({
        ...thread,
        priorityScore: thread.priorityScore ?? calculatePriorityScore(thread).score
      }));

      return sortThreadsByPriority(threadsWithScores);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to fetch threads');
    }
  }, [filter]);

  /**
   * Refresh threads from the server
   */
  const refresh = useCallback(async (): Promise<void> => {
    setSyncStatus('syncing');
    setError(null);

    try {
      const fetchedThreads = await fetchThreads();

      // Update cache
      cacheRef.current = {
        threads: fetchedThreads,
        timestamp: Date.now()
      };

      setThreads(fetchedThreads);
      setSyncStatus('idle');
      setNewThreadsCount(0);
      pendingThreadsRef.current = [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh threads');
      setError(error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchThreads]);

  /**
   * Update a specific thread in the list
   * Requirement 8.3: Thread updates should be reflected immediately
   */
  const updateThread = useCallback((threadId: string, updates: Partial<Thread>): void => {
    setThreads(currentThreads => {
      const updatedThreads = currentThreads.map(thread => {
        if (thread.id === threadId) {
          const updatedThread = { ...thread, ...updates };
          // Recalculate priority score if relevant fields changed
          if (updates.riskLevel || updates.classification || updates.lastMessageAt) {
            updatedThread.priorityScore = calculatePriorityScore(updatedThread).score;
          }
          return updatedThread;
        }
        return thread;
      });

      // Re-sort if priority might have changed
      if (updates.riskLevel || updates.classification || updates.lastMessageAt || updates.priorityScore) {
        return sortThreadsByPriority(updatedThreads);
      }

      return updatedThreads;
    });
  }, []);

  /**
   * Remove a thread from the list
   */
  const removeThread = useCallback((threadId: string): void => {
    setThreads(currentThreads =>
      currentThreads.filter(thread => thread.id !== threadId)
    );
  }, []);

  /**
   * Merge pending new threads into the main list
   * Requirement 8.2: New threads should be inserted at appropriate priority positions
   */
  const mergeNewThreads = useCallback((): void => {
    if (pendingThreadsRef.current.length === 0) return;

    setThreads(currentThreads => {
      // Add priority scores to new threads
      const newThreadsWithScores = pendingThreadsRef.current.map(thread => ({
        ...thread,
        priorityScore: thread.priorityScore ?? calculatePriorityScore(thread).score
      }));

      // Merge and sort
      const mergedThreads = [...currentThreads, ...newThreadsWithScores];
      return sortThreadsByPriority(mergedThreads);
    });

    // Clear pending threads
    pendingThreadsRef.current = [];
    setNewThreadsCount(0);
  }, []);

  /**
   * Set threads directly (useful for testing)
   */
  const setThreadsDirectly = useCallback((newThreads: Thread[]): void => {
    const threadsWithScores = newThreads.map(thread => ({
      ...thread,
      priorityScore: thread.priorityScore ?? calculatePriorityScore(thread).score
    }));
    setThreads(sortThreadsByPriority(threadsWithScores));
    setIsLoading(false);
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    // Check cache first
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL) {
      setThreads(cacheRef.current.threads);
      setIsLoading(false);
      return;
    }

    refresh();
  }, [refresh]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('idle');
      refresh();
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline status
    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  return {
    threads,
    isLoading,
    error,
    syncStatus,
    newThreadsCount,
    refresh,
    updateThread,
    removeThread,
    mergeNewThreads,
    setThreads: setThreadsDirectly
  };
}

export default useThreadsState;
