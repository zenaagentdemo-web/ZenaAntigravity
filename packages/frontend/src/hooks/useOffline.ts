/**
 * useOffline Hook
 * Manages offline state, sync queue, and connectivity
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  processSyncQueue, 
  processSyncQueueWithConflictResolution,
  hasPendingActions, 
  getPendingActionCount,
  getUnresolvedConflicts,
  type ConflictResolutionStrategy 
} from '../utils/syncQueue';
import { updateLastSyncTime, getLastSyncTime } from '../utils/offlineStorage';

export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  dataFreshness: 'fresh' | 'stale' | 'unknown';
  unresolvedConflicts: number;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActions: 0,
    lastSyncTime: null,
    dataFreshness: 'unknown',
    unresolvedConflicts: 0,
  });

  // Enhanced connectivity check with actual network test
  const checkConnectivity = useCallback(async () => {
    // First check navigator.onLine
    if (!navigator.onLine) {
      return false;
    }

    // Perform actual network test to verify connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // If health check fails, try a simple network request
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }, []);

  // Update pending actions count and conflicts
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingActionCount();
    const conflicts = await getUnresolvedConflicts();
    setState((prev) => ({ 
      ...prev, 
      pendingActions: count,
      unresolvedConflicts: conflicts.length 
    }));
  }, []);

  // Update last sync time
  const updateSyncTime = useCallback(async () => {
    const lastSync = await getLastSyncTime();
    setState((prev) => ({ ...prev, lastSyncTime: lastSync }));
    
    // Determine data freshness
    if (lastSync) {
      const hoursSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60);
      const freshness = hoursSinceSync < 1 ? 'fresh' : 'stale';
      setState((prev) => ({ ...prev, dataFreshness: freshness }));
    }
  }, []);

  // Sync queued actions with conflict resolution
  const syncQueue = useCallback(async (conflictStrategy: ConflictResolutionStrategy = 'merge') => {
    if (!navigator.onLine) {
      console.log('[useOffline] Cannot sync while offline');
      return;
    }

    const hasPending = await hasPendingActions();
    if (!hasPending) {
      console.log('[useOffline] No pending actions to sync');
      return;
    }

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await processSyncQueueWithConflictResolution(conflictStrategy);
      console.log('[useOffline] Sync completed:', result);

      if (result.success) {
        await updateLastSyncTime();
        await updateSyncTime();
      }

      await updatePendingCount();

      // Dispatch custom event for other components
      window.dispatchEvent(
        new CustomEvent('sync-completed', {
          detail: result,
        })
      );
    } catch (error) {
      console.error('[useOffline] Sync failed:', error);
    } finally {
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [updatePendingCount, updateSyncTime]);

  // Handle online event with enhanced verification
  const handleOnline = useCallback(async () => {
    console.log('[useOffline] Navigator reports online, verifying connectivity...');
    
    // Verify actual connectivity
    const isActuallyOnline = await checkConnectivity();
    
    if (isActuallyOnline) {
      console.log('[useOffline] Connection verified and restored');
      setState((prev) => ({ ...prev, isOnline: true }));
      
      // Automatically sync when coming back online
      syncQueue();
    } else {
      console.log('[useOffline] Navigator reports online but connectivity test failed');
      setState((prev) => ({ ...prev, isOnline: false }));
    }
  }, [syncQueue, checkConnectivity]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    console.log('[useOffline] Connection lost');
    setState((prev) => ({ ...prev, isOnline: false }));
  }, []);

  // Periodic connectivity check for more accurate status
  const performConnectivityCheck = useCallback(async () => {
    const isActuallyOnline = await checkConnectivity();
    setState((prev) => {
      if (prev.isOnline !== isActuallyOnline) {
        console.log(`[useOffline] Connectivity status changed: ${isActuallyOnline ? 'online' : 'offline'}`);
        
        // If we just came online, trigger sync
        if (isActuallyOnline && !prev.isOnline) {
          setTimeout(() => syncQueue(), 100);
        }
      }
      return { ...prev, isOnline: isActuallyOnline };
    });
  }, [checkConnectivity, syncQueue]);

  // Handle service worker messages
  const handleServiceWorkerMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data.type === 'SYNC_QUEUE') {
        console.log('[useOffline] Sync queue message received from service worker');
        syncQueue();
      }
    },
    [syncQueue]
  );

  // Setup event listeners and periodic checks
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Initial setup
    updatePendingCount();
    updateSyncTime();
    
    // Perform initial connectivity check
    performConnectivityCheck();

    // Set up periodic connectivity checks (every 30 seconds)
    const connectivityInterval = setInterval(performConnectivityCheck, 30000);

    // More frequent checks when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        performConnectivityCheck();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(connectivityInterval);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [handleOnline, handleOffline, handleServiceWorkerMessage, updatePendingCount, updateSyncTime, performConnectivityCheck]);

  // Register background sync if supported
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register for background sync
        return (registration as any).sync.register('sync-queue');
      }).catch((error) => {
        console.error('[useOffline] Background sync registration failed:', error);
      });
    }
  }, []);

  return {
    ...state,
    syncQueue,
    updatePendingCount,
    checkConnectivity: performConnectivityCheck,
  };
}
