import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { notificationService } from './notification.service.js';

/**
 * Property-Based Tests for Notification Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Notification Service - Property-Based Tests', () => {
  // Helper to create test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-notify-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Notify PBT User',
      },
    });
  };

  // Helper to clean up user data
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.notificationPreferences.deleteMany({ where: { userId } });
      await prisma.pushSubscription.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) { }
  };

  it('Property 46: Priority thread preferences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          newThreads: fc.boolean(),
          highPriority: fc.boolean(),
        }),
        async (prefsData) => {
          const user = await createTestUser();
          try {
            await notificationService.updatePreferences(user.id, {
              newThreads: prefsData.newThreads,
              highPriorityThreads: prefsData.highPriority,
            });


            const prefs = await notificationService.getPreferences(user.id);
            expect(prefs.newThreads).toBe(prefsData.newThreads);
            expect(prefs.highPriorityThreads).toBe(prefsData.highPriority);
          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Default preferences creation', async () => {
    const user = await createTestUser();
    try {
      const prefs = await notificationService.getPreferences(user.id);
      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(user.id);
    } finally {
      await cleanupTestUser(user.id);
    }
  });
});
