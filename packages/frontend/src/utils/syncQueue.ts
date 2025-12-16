/**
 * Sync Queue Manager
 * Handles synchronization of offline actions when connectivity is restored
 */

import {
  getQueuedActions,
  removeQueuedAction,
  saveToStore,
  getFromStore,
  getAllFromStore,
  STORES,
  type SyncQueueItem,
} from './offlineStorage';

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  conflicts: number;
  errors: Array<{ action: string; error: string }>;
}

export interface SyncConflict {
  id: string;
  action: string;
  localData: any;
  serverData: any;
  timestamp: number;
  resolved: boolean;
}

export type ConflictResolutionStrategy = 'local' | 'server' | 'merge' | 'manual';

/**
 * Process all queued actions
 */
export async function processSyncQueue(): Promise<SyncResult> {
  const queuedActions = await getQueuedActions();
  
  if (queuedActions.length === 0) {
    return {
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };
  }

  // Sort by timestamp (oldest first)
  queuedActions.sort((a, b) => a.timestamp - b.timestamp);

  let processed = 0;
  let failed = 0;
  let conflicts = 0;
  const errors: Array<{ action: string; error: string }> = [];

  for (const item of queuedActions) {
    try {
      await processQueueItem(item);
      await removeQueuedAction(item.id);
      processed++;
    } catch (error) {
      // Increment retry count
      item.retryCount++;

      if (item.retryCount >= MAX_RETRY_COUNT) {
        // Max retries reached, remove from queue and log error
        await removeQueuedAction(item.id);
        failed++;
        errors.push({
          action: item.action,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        // Update retry count in queue
        await saveToStore(STORES.SYNC_QUEUE, item);
        failed++;
        errors.push({
          action: item.action,
          error: `Retry ${item.retryCount}/${MAX_RETRY_COUNT}`,
        });
      }
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  return {
    success: failed === 0 && conflicts === 0,
    processed,
    failed,
    conflicts,
    errors,
  };
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { endpoint, method, data } = item;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // Add body for POST/PUT requests
  if ((method === 'POST' || method === 'PUT') && data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if there are pending actions in the queue
 */
export async function hasPendingActions(): Promise<boolean> {
  const queuedActions = await getQueuedActions();
  return queuedActions.length > 0;
}

/**
 * Get count of pending actions
 */
export async function getPendingActionCount(): Promise<number> {
  const queuedActions = await getQueuedActions();
  return queuedActions.length;
}

/**
 * Clear all failed actions from queue
 */
export async function clearFailedActions(): Promise<void> {
  const queuedActions = await getQueuedActions();
  
  for (const item of queuedActions) {
    if (item.retryCount >= MAX_RETRY_COUNT) {
      await removeQueuedAction(item.id);
    }
  }
}
/**
 * Detect and handle sync conflicts
 */
export async function detectSyncConflicts(localData: any, serverData: any): Promise<boolean> {
  // Simple conflict detection based on timestamps
  if (localData.lastModified && serverData.lastModified) {
    return localData.lastModified !== serverData.lastModified;
  }
  
  // Fallback to deep comparison for objects without timestamps
  return JSON.stringify(localData) !== JSON.stringify(serverData);
}

/**
 * Resolve sync conflict using specified strategy
 */
export async function resolveSyncConflict(
  conflict: SyncConflict,
  strategy: ConflictResolutionStrategy
): Promise<any> {
  switch (strategy) {
    case 'local':
      return conflict.localData;
    
    case 'server':
      return conflict.serverData;
    
    case 'merge':
      // Simple merge strategy - server data takes precedence for conflicts
      return {
        ...conflict.localData,
        ...conflict.serverData,
        lastModified: Math.max(
          conflict.localData.lastModified || 0,
          conflict.serverData.lastModified || 0
        ),
      };
    
    case 'manual':
      // Store conflict for manual resolution
      await saveConflictForManualResolution(conflict);
      throw new Error('Manual resolution required');
    
    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }
}

/**
 * Save conflict for manual resolution
 */
async function saveConflictForManualResolution(conflict: SyncConflict): Promise<void> {
  await saveToStore('sync_conflicts', conflict);
}

/**
 * Get all unresolved conflicts
 */
export async function getUnresolvedConflicts(): Promise<SyncConflict[]> {
  try {
    const conflicts = await getAllFromStore<SyncConflict>('sync_conflicts');
    return conflicts.filter(c => !c.resolved);
  } catch (error) {
    console.warn('Failed to get unresolved conflicts:', error);
    return [];
  }
}

/**
 * Mark conflict as resolved
 */
export async function markConflictResolved(conflictId: string): Promise<void> {
  try {
    const conflict = await getFromStore<SyncConflict>('sync_conflicts', conflictId);
    if (conflict) {
      conflict.resolved = true;
      await saveToStore('sync_conflicts', conflict);
    }
  } catch (error) {
    console.warn('Failed to mark conflict as resolved:', error);
  }
}

/**
 * Enhanced sync with conflict detection and resolution
 */
export async function processSyncQueueWithConflictResolution(
  conflictStrategy: ConflictResolutionStrategy = 'merge'
): Promise<SyncResult> {
  const queuedActions = await getQueuedActions();
  
  if (queuedActions.length === 0) {
    return {
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };
  }

  // Sort by timestamp (oldest first)
  queuedActions.sort((a, b) => a.timestamp - b.timestamp);

  let processed = 0;
  let failed = 0;
  let conflicts = 0;
  const errors: Array<{ action: string; error: string }> = [];

  for (const item of queuedActions) {
    try {
      // First, try to get current server data to check for conflicts
      if (item.method === 'PUT') {
        try {
          const serverResponse = await fetch(item.endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          });

          if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            const hasConflict = await detectSyncConflicts(item.data, serverData);

            if (hasConflict) {
              const conflict: SyncConflict = {
                id: `conflict-${item.id}`,
                action: item.action,
                localData: item.data,
                serverData,
                timestamp: Date.now(),
                resolved: false,
              };

              try {
                const resolvedData = await resolveSyncConflict(conflict, conflictStrategy);
                // Update the item data with resolved data
                item.data = resolvedData;
                conflicts++;
              } catch (error) {
                if (error instanceof Error && error.message === 'Manual resolution required') {
                  // Skip this item for now, it will be handled manually
                  conflicts++;
                  continue;
                } else {
                  throw error;
                }
              }
            }
          }
        } catch (conflictError) {
          // If we can't check for conflicts, proceed with original sync
          console.warn('Conflict detection failed, proceeding with sync:', conflictError);
        }
      }

      await processQueueItem(item);
      await removeQueuedAction(item.id);
      processed++;
    } catch (error) {
      // Increment retry count
      item.retryCount++;

      if (item.retryCount >= MAX_RETRY_COUNT) {
        // Max retries reached, remove from queue and log error
        await removeQueuedAction(item.id);
        failed++;
        errors.push({
          action: item.action,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        // Update retry count in queue
        await saveToStore(STORES.SYNC_QUEUE, item);
        failed++;
        errors.push({
          action: item.action,
          error: `Retry ${item.retryCount}/${MAX_RETRY_COUNT}`,
        });
      }
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  return {
    success: failed === 0 && conflicts === 0,
    processed,
    failed,
    conflicts,
    errors,
  };
}