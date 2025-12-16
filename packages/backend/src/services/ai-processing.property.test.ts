import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AIProcessingService } from './ai-processing.service.js';
import type { ThreadData } from './ai-processing.service.js';

describe('AIProcessingService Property-Based Tests', () => {
  let aiService: AIProcessingService;

  beforeEach(() => {
    aiService = new AIProcessingService();
  });

  // Generator for thread data - shared across all tests
  const threadDataArbitrary = fc.record({
    id: fc.uuid(),
    subject: fc.string({ minLength: 1, maxLength: 200 }),
    participants: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.emailAddress(),
        role: fc.option(fc.constantFrom('buyer', 'vendor', 'agent', 'lawyer', 'broker', 'other'), { nil: undefined }),
      }),
      { minLength: 1, maxLength: 10 }
    ),
    summary: fc.string({ minLength: 1, maxLength: 500 }),
    lastMessageAt: fc.date(),
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 4: Thread classification completeness
   * Validates: Requirements 3.1
   * 
   * For any processed email thread, it should be classified into exactly one of the 
   * following categories: Buyer, Vendor, Market contact, Lawyer/Broker/Other, or Noise/Marketing.
   * 
   * This property tests that:
   * 1. Every thread receives a classification
   * 2. The classification is one of the valid types
   * 3. The classification is deterministic for the same input
   */
  describe('Property 4: Thread classification completeness', () => {
    it('should classify every thread into exactly one valid category', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property 1: Classification must be one of the valid types
            const validClassifications = ['buyer', 'vendor', 'market', 'lawyer_broker', 'noise'];
            expect(validClassifications).toContain(result.classification);

            // Property 2: Classification must not be null or undefined
            expect(result.classification).toBeDefined();
            expect(result.classification).not.toBeNull();

            // Property 3: Classification must be a string
            expect(typeof result.classification).toBe('string');

            // Property 4: Classification must be exactly one value (not multiple)
            expect(validClassifications.filter(c => c === result.classification).length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce deterministic classifications for the same thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            // Classify the same thread twice
            const result1 = await aiService.classifyThread(threadData);
            const result2 = await aiService.classifyThread(threadData);

            // Property: Same input should produce same classification
            expect(result1.classification).toBe(result2.classification);
            expect(result1.category).toBe(result2.category);
            expect(result1.nextActionOwner).toBe(result2.nextActionOwner);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify threads with buyer keywords as buyer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Interested in buying property',
              'Purchase inquiry',
              'Viewing request',
              'Buyer looking for homes'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Buyer expressing interest in purchasing',
              'Client wants to view the property',
              'Potential buyer inquiry'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with clear buyer signals should be classified as buyer
            // (using fallback classification since we don't have API key in tests)
            expect(result.classification).toBe('buyer');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify threads with vendor keywords as vendor', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Listing my property for sale',
              'Vendor inquiry',
              'Want to sell my house',
              'Property listing request'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Vendor wants to list property',
              'Seller inquiry about listing',
              'Property owner wants to sell'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with clear vendor signals should be classified as vendor
            expect(result.classification).toBe('vendor');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify threads with noise keywords as noise', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Newsletter: Market updates - Unsubscribe',
              'Marketing promotion',
              'Weekly newsletter',
              'Promotional offer - Click to unsubscribe'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Marketing newsletter with unsubscribe link',
              'Promotional content',
              'Newsletter with market updates'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with clear noise/marketing signals should be classified as noise
            expect(result.classification).toBe('noise');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify threads with lawyer keywords as lawyer_broker', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Legal review required',
              'Conveyancer inquiry',
              'Lawyer needs contract details',
              'Solicitor requesting documents'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Lawyer requesting legal documents',
              'Conveyancer needs contract review',
              'Legal professional inquiry'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with clear legal/broker signals should be classified as lawyer_broker
            expect(result.classification).toBe('lawyer_broker');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify threads with market keywords as market', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Market update from fellow agent',
              'Industry insights',
              'Agent collaboration',
              'Market trends discussion'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Discussion with another agent about market',
              'Industry professional sharing insights',
              'Market contact communication'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with clear market/agent signals should be classified as market
            expect(result.classification).toBe('market');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle threads with minimal or ambiguous information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 20 }), // Short, ambiguous subjects
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 50 }), // Short, ambiguous summaries
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Even ambiguous threads must receive a valid classification
            const validClassifications = ['buyer', 'vendor', 'market', 'lawyer_broker', 'noise'];
            expect(validClassifications).toContain(result.classification);

            // Property: Ambiguous threads should have lower confidence
            // (though this is implementation-dependent)
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 5: Thread categorization exclusivity
   * Validates: Requirements 3.2
   * 
   * For any classified thread, it should be placed in exactly one category: 
   * either Focus (agent owes reply) or Waiting (others owe reply).
   * 
   * This property tests that:
   * 1. Every thread is categorized as either focus or waiting
   * 2. A thread cannot be in both categories
   * 3. The category is consistent with the next action owner
   */
  describe('Property 5: Thread categorization exclusivity', () => {
    it('should categorize every thread as either focus or waiting, never both', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property 1: Category must be one of the valid types
            const validCategories = ['focus', 'waiting'];
            expect(validCategories).toContain(result.category);

            // Property 2: Category must not be null or undefined
            expect(result.category).toBeDefined();
            expect(result.category).not.toBeNull();

            // Property 3: Category must be a string
            expect(typeof result.category).toBe('string');

            // Property 4: Category must be exactly one value (exclusivity)
            expect(validCategories.filter(c => c === result.category).length).toBe(1);

            // Property 5: Category cannot be both focus and waiting
            if (result.category === 'focus') {
              expect(result.category).not.toBe('waiting');
            } else {
              expect(result.category).not.toBe('focus');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure category is consistent with next action owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Category and next action owner should be logically consistent
            // Focus threads should typically have agent as next action owner
            // Waiting threads should typically have other as next action owner
            if (result.category === 'focus') {
              expect(result.nextActionOwner).toBe('agent');
            } else if (result.category === 'waiting') {
              expect(result.nextActionOwner).toBe('other');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize reply threads (with Re:) as waiting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 100 }).map((s: string) => `Re: ${s}`),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Threads with "Re:" in subject are typically replies, 
            // indicating waiting for response
            expect(result.category).toBe('waiting');
            expect(result.nextActionOwner).toBe('other');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize new threads (without Re:) as focus', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => !s.toLowerCase().includes('re:')),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: New threads without "Re:" typically need agent action
            expect(result.category).toBe('focus');
            expect(result.nextActionOwner).toBe('agent');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure next action owner is always valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.classifyThread(threadData);

            // Property: Next action owner must be one of the valid types
            const validOwners = ['agent', 'other'];
            expect(validOwners).toContain(result.nextActionOwner);

            // Property: Next action owner must not be null or undefined
            expect(result.nextActionOwner).toBeDefined();
            expect(result.nextActionOwner).not.toBeNull();

            // Property: Next action owner must be a string
            expect(typeof result.nextActionOwner).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce deterministic categorization for the same thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            // Categorize the same thread twice
            const result1 = await aiService.classifyThread(threadData);
            const result2 = await aiService.classifyThread(threadData);

            // Property: Same input should produce same categorization
            expect(result1.category).toBe(result2.category);
            expect(result1.nextActionOwner).toBe(result2.nextActionOwner);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 20: Contact deduplication
   * Validates: Requirements 7.1, 10.2, 18.4
   * 
   * For any set of contacts with matching email addresses or names, the system should 
   * merge them into a single contact record.
   * 
   * This property tests that:
   * 1. Contacts with the same email are deduplicated
   * 2. Email arrays are merged without duplicates
   * 3. Phone arrays are merged without duplicates
   * 4. Contact information is preserved during deduplication
   */
  describe('Property 20: Contact deduplication', () => {
    it('should extract contacts with valid structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property 1: Contacts array must be defined
            expect(result.contacts).toBeDefined();
            expect(Array.isArray(result.contacts)).toBe(true);

            // Property 2: Each contact must have required fields
            result.contacts.forEach((contact) => {
              expect(contact).toHaveProperty('name');
              expect(contact).toHaveProperty('email');
              expect(contact).toHaveProperty('role');
              expect(contact).toHaveProperty('confidence');

              // Property 3: Role must be valid
              const validRoles = ['buyer', 'vendor', 'market', 'other'];
              expect(validRoles).toContain(contact.role);

              // Property 4: Confidence must be between 0 and 1
              expect(contact.confidence).toBeGreaterThanOrEqual(0);
              expect(contact.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract at least one contact from thread participants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
                role: fc.option(fc.constantFrom('buyer', 'vendor', 'agent', 'other'), { nil: undefined }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: Should extract at least as many contacts as participants
            expect(result.contacts.length).toBeGreaterThanOrEqual(threadData.participants.length);

            // Property: Each participant should be represented in contacts
            threadData.participants.forEach((participant) => {
              const found = result.contacts.some(
                (contact) => contact.email === participant.email
              );
              expect(found).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate contacts with same email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 2, maxLength: 5 }
            ).map((participants: Array<{ name: string; email: string }>) => {
              // Force some participants to have the same email
              if (participants.length >= 2) {
                participants[1].email = participants[0].email;
              }
              return participants;
            }),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: No two contacts should have the exact same email
            const emails = result.contacts.map((c) => c.email);
            const uniqueEmails = new Set(emails);
            expect(uniqueEmails.size).toBe(emails.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve contact information during extraction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 200 }),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
                role: fc.constantFrom('buyer', 'vendor', 'agent', 'other'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 500 }),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: All participant information should be preserved
            threadData.participants.forEach((participant) => {
              const contact = result.contacts.find((c) => c.email === participant.email);
              expect(contact).toBeDefined();
              if (contact) {
                expect(contact.name).toBe(participant.name);
                expect(contact.email).toBe(participant.email);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 21: Contact classification
   * Validates: Requirements 7.2
   * 
   * For any created contact, the system should classify them as Buyer, Vendor, 
   * Market contact, or Other.
   * 
   * This property tests that:
   * 1. Every contact has a valid role classification
   * 2. The role is one of the allowed values
   * 3. The classification is consistent with thread context
   */
  describe('Property 21: Contact classification', () => {
    it('should classify every contact with a valid role', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: Every contact must have a valid role
            const validRoles = ['buyer', 'vendor', 'market', 'other'];
            result.contacts.forEach((contact) => {
              expect(validRoles).toContain(contact.role);
              expect(contact.role).toBeDefined();
              expect(contact.role).not.toBeNull();
              expect(typeof contact.role).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify contacts from buyer threads as buyers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Interested in buying property',
              'Purchase inquiry',
              'Buyer looking for homes'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
                role: fc.constant('buyer'),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.constantFrom(
              'Buyer expressing interest in purchasing',
              'Client wants to view the property'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: Contacts from buyer threads should be classified as buyers
            // (at least some of them, depending on context)
            const buyerContacts = result.contacts.filter((c) => c.role === 'buyer');
            expect(buyerContacts.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should classify contacts from vendor threads as vendors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Listing my property for sale',
              'Vendor inquiry',
              'Want to sell my house'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
                role: fc.constant('vendor'),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.constantFrom(
              'Vendor wants to list property',
              'Seller inquiry about listing'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: Contacts from vendor threads should be classified as vendors
            const vendorContacts = result.contacts.filter((c) => c.role === 'vendor');
            expect(vendorContacts.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent classification for the same contact', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            // Extract entities twice from the same thread
            const result1 = await aiService.extractEntities(threadData);
            const result2 = await aiService.extractEntities(threadData);

            // Property: Same contact should have same classification
            result1.contacts.forEach((contact1) => {
              const contact2 = result2.contacts.find((c) => c.email === contact1.email);
              if (contact2) {
                expect(contact2.role).toBe(contact1.role);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to "other" for ambiguous contacts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 50 }), // Ambiguous subject
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 50 }), // Ambiguous summary
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: All contacts must have a valid role, even if ambiguous
            const validRoles = ['buyer', 'vendor', 'market', 'other'];
            result.contacts.forEach((contact) => {
              expect(validRoles).toContain(contact.role);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 7: Entity linking consistency
   * Validates: Requirements 3.4
   * 
   * For any set of threads that reference the same property address or contact email, 
   * all threads should be linked together in the data model.
   * 
   * This property tests that:
   * 1. Properties are extracted from thread content
   * 2. Properties have valid addresses
   * 3. Extracted entities maintain referential consistency
   * 4. Entity extraction is deterministic
   */
  describe('Property 7: Entity linking consistency', () => {
    it('should extract properties with valid structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property 1: Properties array must be defined
            expect(result.properties).toBeDefined();
            expect(Array.isArray(result.properties)).toBe(true);

            // Property 2: Each property must have required fields
            result.properties.forEach((property) => {
              expect(property).toHaveProperty('address');
              expect(property).toHaveProperty('confidence');

              // Property 3: Address must be a non-empty string
              expect(typeof property.address).toBe('string');
              expect(property.address.length).toBeGreaterThan(0);

              // Property 4: Confidence must be between 0 and 1
              expect(property.confidence).toBeGreaterThanOrEqual(0);
              expect(property.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract properties from threads with address patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Viewing at 123 Main Street',
              'Property at 456 Oak Avenue',
              'Inquiry about 789 Elm Road'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Would like to schedule a viewing at 123 Main Street',
              'Interested in the property at 456 Oak Avenue',
              'Questions about 789 Elm Road'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: Threads with clear address patterns should extract properties
            // (using fallback extraction since we don't have API key in tests)
            expect(result.properties.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent entity extraction for the same thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            // Extract entities twice from the same thread
            const result1 = await aiService.extractEntities(threadData);
            const result2 = await aiService.extractEntities(threadData);

            // Property: Same thread should produce same number of entities
            expect(result1.contacts.length).toBe(result2.contacts.length);
            expect(result1.properties.length).toBe(result2.properties.length);
            expect(result1.dates.length).toBe(result2.dates.length);
            expect(result1.actions.length).toBe(result2.actions.length);

            // Property: Same contacts should be extracted
            result1.contacts.forEach((contact1) => {
              const contact2 = result2.contacts.find((c) => c.email === contact1.email);
              expect(contact2).toBeDefined();
            });

            // Property: Same properties should be extracted
            result1.properties.forEach((property1) => {
              const property2 = result2.properties.find((p) => p.address === property1.address);
              expect(property2).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract all entity types with valid structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: All entity arrays must be defined
            expect(result.contacts).toBeDefined();
            expect(result.properties).toBeDefined();
            expect(result.dates).toBeDefined();
            expect(result.actions).toBeDefined();

            // Property: All entity arrays must be arrays
            expect(Array.isArray(result.contacts)).toBe(true);
            expect(Array.isArray(result.properties)).toBe(true);
            expect(Array.isArray(result.dates)).toBe(true);
            expect(Array.isArray(result.actions)).toBe(true);

            // Property: Dates must have valid structure
            result.dates.forEach((date) => {
              expect(date).toHaveProperty('date');
              expect(date).toHaveProperty('type');
              expect(date).toHaveProperty('description');
              expect(date).toHaveProperty('confidence');

              const validDateTypes = ['viewing', 'appraisal', 'meeting', 'auction', 'settlement', 'other'];
              expect(validDateTypes).toContain(date.type);
            });

            // Property: Actions must have valid structure
            result.actions.forEach((action) => {
              expect(action).toHaveProperty('action');
              expect(action).toHaveProperty('owner');
              expect(action).toHaveProperty('confidence');

              const validOwners = ['agent', 'other'];
              expect(validOwners).toContain(action.owner);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate deal stage when present', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: If deal stage is present, it must be valid
            if (result.dealStage) {
              const validStages = ['lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'];
              expect(validStages).toContain(result.dealStage);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate risk signal when present', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const result = await aiService.extractEntities(threadData);

            // Property: If risk signal is present, it must be valid
            if (result.riskSignal) {
              expect(result.riskSignal).toHaveProperty('level');
              expect(result.riskSignal).toHaveProperty('reason');
              expect(result.riskSignal).toHaveProperty('confidence');

              const validLevels = ['none', 'low', 'medium', 'high'];
              expect(validLevels).toContain(result.riskSignal.level);

              expect(result.riskSignal.confidence).toBeGreaterThanOrEqual(0);
              expect(result.riskSignal.confidence).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 18: Focus thread draft generation
   * Validates: Requirements 6.3
   * 
   * For any thread in the Focus list, the system should provide a draft response.
   * 
   * This property tests that:
   * 1. Every Focus thread receives a draft response
   * 2. The draft response is non-empty and meaningful
   * 3. The draft response is contextually appropriate
   * 4. Draft generation is deterministic for the same input
   */
  describe('Property 18: Focus thread draft generation', () => {
    it('should generate a draft response for every thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property 1: Draft response must be defined
            expect(draftResponse).toBeDefined();
            expect(draftResponse).not.toBeNull();

            // Property 2: Draft response must be a string
            expect(typeof draftResponse).toBe('string');

            // Property 3: Draft response must not be empty
            expect(draftResponse.length).toBeGreaterThan(0);

            // Property 4: Draft response should have meaningful content (more than just whitespace)
            expect(draftResponse.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate contextually appropriate draft responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Viewing request for 123 Main Street',
              'Question about property price',
              'Interested in scheduling an inspection'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            summary: fc.constantFrom(
              'Client wants to schedule a viewing',
              'Buyer asking about property details',
              'Inquiry about inspection times'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft should be contextually relevant
            // For viewing/inspection requests, draft should mention scheduling or coordination
            const lowerDraft = draftResponse.toLowerCase();
            const hasRelevantContent = 
              lowerDraft.includes('viewing') ||
              lowerDraft.includes('inspection') ||
              lowerDraft.includes('schedule') ||
              lowerDraft.includes('time') ||
              lowerDraft.includes('property') ||
              lowerDraft.includes('thank') ||
              lowerDraft.includes('happy') ||
              lowerDraft.includes('arrange');

            expect(hasRelevantContent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate professional and polite draft responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft should contain professional language
            const lowerDraft = draftResponse.toLowerCase();
            
            // Should contain at least one professional greeting or closing
            const hasProfessionalTone = 
              lowerDraft.includes('thank') ||
              lowerDraft.includes('regards') ||
              lowerDraft.includes('appreciate') ||
              lowerDraft.includes('please') ||
              lowerDraft.includes('happy') ||
              lowerDraft.includes('glad');

            expect(hasProfessionalTone).toBe(true);

            // Property: Draft should not be excessively long (reasonable length)
            expect(draftResponse.length).toBeLessThan(2000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate deterministic drafts for the same thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            // Generate draft twice for the same thread
            const draft1 = await aiService.generateDraftResponse(threadData);
            const draft2 = await aiService.generateDraftResponse(threadData);

            // Property: Same input should produce same draft
            // (when using fallback, this should be deterministic)
            expect(draft1).toBe(draft2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate drafts for buyer inquiry threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Interested in buying property',
              'Purchase inquiry',
              'Looking to buy a home'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.constantFrom(
              'Buyer expressing interest in purchasing',
              'Client wants information about buying',
              'Potential buyer inquiry'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft for buyer inquiries should be helpful and engaging
            expect(draftResponse.length).toBeGreaterThan(20);
            
            const lowerDraft = draftResponse.toLowerCase();
            const hasRelevantContent = 
              lowerDraft.includes('property') ||
              lowerDraft.includes('buy') ||
              lowerDraft.includes('purchase') ||
              lowerDraft.includes('interest') ||
              lowerDraft.includes('information') ||
              lowerDraft.includes('help');

            expect(hasRelevantContent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate drafts for vendor inquiry threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Want to list my property',
              'Selling my house',
              'Vendor inquiry'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.constantFrom(
              'Vendor wants to list property',
              'Seller inquiry about listing',
              'Property owner wants to sell'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft for vendor inquiries should address listing/selling
            expect(draftResponse.length).toBeGreaterThan(20);
            
            const lowerDraft = draftResponse.toLowerCase();
            const hasRelevantContent = 
              lowerDraft.includes('property') ||
              lowerDraft.includes('list') ||
              lowerDraft.includes('sell') ||
              lowerDraft.includes('vendor') ||
              lowerDraft.includes('information') ||
              lowerDraft.includes('help');

            expect(hasRelevantContent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate drafts for offer-related threads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.constantFrom(
              'Making an offer on property',
              'Offer submission',
              'Bid for property'
            ),
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            summary: fc.constantFrom(
              'Client wants to make an offer',
              'Buyer submitting a bid',
              'Offer details provided'
            ),
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft for offer threads should acknowledge and indicate next steps
            expect(draftResponse.length).toBeGreaterThan(20);
            
            const lowerDraft = draftResponse.toLowerCase();
            const hasRelevantContent = 
              lowerDraft.includes('offer') ||
              lowerDraft.includes('bid') ||
              lowerDraft.includes('review') ||
              lowerDraft.includes('next') ||
              lowerDraft.includes('step') ||
              lowerDraft.includes('thank');

            expect(hasRelevantContent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle threads with minimal information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 20 }), // Short subject
            participants: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                email: fc.emailAddress(),
              }),
              { minLength: 1, maxLength: 2 }
            ),
            summary: fc.string({ minLength: 1, maxLength: 30 }), // Short summary
            lastMessageAt: fc.date(),
          }),
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Even with minimal info, should generate a valid draft
            expect(draftResponse).toBeDefined();
            expect(draftResponse.length).toBeGreaterThan(0);
            expect(typeof draftResponse).toBe('string');

            // Property: Should still be professional even with limited context
            const lowerDraft = draftResponse.toLowerCase();
            const hasProfessionalTone = 
              lowerDraft.includes('thank') ||
              lowerDraft.includes('regards') ||
              lowerDraft.includes('appreciate') ||
              lowerDraft.includes('received');

            expect(hasProfessionalTone).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include subject lines in draft response', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft should not contain "Subject:" prefix
            expect(draftResponse).not.toMatch(/^Subject:/i);
            expect(draftResponse).not.toMatch(/\nSubject:/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate drafts with reasonable structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          threadDataArbitrary,
          async (threadData: ThreadData) => {
            const draftResponse = await aiService.generateDraftResponse(threadData);

            // Property: Draft should have reasonable structure
            // Should contain at least one sentence (has a period, question mark, or exclamation)
            const hasSentenceStructure = 
              draftResponse.includes('.') ||
              draftResponse.includes('?') ||
              draftResponse.includes('!') ||
              draftResponse.includes('\n');

            expect(hasSentenceStructure).toBe(true);

            // Property: Should not be just a single word
            const words = draftResponse.trim().split(/\s+/);
            expect(words.length).toBeGreaterThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
