import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import prisma from '../config/database.js';
import { RiskAnalysisService, RiskLevel } from './risk-analysis.service.js';

/**
 * Property-Based Tests for Risk Analysis Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Risk Analysis Property-Based Tests', () => {
  const service = new RiskAnalysisService();

  // Helper function to create a test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-risk-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Risk PBT User',
      },
    });
  };

  // Helper function to clean up test user
  const cleanupTestUser = async (userId: string) => {
    try {
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.emailAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  describe('Property 44: Deal risk evaluation', () => {
    it('should evaluate risk based on response delays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement'),
          fc.integer({ min: 0, max: 20 }),
          async (stage, daysSinceLastMessage) => {
            const user = await createTestUser();
            try {
              const emailAccount = await prisma.emailAccount.create({
                data: { userId: user.id, provider: 'gmail', email: user.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });

              const deal = await prisma.deal.create({
                data: { userId: user.id, stage, nextActionOwner: 'other', summary: 'Test' }
              });

              // The test thread must be the MOST RECENT one for the deal
              const testThreadTime = new Date(Date.now() - (daysSinceLastMessage * 86400000 + 60000));
              await prisma.thread.create({
                data: { userId: user.id, emailAccountId: emailAccount.id, externalId: `ext-${user.id}-test`, subject: 'T', participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', lastMessageAt: testThreadTime, summary: 'S', dealId: deal.id }
              });

              // Add OTHER threads that are OLDER than the test thread to avoid frequency risk
              // but preserve testThreadTime as the most recent
              for (let i = 0; i < 9; i++) {
                await prisma.thread.create({
                  data: { userId: user.id, emailAccountId: emailAccount.id, externalId: `ext-${user.id}-${i}`, subject: 'T', participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', lastMessageAt: new Date(testThreadTime.getTime() - (i + 1) * 3600000), summary: 'S', dealId: deal.id }
                });
              }

              const result = await service.analyzeDealRisk(deal.id);

              if (daysSinceLastMessage >= 10) expect(result.riskLevel).toBe(RiskLevel.HIGH);
              else if (daysSinceLastMessage >= 5) expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
              else if (daysSinceLastMessage >= 3) expect(result.riskLevel).toBe(RiskLevel.LOW);
              else expect(result.riskLevel).toBe(RiskLevel.NONE);
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should evaluate risk based on communication frequency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (messageCount) => {
            const user = await createTestUser();
            try {
              const emailAccount = await prisma.emailAccount.create({
                data: { userId: user.id, provider: 'gmail', email: user.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });

              const deal = await prisma.deal.create({
                data: { userId: user.id, stage: 'viewing', nextActionOwner: 'other', summary: 'Test' }
              });

              for (let i = 0; i < messageCount; i++) {
                await prisma.thread.create({
                  data: { userId: user.id, emailAccountId: emailAccount.id, externalId: `ext-${user.id}-${i}`, subject: `T ${i}`, participants: [], classification: 'buyer', category: 'focus', nextActionOwner: 'agent', lastMessageAt: new Date(Date.now() - 1000), summary: 'S', dealId: deal.id }
                });
              }

              const result = await service.analyzeDealRisk(deal.id);
              const perWeek = (messageCount / 30) * 7;

              if (messageCount === 0) expect(result.riskLevel).toBe(RiskLevel.NONE);
              else if (perWeek < 0.5) expect(result.riskLevel).toBe(RiskLevel.HIGH);
              else if (perWeek < 1) expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
              else if (perWeek < 2) expect(result.riskLevel).toBe(RiskLevel.LOW);
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 45: Risk flag with explanation', () => {
    it('should update deal with risk flags in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 20 }),
          async (daysSinceLastMessage) => {
            const user = await createTestUser();
            try {
              const emailAccount = await prisma.emailAccount.create({
                data: { userId: user.id, provider: 'gmail', email: user.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });

              const deal = await prisma.deal.create({
                data: { userId: user.id, stage: 'viewing', nextActionOwner: 'other', summary: 'Test' }
              });

              const lastMessageAt = new Date(Date.now() - (daysSinceLastMessage * 86400000 + 60000));
              await prisma.thread.create({
                data: { userId: user.id, emailAccountId: emailAccount.id, externalId: `ext-${user.id}`, subject: 'T', participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', lastMessageAt, summary: 'S', dealId: deal.id }
              });

              const updatedDeal = await service.updateDealRisk(deal.id);
              expect(updatedDeal.riskLevel).not.toBe(RiskLevel.NONE);
              expect(updatedDeal.riskFlags.length).toBeGreaterThan(0);

              const dbDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
              expect(dbDeal?.riskLevel).toBe(updatedDeal.riskLevel);
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 19: Waiting list risk flagging', () => {
    it('should flag waiting threads with 5+ days no response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 15 }),
          async (daysSinceLastMessage) => {
            const user = await createTestUser();
            try {
              const emailAccount = await prisma.emailAccount.create({
                data: { userId: user.id, provider: 'gmail', email: user.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });

              const lastMessageAt = new Date(Date.now() - (daysSinceLastMessage * 86400000 + 60000));
              const thread = await prisma.thread.create({
                data: { userId: user.id, emailAccountId: emailAccount.id, externalId: `ext-${user.id}`, subject: 'T', participants: [], classification: 'buyer', category: 'waiting', nextActionOwner: 'other', lastMessageAt, summary: 'S' }
              });

              const result = await service.analyzeThreadRisk(thread.id);
              if (daysSinceLastMessage >= 5) expect(result.riskLevel).not.toBe(RiskLevel.NONE);
              else if (daysSinceLastMessage >= 3) expect(result.riskLevel).toBe(RiskLevel.LOW);
              else expect(result.riskLevel).toBe(RiskLevel.NONE);
            } finally {
              await cleanupTestUser(user.id);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
