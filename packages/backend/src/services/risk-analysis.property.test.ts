import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { RiskAnalysisService, RiskLevel } from './risk-analysis.service.js';

const prisma = new PrismaClient();

describe('Risk Analysis Property-Based Tests', () => {
  let service: RiskAnalysisService;
  let testUserId: string;

  beforeEach(async () => {
    service = new RiskAnalysisService();
    
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.thread.deleteMany({ where: { userId: testUserId } });
    await prisma.deal.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 44: Deal risk evaluation
   * 
   * For any analyzed deal, the system should evaluate risk based on response delays,
   * communication frequency, and stage duration.
   * 
   * Validates: Requirements 13.1
   */
  describe('Property 44: Deal risk evaluation', () => {
    it('should evaluate risk based on response delays for any deal', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random deal stage
          fc.constantFrom('lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement'),
          // Generate random days since last message (0-20 days)
          fc.integer({ min: 0, max: 20 }),
          async (stage: string, daysSinceLastMessage: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create deal with thread
            const deal = await prisma.deal.create({
              data: {
                userId: testUserId,
                stage,
                nextActionOwner: 'other',
                summary: 'Test deal',
              },
            });

            // Create thread in waiting category
            const lastMessageAt = new Date(Date.now() - daysSinceLastMessage * 24 * 60 * 60 * 1000);
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}`,
                subject: 'Test thread',
                participants: [],
                classification: 'buyer',
                category: 'waiting',
                nextActionOwner: 'other',
                lastMessageAt,
                summary: 'Test summary',
                dealId: deal.id,
              },
            });

            // Analyze risk
            const result = await service.analyzeDealRisk(deal.id);

            // Verify risk evaluation considers response delays
            if (daysSinceLastMessage >= 10) {
              expect(result.riskLevel).toBe(RiskLevel.HIGH);
              expect(result.riskFlags).toContain('response_delay');
            } else if (daysSinceLastMessage >= 5) {
              expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
              expect(result.riskFlags).toContain('response_delay');
            } else if (daysSinceLastMessage >= 3) {
              expect(result.riskLevel).toBe(RiskLevel.LOW);
              expect(result.riskFlags).toContain('response_delay');
            }

            // Clean up
            await prisma.thread.deleteMany({ where: { dealId: deal.id } });
            await prisma.deal.delete({ where: { id: deal.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate risk based on communication frequency for any deal', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random number of messages in last 30 days (0-10)
          fc.integer({ min: 0, max: 10 }),
          async (messageCount: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create deal
            const deal = await prisma.deal.create({
              data: {
                userId: testUserId,
                stage: 'viewing',
                nextActionOwner: 'other',
                summary: 'Test deal',
              },
            });

            // Create threads with varying dates in last 30 days
            const threadIds: string[] = [];
            for (let i = 0; i < messageCount; i++) {
              const daysAgo = Math.floor((i / messageCount) * 30);
              const lastMessageAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
              
              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: emailAccount.id,
                  externalId: `ext-${Date.now()}-${i}`,
                  subject: `Test thread ${i}`,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  lastMessageAt,
                  summary: 'Test summary',
                  dealId: deal.id,
                },
              });
              threadIds.push(thread.id);
            }

            // Analyze risk
            const result = await service.analyzeDealRisk(deal.id);

            // Verify risk evaluation considers communication frequency
            const messagesPerWeek = (messageCount / 30) * 7;
            
            if (messageCount === 0) {
              expect(result.riskLevel).toBe(RiskLevel.HIGH);
              expect(result.riskFlags).toContain('communication_frequency');
            } else if (messagesPerWeek < 0.5) {
              expect(result.riskLevel).toBe(RiskLevel.HIGH);
              expect(result.riskFlags).toContain('communication_frequency');
            } else if (messagesPerWeek < 1) {
              expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
              expect(result.riskFlags).toContain('communication_frequency');
            } else if (messagesPerWeek < 2) {
              expect(result.riskLevel).toBe(RiskLevel.LOW);
              expect(result.riskFlags).toContain('communication_frequency');
            }

            // Clean up
            await prisma.thread.deleteMany({ where: { id: { in: threadIds } } });
            await prisma.deal.delete({ where: { id: deal.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should evaluate risk based on stage duration for any deal', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random deal stage
          fc.constantFrom('lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement'),
          // Generate random days in stage (0-60 days)
          fc.integer({ min: 0, max: 60 }),
          async (stage: string, daysInStage: number) => {
            // Create deal
            const createdAt = new Date(Date.now() - daysInStage * 24 * 60 * 60 * 1000);
            const deal = await prisma.deal.create({
              data: {
                userId: testUserId,
                stage,
                nextActionOwner: 'other',
                summary: 'Test deal',
                createdAt,
                updatedAt: createdAt,
              },
            });

            // Analyze risk
            const result = await service.analyzeDealRisk(deal.id);

            // Verify risk evaluation considers stage duration
            const thresholds: Record<string, number> = {
              lead: 14,
              qualified: 21,
              viewing: 30,
              offer: 14,
              conditional: 45,
              pre_settlement: 60,
            };

            const threshold = thresholds[stage];
            
            if (daysInStage > threshold * 1.5) {
              expect(result.riskFlags).toContain('stage_duration');
              expect(result.riskLevel).not.toBe(RiskLevel.NONE);
            } else if (daysInStage > threshold) {
              expect(result.riskFlags).toContain('stage_duration');
            }

            // Clean up
            await prisma.deal.delete({ where: { id: deal.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 45: Risk flag with explanation
   * 
   * For any deal meeting risk criteria, the system should flag it with a risk indicator
   * and explanation.
   * 
   * Validates: Requirements 13.2
   */
  describe('Property 45: Risk flag with explanation', () => {
    it('should provide risk explanation for any flagged deal', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random days since last message (5-20 days to ensure risk)
          fc.integer({ min: 5, max: 20 }),
          async (daysSinceLastMessage: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create deal with thread
            const deal = await prisma.deal.create({
              data: {
                userId: testUserId,
                stage: 'viewing',
                nextActionOwner: 'other',
                summary: 'Test deal',
              },
            });

            // Create thread in waiting category
            const lastMessageAt = new Date(Date.now() - daysSinceLastMessage * 24 * 60 * 60 * 1000);
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}`,
                subject: 'Test thread',
                participants: [],
                classification: 'buyer',
                category: 'waiting',
                nextActionOwner: 'other',
                lastMessageAt,
                summary: 'Test summary',
                dealId: deal.id,
              },
            });

            // Analyze risk
            const result = await service.analyzeDealRisk(deal.id);

            // Verify risk flag and explanation are provided
            expect(result.riskLevel).not.toBe(RiskLevel.NONE);
            expect(result.riskFlags.length).toBeGreaterThan(0);
            expect(result.riskReason).toBeTruthy();
            expect(result.riskReason.length).toBeGreaterThan(0);
            
            // Verify explanation mentions the specific risk factor
            expect(result.riskReason).toMatch(/days|communication|stage/i);

            // Clean up
            await prisma.thread.deleteMany({ where: { dealId: deal.id } });
            await prisma.deal.delete({ where: { id: deal.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update deal with risk flags in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random days since last message (5-20 days to ensure risk)
          fc.integer({ min: 5, max: 20 }),
          async (daysSinceLastMessage: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create deal with thread
            const deal = await prisma.deal.create({
              data: {
                userId: testUserId,
                stage: 'viewing',
                nextActionOwner: 'other',
                summary: 'Test deal',
              },
            });

            // Create thread in waiting category
            const lastMessageAt = new Date(Date.now() - daysSinceLastMessage * 24 * 60 * 60 * 1000);
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}`,
                subject: 'Test thread',
                participants: [],
                classification: 'buyer',
                category: 'waiting',
                nextActionOwner: 'other',
                lastMessageAt,
                summary: 'Test summary',
                dealId: deal.id,
              },
            });

            // Update risk in database
            const updatedDeal = await service.updateDealRisk(deal.id);

            // Verify deal was updated with risk information
            expect(updatedDeal.riskLevel).not.toBe(RiskLevel.NONE);
            expect(updatedDeal.riskFlags.length).toBeGreaterThan(0);

            // Verify database was actually updated
            const dealFromDb = await prisma.deal.findUnique({
              where: { id: deal.id },
            });
            
            expect(dealFromDb?.riskLevel).toBe(updatedDeal.riskLevel);
            expect(dealFromDb?.riskFlags).toEqual(updatedDeal.riskFlags);

            // Clean up
            await prisma.thread.deleteMany({ where: { dealId: deal.id } });
            await prisma.deal.delete({ where: { id: deal.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 19: Waiting list risk flagging
   * 
   * For any thread in the Waiting list, if no response has been received for 5 or more days,
   * the thread should be flagged as at risk.
   * 
   * Validates: Requirements 6.5
   */
  describe('Property 19: Waiting list risk flagging', () => {
    it('should flag waiting threads with 5+ days no response as at risk', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random days since last message (0-15 days)
          fc.integer({ min: 0, max: 15 }),
          async (daysSinceLastMessage: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create thread in waiting category
            const lastMessageAt = new Date(Date.now() - daysSinceLastMessage * 24 * 60 * 60 * 1000);
            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}`,
                subject: 'Test thread',
                participants: [],
                classification: 'buyer',
                category: 'waiting',
                nextActionOwner: 'other',
                lastMessageAt,
                summary: 'Test summary',
              },
            });

            // Analyze risk
            const result = await service.analyzeThreadRisk(thread.id);

            // Verify 5+ days threshold
            if (daysSinceLastMessage >= 5) {
              expect(result.riskLevel).not.toBe(RiskLevel.NONE);
              expect(result.riskFlags).toContain('response_delay');
              expect(result.riskReason).toContain(`${daysSinceLastMessage} days`);
            } else if (daysSinceLastMessage >= 3) {
              // 3-4 days should be low risk
              expect(result.riskLevel).toBe(RiskLevel.LOW);
            } else {
              // Less than 3 days should be no risk
              expect(result.riskLevel).toBe(RiskLevel.NONE);
            }

            // Clean up
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag focus threads as at risk based on time alone', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random days since last message (0-15 days)
          fc.integer({ min: 0, max: 15 }),
          async (daysSinceLastMessage: number) => {
            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: testUserId,
                provider: 'gmail',
                email: 'test@example.com',
                accessToken: 'encrypted-token',
                refreshToken: 'encrypted-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            // Create thread in focus category (agent owes reply)
            const lastMessageAt = new Date(Date.now() - daysSinceLastMessage * 24 * 60 * 60 * 1000);
            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}`,
                subject: 'Test thread',
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt,
                summary: 'Test summary',
              },
            });

            // Analyze risk
            const result = await service.analyzeThreadRisk(thread.id);

            // Focus threads should not be flagged based on response delay
            // (agent owes the reply, not waiting for others)
            expect(result.riskLevel).toBe(RiskLevel.NONE);
            expect(result.riskFlags).not.toContain('response_delay');

            // Clean up
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
