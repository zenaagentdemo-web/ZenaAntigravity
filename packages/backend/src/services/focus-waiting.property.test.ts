import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { focusWaitingService } from './focus-waiting.service.js';

const prisma = new PrismaClient();

/**
 * Property-Based Tests for Focus and Waiting List Logic
 * 
 * These tests verify universal properties that should hold across all inputs
 */
describe('Focus and Waiting List - Property-Based Tests', () => {
  let testUserId: string;
  let testEmailAccountId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'focus-pbt@example.com',
        passwordHash: 'test-hash',
        name: 'Focus PBT User',
      },
    });
    testUserId = user.id;

    // Create test email account
    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: testUserId,
        provider: 'gmail',
        email: 'focus-pbt@example.com',
        accessToken: 'encrypted-token',
        refreshToken: 'encrypted-refresh',
        tokenExpiry: new Date(Date.now() + 3600000),
      },
    });
    testEmailAccountId = emailAccount.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.thread.deleteMany({ where: { userId: testUserId } });
    await prisma.emailAccount.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 16: Focus list size constraint
   * 
   * For any agent's Focus list, it should contain between 3 and 10 threads
   * (or fewer if insufficient threads require replies).
   * 
   * Validates: Requirements 6.1
   */
  describe('Property 16: Focus list size constraint', () => {
    it('should enforce maximum size of 10 threads for any number of focus threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }), // Number of focus threads to create
          async (threadCount) => {
            // Create the specified number of focus threads
            const threads = [];
            for (let i = 0; i < threadCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-focus-${Date.now()}-${i}`,
                  subject: `Test thread ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel: 'none',
                  lastMessageAt: new Date(Date.now() - i * 60 * 1000),
                  summary: `Test thread ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getFocusList(testUserId);

              // Property: Focus list should never exceed 10 threads
              expect(result.displayed).toBeLessThanOrEqual(10);

              // Property: If fewer than 10 threads exist, all should be displayed
              if (threadCount <= 10) {
                expect(result.displayed).toBe(threadCount);
                expect(result.hasMore).toBe(false);
              } else {
                // Property: If more than 10 threads exist, exactly 10 should be displayed
                expect(result.displayed).toBe(10);
                expect(result.hasMore).toBe(true);
              }

              // Property: Total should always match actual thread count
              expect(result.total).toBe(threadCount);

              // Property: Displayed count should match array length
              expect(result.threads.length).toBe(result.displayed);
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only include focus category threads, never waiting threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Focus threads
          fc.integer({ min: 1, max: 20 }), // Waiting threads
          async (focusCount, waitingCount) => {
            const threads = [];

            // Create focus threads
            for (let i = 0; i < focusCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-focus-cat-${Date.now()}-${i}`,
                  subject: `Focus ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Focus ${i}`,
                },
              });
              threads.push(thread);
            }

            // Create waiting threads
            for (let i = 0; i < waitingCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-waiting-cat-${Date.now()}-${i}`,
                  subject: `Waiting ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'waiting',
                  nextActionOwner: 'other',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Waiting ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getFocusList(testUserId);

              // Property: All returned threads must be focus category
              for (const thread of result.threads) {
                expect(thread.category).toBe('focus');
              }

              // Property: Total should match focus count, not waiting count
              expect(result.total).toBe(focusCount);
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 17: Focus list priority ordering
   * 
   * For any Focus list, threads should be ordered such that higher priority
   * and higher risk threads appear before lower priority and lower risk threads.
   * 
   * Validates: Requirements 6.2
   */
  describe('Property 17: Focus list priority ordering', () => {
    it('should order threads by risk level (high > medium > low > none) for any set of threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
              daysAgo: fc.integer({ min: 1, max: 30 }),
            }),
            { minLength: 2, maxLength: 15 }
          ),
          async (threadSpecs) => {
            const threads = [];

            // Create threads with specified risk levels and times
            for (let i = 0; i < threadSpecs.length; i++) {
              const spec = threadSpecs[i];
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-order-${Date.now()}-${i}`,
                  subject: `Thread ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel: spec.riskLevel,
                  lastMessageAt: new Date(
                    Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000
                  ),
                  summary: `Thread ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getFocusList(testUserId);

              // Property: Risk levels should be in descending order
              const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
              for (let i = 0; i < result.threads.length - 1; i++) {
                const currentRisk = riskOrder[result.threads[i].riskLevel as keyof typeof riskOrder];
                const nextRisk = riskOrder[result.threads[i + 1].riskLevel as keyof typeof riskOrder];
                
                // Current thread should have >= risk level than next thread
                expect(currentRisk).toBeGreaterThanOrEqual(nextRisk);

                // If same risk level, older messages should come first
                if (currentRisk === nextRisk) {
                  const currentTime = new Date(result.threads[i].lastMessageAt).getTime();
                  const nextTime = new Date(result.threads[i + 1].lastMessageAt).getTime();
                  expect(currentTime).toBeLessThanOrEqual(nextTime);
                }
              }
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should order threads with same risk level by oldest message first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('none', 'low', 'medium', 'high'),
          fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 3, maxLength: 10 }),
          async (riskLevel, daysAgoArray) => {
            const threads = [];

            // Create threads with same risk level but different times
            for (let i = 0; i < daysAgoArray.length; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-time-order-${Date.now()}-${i}`,
                  subject: `Thread ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel,
                  lastMessageAt: new Date(
                    Date.now() - daysAgoArray[i] * 24 * 60 * 60 * 1000
                  ),
                  summary: `Thread ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getFocusList(testUserId);

              // Property: Within same risk level, older messages come first
              for (let i = 0; i < result.threads.length - 1; i++) {
                if (result.threads[i].riskLevel === result.threads[i + 1].riskLevel) {
                  const currentTime = new Date(result.threads[i].lastMessageAt).getTime();
                  const nextTime = new Date(result.threads[i + 1].lastMessageAt).getTime();
                  expect(currentTime).toBeLessThanOrEqual(nextTime);
                }
              }
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Waiting list should only contain waiting category threads
   */
  describe('Waiting list category filtering', () => {
    it('should only include waiting category threads, never focus threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Focus threads
          fc.integer({ min: 1, max: 20 }), // Waiting threads
          async (focusCount, waitingCount) => {
            const threads = [];

            // Create focus threads
            for (let i = 0; i < focusCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-wait-focus-${Date.now()}-${i}`,
                  subject: `Focus ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Focus ${i}`,
                },
              });
              threads.push(thread);
            }

            // Create waiting threads
            for (let i = 0; i < waitingCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-wait-waiting-${Date.now()}-${i}`,
                  subject: `Waiting ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'waiting',
                  nextActionOwner: 'other',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Waiting ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getWaitingList(testUserId);

              // Property: All returned threads must be waiting category
              for (const thread of result.threads) {
                expect(thread.category).toBe('waiting');
              }

              // Property: Total should match waiting count, not focus count
              expect(result.total).toBe(waitingCount);
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly filter for at-risk threads when riskOnly is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('none', 'low', 'medium', 'high'),
            { minLength: 5, maxLength: 20 }
          ),
          async (riskLevels) => {
            const threads = [];

            // Create waiting threads with specified risk levels
            for (let i = 0; i < riskLevels.length; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-risk-filter-${Date.now()}-${i}`,
                  subject: `Thread ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'waiting',
                  nextActionOwner: 'other',
                  riskLevel: riskLevels[i],
                  lastMessageAt: new Date(),
                  summary: `Thread ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const result = await focusWaitingService.getWaitingList(testUserId, {
                riskOnly: true,
              });

              // Property: All returned threads must have risk level other than 'none'
              for (const thread of result.threads) {
                expect(thread.riskLevel).not.toBe('none');
                expect(['low', 'medium', 'high']).toContain(thread.riskLevel);
              }

              // Property: Total should match count of at-risk threads
              const atRiskCount = riskLevels.filter((r) => r !== 'none').length;
              expect(result.total).toBe(atRiskCount);
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Statistics should be consistent with actual data
   */
  describe('Statistics consistency', () => {
    it('should return statistics consistent with actual thread counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }), // Focus threads
          fc.integer({ min: 0, max: 20 }), // Waiting threads (safe)
          fc.integer({ min: 0, max: 20 }), // Waiting threads (at risk)
          async (focusCount, waitingSafeCount, waitingRiskCount) => {
            const threads = [];

            // Create focus threads
            for (let i = 0; i < focusCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-stats-focus-${Date.now()}-${i}`,
                  subject: `Focus ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Focus ${i}`,
                },
              });
              threads.push(thread);
            }

            // Create safe waiting threads
            for (let i = 0; i < waitingSafeCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-stats-wait-safe-${Date.now()}-${i}`,
                  subject: `Waiting Safe ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'waiting',
                  nextActionOwner: 'other',
                  riskLevel: 'none',
                  lastMessageAt: new Date(),
                  summary: `Waiting Safe ${i}`,
                },
              });
              threads.push(thread);
            }

            // Create at-risk waiting threads
            for (let i = 0; i < waitingRiskCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `pbt-stats-wait-risk-${Date.now()}-${i}`,
                  subject: `Waiting Risk ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'waiting',
                  nextActionOwner: 'other',
                  riskLevel: 'high',
                  lastMessageAt: new Date(),
                  summary: `Waiting Risk ${i}`,
                },
              });
              threads.push(thread);
            }

            try {
              const stats = await focusWaitingService.getListStatistics(testUserId);

              // Property: Focus total should match actual focus count
              expect(stats.focus.total).toBe(focusCount);

              // Property: Focus displayed should be min(total, 10)
              expect(stats.focus.displayed).toBe(Math.min(focusCount, 10));

              // Property: Waiting total should match all waiting threads
              const totalWaiting = waitingSafeCount + waitingRiskCount;
              expect(stats.waiting.total).toBe(totalWaiting);

              // Property: At-risk count should match only at-risk waiting threads
              expect(stats.waiting.atRisk).toBe(waitingRiskCount);
            } finally {
              // Clean up
              await prisma.thread.deleteMany({
                where: { id: { in: threads.map((t) => t.id) } },
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
