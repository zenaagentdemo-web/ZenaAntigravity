import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { dealsController } from './deals.controller.js';
import type { Request, Response } from 'express';

/**
 * Property-Based Tests for Deals Controller
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Deals Controller Property-Based Tests', () => {
  // Helper function to create a test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-deals-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Deals PBT User',
      },
    });
  };

  // Helper function to clean up test user
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.timelineEvent.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  it('Property 23: should return complete deal information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          stage: fc.constantFrom('viewings', 'offer_made', 'settled'),
          riskLevel: fc.constantFrom('none', 'low', 'high'),
        }),
        async (dealData) => {
          const user = await createTestUser();
          try {
            const deal = await prisma.deal.create({
              data: {
                userId: user.id,
                stage: dealData.stage,
                riskLevel: dealData.riskLevel,
                riskFlags: [],
                nextActionOwner: 'agent',
                summary: 'PBT Deal',
              },
            });

            const req = {
              user: { userId: user.id },
              query: {}
            } as unknown as Request;
            let responseData: any;
            const res = {
              status: vi.fn().mockReturnThis(),
              json: vi.fn().mockImplementation((d: any) => { responseData = d; })
            } as unknown as Response;

            await dealsController.listDeals(req, res);
            expect(responseData).toBeDefined();
            expect(responseData.deals).toBeDefined();
            expect(Array.isArray(responseData.deals)).toBe(true);
            expect(responseData.deals.some((d: any) => d.id === deal.id)).toBe(true);

          } finally {
            await cleanupTestUser(user.id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
