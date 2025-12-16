import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { emailAccountService } from './email-account.service.js';
import { calendarAccountService } from './calendar-account.service.js';
import { dataDeletionService } from './data-deletion.service.js';

const prisma = new PrismaClient();

/**
 * Property-Based Tests for Data Deletion and Account Disconnection
 * 
 * These tests verify correctness properties for data deletion operations
 */

describe('Data Deletion - Property-Based Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.timelineEvent.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.voiceNote.deleteMany({});
    await prisma.export.deleteMany({});
    await prisma.cRMIntegration.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.thread.deleteMany({});
    await prisma.deal.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.calendarAccount.deleteMany({});
    await prisma.emailAccount.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.timelineEvent.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.voiceNote.deleteMany({});
    await prisma.export.deleteMany({});
    await prisma.cRMIntegration.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.thread.deleteMany({});
    await prisma.deal.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.calendarAccount.deleteMany({});
    await prisma.emailAccount.deleteMany({});
    await prisma.user.deleteMany({});
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 66: Account disconnection data handling
   * Validates: Requirements 18.5
   * 
   * For any disconnected email account, the system should remove access to that 
   * account's data while preserving manually entered information.
   */
  describe('Property 66: Account disconnection data handling', () => {
    it('should remove email account threads but preserve manually entered data', async () => {
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
          // Generate random thread count
          fc.integer({ min: 1, max: 5 }),
          // Generate random manual data
          fc.record({
            contactName: fc.string({ minLength: 1, maxLength: 50 }),
            contactEmail: fc.emailAddress(),
            propertyAddress: fc.string({ minLength: 10, maxLength: 200 }),
            manualTaskLabel: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData, accountData, threadCount, manualData) => {
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

            // Create threads from this email account
            const threadIds = [];
            for (let i = 0; i < threadCount; i++) {
              const thread = await prisma.thread.create({
                data: {
                  userId: user.id,
                  emailAccountId: account.id,
                  externalId: `external-${i}`,
                  subject: `Test Thread ${i}`,
                  participants: [{ name: 'Test', email: 'test@example.com' }],
                  classification: 'buyer',
                  category: 'focus',
                  riskLevel: 'none',
                  nextActionOwner: 'agent',
                  lastMessageAt: new Date(),
                  summary: `Summary ${i}`,
                },
              });
              threadIds.push(thread.id);
            }

            // Create manually entered contact
            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: manualData.contactName,
                emails: [manualData.contactEmail],
                phones: [],
                role: 'buyer',
                relationshipNotes: [],
              },
            });

            // Create manually entered property
            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: manualData.propertyAddress,
                milestones: [],
              },
            });

            // Create manual task
            const manualTask = await prisma.task.create({
              data: {
                userId: user.id,
                label: manualData.manualTaskLabel,
                status: 'open',
                source: 'manual',
              },
            });

            // Create email-sourced task
            const emailTask = await prisma.task.create({
              data: {
                userId: user.id,
                label: 'Email task',
                status: 'open',
                source: 'email',
              },
            });

            // Disconnect email account
            await emailAccountService.disconnectEmailAccount(account.id, user.id);

            // Property: Email account should be deleted
            const deletedAccount = await prisma.emailAccount.findUnique({
              where: { id: account.id },
            });
            expect(deletedAccount).toBeNull();

            // Property: Threads from this account should be deleted
            for (const threadId of threadIds) {
              const thread = await prisma.thread.findUnique({
                where: { id: threadId },
              });
              expect(thread).toBeNull();
            }

            // Property: Manually entered contact should be preserved
            const preservedContact = await prisma.contact.findUnique({
              where: { id: contact.id },
            });
            expect(preservedContact).not.toBeNull();
            expect(preservedContact!.name).toBe(manualData.contactName);

            // Property: Manually entered property should be preserved
            const preservedProperty = await prisma.property.findUnique({
              where: { id: property.id },
            });
            expect(preservedProperty).not.toBeNull();
            expect(preservedProperty!.address).toBe(manualData.propertyAddress);

            // Property: Manual task should be preserved
            const preservedManualTask = await prisma.task.findUnique({
              where: { id: manualTask.id },
            });
            expect(preservedManualTask).not.toBeNull();
            expect(preservedManualTask!.source).toBe('manual');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve manually entered data when disconnecting calendar account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            provider: fc.constantFrom('google', 'microsoft'),
            email: fc.emailAddress(),
          }),
          fc.record({
            contactName: fc.string({ minLength: 1, maxLength: 50 }),
            propertyAddress: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          async (userData, accountData, manualData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create calendar account
            const account = await prisma.calendarAccount.create({
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

            // Create calendar-sourced timeline event
            const calendarEvent = await prisma.timelineEvent.create({
              data: {
                userId: user.id,
                type: 'meeting',
                entityType: 'property',
                entityId: 'test-property-id',
                summary: 'Calendar meeting',
                timestamp: new Date(),
              },
            });

            // Create manually entered contact
            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: manualData.contactName,
                emails: ['manual@example.com'],
                phones: [],
                role: 'vendor',
                relationshipNotes: [],
              },
            });

            // Create manually entered property
            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: manualData.propertyAddress,
                milestones: [],
              },
            });

            // Disconnect calendar account
            await calendarAccountService.disconnectCalendarAccount(account.id, user.id);

            // Property: Calendar account should be deleted
            const deletedAccount = await prisma.calendarAccount.findUnique({
              where: { id: account.id },
            });
            expect(deletedAccount).toBeNull();

            // Property: Manually entered contact should be preserved
            const preservedContact = await prisma.contact.findUnique({
              where: { id: contact.id },
            });
            expect(preservedContact).not.toBeNull();

            // Property: Manually entered property should be preserved
            const preservedProperty = await prisma.property.findUnique({
              where: { id: property.id },
            });
            expect(preservedProperty).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle disconnection of multiple email accounts independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.array(
            fc.record({
              provider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
              email: fc.emailAddress(),
            }),
            { minLength: 2, maxLength: 3 }
          ),
          async (userData, accountsData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create multiple email accounts
            const accounts = [];
            const accountThreads = new Map();

            for (const accountData of accountsData) {
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

              // Create thread for this account
              const thread = await prisma.thread.create({
                data: {
                  userId: user.id,
                  emailAccountId: account.id,
                  externalId: `external-${account.id}`,
                  subject: `Thread for ${account.email}`,
                  participants: [{ name: 'Test', email: accountData.email }],
                  classification: 'buyer',
                  category: 'focus',
                  riskLevel: 'none',
                  nextActionOwner: 'agent',
                  lastMessageAt: new Date(),
                  summary: 'Test summary',
                },
              });

              accounts.push(account);
              accountThreads.set(account.id, thread.id);
            }

            // Disconnect first account only
            const accountToDisconnect = accounts[0];
            await emailAccountService.disconnectEmailAccount(
              accountToDisconnect.id,
              user.id
            );

            // Property: Disconnected account should be deleted
            const deletedAccount = await prisma.emailAccount.findUnique({
              where: { id: accountToDisconnect.id },
            });
            expect(deletedAccount).toBeNull();

            // Property: Thread from disconnected account should be deleted
            const deletedThread = await prisma.thread.findUnique({
              where: { id: accountThreads.get(accountToDisconnect.id) },
            });
            expect(deletedThread).toBeNull();

            // Property: Other accounts should remain intact
            for (let i = 1; i < accounts.length; i++) {
              const account = accounts[i];
              const preservedAccount = await prisma.emailAccount.findUnique({
                where: { id: account.id },
              });
              expect(preservedAccount).not.toBeNull();

              // Property: Threads from other accounts should be preserved
              const preservedThread = await prisma.thread.findUnique({
                where: { id: accountThreads.get(account.id) },
              });
              expect(preservedThread).not.toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 83: Data deletion completeness
   * Validates: Requirements 22.4
   * 
   * For any account disconnection or data deletion request, the system should 
   * permanently remove the data from storage.
   */
  describe('Property 83: Data deletion completeness', () => {
    it('should permanently delete all user data when requested', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            emailProvider: fc.constantFrom('gmail', 'outlook', 'microsoft'),
            emailAddress: fc.emailAddress(),
            calendarProvider: fc.constantFrom('google', 'microsoft'),
            calendarEmail: fc.emailAddress(),
          }),
          async (userData, accountsData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create email account
            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountsData.emailProvider,
                email: accountsData.emailAddress,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
              },
            });

            // Create calendar account
            const calendarAccount = await prisma.calendarAccount.create({
              data: {
                userId: user.id,
                provider: accountsData.calendarProvider,
                email: accountsData.calendarEmail,
                accessToken: 'encrypted_token',
                refreshToken: 'encrypted_refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
                syncEnabled: true,
              },
            });

            // Create thread
            const thread = await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: emailAccount.id,
                externalId: 'external-123',
                subject: 'Test Thread',
                participants: [{ name: 'Test', email: 'test@example.com' }],
                classification: 'buyer',
                category: 'focus',
                riskLevel: 'none',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: 'Test summary',
              },
            });

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: 'Test Contact',
                emails: ['contact@example.com'],
                phones: [],
                role: 'buyer',
                relationshipNotes: [],
              },
            });

            // Create property
            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: '123 Test St',
                milestones: [],
              },
            });

            // Create deal
            const deal = await prisma.deal.create({
              data: {
                userId: user.id,
                propertyId: property.id,
                stage: 'viewing',
                riskLevel: 'none',
                riskFlags: [],
                nextActionOwner: 'agent',
                summary: 'Test deal',
              },
            });

            // Create task
            const task = await prisma.task.create({
              data: {
                userId: user.id,
                label: 'Test task',
                status: 'open',
                source: 'manual',
              },
            });

            // Create voice note
            const voiceNote = await prisma.voiceNote.create({
              data: {
                userId: user.id,
                audioUrl: 'https://example.com/audio.mp3',
                transcript: 'Test transcript',
                extractedEntities: [],
                processingStatus: 'completed',
              },
            });

            // Create timeline event
            const timelineEvent = await prisma.timelineEvent.create({
              data: {
                userId: user.id,
                type: 'note',
                entityType: 'deal',
                entityId: deal.id,
                summary: 'Test note',
                timestamp: new Date(),
              },
            });

            // Create export
            const exportRecord = await prisma.export.create({
              data: {
                userId: user.id,
                type: 'contacts',
                format: 'csv',
                fileUrl: 'https://example.com/export.csv',
                recordCount: 1,
                status: 'completed',
              },
            });

            // Create CRM integration
            const crmIntegration = await prisma.cRMIntegration.create({
              data: {
                userId: user.id,
                provider: 'mri_vault',
                credentials: 'encrypted_credentials',
                syncEnabled: true,
                syncConfig: {},
              },
            });

            // Create push subscription
            const pushSubscription = await prisma.pushSubscription.create({
              data: {
                userId: user.id,
                endpoint: 'https://push.example.com/subscription',
                keys: { p256dh: 'key1', auth: 'key2' },
              },
            });

            // Delete all user data
            const result = await dataDeletionService.deleteAllUserData(user.id);

            // Property: Deletion should be successful
            expect(result.success).toBe(true);

            // Property: All email accounts should be deleted
            const remainingEmailAccounts = await prisma.emailAccount.findMany({
              where: { userId: user.id },
            });
            expect(remainingEmailAccounts.length).toBe(0);

            // Property: All calendar accounts should be deleted
            const remainingCalendarAccounts = await prisma.calendarAccount.findMany({
              where: { userId: user.id },
            });
            expect(remainingCalendarAccounts.length).toBe(0);

            // Property: All threads should be deleted
            const remainingThreads = await prisma.thread.findMany({
              where: { userId: user.id },
            });
            expect(remainingThreads.length).toBe(0);

            // Property: All contacts should be deleted
            const remainingContacts = await prisma.contact.findMany({
              where: { userId: user.id },
            });
            expect(remainingContacts.length).toBe(0);

            // Property: All properties should be deleted
            const remainingProperties = await prisma.property.findMany({
              where: { userId: user.id },
            });
            expect(remainingProperties.length).toBe(0);

            // Property: All deals should be deleted
            const remainingDeals = await prisma.deal.findMany({
              where: { userId: user.id },
            });
            expect(remainingDeals.length).toBe(0);

            // Property: All tasks should be deleted
            const remainingTasks = await prisma.task.findMany({
              where: { userId: user.id },
            });
            expect(remainingTasks.length).toBe(0);

            // Property: All voice notes should be deleted
            const remainingVoiceNotes = await prisma.voiceNote.findMany({
              where: { userId: user.id },
            });
            expect(remainingVoiceNotes.length).toBe(0);

            // Property: All timeline events should be deleted
            const remainingTimelineEvents = await prisma.timelineEvent.findMany({
              where: { userId: user.id },
            });
            expect(remainingTimelineEvents.length).toBe(0);

            // Property: All exports should be deleted
            const remainingExports = await prisma.export.findMany({
              where: { userId: user.id },
            });
            expect(remainingExports.length).toBe(0);

            // Property: All CRM integrations should be deleted
            const remainingCRMIntegrations = await prisma.cRMIntegration.findMany({
              where: { userId: user.id },
            });
            expect(remainingCRMIntegrations.length).toBe(0);

            // Property: All push subscriptions should be deleted
            const remainingPushSubscriptions = await prisma.pushSubscription.findMany({
              where: { userId: user.id },
            });
            expect(remainingPushSubscriptions.length).toBe(0);

            // Property: Deleted counts should be accurate
            expect(result.deletedCounts.emailAccounts).toBeGreaterThan(0);
            expect(result.deletedCounts.calendarAccounts).toBeGreaterThan(0);
            expect(result.deletedCounts.threads).toBeGreaterThan(0);
            expect(result.deletedCounts.contacts).toBeGreaterThan(0);
            expect(result.deletedCounts.properties).toBeGreaterThan(0);
            expect(result.deletedCounts.deals).toBeGreaterThan(0);
            expect(result.deletedCounts.tasks).toBeGreaterThan(0);
            expect(result.deletedCounts.voiceNotes).toBeGreaterThan(0);
            expect(result.deletedCounts.timelineEvents).toBeGreaterThan(0);
            expect(result.deletedCounts.exports).toBeGreaterThan(0);
            expect(result.deletedCounts.crmIntegrations).toBeGreaterThan(0);
            expect(result.deletedCounts.pushSubscriptions).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should selectively delete only requested data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          fc.record({
            deleteContacts: fc.boolean(),
            deleteProperties: fc.boolean(),
            deleteDeals: fc.boolean(),
            deleteTasks: fc.boolean(),
          }),
          async (userData, deletionOptions) => {
            // Skip if no deletion options selected
            if (
              !deletionOptions.deleteContacts &&
              !deletionOptions.deleteProperties &&
              !deletionOptions.deleteDeals &&
              !deletionOptions.deleteTasks
            ) {
              return;
            }

            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: 'Test Contact',
                emails: ['contact@example.com'],
                phones: [],
                role: 'buyer',
                relationshipNotes: [],
              },
            });

            // Create property
            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: '123 Test St',
                milestones: [],
              },
            });

            // Create deal
            const deal = await prisma.deal.create({
              data: {
                userId: user.id,
                propertyId: property.id,
                stage: 'viewing',
                riskLevel: 'none',
                riskFlags: [],
                nextActionOwner: 'agent',
                summary: 'Test deal',
              },
            });

            // Create task
            const task = await prisma.task.create({
              data: {
                userId: user.id,
                label: 'Test task',
                status: 'open',
                source: 'manual',
              },
            });

            // Perform selective deletion
            const result = await dataDeletionService.deleteSelectiveUserData(
              user.id,
              deletionOptions
            );

            // Property: Deletion should be successful
            expect(result.success).toBe(true);

            // Property: Contacts should be deleted only if requested
            const remainingContacts = await prisma.contact.findMany({
              where: { userId: user.id },
            });
            if (deletionOptions.deleteContacts) {
              expect(remainingContacts.length).toBe(0);
              expect(result.deletedCounts.contacts).toBeGreaterThan(0);
            } else {
              expect(remainingContacts.length).toBeGreaterThan(0);
              expect(result.deletedCounts.contacts).toBe(0);
            }

            // Property: Properties should be deleted only if requested
            const remainingProperties = await prisma.property.findMany({
              where: { userId: user.id },
            });
            if (deletionOptions.deleteProperties) {
              expect(remainingProperties.length).toBe(0);
              expect(result.deletedCounts.properties).toBeGreaterThan(0);
            } else {
              expect(remainingProperties.length).toBeGreaterThan(0);
              expect(result.deletedCounts.properties).toBe(0);
            }

            // Property: Deals should be deleted only if requested
            const remainingDeals = await prisma.deal.findMany({
              where: { userId: user.id },
            });
            if (deletionOptions.deleteDeals) {
              expect(remainingDeals.length).toBe(0);
              expect(result.deletedCounts.deals).toBeGreaterThan(0);
            } else {
              expect(remainingDeals.length).toBeGreaterThan(0);
              expect(result.deletedCounts.deals).toBe(0);
            }

            // Property: Tasks should be deleted only if requested
            const remainingTasks = await prisma.task.findMany({
              where: { userId: user.id },
            });
            if (deletionOptions.deleteTasks) {
              expect(remainingTasks.length).toBe(0);
              expect(result.deletedCounts.tasks).toBeGreaterThan(0);
            } else {
              expect(remainingTasks.length).toBeGreaterThan(0);
              expect(result.deletedCounts.tasks).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should permanently delete user account and all associated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          async (userData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            // Create some data
            await prisma.contact.create({
              data: {
                userId: user.id,
                name: 'Test Contact',
                emails: ['contact@example.com'],
                phones: [],
                role: 'buyer',
                relationshipNotes: [],
              },
            });

            await prisma.property.create({
              data: {
                userId: user.id,
                address: '123 Test St',
                milestones: [],
              },
            });

            // Delete user account
            await dataDeletionService.deleteUserAccount(user.id);

            // Property: User account should be permanently deleted
            const deletedUser = await prisma.user.findUnique({
              where: { id: user.id },
            });
            expect(deletedUser).toBeNull();

            // Property: All associated data should be deleted
            const remainingContacts = await prisma.contact.findMany({
              where: { userId: user.id },
            });
            expect(remainingContacts.length).toBe(0);

            const remainingProperties = await prisma.property.findMany({
              where: { userId: user.id },
            });
            expect(remainingProperties.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure data is not recoverable after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            password: fc.string({ minLength: 8, maxLength: 100 }),
          }),
          async (userData) => {
            // Create test user
            const user = await prisma.user.create({
              data: {
                email: userData.email,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            const userId = user.id;

            // Create data
            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: 'Sensitive Contact',
                emails: ['sensitive@example.com'],
                phones: ['555-1234'],
                role: 'buyer',
                relationshipNotes: [
                  {
                    id: 'note-1',
                    content: 'Sensitive information',
                    source: 'manual',
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
            });

            const contactId = contact.id;

            // Delete all user data
            await dataDeletionService.deleteAllUserData(userId);

            // Property: Data should not be retrievable by any means
            const retrievedContact = await prisma.contact.findUnique({
              where: { id: contactId },
            });
            expect(retrievedContact).toBeNull();

            // Property: Searching by user ID should return no results
            const contactsByUser = await prisma.contact.findMany({
              where: { userId },
            });
            expect(contactsByUser.length).toBe(0);

            // Property: Searching by email should not return deleted contact
            const contactsByEmail = await prisma.contact.findMany({
              where: {
                emails: {
                  has: 'sensitive@example.com',
                },
              },
            });
            expect(contactsByEmail.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
