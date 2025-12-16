import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from '../config/database.js';
import { threadLinkingService } from './thread-linking.service.js';
import type { Participant } from '../models/types.js';

describe('ThreadLinkingService', () => {
  let testUserId: string;
  let testEmailAccountId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-linking@example.com',
        passwordHash: 'hash',
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test email account
    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: testUserId,
        provider: 'gmail',
        email: 'test@example.com',
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(Date.now() + 3600000),
      },
    });
    testEmailAccountId = emailAccount.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.thread.deleteMany({ where: { userId: testUserId } });
    await prisma.property.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.emailAccount.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('linkThreadToProperty', () => {
    it('should link thread to property when address is mentioned in subject', async () => {
      // Create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '123 Main Street, Sydney',
          milestones: [],
        },
      });

      // Create thread with property address in subject
      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-123',
          subject: 'RE: 123 Main Street viewing',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Discussion about property viewing',
        },
      });

      // Link thread to property
      const propertyId = await threadLinkingService.linkThreadToProperty(
        thread.id,
        testUserId,
        thread.subject,
        thread.summary
      );

      expect(propertyId).toBe(property.id);

      // Verify thread was updated
      const updatedThread = await prisma.thread.findUnique({
        where: { id: thread.id },
      });
      expect(updatedThread?.propertyId).toBe(property.id);
    });

    it('should link thread to property when address is mentioned in summary', async () => {
      // Create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '456 Oak Avenue, Melbourne',
          milestones: [],
        },
      });

      // Create thread with property address in summary
      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-456',
          subject: 'Property inquiry',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Interested in viewing 456 Oak Avenue, Melbourne this weekend',
        },
      });

      // Link thread to property
      const propertyId = await threadLinkingService.linkThreadToProperty(
        thread.id,
        testUserId,
        thread.subject,
        thread.summary
      );

      expect(propertyId).toBe(property.id);
    });

    it('should return null when no matching property is found', async () => {
      // Create thread without matching property
      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-789',
          subject: 'General inquiry',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Just asking about market conditions',
        },
      });

      const propertyId = await threadLinkingService.linkThreadToProperty(
        thread.id,
        testUserId,
        thread.subject,
        thread.summary
      );

      expect(propertyId).toBeNull();
    });

    it('should handle partial address matches', async () => {
      // Create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '789 Elm Street, Brisbane QLD 4000',
          milestones: [],
        },
      });

      // Create thread with partial address
      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-partial',
          subject: 'About 789 Elm',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Interested in the property',
        },
      });

      const propertyId = await threadLinkingService.linkThreadToProperty(
        thread.id,
        testUserId,
        thread.subject,
        thread.summary
      );

      expect(propertyId).toBe(property.id);
    });
  });

  describe('findContactsForThread', () => {
    it('should find contacts matching thread participants by email', async () => {
      // Create contacts
      const contact1 = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: 'John Buyer',
          emails: ['john@example.com'],
          phones: [],
          role: 'buyer',
          relationshipNotes: [],
        },
      });

      const contact2 = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: 'Jane Vendor',
          emails: ['jane@example.com'],
          phones: [],
          role: 'vendor',
          relationshipNotes: [],
        },
      });

      // Create participants
      const participants: Participant[] = [
        { name: 'John Buyer', email: 'john@example.com' },
        { name: 'Jane Vendor', email: 'jane@example.com' },
      ];

      const contactIds = await threadLinkingService.findContactsForThread(
        testUserId,
        participants
      );

      expect(contactIds).toHaveLength(2);
      expect(contactIds).toContain(contact1.id);
      expect(contactIds).toContain(contact2.id);
    });

    it('should handle case-insensitive email matching', async () => {
      // Create contact with lowercase email
      const contact = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: 'Test Contact',
          emails: ['test@example.com'],
          phones: [],
          role: 'buyer',
          relationshipNotes: [],
        },
      });

      // Participants with uppercase email
      const participants: Participant[] = [
        { name: 'Test Contact', email: 'TEST@EXAMPLE.COM' },
      ];

      const contactIds = await threadLinkingService.findContactsForThread(
        testUserId,
        participants
      );

      expect(contactIds).toHaveLength(1);
      expect(contactIds[0]).toBe(contact.id);
    });

    it('should return empty array when no contacts match', async () => {
      const participants: Participant[] = [
        { name: 'Unknown Person', email: 'unknown@example.com' },
      ];

      const contactIds = await threadLinkingService.findContactsForThread(
        testUserId,
        participants
      );

      expect(contactIds).toHaveLength(0);
    });
  });

  describe('autoLinkThread', () => {
    it('should automatically link thread to both property and contacts', async () => {
      // Create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '100 Test Street, Sydney',
          milestones: [],
        },
      });

      // Create contact
      const contact = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: 'Buyer Contact',
          emails: ['buyer@example.com'],
          phones: [],
          role: 'buyer',
          relationshipNotes: [],
        },
      });

      // Create thread
      const participants: Participant[] = [
        { name: 'Buyer Contact', email: 'buyer@example.com' },
      ];

      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-auto',
          subject: 'Viewing at 100 Test Street',
          participants: participants as any,
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Request for property viewing',
        },
      });

      // Auto-link thread
      const result = await threadLinkingService.autoLinkThread(thread.id);

      expect(result.propertyId).toBe(property.id);
      expect(result.contactIds).toHaveLength(1);
      expect(result.contactIds[0]).toBe(contact.id);

      // Verify thread was updated
      const updatedThread = await prisma.thread.findUnique({
        where: { id: thread.id },
      });
      expect(updatedThread?.propertyId).toBe(property.id);
    });

    it('should not overwrite existing property link', async () => {
      // Create two properties
      const property1 = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '200 First Street',
          milestones: [],
        },
      });

      // Create second property (mentioned in thread but should not override)
      await prisma.property.create({
        data: {
          userId: testUserId,
          address: '300 Second Street',
          milestones: [],
        },
      });

      // Create thread already linked to property1
      const thread = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-existing',
          subject: 'About 300 Second Street',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Inquiry',
          propertyId: property1.id,
        },
      });

      // Auto-link should not change existing property link
      const result = await threadLinkingService.autoLinkThread(thread.id);

      expect(result.propertyId).toBe(property1.id);
    });
  });

  describe('relinkThreadsForProperty', () => {
    it('should link all matching threads when property is created', async () => {
      // Create threads first
      const thread1 = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-relink-1',
          subject: 'About 500 New Street',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Interested in viewing',
        },
      });

      const thread2 = await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-relink-2',
          subject: 'RE: 500 New Street offer',
          participants: [],
          classification: 'buyer',
          category: 'waiting',
          nextActionOwner: 'other',
          lastMessageAt: new Date(),
          summary: 'Making an offer',
        },
      });

      // Now create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '500 New Street, Perth',
          milestones: [],
        },
      });

      // Relink threads
      const linkedCount = await threadLinkingService.relinkThreadsForProperty(property.id);

      expect(linkedCount).toBe(2);

      // Verify both threads are linked
      const updatedThread1 = await prisma.thread.findUnique({
        where: { id: thread1.id },
      });
      const updatedThread2 = await prisma.thread.findUnique({
        where: { id: thread2.id },
      });

      expect(updatedThread1?.propertyId).toBe(property.id);
      expect(updatedThread2?.propertyId).toBe(property.id);
    });
  });

  describe('getThreadsForProperty', () => {
    it('should return all threads linked to a property', async () => {
      // Create property
      const property = await prisma.property.create({
        data: {
          userId: testUserId,
          address: '600 Property Lane',
          milestones: [],
        },
      });

      // Create threads linked to property
      await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-prop-1',
          subject: 'Thread 1',
          participants: [],
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date('2024-01-01'),
          summary: 'First thread',
          propertyId: property.id,
        },
      });

      await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-prop-2',
          subject: 'Thread 2',
          participants: [],
          classification: 'vendor',
          category: 'waiting',
          nextActionOwner: 'other',
          lastMessageAt: new Date('2024-01-02'),
          summary: 'Second thread',
          propertyId: property.id,
        },
      });

      const threads = await threadLinkingService.getThreadsForProperty(property.id);

      expect(threads).toHaveLength(2);
      expect(threads[0].lastMessageAt.getTime()).toBeGreaterThan(
        threads[1].lastMessageAt.getTime()
      );
    });
  });

  describe('getThreadsForContact', () => {
    it('should return all threads involving a contact', async () => {
      // Create contact
      const contact = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: 'Contact Person',
          emails: ['contact@example.com'],
          phones: [],
          role: 'buyer',
          relationshipNotes: [],
        },
      });

      // Create threads with this contact as participant
      const participants: Participant[] = [
        { name: 'Contact Person', email: 'contact@example.com' },
      ];

      await prisma.thread.create({
        data: {
          userId: testUserId,
          emailAccountId: testEmailAccountId,
          externalId: 'ext-contact-1',
          subject: 'Thread with contact',
          participants: participants as any,
          classification: 'buyer',
          category: 'focus',
          nextActionOwner: 'agent',
          lastMessageAt: new Date(),
          summary: 'Discussion',
        },
      });

      const threads = await threadLinkingService.getThreadsForContact(contact.id);

      expect(threads).toHaveLength(1);
      expect(threads[0].subject).toBe('Thread with contact');
    });
  });
});
