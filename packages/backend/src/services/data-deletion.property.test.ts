import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { dataDeletionService } from './data-deletion.service.js';
import { emailAccountService } from './email-account.service.js';
import { calendarAccountService } from './calendar-account.service.js';

const prisma = new PrismaClient();

/**
 * Property-Based Tests for Data Deletion Service
 * 
 * Validates requirements for permanent and selective data deletion.
 */

describe('Data Deletion - Property-Based Tests', () => {
  beforeEach(async () => {
    // Clean up test data for deletion tests specifically
    const deletionTestPrefix = 'test-deletion-';
    await prisma.timelineEvent.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.task.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.voiceNote.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.export.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.cRMIntegration.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.pushSubscription.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.thread.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.deal.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.property.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.contact.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.calendarAccount.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.emailAccount.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: deletionTestPrefix } } });
  });

  afterEach(async () => {
    // Clean up test data for deletion tests specifically
    const deletionTestPrefix = 'test-deletion-';
    await prisma.timelineEvent.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.task.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.voiceNote.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.export.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.cRMIntegration.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.pushSubscription.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.thread.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.deal.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.property.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.contact.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.calendarAccount.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.emailAccount.deleteMany({ where: { user: { email: { startsWith: deletionTestPrefix } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: deletionTestPrefix } } });
  });

  const generateEmailWithPrefix = (email: string) => `test-deletion-${email}-${Math.random().toString(36).substring(7)}`;

  /**
   * Feature: zena-ai-real-estate-pwa, Property 66: Account disconnection data handling
   */
  describe('Property 66: Account disconnection data handling', () => {
    it('should remove email account threads but preserve manually entered data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            name: fc.string({ minLength: 1 }),
          }),
          fc.record({
            emailProvider: fc.constantFrom('gmail', 'outlook'),
            emailAddress: fc.emailAddress(),
            contactName: fc.string({ minLength: 1 }),
          }),
          async (userData, accountData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({
              data: {
                email: userEmail,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            const emailAccount = await prisma.emailAccount.create({
              data: {
                userId: user.id,
                provider: accountData.emailProvider,
                email: accountData.emailAddress,
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            await prisma.thread.create({
              data: {
                userId: user.id,
                emailAccountId: emailAccount.id,
                externalId: `thread-${Math.random()}`,
                subject: 'Test Thread',
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                summary: 'Test summary',
                lastMessageAt: new Date(),
              },
            });

            const contact = await prisma.contact.create({
              data: {
                userId: user.id,
                name: accountData.contactName,
                emails: [accountData.emailAddress],
                role: 'buyer',
              },
            });

            await emailAccountService.disconnectEmailAccount(emailAccount.id, user.id);

            const threadsCount = await prisma.thread.count({ where: { emailAccountId: emailAccount.id } });
            expect(threadsCount).toBe(0);

            const contactExists = await prisma.contact.findUnique({ where: { id: contact.id } });
            expect(contactExists).toBeTruthy();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should preserve manually entered data when disconnecting calendar account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            name: fc.string({ minLength: 1 }),
          }),
          fc.record({
            calendarProvider: fc.constant('google'),
            calendarEmail: fc.emailAddress(),
            propertyName: fc.string({ minLength: 1 }),
          }),
          async (userData, accountData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({
              data: {
                email: userEmail,
                passwordHash: userData.password,
                name: userData.name,
              },
            });

            const calendarAccount = await prisma.calendarAccount.create({
              data: {
                userId: user.id,
                provider: accountData.calendarProvider,
                email: accountData.calendarEmail,
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                tokenExpiry: new Date(Date.now() + 3600000),
              },
            });

            const property = await prisma.property.create({
              data: {
                userId: user.id,
                address: accountData.propertyName,
              },
            });

            await calendarAccountService.disconnectCalendarAccount(calendarAccount.id, user.id);

            const calAccountExists = await prisma.calendarAccount.findUnique({ where: { id: calendarAccount.id } });
            expect(calAccountExists).toBeNull();

            const propertyExists = await prisma.property.findUnique({ where: { id: property.id } });
            expect(propertyExists).toBeTruthy();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle disconnection of multiple email accounts independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ email: fc.emailAddress(), password: fc.string(), name: fc.string() }),
          fc.array(fc.record({ provider: fc.constant('gmail'), email: fc.emailAddress() }), { minLength: 2, maxLength: 3 }),
          async (userData, accounts) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({ data: { email: userEmail, passwordHash: userData.password, name: userData.name } });

            const createdAccounts = [];
            for (const acc of accounts) {
              const account = await prisma.emailAccount.create({
                data: { userId: user.id, provider: acc.provider, email: acc.email, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() }
              });
              createdAccounts.push(account);
            }

            await emailAccountService.disconnectEmailAccount(createdAccounts[0].id, user.id);

            const acc1Exists = await prisma.emailAccount.findUnique({ where: { id: createdAccounts[0].id } });
            expect(acc1Exists).toBeNull();

            const acc2Exists = await prisma.emailAccount.findUnique({ where: { id: createdAccounts[1].id } });
            expect(acc2Exists).toBeTruthy();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 83: Data deletion completeness
   */
  describe('Property 83: Data deletion completeness', () => {
    it('should permanently delete all user data when requested', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ email: fc.emailAddress(), name: fc.string(), password: fc.string() }),
          fc.record({ emailProvider: fc.string(), emailAddress: fc.emailAddress(), calendarProvider: fc.string(), calendarEmail: fc.emailAddress() }),
          async (userData, accountsData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({ data: { email: userEmail, passwordHash: userData.password, name: userData.name } });

            await prisma.emailAccount.create({ data: { userId: user.id, provider: accountsData.emailProvider, email: accountsData.emailAddress, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() } });
            await prisma.calendarAccount.create({ data: { userId: user.id, provider: accountsData.calendarProvider, email: accountsData.calendarEmail, accessToken: 't', refreshToken: 'r', tokenExpiry: new Date() } });
            await prisma.contact.create({ data: { userId: user.id, name: 'C', emails: ['c@c.c'], role: 'buyer' } });
            await prisma.property.create({ data: { userId: user.id, address: 'A' } });

            await dataDeletionService.deleteAllUserData(user.id);

            const contacts = await prisma.contact.count({ where: { userId: user.id } });
            const properties = await prisma.property.count({ where: { userId: user.id } });
            const emailAccs = await prisma.emailAccount.count({ where: { userId: user.id } });

            expect(contacts).toBe(0);
            expect(properties).toBe(0);
            expect(emailAccs).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should selectively delete only requested data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ email: fc.emailAddress(), name: fc.string(), password: fc.string() }),
          async (userData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({ data: { email: userEmail, passwordHash: userData.password, name: userData.name } });

            await prisma.contact.create({ data: { userId: user.id, name: 'C', emails: ['c@c.c'], role: 'buyer' } });
            await prisma.property.create({ data: { userId: user.id, address: 'A' } });

            await dataDeletionService.deleteSelectiveUserData(user.id, { deleteContacts: true });

            const contacts = await prisma.contact.count({ where: { userId: user.id } });
            const properties = await prisma.property.count({ where: { userId: user.id } });

            expect(contacts).toBe(0);
            expect(properties).toBe(1);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should permanently delete user account and all associated data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ email: fc.emailAddress(), name: fc.string(), password: fc.string() }),
          async (userData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({ data: { email: userEmail, passwordHash: userData.password, name: userData.name } });

            await dataDeletionService.deleteUserAccount(user.id);

            const userExists = await prisma.user.findUnique({ where: { id: user.id } });
            expect(userExists).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should ensure data is not recoverable after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ email: fc.emailAddress(), name: fc.string(), password: fc.string() }),
          async (userData) => {
            const userEmail = generateEmailWithPrefix(userData.email);
            const user = await prisma.user.create({ data: { email: userEmail, passwordHash: userData.password, name: userData.name } });
            const task = await prisma.task.create({ data: { userId: user.id, label: 'T', source: 'manual' } });

            await dataDeletionService.deleteAllUserData(user.id);

            const foundTask = await prisma.task.findUnique({ where: { id: task.id } });
            expect(foundTask).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
