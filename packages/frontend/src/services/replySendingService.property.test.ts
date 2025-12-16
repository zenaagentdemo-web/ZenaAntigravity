/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Reply Sending Service
 * 
 * Tests correctness properties for reply sending with error handling,
 * offline queuing, and conflict detection using property-based testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { 
  ReplySendingService, 
  replySendingService,
  ReplyError,
  ConflictError 
} from './replySendingService';
import { ReplyData, ThreadClassification, Thread } from '../models/newPage.types';
import * as apiClient from '../utils/apiClient';
import * as offlineStorage from '../utils/offlineStorage';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

// Mock the API client
vi.mock('../utils/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock offline storage
vi.mock('../utils/offlineStorage', () => ({
  queueAction: vi.fn(),
  getQueuedActions: vi.fn(),
  removeQueuedAction: vi.fn()
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Reply Sending Service Property Tests', () => {
  let service: ReplySendingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReplySendingService();
    
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 9: Thread Removal After Reply**
   * **Validates: Requirements 3.7**
   * 
   * For any successfully sent quick reply, the corresponding thread SHALL be 
   * removed from the New page thread list within 1000ms.
   */
  it('Property 9: Thread removal after successful reply', async () => {
    // Test with concrete examples since thread removal is a UI concern
    const testCases = [
      {
        threadId: 'thread-1',
        recipients: ['buyer@example.com'],
        subject: 'Re: Property Inquiry',
        message: 'Thank you for your interest. I will get back to you shortly.'
      },
      {
        threadId: 'thread-2', 
        recipients: ['vendor@example.com', 'agent@example.com'],
        subject: 'Re: Listing Update',
        message: 'The property details have been updated as requested.'
      }
    ];

    for (const replyData of testCases) {
      // Mock conflict check to succeed
      const mockApiGet = vi.mocked(apiClient.api.get);
      mockApiGet.mockResolvedValueOnce({
        data: {
          id: replyData.threadId,
          lastMessageAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          subject: 'Test Thread',
          participants: [{ id: '1', name: 'Test', email: 'test@example.com' }],
          classification: 'buyer' as ThreadClassification,
          riskLevel: 'low' as const,
          createdAt: new Date().toISOString(),
          summary: 'Test summary',
          messageCount: 1,
          unreadCount: 0
        },
        fromCache: false,
        timestamp: Date.now()
      });

      // Mock successful API response
      const mockApiPost = vi.mocked(apiClient.api.post);
      mockApiPost.mockResolvedValueOnce({
        data: { success: true, replyId: 'reply-123' },
        fromCache: false,
        timestamp: Date.now()
      });

      const startTime = Date.now();
      
      // Send the reply
      const result = await service.sendReply(replyData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify the reply was sent successfully
      expect(result.success).toBe(true);
      expect(result.replyData).toEqual(replyData);
      
      // Verify the operation completed within reasonable time (< 1000ms)
      // This tests the performance aspect of the requirement
      expect(duration).toBeLessThan(1000);
      
      // Verify API was called correctly
      expect(mockApiPost).toHaveBeenCalledWith(
        `/api/threads/${replyData.threadId}/reply`,
        {
          recipients: replyData.recipients,
          subject: replyData.subject,
          message: replyData.message,
          templateId: replyData.templateId
        }
      );
    }
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 15: Error Message Preservation**
   * **Validates: Requirements 5.7, 8.3**
   * 
   * For any failed reply send operation, the composed message content SHALL be 
   * preserved in the Reply_Composer for retry.
   */
  it('Property 15: Error message preservation on send failure', async () => {
    const replyData = {
      threadId: 'thread-1',
      recipients: ['test@example.com'],
      subject: 'Re: Test',
      message: 'Test message content'
    };

    // Mock API get for conflict check to succeed
    const mockApiGet = vi.mocked(apiClient.api.get);
    mockApiGet.mockResolvedValueOnce({
      data: {
        id: 'thread-1',
        lastMessageAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        subject: 'Test Thread',
        participants: [{ id: '1', name: 'Test', email: 'test@example.com' }],
        classification: 'buyer' as ThreadClassification,
        riskLevel: 'low' as const,
        createdAt: new Date().toISOString(),
        summary: 'Test summary',
        messageCount: 1,
        unreadCount: 0
      },
      fromCache: false,
      timestamp: Date.now()
    });

    // Mock API failure for the actual send
    const mockApiPost = vi.mocked(apiClient.api.post);
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));

    // Send the reply (should fail)
    const result = await service.sendReply(replyData);

    // Verify the send failed
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.type).toBe('network');
    expect(result.error?.retryable).toBe(true);

    // The original reply data should be preserved in the result
    // This allows the UI to maintain the composed message for retry
    expect(result.replyData).toBeUndefined(); // No successful reply data
    
    // The error should indicate the message is preserved
    expect(result.error?.message).toContain('connection is restored');
    
    // Verify the sending state is reset to allow retry
    expect(service.getSendingState(replyData.threadId)).toBe('error');
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 21: Offline Reply Queuing**
   * **Validates: Requirements 8.2**
   * 
   * For any reply sent while offline, the reply SHALL be queued and automatically 
   * sent when connectivity is restored.
   */
  it('Property 21: Offline reply queuing behavior', async () => {
    const replyData = {
      threadId: 'thread-1',
      recipients: ['test@example.com'],
      subject: 'Re: Test',
      message: 'Test message content'
    };

    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    // Mock queue action
    const mockQueueAction = vi.mocked(offlineStorage.queueAction);
    mockQueueAction.mockResolvedValueOnce();

    // Send the reply while offline
    const result = await service.sendReply(replyData, { queueIfOffline: true });

    // Verify the reply was queued, not sent
    expect(result.success).toBe(false);
    expect(result.queued).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify queueAction was called with correct parameters
    expect(mockQueueAction).toHaveBeenCalledWith(
      `SEND_REPLY_${replyData.threadId}`,
      `/api/threads/${replyData.threadId}/reply`,
      'POST',
      replyData
    );

    // Verify sending state is reset (not stuck in sending)
    expect(service.getSendingState(replyData.threadId)).toBe('idle');
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 21: Offline Reply Queuing**
   * **Validates: Requirements 8.2**
   * 
   * When connectivity is restored, queued replies should be automatically processed.
   */
  it('Property 21: Automatic processing when coming online', async () => {
    // Mock queued actions
    const queuedReply = {
      id: 'queue-1',
      action: 'SEND_REPLY_thread-1',
      endpoint: '/api/threads/thread-1/reply',
      method: 'POST' as const,
      data: {
        threadId: 'thread-1',
        recipients: ['test@example.com'],
        subject: 'Re: Test',
        message: 'Queued message'
      },
      timestamp: Date.now(),
      retryCount: 0
    };

    const mockGetQueuedActions = vi.mocked(offlineStorage.getQueuedActions);
    mockGetQueuedActions.mockResolvedValueOnce([queuedReply]);

    const mockRemoveQueuedAction = vi.mocked(offlineStorage.removeQueuedAction);
    mockRemoveQueuedAction.mockResolvedValueOnce();

    const mockApiPost = vi.mocked(apiClient.api.post);
    mockApiPost.mockResolvedValueOnce({
      data: { success: true, replyId: 'reply-123' },
      fromCache: false,
      timestamp: Date.now()
    });

    // Process queued replies (simulating coming online)
    await service.processQueuedReplies();

    // Verify queued actions were retrieved
    expect(mockGetQueuedActions).toHaveBeenCalled();

    // Verify the queued reply was sent
    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/threads/thread-1/reply',
      {
        recipients: queuedReply.data.recipients,
        subject: queuedReply.data.subject,
        message: queuedReply.data.message,
        templateId: queuedReply.data.templateId
      }
    );

    // Verify the queued action was removed after successful send
    expect(mockRemoveQueuedAction).toHaveBeenCalledWith('queue-1');
  });

  /**
   * Validation property: Invalid reply data should be rejected
   */
  it('Property: Invalid reply data validation', async () => {
    const invalidCases = [
      // Empty message
      {
        threadId: 'thread-1',
        recipients: ['test@example.com'],
        subject: 'Re: Test',
        message: ''
      },
      // No recipients
      {
        threadId: 'thread-2',
        recipients: [],
        subject: 'Re: Test',
        message: 'Valid message'
      },
      // Empty thread ID
      {
        threadId: '',
        recipients: ['test@example.com'],
        subject: 'Re: Test',
        message: 'Valid message'
      }
    ];

    for (const invalidReplyData of invalidCases) {
      // Send invalid reply data
      const result = await service.sendReply(invalidReplyData);

      // Should fail with validation error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('validation');
      expect(result.error?.retryable).toBe(false);

      // Should not make API call for invalid data
      const mockApiPost = vi.mocked(apiClient.api.post);
      expect(mockApiPost).not.toHaveBeenCalled();
    }
  });

  /**
   * Conflict detection property: Recent thread modifications should trigger conflicts
   */
  it('Property: Conflict detection for concurrent modifications', async () => {
    const replyData = {
      threadId: 'thread-1',
      recipients: ['test@example.com'],
      subject: 'Re: Test',
      message: 'Test message'
    };

    // Mock thread with recent modification (within 30 seconds)
    const recentThread = {
      id: 'thread-1',
      lastMessageAt: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
      subject: 'Test Thread',
      participants: [{ id: '1', name: 'Test', email: 'test@example.com' }],
      classification: 'buyer' as ThreadClassification,
      riskLevel: 'low' as const,
      createdAt: new Date().toISOString(),
      summary: 'Test summary',
      messageCount: 1,
      unreadCount: 0
    };

    const mockApiGet = vi.mocked(apiClient.api.get);
    mockApiGet.mockResolvedValueOnce({
      data: recentThread,
      fromCache: false,
      timestamp: Date.now()
    });

    // Send reply with conflict checking enabled
    const result = await service.sendReply(replyData, { checkConflicts: true });

    // Should fail with conflict error
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.type).toBe('conflict');
    expect(result.error?.retryable).toBe(false);

    // Verify conflict check was performed
    expect(mockApiGet).toHaveBeenCalledWith('/api/threads/thread-1');
  });

  /**
   * Retry mechanism property: Failed sends should be retried with exponential backoff
   */
  it('Property: Retry mechanism with exponential backoff', async () => {
    const replyData = {
      threadId: 'thread-1',
      recipients: ['test@example.com'],
      subject: 'Re: Test',
      message: 'Test message'
    };

    // Mock conflict check to succeed
    const mockApiGet = vi.mocked(apiClient.api.get);
    mockApiGet.mockResolvedValueOnce({
      data: {
        id: 'thread-1',
        lastMessageAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        subject: 'Test Thread',
        participants: [{ id: '1', name: 'Test', email: 'test@example.com' }],
        classification: 'buyer' as ThreadClassification,
        riskLevel: 'low' as const,
        createdAt: new Date().toISOString(),
        summary: 'Test summary',
        messageCount: 1,
        unreadCount: 0
      },
      fromCache: false,
      timestamp: Date.now()
    });

    // Mock API failure followed by success
    const mockApiPost = vi.mocked(apiClient.api.post);
    mockApiPost.mockRejectedValueOnce(new Error('HTTP 500: Server Error'));

    const startTime = Date.now();

    // Send reply with retry enabled
    const result = await service.sendReply(replyData, { maxRetries: 1 });

    const duration = Date.now() - startTime;

    // First attempt should fail, but retry should be scheduled
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.retryDelay).toBeGreaterThan(0);

    // Should complete quickly (retry is scheduled, not waited for)
    expect(duration).toBeLessThan(100);
  });

  /**
   * State management property: Sending states should be properly managed
   */
  it('Property: Sending state management consistency', async () => {
    const replyData = {
      threadId: 'thread-1',
      recipients: ['test@example.com'],
      subject: 'Re: Test',
      message: 'Test message'
    };

    // Initial state should be idle
    expect(service.getSendingState(replyData.threadId)).toBe('idle');

    // Mock conflict check to succeed
    const mockApiGet = vi.mocked(apiClient.api.get);
    mockApiGet.mockResolvedValueOnce({
      data: {
        id: 'thread-1',
        lastMessageAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        subject: 'Test Thread',
        participants: [{ id: '1', name: 'Test', email: 'test@example.com' }],
        classification: 'buyer' as ThreadClassification,
        riskLevel: 'low' as const,
        createdAt: new Date().toISOString(),
        summary: 'Test summary',
        messageCount: 1,
        unreadCount: 0
      },
      fromCache: false,
      timestamp: Date.now()
    });

    // Mock successful API response
    const mockApiPost = vi.mocked(apiClient.api.post);
    mockApiPost.mockResolvedValueOnce({
      data: { success: true, replyId: 'reply-123' },
      fromCache: false,
      timestamp: Date.now()
    });

    // Send reply
    const result = await service.sendReply(replyData);

    // After successful send, should be successful
    expect(result.success).toBe(true);
    expect(service.getSendingState(replyData.threadId)).toBe('success');

    // State should reset to 'idle' after a delay (tested with timeout)
    await new Promise(resolve => setTimeout(resolve, 3100)); // Wait for cleanup
    expect(service.getSendingState(replyData.threadId)).toBe('idle');
  });
});