/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for useFilterState hook
 * 
 * Feature: enhanced-new-page
 * Property 15: Filter Application Correctness
 * Property 16: Multi-Filter AND Logic
 * Property 17: Search Filter Correctness
 * Validates: Requirements 6.2, 6.3, 6.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { useFilterState } from './useFilterState';
import { Thread, ThreadClassification, RiskLevel, FilterType } from '../models/newPage.types';

// Arbitraries for generating test data
const riskLevelArb = fc.constantFrom<RiskLevel>('none', 'low', 'medium', 'high');
const classificationArb = fc.constantFrom<ThreadClassification>('buyer', 'vendor', 'market', 'lawyer_broker', 'noise');
const filterTypeArb = fc.constantFrom<FilterType>('all', 'buyer', 'vendor', 'market', 'lawyer_broker', 'high_risk');

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
  lastMessages: fc.constant(undefined),
  suggestedReplies: fc.constant(undefined),
  priorityScore: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 100 })),
  snoozedUntil: fc.constant(undefined)
});

describe('useFilterState Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Property 15: Filter Application Correctness', () => {
    /**
     * Feature: enhanced-new-page, Property 15: Filter Application Correctness
     * Validates: Requirements 6.2
     * 
     * For any set of active filters, the displayed threads SHALL only include 
     * threads whose classification matches at least one active filter 
     * (or all threads if 'all' filter is active).
     */
    it('should return all threads when "all" filter is active', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 0, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Default filter is 'all'
            expect(result.current.activeFilters).toContain('all');
            expect(result.current.filteredThreads.length).toBe(threads.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter threads by classification correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          fc.constantFrom<FilterType>('buyer', 'vendor', 'market', 'lawyer_broker'),
          (threads, filterType) => {
            const { result } = renderHook(() => useFilterState(threads));

            act(() => {
              result.current.setFilters([filterType]);
            });

            // All filtered threads should match the classification
            const expectedClassification = filterType as ThreadClassification;
            result.current.filteredThreads.forEach(thread => {
              expect(thread.classification).toBe(expectedClassification);
            });

            // Count should match threads with that classification
            const expectedCount = threads.filter(t => t.classification === expectedClassification).length;
            expect(result.current.filteredThreads.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter high_risk threads correctly', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            act(() => {
              result.current.setFilters(['high_risk']);
            });

            // All filtered threads should have high risk level
            result.current.filteredThreads.forEach(thread => {
              expect(thread.riskLevel).toBe('high');
            });

            // Count should match high risk threads
            const expectedCount = threads.filter(t => t.riskLevel === 'high').length;
            expect(result.current.filteredThreads.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Multi-Filter AND Logic', () => {
    /**
     * Feature: enhanced-new-page, Property 16: Multi-Filter AND Logic
     * Validates: Requirements 6.3
     * 
     * For any combination of active filters excluding 'all', the displayed 
     * threads SHALL match ALL active filter criteria simultaneously.
     */
    it('should apply AND logic when multiple filters are active', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 30 }),
          fc.constantFrom<FilterType>('buyer', 'vendor', 'market', 'lawyer_broker'),
          (threads, classificationFilter) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Apply both classification and high_risk filters
            act(() => {
              result.current.setFilters([classificationFilter, 'high_risk']);
            });

            // All filtered threads must match BOTH criteria
            result.current.filteredThreads.forEach(thread => {
              expect(thread.classification).toBe(classificationFilter);
              expect(thread.riskLevel).toBe('high');
            });

            // Count should match threads meeting both criteria
            const expectedCount = threads.filter(t =>
              t.classification === classificationFilter && t.riskLevel === 'high'
            ).length;
            expect(result.current.filteredThreads.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty when AND logic produces no matches', () => {
      // Create threads that won't match combined filters
      const threads: Thread[] = [
        {
          id: '1',
          subject: 'Test',
          participants: [{ id: 'p1', name: 'John', email: 'john@test.com' }],
          classification: 'buyer',
          riskLevel: 'low', // Not high risk
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Test summary here',
          messageCount: 1,
          unreadCount: 0
        },
        {
          id: '2',
          subject: 'Test 2',
          participants: [{ id: 'p2', name: 'Jane', email: 'jane@test.com' }],
          classification: 'vendor', // Not buyer
          riskLevel: 'high',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Test summary two',
          messageCount: 1,
          unreadCount: 0
        }
      ];

      const { result } = renderHook(() => useFilterState(threads));

      // Apply buyer + high_risk (no thread matches both)
      act(() => {
        result.current.setFilters(['buyer', 'high_risk']);
      });

      expect(result.current.filteredThreads.length).toBe(0);
    });
  });

  describe('Property 17: Search Filter Correctness', () => {
    /**
     * Feature: enhanced-new-page, Property 17: Search Filter Correctness
     * Validates: Requirements 6.5
     * 
     * For any non-empty search query, the displayed threads SHALL only include 
     * threads where the subject, any participant name, or summary contains 
     * the search query (case-insensitive).
     */
    it('should filter by subject match', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          (threads) => {
            // Skip if no threads
            if (threads.length === 0) return true;

            const { result } = renderHook(() => useFilterState(threads));

            // Use part of first thread's subject as search query
            const rawSearchTerm = threads[0].subject.substring(0, 3).toLowerCase();
            // Skip if search term is empty or only whitespace (implementation trims whitespace)
            const searchTerm = rawSearchTerm.trim();
            if (!searchTerm || searchTerm.length === 0) return true;

            act(() => {
              result.current.setSearchQuery(searchTerm);
            });

            // Advance timers to trigger debounce
            act(() => {
              vi.advanceTimersByTime(350);
            });

            // All filtered threads should contain the search term in subject, participant name, summary, or propertyAddress
            result.current.filteredThreads.forEach(thread => {
              const matchesSubject = thread.subject?.toLowerCase().includes(searchTerm);
              const matchesParticipant = thread.participants?.some(p =>
                p.name?.toLowerCase().includes(searchTerm) || p.email?.toLowerCase().includes(searchTerm)
              );
              const matchesSummary = thread.summary?.toLowerCase().includes(searchTerm);
              const matchesAiSummary = thread.aiSummary?.toLowerCase().includes(searchTerm) ?? false;
              const matchesPropertyAddress = thread.propertyAddress?.toLowerCase().includes(searchTerm) ?? false;

              expect(matchesSubject || matchesParticipant || matchesSummary || matchesAiSummary || matchesPropertyAddress).toBe(true);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by participant name match', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          (threads) => {
            // Skip if no threads or no participants
            if (threads.length === 0 || threads[0].participants.length === 0) return true;

            const { result } = renderHook(() => useFilterState(threads));

            // Use part of first participant's name as search query
            // Trim and ensure we have a meaningful search term (not just whitespace)
            const participantName = threads[0].participants[0].name.trim();
            if (participantName.length < 2) return true; // Skip if name is too short

            const rawSearchTerm = participantName.substring(0, 2).toLowerCase();
            // Skip if search term is empty or only whitespace (implementation trims whitespace)
            const searchTerm = rawSearchTerm.trim();
            if (!searchTerm || searchTerm.length === 0) return true; // Skip empty search terms

            act(() => {
              result.current.setSearchQuery(searchTerm);
            });

            // Advance timers to trigger debounce
            act(() => {
              vi.advanceTimersByTime(350);
            });

            // All filtered threads should contain the search term somewhere
            result.current.filteredThreads.forEach(thread => {
              const matchesSubject = thread.subject?.toLowerCase().includes(searchTerm);
              const matchesParticipant = thread.participants?.some(p =>
                p.name?.toLowerCase().includes(searchTerm) || p.email?.toLowerCase().includes(searchTerm)
              );
              const matchesSummary = thread.summary?.toLowerCase().includes(searchTerm);
              const matchesAiSummary = thread.aiSummary?.toLowerCase().includes(searchTerm) ?? false;
              const matchesPropertyAddress = thread.propertyAddress?.toLowerCase().includes(searchTerm) ?? false;

              expect(matchesSubject || matchesParticipant || matchesSummary || matchesAiSummary || matchesPropertyAddress).toBe(true);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all threads when search query is empty', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 0, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Empty search should return all threads
            act(() => {
              result.current.setSearchQuery('');
            });

            act(() => {
              vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredThreads.length).toBe(threads.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive in search', () => {
      const threads: Thread[] = [
        {
          id: '1',
          subject: 'UPPERCASE Subject',
          participants: [{ id: 'p1', name: 'John Doe', email: 'john@test.com' }],
          classification: 'buyer',
          riskLevel: 'low',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Test summary content',
          messageCount: 1,
          unreadCount: 0
        }
      ];

      const { result } = renderHook(() => useFilterState(threads));

      // Search with lowercase
      act(() => {
        result.current.setSearchQuery('uppercase');
      });

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.filteredThreads.length).toBe(1);
    });

    it('should debounce search query updates', () => {
      const threads: Thread[] = [
        {
          id: '1',
          subject: 'Test Subject',
          participants: [{ id: 'p1', name: 'John', email: 'john@test.com' }],
          classification: 'buyer',
          riskLevel: 'low',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Test summary',
          messageCount: 1,
          unreadCount: 0
        }
      ];

      const { result } = renderHook(() => useFilterState(threads));

      // Set search query
      act(() => {
        result.current.setSearchQuery('xyz');
      });

      // Before debounce, should still show all threads
      expect(result.current.filteredThreads.length).toBe(1);

      // After debounce, should filter
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(result.current.filteredThreads.length).toBe(0);
    });
  });

  describe('Filter Counts', () => {
    it('should calculate correct filter counts', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 0, maxLength: 30 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            const counts = result.current.filterCounts;

            // Verify counts match actual thread counts (only checking implemented filter types)
            expect(counts.all).toBe(threads.length);
            expect(counts.buyer).toBe(threads.filter(t => t.classification === 'buyer').length);
            expect(counts.vendor).toBe(threads.filter(t => t.classification === 'vendor').length);
            expect(counts.high_risk).toBe(threads.filter(t => t.riskLevel === 'high').length);
            expect(counts.normal).toBe(threads.filter(t => t.riskLevel !== 'high').length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Folder Filtering Correctness', () => {
    /**
     * Feature: enhanced-new-page, Property 18: Folder Filtering Correctness
     * 
     * When a folder is selected, the displayed threads SHALL only include
     * threads whose folderId matches the selected folder.
     */

    // Extended thread arbitrary with folderId
    const threadWithFolderArb: fc.Arbitrary<Thread> = threadArbitrary.chain(thread =>
      fc.oneof(fc.constant(undefined), fc.uuid()).map(folderId => ({
        ...thread,
        folderId
      }))
    );

    it('should filter threads by folderId when folder is selected', () => {
      fc.assert(
        fc.property(
          fc.array(threadWithFolderArb, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          (threads, selectedFolderId) => {
            const { result } = renderHook(() => useFilterState(threads));

            act(() => {
              result.current.setFolderId(selectedFolderId);
            });

            // All filtered threads should have matching folderId
            result.current.filteredThreads.forEach(thread => {
              expect(thread.folderId).toBe(selectedFolderId);
            });

            // Count should match threads with that folderId
            const expectedCount = threads.filter(t => t.folderId === selectedFolderId).length;
            expect(result.current.filteredThreads.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show all threads when folderId is null', () => {
      fc.assert(
        fc.property(
          fc.array(threadWithFolderArb, { minLength: 0, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Set a folder first
            act(() => {
              result.current.setFolderId('some-folder-id');
            });

            // Then clear it
            act(() => {
              result.current.setFolderId(null);
            });

            // Should show all threads
            expect(result.current.filteredThreads.length).toBe(threads.length);
            expect(result.current.activeFolderId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should treat "inbox" as null (show all threads)', () => {
      fc.assert(
        fc.property(
          fc.array(threadWithFolderArb, { minLength: 0, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Set inbox folder
            act(() => {
              result.current.setFolderId('inbox');
            });

            // Should show all threads (inbox = show all)
            expect(result.current.filteredThreads.length).toBe(threads.length);
            expect(result.current.activeFolderId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should combine folder filter with classification filters using AND logic', () => {
      fc.assert(
        fc.property(
          fc.array(threadWithFolderArb, { minLength: 1, maxLength: 30 }),
          fc.uuid(),
          fc.constantFrom<FilterType>('buyer', 'vendor'),
          (threads, folderId, classificationFilter) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Apply both folder and classification filter
            act(() => {
              result.current.setFolderId(folderId);
              result.current.setFilters([classificationFilter]);
            });

            // All filtered threads must match BOTH criteria
            result.current.filteredThreads.forEach(thread => {
              expect(thread.folderId).toBe(folderId);
              expect(thread.classification).toBe(classificationFilter);
            });

            // Count should match threads meeting both criteria
            const expectedCount = threads.filter(t =>
              t.folderId === folderId && t.classification === classificationFilter
            ).length;
            expect(result.current.filteredThreads.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should combine folder filter with search filter', () => {
      const threadsWithFolder: Thread[] = [
        {
          id: '1',
          subject: 'Important Email',
          participants: [{ id: 'p1', name: 'John', email: 'john@test.com' }],
          classification: 'buyer',
          riskLevel: 'low',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Test summary',
          messageCount: 1,
          unreadCount: 0,
          folderId: 'folder-1'
        },
        {
          id: '2',
          subject: 'Another Important',
          participants: [{ id: 'p2', name: 'Jane', email: 'jane@test.com' }],
          classification: 'vendor',
          riskLevel: 'medium',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Another summary',
          messageCount: 2,
          unreadCount: 1,
          folderId: 'folder-2'
        },
        {
          id: '3',
          subject: 'Important Deal',
          participants: [{ id: 'p3', name: 'Bob', email: 'bob@test.com' }],
          classification: 'buyer',
          riskLevel: 'high',
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          summary: 'Deal summary',
          messageCount: 3,
          unreadCount: 0,
          folderId: 'folder-1'
        }
      ];

      const { result } = renderHook(() => useFilterState(threadsWithFolder));

      // Set folder filter
      act(() => {
        result.current.setFolderId('folder-1');
      });

      // Set search query
      act(() => {
        result.current.setSearchQuery('Important');
      });

      // Advance timers for debounce
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Should only match threads in folder-1 with "Important" in subject
      expect(result.current.filteredThreads.length).toBe(2);
      result.current.filteredThreads.forEach(thread => {
        expect(thread.folderId).toBe('folder-1');
        expect(thread.subject.toLowerCase()).toContain('important');
      });
    });

    it('should return empty when folder has no threads', () => {
      fc.assert(
        fc.property(
          fc.array(threadWithFolderArb, { minLength: 1, maxLength: 20 }),
          (threads) => {
            const { result } = renderHook(() => useFilterState(threads));

            // Use a folder ID that doesn't exist in any thread
            const nonExistentFolderId = 'non-existent-folder-id-12345';

            act(() => {
              result.current.setFolderId(nonExistentFolderId);
            });

            // Should return empty
            expect(result.current.filteredThreads.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

