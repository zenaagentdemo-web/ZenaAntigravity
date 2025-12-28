import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { vendorUpdateService } from './vendor-update.service.js';

/**
 * Property-Based Tests for Vendor Update Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Vendor Update Service - Property-Based Tests', () => {
  // Helper to create test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-vendor-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Vendor PBT User',
      },
    });
  };

  // Helper to clean up user data
  const cleanupUser = async (userId: string) => {
    try {
      await prisma.timelineEvent.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) { }
  };

  it('Property 92: Vendor update includes required components', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          address: fc.constantFrom('123 Main St', '456 Oak Ave', '789 Pine Rd'),
        }),
        async (data) => {
          const user = await createTestUser();
          try {
            const property = await prisma.property.create({
              data: { userId: user.id, address: data.address }
            });

            // Add a viewing
            await prisma.timelineEvent.create({
              data: {
                userId: user.id,
                entityType: 'property',
                entityId: property.id,
                type: 'meeting',
                summary: 'Viewing with potential buyer',
                timestamp: new Date(),
              }
            });

            const update = await vendorUpdateService.generateVendorUpdate({
              propertyId: property.id,
              userId: user.id
            });

            expect(update.propertyAddress).toBe(data.address);
            expect(update.metrics.viewings).toBe(1);
          } finally {
            await cleanupUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
