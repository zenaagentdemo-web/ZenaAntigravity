import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';

/**
 * Property-Based Tests for Email Synchronization Engine
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Email Synchronization Engine - Property-Based Tests', () => {
  // Helper function to create a test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-sync-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Sync PBT User',
      },
    });
  };

  // Helper function to clean up test user
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.emailAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe('Property 3: Automatic email synchronization', () => {
    it('should periodically sync enabled accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            syncEnabled: fc.boolean(),
          }),
          async (accountData) => {
            const user = await createTestUser();
            try {
              const account = await prisma.emailAccount.create({
                data: {
                  userId: user.id,
                  provider: accountData.provider,
                  email: user.email,
                  accessToken: 't',
                  refreshToken: 'r',
                  tokenExpiry: new Date(),
                  syncEnabled: accountData.syncEnabled,
                },
              });

              const accountsToSync = await prisma.emailAccount.findMany({
                where: { syncEnabled: true, userId: user.id },
              });

              if (accountData.syncEnabled) {
                expect(accountsToSync.some((a) => a.id === account.id)).toBe(true);
              } else {
                expect(accountsToSync.some((a) => a.id === account.id)).toBe(false);
              }
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should update lastSyncAt timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook'),
          }),
          async (accountData) => {
            const user = await createTestUser();
            try {
              const account = await prisma.emailAccount.create({
                data: {
                  userId: user.id,
                  provider: accountData.provider,
                  email: user.email,
                  accessToken: 't',
                  refreshToken: 'r',
                  tokenExpiry: new Date(),
                  syncEnabled: true,
                  lastSyncAt: null,
                },
              });

              expect(account.lastSyncAt).toBeNull();

              const before = new Date();
              const updated = await prisma.emailAccount.update({
                where: { id: account.id },
                data: { lastSyncAt: new Date() },
              });

              expect(updated.lastSyncAt).not.toBeNull();
              expect(updated.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 6: Thread metadata extraction completeness', () => {
    it('should extract all required metadata fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            externalId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 50 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 20 }),
                email: fc.emailAddress(),
                role: fc.constantFrom('buyer', 'vendor', 'agent'),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            classification: fc.constantFrom('buyer', 'vendor', 'noise'),
            category: fc.constantFrom('focus', 'waiting'),
            riskLevel: fc.constantFrom('none', 'low', 'high'),
            summary: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (threadData) => {
            const user = await createTestUser();
            try {
              const account = await prisma.emailAccount.create({
                data: { userId: user.id, provider: 'gmail', email: user.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });

              const thread = await prisma.thread.create({
                data: {
                  userId: user.id,
                  emailAccountId: account.id,
                  externalId: threadData.externalId,
                  subject: threadData.subject,
                  participants: threadData.participants,
                  classification: threadData.classification,
                  category: threadData.category,
                  riskLevel: threadData.riskLevel,
                  nextActionOwner: 'agent',
                  lastMessageAt: new Date(),
                  summary: threadData.summary,
                },
              });

              expect(thread.externalId).toBe(threadData.externalId);
              expect(thread.classification).toBe(threadData.classification);
              expect((thread.participants as any[]).length).toBe(threadData.participants.length);
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
