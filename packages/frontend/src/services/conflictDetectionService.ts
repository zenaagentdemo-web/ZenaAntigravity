/**
 * Conflict Detection Service
 * 
 * Handles detection of concurrent modifications to threads and provides
 * real-time conflict notifications for the reply composer and other components.
 * 
 * Requirements: 8.5, 8.6
 */

import { realTimeDataService } from './realTimeDataService';
import { errorHandlingService } from './errorHandlingService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ThreadConflict {
  threadId: string;
  conflictType: 'concurrent_edit' | 'status_change' | 'new_reply' | 'thread_moved';
  conflictingUser?: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

export interface ThreadUpdate {
  threadId: string;
  updateType: 'reply_added' | 'status_changed' | 'priority_changed' | 'moved' | 'deleted';
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  changes: Record<string, any>;
  version: number;
}

export interface ConflictNotification {
  id: string;
  threadId: string;
  type: 'conflict' | 'update';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  actions?: ConflictAction[];
  autoHideAfter?: number; // milliseconds
}

export interface ConflictAction {
  id: string;
  label: string;
  type: 'refresh' | 'merge' | 'discard' | 'save_as_draft';
  primary?: boolean;
}

export type ConflictCallback = (conflict: ThreadConflict) => void;
export type UpdateCallback = (update: ThreadUpdate) => void;
export type NotificationCallback = (notification: ConflictNotification) => void;

// ============================================================================
// Conflict Detection Service Class
// ============================================================================

class ConflictDetectionService {
  private conflictCallbacks: Set<ConflictCallback> = new Set();
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  
  private activeThreads: Map<string, number> = new Map(); // threadId -> version
  private composingThreads: Set<string> = new Set(); // threads currently being composed
  private lastUpdateTimestamps: Map<string, Date> = new Map();
  
  private isInitialized = false;

  /**
   * Initialize the conflict detection service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to real-time updates
    realTimeDataService.onDataUpdate(this.handleRealTimeUpdate);
    
    this.isInitialized = true;
    console.log('Conflict detection service initialized');
  }

  /**
   * Handle real-time updates from the WebSocket service
   */
  private handleRealTimeUpdate = (data: any): void => {
    try {
      // Handle thread-specific updates
      if (data.threadUpdates) {
        data.threadUpdates.forEach((update: any) => {
          this.processThreadUpdate(update);
        });
      }

      // Handle conflict notifications
      if (data.conflicts) {
        data.conflicts.forEach((conflict: any) => {
          this.processConflict(conflict);
        });
      }

      // Handle general thread changes
      if (data.threadId && data.changes) {
        this.processThreadUpdate({
          threadId: data.threadId,
          updateType: data.updateType || 'status_changed',
          updatedBy: data.updatedBy,
          timestamp: new Date(data.timestamp || Date.now()),
          changes: data.changes,
          version: data.version || this.getThreadVersion(data.threadId) + 1
        });
      }
    } catch (error) {
      console.error('Error processing real-time update for conflict detection:', error);
      errorHandlingService.reportError(error as Error, {
        component: 'ConflictDetectionService',
        props: { updateData: data }
      });
    }
  };

  /**
   * Process a thread update and check for conflicts
   */
  private processThreadUpdate(update: ThreadUpdate): void {
    const { threadId, timestamp, version } = update;
    
    // Update our tracking
    const previousVersion = this.activeThreads.get(threadId) || 0;
    this.activeThreads.set(threadId, version);
    this.lastUpdateTimestamps.set(threadId, timestamp);

    // Check if this thread is currently being composed
    const isComposing = this.composingThreads.has(threadId);
    
    // Detect conflicts
    if (isComposing && version > previousVersion + 1) {
      // Version jump indicates concurrent modifications
      const conflict: ThreadConflict = {
        threadId,
        conflictType: 'concurrent_edit',
        conflictingUser: update.updatedBy,
        timestamp,
        description: `Thread was modified by ${update.updatedBy?.name || 'another user'} while you were composing a reply`,
        severity: 'medium',
        suggestedAction: 'Review changes before sending your reply'
      };
      
      this.notifyConflict(conflict);
    }

    // Check for specific conflict types
    if (isComposing) {
      switch (update.updateType) {
        case 'reply_added':
          this.handleNewReplyConflict(update);
          break;
        case 'status_changed':
          this.handleStatusChangeConflict(update);
          break;
        case 'moved':
          this.handleThreadMovedConflict(update);
          break;
        case 'deleted':
          this.handleThreadDeletedConflict(update);
          break;
      }
    }

    // Notify update callbacks
    this.updateCallbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  /**
   * Handle conflict when a new reply is added while composing
   */
  private handleNewReplyConflict(update: ThreadUpdate): void {
    const conflict: ThreadConflict = {
      threadId: update.threadId,
      conflictType: 'new_reply',
      conflictingUser: update.updatedBy,
      timestamp: update.timestamp,
      description: `${update.updatedBy?.name || 'Someone'} added a new reply to this thread`,
      severity: 'low',
      suggestedAction: 'Review the new reply before sending yours'
    };

    this.notifyConflict(conflict);
    
    // Create a non-disruptive notification
    const notification: ConflictNotification = {
      id: `new-reply-${update.threadId}-${Date.now()}`,
      threadId: update.threadId,
      type: 'update',
      title: 'New Reply Added',
      message: `${update.updatedBy?.name || 'Someone'} replied to this thread`,
      severity: 'info',
      timestamp: update.timestamp,
      actions: [
        {
          id: 'refresh',
          label: 'Refresh Thread',
          type: 'refresh',
          primary: true
        }
      ],
      autoHideAfter: 10000 // 10 seconds
    };

    this.notifyNotification(notification);
  }

  /**
   * Handle conflict when thread status changes while composing
   */
  private handleStatusChangeConflict(update: ThreadUpdate): void {
    const newStatus = update.changes.status;
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let suggestedAction = 'Review the status change';

    // Determine severity based on status change
    if (newStatus === 'closed' || newStatus === 'resolved') {
      severity = 'high';
      suggestedAction = 'Consider if your reply is still needed';
    } else if (newStatus === 'archived') {
      severity = 'high';
      suggestedAction = 'Thread has been archived - your reply may not be delivered';
    }

    const conflict: ThreadConflict = {
      threadId: update.threadId,
      conflictType: 'status_change',
      conflictingUser: update.updatedBy,
      timestamp: update.timestamp,
      description: `Thread status changed to "${newStatus}" by ${update.updatedBy?.name || 'another user'}`,
      severity,
      suggestedAction
    };

    this.notifyConflict(conflict);

    // Create notification
    const notification: ConflictNotification = {
      id: `status-change-${update.threadId}-${Date.now()}`,
      threadId: update.threadId,
      type: 'update',
      title: 'Thread Status Changed',
      message: `Status changed to "${newStatus}"`,
      severity: severity === 'high' ? 'warning' : 'info',
      timestamp: update.timestamp,
      actions: [
        {
          id: 'refresh',
          label: 'Refresh',
          type: 'refresh'
        },
        {
          id: 'continue',
          label: 'Continue Composing',
          type: 'merge',
          primary: true
        }
      ]
    };

    this.notifyNotification(notification);
  }

  /**
   * Handle conflict when thread is moved while composing
   */
  private handleThreadMovedConflict(update: ThreadUpdate): void {
    const conflict: ThreadConflict = {
      threadId: update.threadId,
      conflictType: 'thread_moved',
      conflictingUser: update.updatedBy,
      timestamp: update.timestamp,
      description: `Thread was moved by ${update.updatedBy?.name || 'another user'}`,
      severity: 'medium',
      suggestedAction: 'Your reply will be sent to the new location'
    };

    this.notifyConflict(conflict);
  }

  /**
   * Handle conflict when thread is deleted while composing
   */
  private handleThreadDeletedConflict(update: ThreadUpdate): void {
    const conflict: ThreadConflict = {
      threadId: update.threadId,
      conflictType: 'concurrent_edit',
      conflictingUser: update.updatedBy,
      timestamp: update.timestamp,
      description: `Thread was deleted by ${update.updatedBy?.name || 'another user'}`,
      severity: 'high',
      suggestedAction: 'Save your reply as a draft or discard it'
    };

    this.notifyConflict(conflict);

    // Create urgent notification
    const notification: ConflictNotification = {
      id: `deleted-${update.threadId}-${Date.now()}`,
      threadId: update.threadId,
      type: 'conflict',
      title: 'Thread Deleted',
      message: 'This thread has been deleted while you were composing',
      severity: 'error',
      timestamp: update.timestamp,
      actions: [
        {
          id: 'save_draft',
          label: 'Save as Draft',
          type: 'save_as_draft',
          primary: true
        },
        {
          id: 'discard',
          label: 'Discard',
          type: 'discard'
        }
      ]
    };

    this.notifyNotification(notification);
  }

  /**
   * Process a detected conflict
   */
  private processConflict(conflictData: any): void {
    const conflict: ThreadConflict = {
      threadId: conflictData.threadId,
      conflictType: conflictData.type || 'concurrent_edit',
      conflictingUser: conflictData.user,
      timestamp: new Date(conflictData.timestamp),
      description: conflictData.description,
      severity: conflictData.severity || 'medium',
      suggestedAction: conflictData.suggestedAction
    };

    this.notifyConflict(conflict);
  }

  /**
   * Notify conflict callbacks
   */
  private notifyConflict(conflict: ThreadConflict): void {
    console.log('Conflict detected:', conflict);
    
    this.conflictCallbacks.forEach(callback => {
      try {
        callback(conflict);
      } catch (error) {
        console.error('Error in conflict callback:', error);
      }
    });
  }

  /**
   * Notify notification callbacks
   */
  private notifyNotification(notification: ConflictNotification): void {
    console.log('Conflict notification:', notification);
    
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Get the current version of a thread
   */
  private getThreadVersion(threadId: string): number {
    return this.activeThreads.get(threadId) || 0;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Register that a user is composing a reply for a thread
   */
  startComposing(threadId: string, currentVersion?: number): void {
    this.composingThreads.add(threadId);
    
    if (currentVersion !== undefined) {
      this.activeThreads.set(threadId, currentVersion);
    }

    // Notify server that we're composing
    realTimeDataService.sendMessage('thread.composing.start', {
      threadId,
      timestamp: new Date().toISOString()
    });

    console.log(`Started composing for thread ${threadId}`);
  }

  /**
   * Register that a user stopped composing a reply for a thread
   */
  stopComposing(threadId: string): void {
    this.composingThreads.delete(threadId);

    // Notify server that we stopped composing
    realTimeDataService.sendMessage('thread.composing.stop', {
      threadId,
      timestamp: new Date().toISOString()
    });

    console.log(`Stopped composing for thread ${threadId}`);
  }

  /**
   * Check if there are any conflicts for a specific thread
   */
  hasConflicts(threadId: string): boolean {
    const lastUpdate = this.lastUpdateTimestamps.get(threadId);
    const isComposing = this.composingThreads.has(threadId);
    
    // Simple heuristic: if thread was updated recently while we're composing
    if (isComposing && lastUpdate) {
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      return timeSinceUpdate < 60000; // 1 minute
    }
    
    return false;
  }

  /**
   * Get the latest version of a thread
   */
  getLatestVersion(threadId: string): number {
    return this.getThreadVersion(threadId);
  }

  /**
   * Request fresh thread data to resolve conflicts
   */
  refreshThread(threadId: string): void {
    realTimeDataService.sendMessage('thread.refresh', {
      threadId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to conflict notifications
   */
  onConflict(callback: ConflictCallback): () => void {
    this.conflictCallbacks.add(callback);
    
    return () => {
      this.conflictCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to thread updates
   */
  onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to conflict notifications
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);
    
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * Cleanup and disconnect
   */
  cleanup(): void {
    this.conflictCallbacks.clear();
    this.updateCallbacks.clear();
    this.notificationCallbacks.clear();
    this.composingThreads.clear();
    this.activeThreads.clear();
    this.lastUpdateTimestamps.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const conflictDetectionService = new ConflictDetectionService();