/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for useThreadsState hook
 * 
 * Feature: enhanced-new-page, Property 22: Thread Update Reflection
 * Validates: Requirements 8.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useThreadsState } from './useThreadsState';
import { Thread, ThreadClassification, RiskLevel } from '../models/newPage.types';

// Mock the API client
vi.mock('../utils/apiClient', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [], fromCache: false, timestamp: Date.now() })
  }
}));

// Arbitraries for generating test data
const riskLevelArb = fc.constantFrom<RiskLevel>('none', 'low', 'medium', 'high');
const classificationArb = fc.constantFrom<ThreadClassification>('buyer', 'vendor', 'market', 'lawyer_broker', 'noise');

const participantArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  role: fc.oneof(
    fc.constant(undefined),
    fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker', 'other') as fc.Arbitrary<'buyer' | 'vendor' | 'agent' | 'lawyer' | 'broker' | 'other'>
  )
});

const threadArbitrary: fc.Arbitrary<Thread> = fc.record({
  id: fc.uuid(),
  subject: fc.string({ minLength: 1, maxLength: 200 }),
  participants: fc.array(participantArb, { minLength: 1, maxLength: 5 }),
  classification: classificationArb,
  riskLevel: riskLevelArb,
  riskReason: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 100 })),
  lastMessageAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
  draftResponse: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 500 })),
  summary: fc.string({ minLength: 10, maxLength: 300 }),
  aiSummary: fc.oneof(fc.constant(undefined), fc.string({ minLength: 10, maxLength: 300 })),
  propertyId: fc.oneof(fc.constant(undefined), fc.uuid()),
  propertyAddress: fc.oneof(fc.constant(undefined), fc.string({ minLength: 5, maxLength: 100 })),
  dealId: fc.oneof(fc.constant(undefined), fc.uuid()),
  dealStage: fc.oneof(
    fc.constant(undefined),
    fc.constantFrom('inquiry', 'viewing', 'offer', 'negotiation', 'conditional', 'unconditional', 'settled') as fc.Arbitrary<'inquiry' | 'viewing' | 'offer' | 'negotiation' | 'conditional' | 'unconditional' | 'settled'>
  ),
  messageCount: fc.integer({ min: 1, max: 100 }),
  unreadCount: fc.integer({ min: 0, max: 50 }),
  lastMessages: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.record({
      id: fc.uuid(),
      senderId: fc.uuid(),
      senderName: fc.string({ minLength: 1, maxLength: 50 }),
      content: fc.string({ minLength: 1, maxLength: 200 }),
      timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
      isFromUser: fc.boolean()
    }), { minLength: 0, maxLength: 3 })
  ),
  suggestedReplies: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 0, maxLength: 3 })
  ),
  priorityScore: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 100 })),
  snoozedUntil: fc.oneof(fc.constant(undefined), fc.date({ min: new Date(), max: new Date('2025-12-31') }).map(d => d.toISOString()))
});

describe('useThreadsState Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 22: Thread Update Reflection', () => {
    /**
     * Feature: enhanced-new-page, Property 22: Thread Update Reflection
     * Validates: Requirements 8.3
     * 
     * For any thread that receives an external update, the corresponding 
     * Thread_Card content SHALL reflect the updated values within 100ms of state update.
     */
    it('should reflect thread updates immediately in state', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 200 }), // new subject
          (threads, newSubject) => {
            const { result } = renderHook(() => useThreadsState());

            // Set initial threads
            act(() => {
              result.current.setThreads(threads);
            });

            // Pick a random thread to update
            const threadToUpdate = threads[Math.floor(Math.random() * threads.length)];
            
            // Update the thread
            act(() => {
              result.current.updateThread(threadToUpdate.id, { subject: newSubject });
            });

            // Property: The updated thread should reflect the new subject immediately
            const updatedThread = result.current.threads.find(t => t.id === threadToUpdate.id);
            expect(updatedThread).toBeDefined();
            expect(updatedThread?.subject).toBe(newSubject);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other thread properties when updating a single field', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (threads, newSubject) => {
            const { result } = renderHook(() => useThreadsState());

            // Set initial threads
            act(() => {
              result.current.setThreads(threads);
            });

            const threadToUpdate = threads[0];
            const originalThread = { ...threadToUpdate };

            // Update only the subject
            act(() => {
              result.current.updateThread(threadToUpdate.id, { subject: newSubject });
            });

            const updatedThread = result.current.threads.find(t => t.id === threadToUpdate.id);

            // Property: All other properties should remain unchanged
            expect(updatedThread?.id).toBe(originalThread.id);
            expect(updatedThread?.classification).toBe(originalThread.classification);
            expect(updatedThread?.riskLevel).toBe(originalThread.riskLevel);
            expect(updatedThread?.participants).toEqual(originalThread.participants);
            expect(updatedThread?.summary).toBe(originalThread.summary);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should recalculate priority score when risk level changes', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 10 }),
          riskLevelArb,
          (threads, newRiskLevel) => {
            const { result } = renderHook(() => useThreadsState());

            // Set initial threads
            act(() => {
              result.current.setThreads(threads);
            });

            const threadToUpdate = threads[0];
            // Update risk level
            act(() => {
              result.current.updateThread(threadToUpdate.id, { riskLevel: newRiskLevel });
            });

            const updatedThread = result.current.threads.find(t => t.id === threadToUpdate.id);

            // Property: Priority score should be recalculated (may or may not change depending on the new risk level)
            expect(updatedThread?.priorityScore).toBeDefined();
            expect(typeof updatedThread?.priorityScore).toBe('number');
            
            // If risk level changed, score should be recalculated
            if (threadToUpdate.riskLevel !== newRiskLevel) {
              // Score should be a valid number between 0 and 100
              expect(updatedThread?.priorityScore).toBeGreaterThanOrEqual(0);
              expect(updatedThread?.priorityScore).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain thread count after updates', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          fc.record({
            subject: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
            riskLevel: fc.option(riskLevelArb),
            classification: fc.option(classificationArb)
          }),
          (threads, updates) => {
            const { result } = renderHook(() => useThreadsState());

            // Set initial threads
            act(() => {
              result.current.setThreads(threads);
            });

            const initialCount = result.current.threads.length;
            const threadToUpdate = threads[Math.floor(Math.random() * threads.length)];

            // Apply updates (filter out undefined values)
            const cleanUpdates: Partial<Thread> = {};
            if (updates.subject !== null) cleanUpdates.subject = updates.subject;
            if (updates.riskLevel !== null) cleanUpdates.riskLevel = updates.riskLevel;
            if (updates.classification !== null) cleanUpdates.classification = updates.classification;

            act(() => {
              result.current.updateThread(threadToUpdate.id, cleanUpdates);
            });

            // Property: Thread count should remain the same after update
            expect(result.current.threads.length).toBe(initialCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle updates to non-existent threads gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 10 }),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 200 }),
          (threads, nonExistentId, newSubject) => {
            const { result } = renderHook(() => useThreadsState());

            // Set initial threads
            act(() => {
              result.current.setThreads(threads);
            });

            const initialThreads = [...result.current.threads];

            // Try to update a non-existent thread
            act(() => {
              result.current.updateThread(nonExistentId, { subject: newSubject });
            });

            // Property: Threads should remain unchanged when updating non-existent thread
            expect(result.current.threads.length).toBe(initialThreads.length);
            result.current.threads.forEach((thread, index) => {
              expect(thread.id).toBe(initialThreads[index].id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
