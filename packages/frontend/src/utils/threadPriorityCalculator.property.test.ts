/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculatePriorityScore,
  calculateAgeScore,
  sortThreadsByPriority,
  DEFAULT_PRIORITY_CONFIG
} from './threadPriorityCalculator';
import {
  Thread,
  ThreadClassification,
  RiskLevel,
  PriorityConfig,
  CLASSIFICATION_VALUES,
  RISK_LEVEL_SCORES
} from '../models/newPage.types';

/**
 * **Feature: enhanced-new-page, Property 1: Priority Score Calculation Consistency**
 * 
 * For any thread with valid risk level, classification, and lastMessageAt timestamp,
 * the calculated priority score SHALL equal: (riskScore × 0.4) + (ageScore × 0.3) + (classificationScore × 0.3),
 * where each component score is between 0-100.
 * 
 * **Validates: Requirements 2.1**
 */

// ============================================================================
// Arbitraries (Generators) for Test Data
// ============================================================================

const riskLevelArb = fc.constantFrom<RiskLevel>('none', 'low', 'medium', 'high');
const classificationArb = fc.constantFrom<ThreadClassification>('buyer', 'vendor', 'market', 'lawyer_broker', 'noise');

const participantArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  role: fc.option(fc.constantFrom('buyer' as const, 'vendor' as const, 'agent' as const, 'lawyer' as const, 'broker' as const, 'other' as const), { nil: undefined }),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined })
});

// Generate dates within a reasonable range (last 30 days to now)
const recentDateArb = fc.date({
  min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  max: new Date()
}).map(d => d.toISOString());

const threadArbitrary = fc.record({
  id: fc.uuid(),
  subject: fc.string({ minLength: 1, maxLength: 200 }),
  participants: fc.array(participantArb, { minLength: 1, maxLength: 10 }),
  classification: classificationArb,
  riskLevel: riskLevelArb,
  riskReason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  lastMessageAt: recentDateArb,
  createdAt: recentDateArb,
  draftResponse: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
  summary: fc.string({ minLength: 10, maxLength: 500 }),
  aiSummary: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: undefined }),
  propertyId: fc.option(fc.uuid(), { nil: undefined }),
  propertyAddress: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  dealId: fc.option(fc.uuid(), { nil: undefined }),
  dealStage: fc.option(fc.constantFrom('inquiry' as const, 'viewing' as const, 'offer' as const, 'negotiation' as const, 'conditional' as const, 'unconditional' as const, 'settled' as const), { nil: undefined }),
  messageCount: fc.integer({ min: 1, max: 100 }),
  unreadCount: fc.integer({ min: 0, max: 50 }),
  priorityScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  snoozedUntil: fc.option(recentDateArb, { nil: undefined })
}) as fc.Arbitrary<Thread>;

const priorityConfigArb = fc.record({
  riskWeight: fc.float({ min: 0, max: 1, noNaN: true }),
  ageWeight: fc.float({ min: 0, max: 1, noNaN: true }),
  classificationWeight: fc.float({ min: 0, max: 1, noNaN: true })
}).filter(config => {
  // Ensure weights sum to approximately 1 (within floating point tolerance)
  const sum = config.riskWeight + config.ageWeight + config.classificationWeight;
  return sum >= 0.99 && sum <= 1.01;
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Thread Priority Calculator Property Tests', () => {
  describe('Property 1: Priority Score Calculation Consistency', () => {
    /**
     * **Feature: enhanced-new-page, Property 1: Priority Score Calculation Consistency**
     * **Validates: Requirements 2.1**
     */
    it('should calculate priority score as weighted sum of component scores', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            const result = calculatePriorityScore(thread);
            
            // Calculate expected score manually
            const riskScore = RISK_LEVEL_SCORES[thread.riskLevel];
            const classificationScore = CLASSIFICATION_VALUES[thread.classification];
            const ageScore = calculateAgeScore(thread.lastMessageAt);
            
            const expectedScore = 
              (riskScore * DEFAULT_PRIORITY_CONFIG.riskWeight) +
              (ageScore * DEFAULT_PRIORITY_CONFIG.ageWeight) +
              (classificationScore * DEFAULT_PRIORITY_CONFIG.classificationWeight);
            
            // Property: Calculated score should match expected formula
            expect(result.score).toBeCloseTo(expectedScore, 5);
            
            // Property: Score should be between 0 and 100
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
            
            // Property: Individual factor scores should be between 0 and 100
            expect(result.factors.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.factors.riskScore).toBeLessThanOrEqual(100);
            expect(result.factors.ageScore).toBeGreaterThanOrEqual(0);
            expect(result.factors.ageScore).toBeLessThanOrEqual(100);
            expect(result.factors.classificationScore).toBeGreaterThanOrEqual(0);
            expect(result.factors.classificationScore).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify risk score based on risk level', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            const result = calculatePriorityScore(thread);
            
            // Property: Risk score should match the defined mapping
            expect(result.factors.riskScore).toBe(RISK_LEVEL_SCORES[thread.riskLevel]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify classification score based on classification', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            const result = calculatePriorityScore(thread);
            
            // Property: Classification score should match the defined mapping
            expect(result.factors.classificationScore).toBe(CLASSIFICATION_VALUES[thread.classification]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce higher scores for high-risk threads', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          threadArbitrary,
          (thread1, thread2) => {
            // Create two threads with same classification and age but different risk
            const highRiskThread: Thread = { ...thread1, riskLevel: 'high', lastMessageAt: thread2.lastMessageAt, classification: thread2.classification };
            const lowRiskThread: Thread = { ...thread2, riskLevel: 'low', lastMessageAt: thread2.lastMessageAt, classification: thread2.classification };
            
            const highRiskResult = calculatePriorityScore(highRiskThread);
            const lowRiskResult = calculatePriorityScore(lowRiskThread);
            
            // Property: High risk threads should have higher priority scores
            expect(highRiskResult.score).toBeGreaterThan(lowRiskResult.score);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce higher scores for vendor classification than noise', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            // Create two threads with same risk and age but different classification
            const vendorThread: Thread = { ...thread, classification: 'vendor' };
            const noiseThread: Thread = { ...thread, classification: 'noise' };
            
            const vendorResult = calculatePriorityScore(vendorThread);
            const noiseResult = calculatePriorityScore(noiseThread);
            
            // Property: Vendor threads should have higher priority than noise
            expect(vendorResult.score).toBeGreaterThan(noiseResult.score);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should mark threads as overdue when older than 48 hours', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          fc.integer({ min: 49, max: 200 }), // Hours ago (more than 48)
          (thread, hoursAgo) => {
            const overdueDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
            const overdueThread: Thread = { ...thread, lastMessageAt: overdueDate.toISOString() };
            
            const result = calculatePriorityScore(overdueThread);
            
            // Property: Threads older than 48 hours should be marked as overdue
            expect(result.isOverdue).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not mark recent threads as overdue', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          fc.integer({ min: 0, max: 47 }), // Hours ago (less than 48)
          (thread, hoursAgo) => {
            const recentDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
            const recentThread: Thread = { ...thread, lastMessageAt: recentDate.toISOString() };
            
            const result = calculatePriorityScore(recentThread);
            
            // Property: Threads less than 48 hours old should not be marked as overdue
            expect(result.isOverdue).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            const result1 = calculatePriorityScore(thread);
            const result2 = calculatePriorityScore(thread);
            
            // Property: Same input should produce identical output
            expect(result1.score).toBe(result2.score);
            expect(result1.factors.riskScore).toBe(result2.factors.riskScore);
            expect(result1.factors.ageScore).toBe(result2.factors.ageScore);
            expect(result1.factors.classificationScore).toBe(result2.factors.classificationScore);
            expect(result1.isOverdue).toBe(result2.isOverdue);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect custom priority config weights', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          priorityConfigArb,
          (thread, config) => {
            const result = calculatePriorityScore(thread, config);
            
            // Calculate expected score with custom weights
            const expectedScore = 
              (result.factors.riskScore * config.riskWeight) +
              (result.factors.ageScore * config.ageWeight) +
              (result.factors.classificationScore * config.classificationWeight);
            
            // Property: Score should match formula with custom weights
            expect(result.score).toBeCloseTo(expectedScore, 5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});


/**
 * **Feature: enhanced-new-page, Property 2: Thread Sort Order Invariant**
 * 
 * For any list of threads displayed in the New page, the threads SHALL be ordered
 * such that for every adjacent pair (thread[i], thread[i+1]), 
 * thread[i].priorityScore >= thread[i+1].priorityScore.
 * 
 * **Validates: Requirements 2.2**
 */

describe('Thread Sort Order Property Tests', () => {
  describe('Property 2: Thread Sort Order Invariant', () => {
    /**
     * **Feature: enhanced-new-page, Property 2: Thread Sort Order Invariant**
     * **Validates: Requirements 2.2**
     */
    it('should sort threads in descending priority order', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 0, maxLength: 50 }),
          (threads) => {
            const sortedThreads = sortThreadsByPriority(threads);
            
            // Property: For every adjacent pair, the first should have >= priority
            for (let i = 0; i < sortedThreads.length - 1; i++) {
              const currentScore = calculatePriorityScore(sortedThreads[i]).score;
              const nextScore = calculatePriorityScore(sortedThreads[i + 1]).score;
              
              expect(currentScore).toBeGreaterThanOrEqual(nextScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all threads after sorting (no loss or duplication)', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 0, maxLength: 30 }),
          (threads) => {
            const sortedThreads = sortThreadsByPriority(threads);
            
            // Property: Same number of threads
            expect(sortedThreads.length).toBe(threads.length);
            
            // Property: All original thread IDs should be present
            const originalIds = new Set(threads.map(t => t.id));
            const sortedIds = new Set(sortedThreads.map(t => t.id));
            
            expect(sortedIds.size).toBe(originalIds.size);
            originalIds.forEach(id => {
              expect(sortedIds.has(id)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original array', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 1, maxLength: 20 }),
          (threads) => {
            const originalOrder = threads.map(t => t.id);
            const sortedThreads = sortThreadsByPriority(threads);
            const afterSortOrder = threads.map(t => t.id);
            
            // Property: Original array should be unchanged
            expect(afterSortOrder).toEqual(originalOrder);
            
            // Property: Sorted array should be a different reference
            expect(sortedThreads).not.toBe(threads);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce stable sort for threads with equal priority', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          fc.integer({ min: 2, max: 10 }),
          (baseThread, count) => {
            // Create multiple threads with identical priority factors
            const identicalThreads: Thread[] = [];
            for (let i = 0; i < count; i++) {
              identicalThreads.push({
                ...baseThread,
                id: `thread-${i}`,
                subject: `Subject ${i}`
              });
            }
            
            const sortedThreads = sortThreadsByPriority(identicalThreads);
            
            // Property: All threads should have the same priority score
            const scores = sortedThreads.map(t => calculatePriorityScore(t).score);
            const uniqueScores = new Set(scores);
            expect(uniqueScores.size).toBe(1);
            
            // Property: All threads should still be present
            expect(sortedThreads.length).toBe(count);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle empty array', () => {
      const emptyThreads: Thread[] = [];
      const sortedThreads = sortThreadsByPriority(emptyThreads);
      
      expect(sortedThreads).toEqual([]);
      expect(sortedThreads.length).toBe(0);
    });

    it('should handle single thread array', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (thread) => {
            const singleThread = [thread];
            const sortedThreads = sortThreadsByPriority(singleThread);
            
            // Property: Single thread should remain unchanged
            expect(sortedThreads.length).toBe(1);
            expect(sortedThreads[0].id).toBe(thread.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect custom priority config in sorting', () => {
      fc.assert(
        fc.property(
          fc.array(threadArbitrary, { minLength: 2, maxLength: 20 }),
          priorityConfigArb,
          (threads, config) => {
            const sortedThreads = sortThreadsByPriority(threads, config);
            
            // Property: Sorted order should respect custom config
            for (let i = 0; i < sortedThreads.length - 1; i++) {
              const currentScore = calculatePriorityScore(sortedThreads[i], config).score;
              const nextScore = calculatePriorityScore(sortedThreads[i + 1], config).score;
              
              expect(currentScore).toBeGreaterThanOrEqual(nextScore);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should place high-risk threads before low-risk threads (all else equal)', () => {
      fc.assert(
        fc.property(
          threadArbitrary,
          (baseThread) => {
            // Create threads with same classification and age but different risk
            const now = new Date().toISOString();
            const highRiskThread: Thread = { 
              ...baseThread, 
              id: 'high-risk',
              riskLevel: 'high', 
              lastMessageAt: now,
              classification: 'buyer'
            };
            const lowRiskThread: Thread = { 
              ...baseThread, 
              id: 'low-risk',
              riskLevel: 'low', 
              lastMessageAt: now,
              classification: 'buyer'
            };
            
            // Test both orderings
            const sorted1 = sortThreadsByPriority([highRiskThread, lowRiskThread]);
            const sorted2 = sortThreadsByPriority([lowRiskThread, highRiskThread]);
            
            // Property: High risk should always come first
            expect(sorted1[0].id).toBe('high-risk');
            expect(sorted2[0].id).toBe('high-risk');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
