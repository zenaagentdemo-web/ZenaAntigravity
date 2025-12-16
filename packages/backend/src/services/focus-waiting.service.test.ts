import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { focusWaitingService } from './focus-waiting.service.js';

const prisma = new PrismaClient();

describe('FocusWaitingService', () => {
  let testUserId: string;
  let testEmailAccountId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'focus-test@example.com',
        passwordHash: 'test-hash',
        name: 'Focus Test User',
      },
    });
    testUserId = user.id;

    // Create test email account
    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: testUserId,
        provider: 'gmail',
        email: 'focus-test@example.com',
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

  describe('getFocusList', () => {
    it('should return empty list when no focus threads exist', async () => {
      const result = await focusWaitingService.getFocusList(testUserId);

      expect(result.threads).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.displayed).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return focus threads ordered by risk level and last message time', async () => {
      // Create focus threads with different risk levels and times
      const now = new Date();
      const threads = await Promise.all([
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'focus-1',
            subject: 'High risk old thread',
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'high',
            lastMessageAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            summary: 'Test thread 1',
          },
        }),
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'focus-2',
            subject: 'Medium risk recent thread',
            participants: [],
            classification: 'vendor',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'medium',
            lastMessageAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            summary: 'Test thread 2',
          },
        }),
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'focus-3',
            subject: 'No risk old thread',
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'none',
            lastMessageAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            summary: 'Test thread 3',
          },
        }),
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'focus-4',
            subject: 'High risk recent thread',
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'high',
            lastMessageAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            summary: 'Test thread 4',
          },
        }),
      ]);

      const result = await focusWaitingService.getFocusList(testUserId);

      expect(result.threads).toHaveLength(4);
      expect(result.total).toBe(4);
      expect(result.displayed).toBe(4);
      expect(result.hasMore).toBe(false);

      // Verify ordering: high risk threads first, then by oldest message
      expect(result.threads[0].riskLevel).toBe('high');
      expect(result.threads[0].externalId).toBe('focus-1'); // Oldest high risk
      expect(result.threads[1].riskLevel).toBe('high');
      expect(result.threads[1].externalId).toBe('focus-4'); // Newer high risk
      expect(result.threads[2].riskLevel).toBe('medium');
      expect(result.threads[3].riskLevel).toBe('none');

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should enforce maximum size constraint of 10 threads', async () => {
      // Create 15 focus threads
      const threads = [];
      for (let i = 0; i < 15; i++) {
        const thread = await prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: `focus-max-${i}`,
            subject: `Thread ${i}`,
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'none',
            lastMessageAt: new Date(Date.now() - i * 60 * 60 * 1000), // Stagger times
            summary: `Test thread ${i}`,
          },
        });
        threads.push(thread);
      }

      const result = await focusWaitingService.getFocusList(testUserId);

      expect(result.threads).toHaveLength(10); // Max constraint
      expect(result.total).toBe(15); // Total available
      expect(result.displayed).toBe(10);
      expect(result.hasMore).toBe(true);

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should return fewer than 10 threads if insufficient threads exist', async () => {
      // Create only 5 focus threads
      const threads = [];
      for (let i = 0; i < 5; i++) {
        const thread = await prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: `focus-few-${i}`,
            subject: `Thread ${i}`,
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'none',
            lastMessageAt: new Date(),
            summary: `Test thread ${i}`,
          },
        });
        threads.push(thread);
      }

      const result = await focusWaitingService.getFocusList(testUserId);

      expect(result.threads).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.displayed).toBe(5);
      expect(result.hasMore).toBe(false);

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should only return focus category threads, not waiting', async () => {
      // Create mix of focus and waiting threads
      const focusThread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'focus-only-1',
          subject: 'Focus thread',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          riskLevel: 'none',
          lastMessageAt: new Date(),
          summary: 'Focus thread',
        },
      });

      const waitingThread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'waiting-1',
          subject: 'Waiting thread',
          participants: [],
          classification: 'buyer',
          category: 'waiting',
          nextActionOwner: 'other',
          riskLevel: 'none',
          lastMessageAt: new Date(),
          summary: 'Waiting thread',
        },
      });

      const result = await focusWaitingService.getFocusList(testUserId);

      expect(result.threads).toHaveLength(1);
      expect(result.threads[0].category).toBe('focus');
      expect(result.threads[0].externalId).toBe('focus-only-1');

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: [focusThread.id, waitingThread.id] } },
      });
    });
  });

  describe('getWaitingList', () => {
    it('should return empty list when no waiting threads exist', async () => {
      const result = await focusWaitingService.getWaitingList(testUserId);

      expect(result.threads).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.displayed).toBe(0);
    });

    it('should return waiting threads ordered by risk level and last message time', async () => {
      const now = new Date();
      const threads = await Promise.all([
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'waiting-1',
            subject: 'High risk waiting',
            participants: [],
            classification: 'buyer',
            category: 'waiting',
            nextActionOwner: 'other',
            riskLevel: 'high',
            lastMessageAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            summary: 'Test waiting 1',
          },
        }),
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'waiting-2',
            subject: 'No risk waiting',
            participants: [],
            classification: 'vendor',
            category: 'waiting',
            nextActionOwner: 'other',
            riskLevel: 'none',
            lastMessageAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            summary: 'Test waiting 2',
          },
        }),
      ]);

      const result = await focusWaitingService.getWaitingList(testUserId);

      expect(result.threads).toHaveLength(2);
      expect(result.total).toBe(2);
      // High risk should come first
      expect(result.threads[0].riskLevel).toBe('high');
      expect(result.threads[1].riskLevel).toBe('none');

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should filter for at-risk threads only when riskOnly is true', async () => {
      const threads = await Promise.all([
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'waiting-risk-1',
            subject: 'At risk',
            participants: [],
            classification: 'buyer',
            category: 'waiting',
            nextActionOwner: 'other',
            riskLevel: 'high',
            lastMessageAt: new Date(),
            summary: 'At risk thread',
          },
        }),
        prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: 'waiting-safe-1',
            subject: 'Safe',
            participants: [],
            classification: 'buyer',
            category: 'waiting',
            nextActionOwner: 'other',
            riskLevel: 'none',
            lastMessageAt: new Date(),
            summary: 'Safe thread',
          },
        }),
      ]);

      const result = await focusWaitingService.getWaitingList(testUserId, {
        riskOnly: true,
      });

      expect(result.threads).toHaveLength(1);
      expect(result.threads[0].riskLevel).toBe('high');
      expect(result.threads[0].externalId).toBe('waiting-risk-1');

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should support pagination', async () => {
      // Create 25 waiting threads
      const threads = [];
      for (let i = 0; i < 25; i++) {
        const thread = await prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: `waiting-page-${i}`,
            subject: `Thread ${i}`,
            participants: [],
            classification: 'buyer',
            category: 'waiting',
            nextActionOwner: 'other',
            riskLevel: 'none',
            lastMessageAt: new Date(Date.now() - i * 60 * 60 * 1000),
            summary: `Test thread ${i}`,
          },
        });
        threads.push(thread);
      }

      // Get first page
      const page1 = await focusWaitingService.getWaitingList(testUserId, {
        limit: 10,
        offset: 0,
      });

      expect(page1.threads).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.pagination.hasMore).toBe(true);

      // Get second page
      const page2 = await focusWaitingService.getWaitingList(testUserId, {
        limit: 10,
        offset: 10,
      });

      expect(page2.threads).toHaveLength(10);
      expect(page2.total).toBe(25);
      expect(page2.pagination.hasMore).toBe(true);

      // Get third page
      const page3 = await focusWaitingService.getWaitingList(testUserId, {
        limit: 10,
        offset: 20,
      });

      expect(page3.threads).toHaveLength(5);
      expect(page3.total).toBe(25);
      expect(page3.pagination.hasMore).toBe(false);

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });
  });

  describe('getListStatistics', () => {
    it('should return correct statistics for focus and waiting lists', async () => {
      // Create test threads
      const threads = await Promise.all([
        // 5 focus threads
        ...Array.from({ length: 5 }, (_, i) =>
          prisma.thread.create({
            data: {
              userId: testUserId,
              emailAccountId: testEmailAccountId,
              externalId: `stats-focus-${i}`,
              subject: `Focus ${i}`,
              participants: [],
              classification: 'buyer',
              category: 'focus',
              nextActionOwner: 'agent',
              riskLevel: 'none',
              lastMessageAt: new Date(),
              summary: `Focus thread ${i}`,
            },
          })
        ),
        // 8 waiting threads (3 at risk)
        ...Array.from({ length: 8 }, (_, i) =>
          prisma.thread.create({
            data: {
              userId: testUserId,
              emailAccountId: testEmailAccountId,
              externalId: `stats-waiting-${i}`,
              subject: `Waiting ${i}`,
              participants: [],
              classification: 'buyer',
              category: 'waiting',
              nextActionOwner: 'other',
              riskLevel: i < 3 ? 'high' : 'none',
              lastMessageAt: new Date(),
              summary: `Waiting thread ${i}`,
            },
          })
        ),
      ]);

      const stats = await focusWaitingService.getListStatistics(testUserId);

      expect(stats.focus.total).toBe(5);
      expect(stats.focus.displayed).toBe(5); // Less than 10, so all displayed
      expect(stats.waiting.total).toBe(8);
      expect(stats.waiting.atRisk).toBe(3);

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });

    it('should cap displayed focus count at 10', async () => {
      // Create 15 focus threads
      const threads = [];
      for (let i = 0; i < 15; i++) {
        const thread = await prisma.thread.create({
          data: {
            userId: testUserId,
            emailAccountId: testEmailAccountId,
            externalId: `stats-cap-${i}`,
            subject: `Thread ${i}`,
            participants: [],
            classification: 'buyer',
            category: 'focus',
            nextActionOwner: 'agent',
            riskLevel: 'none',
            lastMessageAt: new Date(),
            summary: `Test thread ${i}`,
          },
        });
        threads.push(thread);
      }

      const stats = await focusWaitingService.getListStatistics(testUserId);

      expect(stats.focus.total).toBe(15);
      expect(stats.focus.displayed).toBe(10); // Capped at 10

      // Clean up
      await prisma.thread.deleteMany({
        where: { id: { in: threads.map((t) => t.id) } },
      });
    });
  });
});
