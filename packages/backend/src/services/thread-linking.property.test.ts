import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { threadLinkingService } from './thread-linking.service.js';

/**
 * Property-Based Tests for Thread Linking Service
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

describe('Thread Linking Property-Based Tests', () => {
  let testUserId: string;
  let testEmailAccountId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-pbt-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Test User PBT',
      },
    });
    testUserId = user.id;

    // Create test email account
    const emailAccount = await prisma.emailAccount.create({
      data: {
        userId: testUserId,
        provider: 'gmail',
        email: 'test-pbt@example.com',
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

  /**
   * Feature: zena-ai-real-estate-pwa, Property 22: Property thread attachment
   * 
   * Validates: Requirements 7.3, 11.3
   * 
   * Property: For any manually added property address, all email threads that 
   * mention that address should be automatically attached to the property.
   * 
   * This property tests that:
   * 1. When a property is created with an address
   * 2. And threads exist that mention that address
   * 3. Then all matching threads should be linked to the property
   * 4. And the property ID should be set on each thread
   */
  describe('Property 22: Property thread attachment', () => {
    it('should attach all threads mentioning a property address when property is created', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random property addresses
          fc.record({
            streetNumber: fc.integer({ min: 1, max: 9999 }),
            streetName: fc.constantFrom(
              'Main Street',
              'Oak Avenue',
              'Elm Road',
              'Park Lane',
              'High Street',
              'Church Road',
              'Station Road',
              'Victoria Street'
            ),
            city: fc.constantFrom(
              'Sydney',
              'Melbourne',
              'Brisbane',
              'Perth',
              'Adelaide',
              'Canberra'
            ),
          }),
          // Generate random thread subjects that may or may not mention the address
          fc.array(
            fc.record({
              mentionsAddress: fc.boolean(),
              subjectPrefix: fc.constantFrom(
                'RE:',
                'FW:',
                'About',
                'Inquiry:',
                'Question about',
                ''
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (propertyData, threadConfigs) => {
            // Create the property address
            const address = `${propertyData.streetNumber} ${propertyData.streetName}, ${propertyData.city}`;

            // Create threads with varying subjects
            const createdThreads = [];
            for (const config of threadConfigs) {
              const subject = config.mentionsAddress
                ? `${config.subjectPrefix} ${propertyData.streetNumber} ${propertyData.streetName}`.trim()
                : `${config.subjectPrefix} General inquiry`.trim();

              const thread = await prisma.thread.create({
                data: {
                  userId: testUserId,
                  emailAccountId: testEmailAccountId,
                  externalId: `ext-pbt-${Date.now()}-${Math.random()}`,
                  subject,
                  participants: [],
                  classification: 'buyer',
                  category: 'focus',
                  nextActionOwner: 'agent',
                  lastMessageAt: new Date(),
                  summary: config.mentionsAddress
                    ? `Discussion about ${address}`
                    : 'General discussion',
                },
              });
              createdThreads.push({ id: thread.id, shouldMatch: config.mentionsAddress });
            }

            // Now create the property
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address,
                milestones: [],
              },
            });

            // Re-link threads for this property
            const linkedCount = await threadLinkingService.relinkThreadsForProperty(
              property.id
            );

            // Verify: All threads that mention the address should be linked
            const expectedLinkedCount = createdThreads.filter(t => t.shouldMatch).length;
            expect(linkedCount).toBe(expectedLinkedCount);

            // Verify: Each thread that should match is actually linked
            for (const threadInfo of createdThreads) {
              const thread = await prisma.thread.findUnique({
                where: { id: threadInfo.id },
              });

              if (threadInfo.shouldMatch) {
                // Thread mentions address, should be linked
                expect(thread?.propertyId).toBe(property.id);
              } else {
                // Thread doesn't mention address, should not be linked
                expect(thread?.propertyId).toBeNull();
              }
            }

            // Clean up for next iteration
            await prisma.thread.deleteMany({
              where: { id: { in: createdThreads.map(t => t.id) } },
            });
            await prisma.property.delete({ where: { id: property.id } });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should handle address variations and partial matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate property address components
          fc.record({
            streetNumber: fc.integer({ min: 1, max: 999 }),
            streetName: fc.constantFrom('Main', 'Oak', 'Elm', 'Park'),
            streetType: fc.constantFrom('Street', 'Avenue', 'Road', 'Lane'),
            city: fc.constantFrom('Sydney', 'Melbourne', 'Brisbane'),
          }),
          // Generate how the address appears in thread (full, partial, abbreviated)
          fc.constantFrom('full', 'partial', 'abbreviated'),
          async (addressParts, mentionType) => {
            // Build full address
            const fullAddress = `${addressParts.streetNumber} ${addressParts.streetName} ${addressParts.streetType}, ${addressParts.city}`;

            // Build thread subject based on mention type
            let threadSubject: string;
            switch (mentionType) {
              case 'full':
                threadSubject = `Inquiry about ${fullAddress}`;
                break;
              case 'partial':
                threadSubject = `RE: ${addressParts.streetNumber} ${addressParts.streetName}`;
                break;
              case 'abbreviated':
                threadSubject = `About ${addressParts.streetNumber} ${addressParts.streetName} ${addressParts.streetType}`;
                break;
            }

            // Create thread
            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: testEmailAccountId,
                externalId: `ext-var-${Date.now()}-${Math.random()}`,
                subject: threadSubject,
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: 'Property inquiry',
              },
            });

            // Create property
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address: fullAddress,
                milestones: [],
              },
            });

            // Re-link threads
            const linkedCount = await threadLinkingService.relinkThreadsForProperty(
              property.id
            );

            // Property: All address variations should be matched
            expect(linkedCount).toBeGreaterThanOrEqual(1);

            // Verify thread is linked
            const updatedThread = await prisma.thread.findUnique({
              where: { id: thread.id },
            });
            expect(updatedThread?.propertyId).toBe(property.id);

            // Clean up
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.property.delete({ where: { id: property.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not link threads that do not mention the property address', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two different addresses
          fc.record({
            propertyAddress: fc.record({
              number: fc.integer({ min: 1, max: 999 }),
              street: fc.constantFrom('Main Street', 'Oak Avenue', 'Elm Road'),
              city: fc.constantFrom('Sydney', 'Melbourne'),
            }),
            unrelatedAddress: fc.record({
              number: fc.integer({ min: 1000, max: 9999 }), // Different range
              street: fc.constantFrom('Park Lane', 'High Street', 'Church Road'),
              city: fc.constantFrom('Brisbane', 'Perth'),
            }),
          }),
          async (addresses) => {
            const propertyAddress = `${addresses.propertyAddress.number} ${addresses.propertyAddress.street}, ${addresses.propertyAddress.city}`;
            const unrelatedAddress = `${addresses.unrelatedAddress.number} ${addresses.unrelatedAddress.street}, ${addresses.unrelatedAddress.city}`;

            // Create thread mentioning unrelated address
            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: testEmailAccountId,
                externalId: `ext-unrel-${Date.now()}-${Math.random()}`,
                subject: `About ${unrelatedAddress}`,
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: 'Different property inquiry',
              },
            });

            // Create property with different address
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address: propertyAddress,
                milestones: [],
              },
            });

            // Re-link threads
            await threadLinkingService.relinkThreadsForProperty(property.id);

            // Property: Thread should NOT be linked (different address)
            const updatedThread = await prisma.thread.findUnique({
              where: { id: thread.id },
            });
            expect(updatedThread?.propertyId).toBeNull();

            // Clean up
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.property.delete({ where: { id: property.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should link threads when address appears in summary instead of subject', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            streetNumber: fc.integer({ min: 1, max: 999 }),
            streetName: fc.constantFrom('Main Street', 'Oak Avenue', 'Park Lane'),
            city: fc.constantFrom('Sydney', 'Melbourne', 'Brisbane'),
          }),
          fc.constantFrom('subject', 'summary', 'both'),
          async (addressParts, location) => {
            const address = `${addressParts.streetNumber} ${addressParts.streetName}, ${addressParts.city}`;

            // Create thread with address in different locations
            const subject =
              location === 'subject' || location === 'both'
                ? `RE: ${addressParts.streetNumber} ${addressParts.streetName}`
                : 'Property inquiry';

            const summary =
              location === 'summary' || location === 'both'
                ? `Interested in viewing ${address} this weekend`
                : 'General inquiry about property';

            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: testEmailAccountId,
                externalId: `ext-loc-${Date.now()}-${Math.random()}`,
                subject,
                participants: [],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary,
              },
            });

            // Create property
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address,
                milestones: [],
              },
            });

            // Re-link threads
            const linkedCount = await threadLinkingService.relinkThreadsForProperty(
              property.id
            );

            // Property: Thread should be linked regardless of where address appears
            expect(linkedCount).toBe(1);

            const updatedThread = await prisma.thread.findUnique({
              where: { id: thread.id },
            });
            expect(updatedThread?.propertyId).toBe(property.id);

            // Clean up
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.property.delete({ where: { id: property.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
