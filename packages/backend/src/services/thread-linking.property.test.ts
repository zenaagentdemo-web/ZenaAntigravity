import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { threadLinkingService } from './thread-linking.service.js';

/**
 * Property-Based Tests for Thread Linking Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Thread Linking Property-Based Tests', () => {
  // Helper to create test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-linking-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Linking PBT User',
      },
    });
  };

  // Helper to clean up user data
  const cleanupUser = async (userId: string) => {
    try {
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) { }
  };

  it('Property 22: should attach threads mentioning a property address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          streetNumber: fc.integer({ min: 1, max: 999 }),
          streetName: fc.constantFrom('Main', 'Oak', 'Pine', 'Elm', 'Maple'),
          streetType: fc.constantFrom('St', 'Ave', 'Rd', 'Dr', 'Ln'),
        }),
        async (addr) => {
          const user = await createTestUser();
          try {
            const fullAddress = `${addr.streetNumber} ${addr.streetName} ${addr.streetType}`;
            const property = await prisma.property.create({
              data: { userId: user.id, address: fullAddress }
            });

            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: 'gmail',
                email: user.email,
                accessToken: 't',
                refreshToken: 'r',
                tokenExpiry: new Date(),
              }
            });

            const thread = await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: account.id,
                externalId: `t-${Date.now()}`,
                subject: `Question about ${fullAddress}`,
                summary: 'Interested in this property',
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
              }
            });



            await threadLinkingService.autoLinkThread(thread.id);

            const updated = await prisma.thread.findUnique({ where: { id: thread.id } });
            expect(updated?.propertyId).toBe(property.id);
          } finally {
            await cleanupUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
