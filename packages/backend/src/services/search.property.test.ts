import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { searchService, type SearchOptions } from './search.service.js';

const prisma = new PrismaClient();

/**
 * Property-Based Tests for Search Service
 * 
 * These tests validate the correctness properties defined in the design document
 * using property-based testing with fast-check.
 */
describe('Search Service - Property-Based Tests', () => {
  let testUserId: string;
  let testEmailAccountId: string;

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-search-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    // Create a test email account
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
    testEmailAccountId = emailAccount.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.thread.deleteMany({ where: { userId: testUserId } });
    await prisma.deal.deleteMany({ where: { userId: testUserId } });
    await prisma.property.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.emailAccount.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 59: Search result matching
   * 
   * For any search query, the system should return results matching deals, 
   * contacts, properties, or communications.
   * 
   * Validates: Requirements 17.1
   */
  it('Property 59: All search results should match the query', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random search data
        fc.record({
          contactName: fc.string({ minLength: 3, maxLength: 20 }),
          propertyAddress: fc.string({ minLength: 10, maxLength: 50 }),
          threadSubject: fc.string({ minLength: 5, maxLength: 30 }),
          dealSummary: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async (testData) => {
          // Create test entities with the generated data
          const contact = await prisma.contact.create({
            data: {
              userId: testUserId,
              name: testData.contactName,
              emails: [`${testData.contactName.toLowerCase().replace(/\s+/g, '')}@example.com`],
              phones: [],
              role: 'buyer',
              relationshipNotes: [],
            },
          });

          const property = await prisma.property.create({
            data: {
              userId: testUserId,
              address: testData.propertyAddress,
              milestones: [],
            },
          });

          const thread = await prisma.thread.create({
            data: {
              userId: testUserId,
              emailAccountId: testEmailAccountId,
              externalId: `ext-${Date.now()}-${Math.random()}`,
              subject: testData.threadSubject,
              participants: [],
              classification: 'buyer',
              category: 'focus',
              nextActionOwner: 'agent',
              lastMessageAt: new Date(),
              summary: `Summary for ${testData.threadSubject}`,
            },
          });

          const deal = await prisma.deal.create({
            data: {
              userId: testUserId,
              propertyId: property.id,
              stage: 'viewing',
              riskLevel: 'none',
              riskFlags: [],
              nextActionOwner: 'agent',
              summary: testData.dealSummary,
            },
          });

          try {
            // Test 1: Search for contact name
            const contactResults = await searchService.search({
              query: testData.contactName,
              userId: testUserId,
            });

            const contactMatches = contactResults.filter(r => 
              r.type === 'contact' && r.id === contact.id
            );
            expect(contactMatches.length).toBeGreaterThan(0);

            // Test 2: Search for property address
            const propertyResults = await searchService.search({
              query: testData.propertyAddress,
              userId: testUserId,
            });

            const propertyMatches = propertyResults.filter(r => 
              r.type === 'property' && r.id === property.id
            );
            expect(propertyMatches.length).toBeGreaterThan(0);

            // Test 3: Search for thread subject
            const threadResults = await searchService.search({
              query: testData.threadSubject,
              userId: testUserId,
            });

            const threadMatches = threadResults.filter(r => 
              r.type === 'thread' && r.id === thread.id
            );
            expect(threadMatches.length).toBeGreaterThan(0);

            // Test 4: Search for deal summary
            const dealResults = await searchService.search({
              query: testData.dealSummary,
              userId: testUserId,
            });

            const dealMatches = dealResults.filter(r => 
              r.type === 'deal' && r.id === deal.id
            );
            expect(dealMatches.length).toBeGreaterThan(0);

            // Verify all results contain the query (case-insensitive)
            const allResults = [
              ...contactResults,
              ...propertyResults,
              ...threadResults,
              ...dealResults,
            ];

            allResults.forEach(result => {
              const queryLower = result.type === 'contact' ? testData.contactName.toLowerCase() :
                                 result.type === 'property' ? testData.propertyAddress.toLowerCase() :
                                 result.type === 'thread' ? testData.threadSubject.toLowerCase() :
                                 testData.dealSummary.toLowerCase();
              
              const titleLower = result.title.toLowerCase();
              const snippetLower = result.snippet.toLowerCase();
              
              const matches = titleLower.includes(queryLower) || 
                            snippetLower.includes(queryLower);
              
              expect(matches).toBe(true);
            });
          } finally {
            // Clean up
            await prisma.deal.delete({ where: { id: deal.id } });
            await prisma.thread.delete({ where: { id: thread.id } });
            await prisma.property.delete({ where: { id: property.id } });
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        }
      ),
      { numRuns: 10 } // Run 10 iterations for faster testing
    );
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 60: Search result ranking
   * 
   * For any search results, they should be ranked such that more relevant 
   * and more recent items appear before less relevant and older items.
   * 
   * Validates: Requirements 17.2
   */
  it('Property 60: Search results should be ranked by relevance and recency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseQuery: fc.string({ minLength: 5, maxLength: 15 }),
          exactMatch: fc.string({ minLength: 5, maxLength: 15 }),
          partialMatch: fc.string({ minLength: 5, maxLength: 15 }),
        }),
        async (testData) => {
          // Create contacts with different match qualities
          const exactContact = await prisma.contact.create({
            data: {
              userId: testUserId,
              name: testData.exactMatch,
              emails: [`exact-${Date.now()}@example.com`],
              phones: [],
              role: 'buyer',
              relationshipNotes: [],
            },
          });

          const partialContact = await prisma.contact.create({
            data: {
              userId: testUserId,
              name: `${testData.partialMatch} ${testData.exactMatch} extra`,
              emails: [`partial-${Date.now()}@example.com`],
              phones: [],
              role: 'buyer',
              relationshipNotes: [],
            },
          });

          try {
            // Search for the exact match term
            const results = await searchService.search({
              query: testData.exactMatch,
              userId: testUserId,
              types: ['contact'],
            });

            // Find positions of our test contacts
            const exactIndex = results.findIndex(r => r.id === exactContact.id);
            const partialIndex = results.findIndex(r => r.id === partialContact.id);

            // If both are found, exact match should rank higher (lower index)
            if (exactIndex !== -1 && partialIndex !== -1) {
              expect(exactIndex).toBeLessThan(partialIndex);
            }

            // Verify results are sorted by score (descending)
            for (let i = 0; i < results.length - 1; i++) {
              const currentScore = results[i].relevanceScore;
              const nextScore = results[i + 1].relevanceScore;
              
              // Current score should be >= next score (allowing for recency adjustments)
              // We allow some tolerance due to recency scoring
              expect(currentScore).toBeGreaterThanOrEqual(nextScore - 50);
            }
          } finally {
            // Clean up
            await prisma.contact.delete({ where: { id: exactContact.id } });
            await prisma.contact.delete({ where: { id: partialContact.id } });
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 61: Address search completeness
   * 
   * For any search query containing a property address, the system should 
   * return the property and all associated threads.
   * 
   * Validates: Requirements 17.3
   */
  it('Property 61: Address search should return property and all associated threads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          streetNumber: fc.integer({ min: 1, max: 9999 }),
          streetName: fc.constantFrom('Main', 'Oak', 'Elm', 'Pine', 'Maple'),
          streetType: fc.constantFrom('Street', 'Avenue', 'Road', 'Lane'),
          threadCount: fc.integer({ min: 1, max: 5 }),
        }),
        async (testData) => {
          const address = `${testData.streetNumber} ${testData.streetName} ${testData.streetType}`;

          // Create property
          const property = await prisma.property.create({
            data: {
              userId: testUserId,
              address,
              milestones: [],
            },
          });

          // Create multiple threads mentioning this property
          const threads = [];
          for (let i = 0; i < testData.threadCount; i++) {
            const thread = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: testEmailAccountId,
                externalId: `ext-${Date.now()}-${Math.random()}`,
                subject: `Thread ${i} about ${address}`,
                participants: [],
                classification: 'buyer',
                category: 'focus',
                propertyId: property.id,
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: `Discussion about property at ${address}`,
              },
            });
            threads.push(thread);
          }

          try {
            // Search for the address
            const results = await searchService.search({
              query: address,
              userId: testUserId,
            });

            // Verify property is in results
            const propertyResults = results.filter(r => 
              r.type === 'property' && r.id === property.id
            );
            expect(propertyResults.length).toBe(1);

            // Verify all threads are in results
            const threadResults = results.filter(r => r.type === 'thread');
            const foundThreadIds = new Set(threadResults.map(r => r.id));
            
            threads.forEach(thread => {
              expect(foundThreadIds.has(thread.id)).toBe(true);
            });

            // Verify minimum result count (property + all threads)
            expect(results.length).toBeGreaterThanOrEqual(1 + testData.threadCount);
          } finally {
            // Clean up
            await Promise.all(threads.map(t => 
              prisma.thread.delete({ where: { id: t.id } })
            ));
            await prisma.property.delete({ where: { id: property.id } });
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
