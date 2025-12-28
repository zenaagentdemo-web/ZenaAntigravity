import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { focusWaitingService } from './focus-waiting.service.js';

/**
 * Property-Based Tests for Focus and Waiting List Logic
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Focus and Waiting List - Property-Based Tests', () => {
  // Helper function to create a test user and email account
  const createTestContext = async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-focus-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Focus PBT User',
      },
    });

    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: user.id,
        provider: 'gmail',
        email: user.email,
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenExpiry: new Date(Date.now() + 3600000),
      },
    });

    return { userId: user.id, emailAccountId: emailAccount.id };
  };

  // Helper function to clean up test context
  const cleanupTestContext = async (userId: string) => {
    try {
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.emailAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe('Property 16: Focus list size constraint', () => {
    it('should enforce maximum size of 10 threads for any number of focus threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          async (threadCount) => {
            const { userId, emailAccountId } = await createTestContext();
            try {
              for (let i = 0; i < threadCount; i++) {
                await prisma.thread.create({
                  data: {
                    userId,
                    emailAccountId,
                    externalId: `pbt-focus-${userId}-${i}`,
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
              }

              const result = await focusWaitingService.getFocusList(userId);
              expect(result.displayed).toBeLessThanOrEqual(10);
              expect(result.total).toBe(threadCount);
            } finally {
              await cleanupTestContext(userId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should only include focus category threads, never waiting threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (focusCount, waitingCount) => {
            const { userId, emailAccountId } = await createTestContext();
            try {
              for (let i = 0; i < focusCount; i++) {
                await prisma.thread.create({
                  data: {
                    userId,
                    emailAccountId,
                    externalId: `pbt-f-${userId}-${i}`,
                    subject: `F ${i}`,
                    participants: [],
                    classification: 'buyer',
                    category: 'focus',
                    nextActionOwner: 'agent',
                    summary: `F ${i}`,
                    lastMessageAt: new Date(),
                  },
                });
              }
              for (let i = 0; i < waitingCount; i++) {
                await prisma.thread.create({
                  data: {
                    userId,
                    emailAccountId,
                    externalId: `pbt-w-${userId}-${i}`,
                    subject: `W ${i}`,
                    participants: [],
                    classification: 'buyer',
                    category: 'waiting',
                    nextActionOwner: 'other',
                    summary: `W ${i}`,
                    lastMessageAt: new Date(),
                  },
                });
              }

              const result = await focusWaitingService.getFocusList(userId);
              expect(result.threads.every(t => t.category === 'focus')).toBe(true);
              expect(result.total).toBe(focusCount);
            } finally {
              await cleanupTestContext(userId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 17: Focus list priority ordering', () => {
    it('should order threads by risk level (high > medium > low > none)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
              daysAgo: fc.integer({ min: 1, max: 30 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (threadSpecs) => {
            const { userId, emailAccountId } = await createTestContext();
            try {
              for (let i = 0; i < threadSpecs.length; i++) {
                await prisma.thread.create({
                  data: {
                    userId,
                    emailAccountId,
                    externalId: `pbt-ord-${userId}-${i}`,
                    subject: `T ${i}`,
                    participants: [],
                    classification: 'buyer',
                    category: 'focus',
                    nextActionOwner: 'agent',
                    riskLevel: threadSpecs[i].riskLevel,
                    lastMessageAt: new Date(Date.now() - threadSpecs[i].daysAgo * 86400000),
                    summary: `T ${i}`,
                  },
                });
              }

              const result = await focusWaitingService.getFocusList(userId);
              const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
              for (let i = 0; i < result.threads.length - 1; i++) {
                const cur = riskOrder[result.threads[i].riskLevel as keyof typeof riskOrder];
                const nxt = riskOrder[result.threads[i + 1].riskLevel as keyof typeof riskOrder];
                expect(cur).toBeGreaterThanOrEqual(nxt);
              }
            } finally {
              await cleanupTestContext(userId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Waiting list category filtering', () => {
    it('should only include waiting category threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (focusCount, waitingCount) => {
            const { userId, emailAccountId } = await createTestContext();
            try {
              for (let i = 0; i < focusCount; i++) {
                await prisma.thread.create({ data: { userId, emailAccountId, externalId: `pbt-wf-${userId}-${i}`, subject: `F ${i}`, participants: [], classification: 'buyer', category: 'focus', nextActionOwner: 'agent', summary: `F ${i}`, lastMessageAt: new Date() } });
              }
              for (let i = 0; i < waitingCount; i++) {
                await prisma.thread.create({ data: { userId, emailAccountId, externalId: `pbt-ww-${userId}-${i}`, subject: `W ${i}`, participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', summary: `W ${i}`, lastMessageAt: new Date() } });
              }

              const result = await focusWaitingService.getWaitingList(userId);
              expect(result.threads.every(t => t.category === 'waiting')).toBe(true);
              expect(result.total).toBe(waitingCount);
            } finally {
              await cleanupTestContext(userId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Statistics consistency', () => {
    it('should return statistics consistent with actual thread counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          async (focusCount, waitingSafeCount, waitingRiskCount) => {
            const { userId, emailAccountId } = await createTestContext();
            try {
              for (let i = 0; i < focusCount; i++) {
                await prisma.thread.create({ data: { userId, emailAccountId, externalId: `pbt-sf-${userId}-${i}`, subject: `SF ${i}`, participants: [], classification: 'buyer', category: 'focus', nextActionOwner: 'agent', summary: `SF ${i}`, lastMessageAt: new Date() } });
              }
              for (let i = 0; i < waitingSafeCount; i++) {
                await prisma.thread.create({ data: { userId, emailAccountId, externalId: `pbt-sws-${userId}-${i}`, subject: `SWS ${i}`, participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', summary: `SWS ${i}`, lastMessageAt: new Date() } });
              }
              for (let i = 0; i < waitingRiskCount; i++) {
                await prisma.thread.create({ data: { userId, emailAccountId, externalId: `pbt-swr-${userId}-${i}`, subject: `SWR ${i}`, participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', riskLevel: 'high', summary: `SWR ${i}`, lastMessageAt: new Date() } });
              }

              const stats = await focusWaitingService.getListStatistics(userId);
              expect(stats.focus.total).toBe(focusCount);
              expect(stats.waiting.total).toBe(waitingSafeCount + waitingRiskCount);
              expect(stats.waiting.atRisk).toBe(waitingRiskCount);
            } finally {
              await cleanupTestContext(userId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
