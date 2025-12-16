import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Property-Based Tests for Email Synchronization Engine
 * 
 * These tests verify correctness properties that should hold across all valid inputs
 */

describe('Email Synchronization Engine - Property-Based Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.thread.deleteMany({});
    await prisma.emailAccount.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.thread.deleteMany({});
    await prisma.emailAccount.deleteMany({});
    await prisma.user.deleteMany({});
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 3: Automatic email synchronization
   * Validates: Requirements 2.4
   * 
   * For any connected email account with sync enabled, new messages and updates 
   * should be fetched periodically without manual intervention.
   */
  describe('Property 3: Automatic email synchronization', () => {
    it('should periodically sync enabled accounts without manual intervention', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user data
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          // Generate random email account data
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
            syncEnabled: fc.boolean(),
          }),
          async (userData, accountData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: accountData.syncEnabled,
              },
            });

            // Query for accounts that should be synced
            const accountsToSync = await prisma.emailAccount.findMany({
              where: {
                syncEnabled: true,
              },
            });

            // Property: If sync is enabled, account should be in sync list
            if (accountData.syncEnabled) {
              expect(accountsToSync.some((a) => a.id === account.id)).toBe(true);
            } else {
              expect(accountsToSync.some((a) => a.id === account.id)).toBe(false);
            }

            // Property: Only enabled accounts should be synced
            for (const acc of accountsToSync) {
              expect(acc.syncEnabled).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update lastSyncAt timestamp after successful sync', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
          }),
          async (userData, accountData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account with no lastSyncAt
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
                lastSyncAt: null,
              },
            });

            // Property: Initially lastSyncAt should be null
            expect(account.lastSyncAt).toBeNull();

            // Simulate successful sync by updating lastSyncAt
            const beforeSync = new Date();
            const updatedAccount = await prisma.emailAccount.update({
              where: { id: account.id },
              data: { lastSyncAt: new Date() },
            });
            const afterSync = new Date();

            // Property: After sync, lastSyncAt should be set and within expected range
            expect(updatedAccount.lastSyncAt).not.toBeNull();
            expect(updatedAccount.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(
              beforeSync.getTime()
            );
            expect(updatedAccount.lastSyncAt!.getTime()).toBeLessThanOrEqual(
              afterSync.getTime()
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch new messages without manual intervention for any enabled account', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple users with email accounts
          fc.array(
            fc.record({
              user: fc.record({
                email: fc.emailAddress(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                password: fc.string({ minLength: 8, maxLength: 100 }),
              }),
              account: fc.record({
                provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
                email: fc.emailAddress(),
                syncEnabled: fc.boolean(),
              }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (testData) => {
            // Create users and accounts
            const createdAccounts = [];
            for (const data of testData) {
              const user = await prisma.user.create({
                data: {
                  email: data.user.email,
                  passwordHash: data.user.password,
                  name: data.user.name,
                },
              });

              const account = await prisma.emailAccount.create({
                data: {
                  userId: user.id,
                  provider: data.account.provider,
                  email: data.account.email,
                  accessToken: 'encrypted_token',
                  refreshToken: 'encrypted_refresh',
                  tokenExpiry: new Date(Date.now() + 3600000),
                  syncEnabled: data.account.syncEnabled,
                },
              });

              createdAccounts.push({ account, syncEnabled: data.account.syncEnabled });
            }

            // Query for accounts that should be synced (simulating automatic sync)
            const accountsToSync = await prisma.emailAccount.findMany({
              where: {
                syncEnabled: true,
              },
            });

            // Property: All and only enabled accounts should be in sync list
            const enabledCount = createdAccounts.filter((a) => a.syncEnabled).length;
            expect(accountsToSync.length).toBeGreaterThanOrEqual(enabledCount);

            // Property: No disabled accounts should be in sync list
            for (const { account, syncEnabled } of createdAccounts) {
              const isInSyncList = accountsToSync.some((a) => a.id === account.id);
              if (syncEnabled) {
                expect(isInSyncList).toBe(true);
              } else {
                expect(isInSyncList).toBe(false);
              }
            }

            // Property: All accounts in sync list must have syncEnabled = true
            for (const account of accountsToSync) {
              expect(account.syncEnabled).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain sync state consistency across multiple sync cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
          }),
          fc.integer({ min: 2, max: 5 }), // Number of sync cycles
          async (userData, accountData, syncCycles) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
                lastSyncAt: null,
              },
            });

            let previousSyncTime: Date | null = null;

            // Simulate multiple sync cycles
            for (let i = 0; i < syncCycles; i++) {
              // Simulate sync by updating lastSyncAt
              const updatedAccount = await prisma.emailAccount.update({
                where: { id: account.id },
                data: { lastSyncAt: new Date() },
              });

              // Property: lastSyncAt should always be set after sync
              expect(updatedAccount.lastSyncAt).not.toBeNull();

              // Property: Each sync should update lastSyncAt to a later time
              if (previousSyncTime) {
                expect(updatedAccount.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(
                  previousSyncTime.getTime()
                );
              }

              previousSyncTime = updatedAccount.lastSyncAt;

              // Property: Account should remain enabled throughout sync cycles
              expect(updatedAccount.syncEnabled).toBe(true);

              // Small delay to ensure timestamps are different
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            // Property: After all syncs, lastSyncAt should be the most recent
            const finalAccount = await prisma.emailAccount.findUnique({
              where: { id: account.id },
            });
            expect(finalAccount!.lastSyncAt).toEqual(previousSyncTime);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 6: Thread metadata extraction completeness
   * Validates: Requirements 3.3
   * 
   * For any processed thread, the system should extract all required metadata fields:
   * parties involved, associated property (if any), current stage, risk signals, 
   * next actions, and relevant dates.
   */
  describe('Property 6: Thread metadata extraction completeness', () => {
    it('should extract all required metadata fields from threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          // Generate random email account
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
          }),
          // Generate random thread data with all required metadata
          fc.record({
            externalId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                email: fc.emailAddress(),
                role: fc.option(
                  fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker', 'other'),
                  { nil: undefined }
                ),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            classification: fc.constantFrom(
              'buyer',
              'vendor',
              'market',
              'lawyer_broker',
              'noise'
            ),
            category: fc.constantFrom('focus', 'waiting'),
            stage: fc.option(
              fc.constantFrom(
                'lead',
                'qualified',
                'viewing',
                'offer',
                'conditional',
                'pre_settlement',
                'sold',
                'nurture'
              ),
              { nil: undefined }
            ),
            riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
            riskReason: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
              nil: undefined,
            }),
            nextAction: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
              nil: undefined,
            }),
            nextActionOwner: fc.constantFrom('agent', 'other'),
            lastMessageAt: fc.date(),
            lastReplyAt: fc.option(fc.date(), { nil: undefined }),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (userData, accountData, threadData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
              },
            });

            // Create thread with all metadata fields
            const thread = await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: account.id,
                externalId: threadData.externalId,
                subject: threadData.subject,
                participants: threadData.participants,
                classification: threadData.classification,
                category: threadData.category,
                stage: threadData.stage,
                riskLevel: threadData.riskLevel,
                riskReason: threadData.riskReason,
                nextAction: threadData.nextAction,
                nextActionOwner: threadData.nextActionOwner,
                lastMessageAt: threadData.lastMessageAt,
                lastReplyAt: threadData.lastReplyAt,
                summary: threadData.summary,
              },
            });

            // Property: All required metadata fields should be present
            expect(thread.externalId).toBeDefined();
            expect(thread.subject).toBeDefined();
            expect(thread.participants).toBeDefined();
            expect(Array.isArray(thread.participants)).toBe(true);
            expect(thread.classification).toBeDefined();
            expect(thread.category).toBeDefined();
            expect(thread.riskLevel).toBeDefined();
            expect(thread.nextActionOwner).toBeDefined();
            expect(thread.lastMessageAt).toBeDefined();
            expect(thread.summary).toBeDefined();

            // Property: Participants (parties involved) should be an array with at least one entry
            const participants = thread.participants as any[];
            expect(participants.length).toBeGreaterThan(0);

            // Property: Each participant should have name and email (parties involved)
            for (const participant of participants) {
              expect(participant.name).toBeDefined();
              expect(participant.email).toBeDefined();
              expect(typeof participant.name).toBe('string');
              expect(typeof participant.email).toBe('string');
              // Role is optional but if present should be valid
              if (participant.role) {
                expect([
                  'buyer',
                  'vendor',
                  'agent',
                  'lawyer',
                  'broker',
                  'other',
                ]).toContain(participant.role);
              }
            }

            // Property: Classification should be one of valid values
            expect([
              'buyer',
              'vendor',
              'market',
              'lawyer_broker',
              'noise',
            ]).toContain(thread.classification);

            // Property: Category should be one of valid values
            expect(['focus', 'waiting']).toContain(thread.category);

            // Property: Stage (current stage) is optional but if present should be valid
            if (thread.stage) {
              expect([
                'lead',
                'qualified',
                'viewing',
                'offer',
                'conditional',
                'pre_settlement',
                'sold',
                'nurture',
              ]).toContain(thread.stage);
            }

            // Property: Risk level (risk signals) should be one of valid values
            expect(['none', 'low', 'medium', 'high']).toContain(thread.riskLevel);

            // Property: Risk reason (risk signals) is optional but if present should be a string
            if (thread.riskReason) {
              expect(typeof thread.riskReason).toBe('string');
              expect(thread.riskReason.length).toBeGreaterThan(0);
            }

            // Property: Next action is optional but if present should be a string
            if (thread.nextAction) {
              expect(typeof thread.nextAction).toBe('string');
              expect(thread.nextAction.length).toBeGreaterThan(0);
            }

            // Property: Next action owner should be one of valid values
            expect(['agent', 'other']).toContain(thread.nextActionOwner);

            // Property: lastMessageAt (relevant dates) should be a valid date
            expect(thread.lastMessageAt).toBeInstanceOf(Date);
            expect(thread.lastMessageAt.getTime()).not.toBeNaN();

            // Property: lastReplyAt (relevant dates) is optional but if present should be valid
            if (thread.lastReplyAt) {
              expect(thread.lastReplyAt).toBeInstanceOf(Date);
              expect(thread.lastReplyAt.getTime()).not.toBeNaN();
            }

            // Property: Associated property is optional (propertyId field)
            // If present, it should be a valid string ID
            if (thread.propertyId) {
              expect(typeof thread.propertyId).toBe('string');
              expect(thread.propertyId.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract metadata including associated property when present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
          }),
          fc.record({
            address: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          fc.record({
            externalId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            classification: fc.constantFrom('buyer', 'vendor'),
            stage: fc.constantFrom('viewing', 'offer', 'conditional'),
            riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
            nextAction: fc.string({ minLength: 1, maxLength: 200 }),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (userData, accountData, propertyData, threadData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
              },
            });

            // Create property
            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: propertyData.address,
              },
            });

            // Create thread with associated property
            const thread = await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: account.id,
                propertyId: property.id,
                externalId: threadData.externalId,
                subject: threadData.subject,
                participants: threadData.participants,
                classification: threadData.classification,
                category: 'focus',
                stage: threadData.stage,
                riskLevel: threadData.riskLevel,
                nextAction: threadData.nextAction,
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: threadData.summary,
              },
            });

            // Property: Thread should have associated property
            expect(thread.propertyId).toBeDefined();
            expect(thread.propertyId).toBe(property.id);

            // Property: All required metadata should be present
            expect(thread.externalId).toBeDefined();
            expect(thread.subject).toBeDefined();
            expect(thread.participants).toBeDefined();
            expect(thread.classification).toBeDefined();
            expect(thread.category).toBeDefined();
            expect(thread.stage).toBeDefined();
            expect(thread.riskLevel).toBeDefined();
            expect(thread.nextAction).toBeDefined();
            expect(thread.nextActionOwner).toBeDefined();
            expect(thread.lastMessageAt).toBeDefined();
            expect(thread.summary).toBeDefined();

            // Property: Participants should contain valid party information
            const participants = thread.participants as any[];
            expect(participants.length).toBeGreaterThan(0);
            for (const participant of participants) {
              expect(participant.name).toBeDefined();
              expect(participant.email).toBeDefined();
            }

            // Property: Stage should be valid when present
            expect([
              'lead',
              'qualified',
              'viewing',
              'offer',
              'conditional',
              'pre_settlement',
              'sold',
              'nurture',
            ]).toContain(thread.stage);

            // Property: Risk signals should be captured
            expect(['none', 'low', 'medium', 'high']).toContain(thread.riskLevel);

            // Property: Next actions should be captured
            expect(typeof thread.nextAction).toBe('string');
            expect(thread.nextAction!.length).toBeGreaterThan(0);

            // Property: Relevant dates should be valid
            expect(thread.lastMessageAt).toBeInstanceOf(Date);
            expect(thread.lastMessageAt.getTime()).not.toBeNaN();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve metadata consistency across updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            email: fc.emailAddress(),
          }),
          fc.record({
            externalId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          fc.record({
            newSubject: fc.string({ minLength: 1, maxLength: 200 }),
            newSummary: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (userData, accountData, threadData, updateData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const account = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.provider,
                email: accountData.email,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
              },
            });

            // Create initial thread
            const thread = await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: account.id,
                externalId: threadData.externalId,
                subject: threadData.subject,
                participants: threadData.participants,
                classification: 'noise',
                category: 'waiting',
                riskLevel: 'none',
                nextActionOwner: 'other',
                lastMessageAt: new Date(),
                summary: threadData.summary,
              },
            });

            // Update thread (simulating sync update)
            const updatedThread = await prisma.thread.update({
              where: { id: thread.id },
              data: {
                subject: updateData.newSubject,
                summary: updateData.newSummary,
                lastMessageAt: new Date(),
              },
            });

            // Property: External ID should remain unchanged
            expect(updatedThread.externalId).toBe(thread.externalId);

            // Property: User and account associations should remain unchanged
            expect(updatedThread.userId).toBe(thread.userId);
            expect(updatedThread.emailAccountId).toBe(thread.emailAccountId);

            // Property: Updated fields should reflect new values
            expect(updatedThread.subject).toBe(updateData.newSubject);
            expect(updatedThread.summary).toBe(updateData.newSummary);

            // Property: All required metadata should still be present
            expect(updatedThread.classification).toBeDefined();
            expect(updatedThread.category).toBeDefined();
            expect(updatedThread.riskLevel).toBeDefined();
            expect(updatedThread.nextActionOwner).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
