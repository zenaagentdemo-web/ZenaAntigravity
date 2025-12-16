/**
 * Reply Sending Service
 * 
 * Handles sending replies with comprehensive error handling, offline queuing,
 * retry logic, and conflict detection for concurrent edits.
 * 
 * Requirements: 3.6, 5.6, 8.2, 8.5
 */

import { api } from '../utils/apiClient';
import { queueAction, getQueuedActions, removeQueuedAction } from '../utils/offlineStorage';
import { ReplyData, SendingState, Thread } from '../models/newPage.types';

// ============================================================================
// Error Types
// ============================================================================

export class ReplyError extends Error {
  constructor(
    message: string,
    public type: 'network' | 'validation' | 'server' | 'conflict',
    public retryable: boolean = false,
    public retryDelay?: number
  ) {
    super(message);
    this.name = 'ReplyError';
  }
}

export class ConflictError extends ReplyError {
  constructor(message: string, public conflictData?: any) {
    super(message, 'conflict', false);
    this.name = 'ConflictError';
  }
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface SendReplyOptions {
  /** Whether to queue the reply if offline */
  queueIfOffline?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Custom retry delay in milliseconds */
  retryDelay?: number;
  /** Whether to check for conflicts before sending */
  checkConflicts?: boolean;
}

export interface SendReplyResult {
  /** Whether the reply was sent successfully */
  success: boolean;
  /** The sent reply data if successful */
  replyData?: ReplyData;
  /** Error information if failed */
  error?: ReplyError;
  /** Whether the reply was queued for later sending */
  queued?: boolean;
  /** Timestamp of the operation */
  timestamp: number;
}

export interface QueuedReply {
  id: string;
  replyData: ReplyData;
  options: SendReplyOptions;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// ============================================================================
// Reply Sending Service Class
// ============================================================================

export class ReplySendingService {
  private readonly DEFAULT_OPTIONS: SendReplyOptions = {
    queueIfOffline: true,
    maxRetries: 3,
    retryDelay: 1000,
    checkConflicts: true
  };

  private sendingStates = new Map<string, SendingState>();
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Send a reply with comprehensive error handling and offline support
   */
  async sendReply(
    replyData: ReplyData, 
    options: SendReplyOptions = {}
  ): Promise<SendReplyResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const timestamp = Date.now();

    // Set sending state
    this.setSendingState(replyData.threadId, 'sending');

    try {
      // Validate reply data
      this.validateReplyData(replyData);

      // Check for conflicts if enabled
      if (opts.checkConflicts) {
        await this.checkForConflicts(replyData.threadId);
      }

      // Check if offline
      if (!navigator.onLine && opts.queueIfOffline) {
        await this.queueReply(replyData, opts);
        this.setSendingState(replyData.threadId, 'idle');
        
        return {
          success: false,
          queued: true,
          timestamp
        };
      }

      // Attempt to send the reply
      const result = await this.performSend(replyData);
      
      this.setSendingState(replyData.threadId, 'success');
      
      return {
        success: true,
        replyData: result,
        timestamp
      };

    } catch (error) {
      this.setSendingState(replyData.threadId, 'error');
      
      const replyError = this.handleSendError(error, 0);
      
      // If retryable and we have retries left, schedule retry
      if (replyError.retryable && opts.maxRetries && opts.maxRetries > 0) {
        this.scheduleRetry(replyData, { ...opts, maxRetries: opts.maxRetries - 1 }, replyError.retryDelay);
      }

      return {
        success: false,
        error: replyError,
        timestamp
      };
    }
  }

  /**
   * Get the current sending state for a thread
   */
  getSendingState(threadId: string): SendingState {
    return this.sendingStates.get(threadId) || 'idle';
  }

  /**
   * Process queued replies when coming back online
   */
  async processQueuedReplies(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    const queuedActions = await getQueuedActions();
    const replyActions = queuedActions.filter(action => 
      action.action.startsWith('SEND_REPLY') && action.method === 'POST'
    );

    for (const action of replyActions) {
      try {
        const replyData = action.data as ReplyData;
        const result = await this.performSend(replyData);
        
        if (result) {
          await removeQueuedAction(action.id);
          console.log(`[ReplySending] Successfully sent queued reply for thread ${replyData.threadId}`);
        }
      } catch (error) {
        console.error(`[ReplySending] Failed to send queued reply:`, error);
        
        // Increment retry count and check if we should give up
        action.retryCount += 1;
        if (action.retryCount >= 3) {
          await removeQueuedAction(action.id);
          console.log(`[ReplySending] Giving up on queued reply after ${action.retryCount} attempts`);
        }
      }
    }
  }

  /**
   * Get all queued replies for display/management
   */
  async getQueuedReplies(): Promise<QueuedReply[]> {
    const queuedActions = await getQueuedActions();
    
    return queuedActions
      .filter(action => action.action.startsWith('SEND_REPLY'))
      .map(action => ({
        id: action.id,
        replyData: action.data as ReplyData,
        options: {}, // Options not stored in queue
        timestamp: action.timestamp,
        retryCount: action.retryCount,
        lastError: undefined // Could be enhanced to store last error
      }));
  }

  /**
   * Cancel a queued reply
   */
  async cancelQueuedReply(queueId: string): Promise<void> {
    await removeQueuedAction(queueId);
  }

  /**
   * Retry a failed reply immediately
   */
  async retryReply(replyData: ReplyData, options: SendReplyOptions = {}): Promise<SendReplyResult> {
    // Clear any existing retry timeout
    const timeoutId = this.retryTimeouts.get(replyData.threadId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(replyData.threadId);
    }

    return this.sendReply(replyData, options);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Validate reply data before sending
   */
  private validateReplyData(replyData: ReplyData): void {
    if (!replyData.threadId) {
      throw new ReplyError('Thread ID is required', 'validation');
    }

    if (!replyData.recipients || replyData.recipients.length === 0) {
      throw new ReplyError('At least one recipient is required', 'validation');
    }

    if (!replyData.message || replyData.message.trim().length === 0) {
      throw new ReplyError('Message content is required', 'validation');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = replyData.recipients.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      throw new ReplyError(
        `Invalid email addresses: ${invalidEmails.join(', ')}`, 
        'validation'
      );
    }
  }

  /**
   * Check for conflicts with concurrent modifications
   */
  private async checkForConflicts(threadId: string): Promise<void> {
    try {
      // Get the latest thread data to check for modifications
      const response = await api.get<Thread>(`/api/threads/${threadId}`);
      const latestThread = response.data;

      // In a real implementation, this would compare timestamps or version numbers
      // For now, we'll simulate conflict detection based on recent modifications
      const now = Date.now();
      const lastModified = new Date(latestThread.lastMessageAt).getTime();
      const timeDiff = now - lastModified;

      // If thread was modified in the last 30 seconds by someone else, consider it a conflict
      if (timeDiff < 30000) {
        throw new ConflictError(
          'This thread has been updated by another user. Please refresh and try again.',
          { latestThread }
        );
      }
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      
      // If we can't check for conflicts (network error), proceed anyway
      console.warn('[ReplySending] Could not check for conflicts:', error);
    }
  }

  /**
   * Perform the actual reply sending via API
   */
  private async performSend(replyData: ReplyData): Promise<ReplyData> {
    const response = await api.post<{ success: boolean; replyId: string }>(
      `/api/threads/${replyData.threadId}/reply`,
      {
        recipients: replyData.recipients,
        subject: replyData.subject,
        message: replyData.message,
        templateId: replyData.templateId
      }
    );

    if (!response.data.success) {
      throw new ReplyError('Server rejected the reply', 'server', true);
    }

    return replyData;
  }

  /**
   * Queue a reply for later sending when offline
   */
  private async queueReply(replyData: ReplyData, options: SendReplyOptions): Promise<void> {
    await queueAction(
      `SEND_REPLY_${replyData.threadId}`,
      `/api/threads/${replyData.threadId}/reply`,
      'POST',
      replyData
    );

    console.log(`[ReplySending] Queued reply for thread ${replyData.threadId}`);
  }

  /**
   * Handle errors from reply sending attempts
   */
  private handleSendError(error: unknown, attemptNumber: number): ReplyError {
    if (error instanceof ReplyError) {
      return error;
    }

    if (error instanceof Error) {
      // Network errors - be more inclusive in detection
      if (error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('Network error') ||
          error.name === 'NetworkError' ||
          error.message.includes('Failed to fetch')) {
        return new ReplyError(
          'Network error. Reply will be sent when connection is restored.',
          'network',
          true,
          this.calculateRetryDelay(attemptNumber)
        );
      }

      // Server errors (5xx)
      if (error.message.includes('HTTP 5')) {
        return new ReplyError(
          'Server error. Please try again.',
          'server',
          true,
          this.calculateRetryDelay(attemptNumber)
        );
      }

      // Client errors (4xx)
      if (error.message.includes('HTTP 4')) {
        return new ReplyError(
          'Request error. Please check your input and try again.',
          'validation',
          false
        );
      }

      // If it's a generic Error with "Network error" message, treat as network
      if (error.message === 'Network error') {
        return new ReplyError(
          'Network error. Reply will be sent when connection is restored.',
          'network',
          true,
          this.calculateRetryDelay(attemptNumber)
        );
      }
    }

    // Unknown error - default to server error
    return new ReplyError(
      'An unexpected error occurred. Please try again.',
      'server',
      true,
      this.calculateRetryDelay(attemptNumber)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return delay + jitter;
  }

  /**
   * Schedule a retry attempt
   */
  private scheduleRetry(
    replyData: ReplyData, 
    options: SendReplyOptions, 
    delay?: number
  ): void {
    const retryDelay = delay || this.calculateRetryDelay(0);
    
    const timeoutId = setTimeout(() => {
      this.retryTimeouts.delete(replyData.threadId);
      this.sendReply(replyData, options);
    }, retryDelay);

    this.retryTimeouts.set(replyData.threadId, timeoutId);
  }

  /**
   * Set the sending state for a thread
   */
  private setSendingState(threadId: string, state: SendingState): void {
    this.sendingStates.set(threadId, state);
    
    // Clean up success/error states after a delay
    if (state === 'success' || state === 'error') {
      setTimeout(() => {
        if (this.sendingStates.get(threadId) === state) {
          this.sendingStates.set(threadId, 'idle');
        }
      }, 3000);
    }
  }
}

// ============================================================================
// Service Instance Export
// ============================================================================

export const replySendingService = new ReplySendingService();

// ============================================================================
// Auto-process queued replies when coming online
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[ReplySending] Connection restored, processing queued replies...');
    replySendingService.processQueuedReplies();
  });
}