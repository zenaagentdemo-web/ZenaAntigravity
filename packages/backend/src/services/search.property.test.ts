import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { searchService } from './search.service.js';

/**
 * Property-Based Tests for Search Service
 * 
 * These tests use the real database with per-run user isolation.
 */
describe('Search Service - Property-Based Tests', () => {
  // Helper to create test user
  const createTestUser = async () => {
    return prisma.user.create({
      data: {
        email: `test-search-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Search PBT User',
      },
    });
  };

  // Helper to clean up user data
  const cleanupUser = async (userId: string) => {
    try {
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.thread.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (e) { }
  };

  // String generator that doesn't produce just whitespace or special characters that might break simple search
  const meaningfulString = fc.string({ minLength: 3, maxLength: 50 })
    .map(s => s.replace(/[^a-zA-Z0-9 ]/g, ''))
    .map(s => s.trim())
    .filter(s => s.length >= 3);

  it('Property 59: All search results should match the query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contactName: meaningfulString,
          propertyAddress: meaningfulString,
          threadSubject: meaningfulString,
          dealSummary: meaningfulString,
        }),
        async (data) => {
          const user = await createTestUser();
          try {
            const contact = await prisma.contact.create({
              data: { userId: user.id, name: data.contactName, emails: ['c@t.com'], role: 'buyer' }
            });
            const property = await prisma.property.create({
              data: { userId: user.id, address: data.propertyAddress }
            });

            // Search by contact name
            const contactResults = await searchService.search({ query: data.contactName, userId: user.id });
            expect(contactResults.some(r => r.id === contact.id)).toBe(true);

            // Search by property address
            const propertyResults = await searchService.search({ query: data.propertyAddress, userId: user.id });
            expect(propertyResults.some(r => r.id === property.id)).toBe(true);
          } finally {
            await cleanupUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 61: Address search should return property and associated threads', async () => {
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

            const results = await searchService.search({ query: data.address, userId: user.id });
            expect(results.some(r => r.type === 'property' && r.id === property.id)).toBe(true);
          } finally {
            await cleanupUser(user.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
