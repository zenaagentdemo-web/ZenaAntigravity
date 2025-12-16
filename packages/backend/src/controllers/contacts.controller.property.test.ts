import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { contactsController } from './contacts.controller.js';
import type { Request, Response } from 'express';

/**
 * Property-Based Tests for Contacts Controller
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

describe('Contacts Controller Property-Based Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-contacts-pbt-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Test User Contacts PBT',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.deal.deleteMany({ where: { userId: testUserId } });
    await prisma.property.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 31: Contact view completeness
   * 
   * Validates: Requirements 10.1
   * 
   * Property: For any contact viewed by an agent, the display should include 
   * all active deals, roles, and key relationship notes.
   * 
   * This property tests that:
   * 1. When a contact is retrieved via the API
   * 2. The response includes all associated deals
   * 3. The response includes the contact's role
   * 4. The response includes all relationship notes
   */
  describe('Property 31: Contact view completeness', () => {
    it('should return complete contact information including all deals, role, and notes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random contact data
          fc.record({
            name: fc.constantFrom(
              'John Smith',
              'Jane Doe',
              'Robert Johnson',
              'Emily Williams',
              'Michael Brown'
            ),
            emails: fc.array(
              fc.emailAddress(),
              { minLength: 1, maxLength: 3 }
            ),
            phones: fc.array(
              fc.stringMatching(/^\+61[0-9]{9}$/),
              { minLength: 0, maxLength: 2 }
            ),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
            noteCount: fc.integer({ min: 0, max: 5 }),
            dealCount: fc.integer({ min: 0, max: 3 }),
          }),
          async (contactData) => {
            // Create relationship notes
            const relationshipNotes = [];
            for (let i = 0; i < contactData.noteCount; i++) {
              relationshipNotes.push({
                id: `note-${i}-${Date.now()}`,
                content: `Note ${i}: Important information about contact`,
                source: ['email', 'voice_note', 'manual'][i % 3],
                createdAt: new Date().toISOString(),
              });
            }

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: contactData.name,
                emails: contactData.emails,
                phones: contactData.phones,
                role: contactData.role,
                relationshipNotes,
              },
            });

            // Create deals for this contact
            const createdDeals = [];
            for (let i = 0; i < contactData.dealCount; i++) {
              const deal = await prisma.deal.create({
                data: {
                  userId: testUserId,
                  stage: ['lead', 'qualified', 'viewing', 'offer'][i % 4],
                  riskLevel: ['none', 'low', 'medium', 'high'][i % 4],
                  riskFlags: [],
                  nextActionOwner: 'agent',
                  summary: `Deal ${i} summary`,
                  contacts: {
                    connect: { id: contact.id },
                  },
                },
              });
              createdDeals.push(deal);
            }

            // Mock request and response
            const req = {
              params: { id: contact.id },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            // Call controller method
            await contactsController.getContact(req, res);

            // Property: Response should be successful
            expect(responseData.statusCode).toBe(200);

            // Property: Response should include the contact
            expect(responseData.contact).toBeDefined();
            expect(responseData.contact.id).toBe(contact.id);

            // Property: All active deals should be included
            expect(responseData.contact.deals).toBeDefined();
            expect(responseData.contact.deals).toHaveLength(contactData.dealCount);

            // Verify each deal is present
            const dealIds = createdDeals.map(d => d.id);
            const returnedDealIds = responseData.contact.deals.map((d: any) => d.id);
            for (const dealId of dealIds) {
              expect(returnedDealIds).toContain(dealId);
            }

            // Property: Role should be included
            expect(responseData.contact.role).toBe(contactData.role);

            // Property: All relationship notes should be included
            expect(responseData.contact.relationshipNotes).toBeDefined();
            expect(responseData.contact.relationshipNotes).toHaveLength(contactData.noteCount);

            // Verify each note is present
            for (let i = 0; i < contactData.noteCount; i++) {
              const note = responseData.contact.relationshipNotes[i];
              expect(note.content).toBeDefined();
              expect(note.source).toBeDefined();
              expect(note.createdAt).toBeDefined();
            }

            // Clean up
            await prisma.deal.deleteMany({
              where: { id: { in: dealIds } },
            });
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should include properties where contact is vendor or buyer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constantFrom('Alice Cooper', 'Bob Dylan', 'Charlie Parker'),
            email: fc.emailAddress(),
            role: fc.constantFrom('buyer', 'vendor'),
            vendorPropertyCount: fc.integer({ min: 0, max: 2 }),
            buyerPropertyCount: fc.integer({ min: 0, max: 2 }),
          }),
          async (contactData) => {
            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: contactData.name,
                emails: [contactData.email],
                phones: [],
                role: contactData.role,
                relationshipNotes: [],
              },
            });

            // Create properties where contact is vendor
            const vendorProperties = [];
            for (let i = 0; i < contactData.vendorPropertyCount; i++) {
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address: `${100 + i} Vendor Street, Sydney`,
                  milestones: [],
                  vendors: {
                    connect: { id: contact.id },
                  },
                },
              });
              vendorProperties.push(property);
            }

            // Create properties where contact is buyer
            const buyerProperties = [];
            for (let i = 0; i < contactData.buyerPropertyCount; i++) {
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address: `${200 + i} Buyer Avenue, Melbourne`,
                  milestones: [],
                  buyers: {
                    connect: { id: contact.id },
                  },
                },
              });
              buyerProperties.push(property);
            }

            // Mock request and response
            const req = {
              params: { id: contact.id },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            // Call controller method
            await contactsController.getContact(req, res);

            // Property: All vendor properties should be included
            expect(responseData.contact.vendorProperties).toHaveLength(
              contactData.vendorPropertyCount
            );

            // Property: All buyer properties should be included
            expect(responseData.contact.buyerProperties).toHaveLength(
              contactData.buyerPropertyCount
            );

            // Verify property addresses are present
            const vendorAddresses = responseData.contact.vendorProperties.map(
              (p: any) => p.address
            );
            const buyerAddresses = responseData.contact.buyerProperties.map(
              (p: any) => p.address
            );

            for (const prop of vendorProperties) {
              expect(vendorAddresses).toContain(prop.address);
            }

            for (const prop of buyerProperties) {
              expect(buyerAddresses).toContain(prop.address);
            }

            // Clean up
            await prisma.property.deleteMany({
              where: {
                id: {
                  in: [
                    ...vendorProperties.map(p => p.id),
                    ...buyerProperties.map(p => p.id),
                  ],
                },
              },
            });
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty arrays when contact has no deals or properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
          }),
          async (contactData) => {
            // Create contact with no deals or properties
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: contactData.name,
                emails: [contactData.email],
                phones: [],
                role: contactData.role,
                relationshipNotes: [],
              },
            });

            // Mock request and response
            const req = {
              params: { id: contact.id },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            // Call controller method
            await contactsController.getContact(req, res);

            // Property: Response should still be successful
            expect(responseData.statusCode).toBe(200);

            // Property: Deals array should be empty but defined
            expect(responseData.contact.deals).toBeDefined();
            expect(responseData.contact.deals).toHaveLength(0);

            // Property: Properties arrays should be empty but defined
            expect(responseData.contact.vendorProperties).toBeDefined();
            expect(responseData.contact.vendorProperties).toHaveLength(0);
            expect(responseData.contact.buyerProperties).toBeDefined();
            expect(responseData.contact.buyerProperties).toHaveLength(0);

            // Property: Relationship notes should be empty but defined
            expect(responseData.contact.relationshipNotes).toBeDefined();
            expect(responseData.contact.relationshipNotes).toHaveLength(0);

            // Clean up
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 33: Contact search matching
   * 
   * Validates: Requirements 10.4
   * 
   * Property: For any contact search query, the system should return results 
   * matching the name, email, or associated property.
   * 
   * This property tests that:
   * 1. Searching by name returns matching contacts
   * 2. Searching by email returns matching contacts
   * 3. Searching by property address returns associated contacts
   */
  describe('Property 33: Contact search matching', () => {
    it('should return contacts matching search query by name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firstName: fc.constantFrom('John', 'Jane', 'Robert', 'Emily'),
            lastName: fc.constantFrom('Smith', 'Doe', 'Johnson', 'Williams'),
            email: fc.emailAddress(),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
          }),
          async (contactData) => {
            const fullName = `${contactData.firstName} ${contactData.lastName}`;

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: fullName,
                emails: [contactData.email],
                phones: [],
                role: contactData.role,
                relationshipNotes: [],
              },
            });

            // Test searching by first name
            const req1 = {
              query: { search: contactData.firstName.toLowerCase() },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData1: any;
            const res1 = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData1 = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            await contactsController.listContacts(req1, res1);

            // Property: Search by first name should return the contact
            expect(responseData1.statusCode).toBe(200);
            expect(responseData1.contacts).toBeDefined();
            const contactIds1 = responseData1.contacts.map((c: any) => c.id);
            expect(contactIds1).toContain(contact.id);

            // Test searching by last name
            const req2 = {
              query: { search: contactData.lastName.toLowerCase() },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData2: any;
            const res2 = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData2 = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            await contactsController.listContacts(req2, res2);

            // Property: Search by last name should return the contact
            expect(responseData2.statusCode).toBe(200);
            const contactIds2 = responseData2.contacts.map((c: any) => c.id);
            expect(contactIds2).toContain(contact.id);

            // Clean up
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return contacts matching search query by email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constantFrom('Alice Cooper', 'Bob Dylan', 'Charlie Parker'),
            emailPrefix: fc.constantFrom('test', 'user', 'contact', 'agent'),
            emailDomain: fc.constantFrom('example.com', 'test.com', 'mail.com'),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
          }),
          async (contactData) => {
            const email = `${contactData.emailPrefix}@${contactData.emailDomain}`;

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: contactData.name,
                emails: [email],
                phones: [],
                role: contactData.role,
                relationshipNotes: [],
              },
            });

            // Search by email
            const req = {
              query: { search: email },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            await contactsController.listContacts(req, res);

            // Property: Search by email should return the contact
            expect(responseData.statusCode).toBe(200);
            expect(responseData.contacts).toBeDefined();
            const contactIds = responseData.contacts.map((c: any) => c.id);
            expect(contactIds).toContain(contact.id);

            // Verify the returned contact has the correct email
            const returnedContact = responseData.contacts.find((c: any) => c.id === contact.id);
            expect(returnedContact.emails).toContain(email);

            // Clean up
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return contacts associated with properties matching search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contactName: fc.constantFrom('David Lee', 'Sarah Miller', 'Tom Wilson'),
            email: fc.emailAddress(),
            streetNumber: fc.integer({ min: 1, max: 999 }),
            streetName: fc.constantFrom('Main Street', 'Oak Avenue', 'Park Lane'),
            city: fc.constantFrom('Sydney', 'Melbourne', 'Brisbane'),
            role: fc.constantFrom('buyer', 'vendor'),
            isVendor: fc.boolean(),
          }),
          async (data) => {
            const address = `${data.streetNumber} ${data.streetName}, ${data.city}`;

            // Create contact
            const contact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: data.contactName,
                emails: [data.email],
                phones: [],
                role: data.role,
                relationshipNotes: [],
              },
            });

            // Create property and link contact
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address,
                milestones: [],
                ...(data.isVendor
                  ? { vendors: { connect: { id: contact.id } } }
                  : { buyers: { connect: { id: contact.id } } }),
              },
            });

            // Search by property address
            const req = {
              query: { search: data.streetName.toLowerCase() },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            await contactsController.listContacts(req, res);

            // Property: Search by property address should return associated contact
            expect(responseData.statusCode).toBe(200);
            expect(responseData.contacts).toBeDefined();
            const contactIds = responseData.contacts.map((c: any) => c.id);
            expect(contactIds).toContain(contact.id);

            // Clean up
            await prisma.property.delete({ where: { id: property.id } });
            await prisma.contact.delete({ where: { id: contact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not return contacts that do not match the search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            matchingName: fc.constantFrom('Alice Anderson', 'Bob Baker'),
            nonMatchingName: fc.constantFrom('Charlie Chen', 'Diana Davis'),
            searchTerm: fc.constantFrom('alice', 'bob', 'anderson', 'baker'),
          }),
          async (data) => {
            // Create matching contact
            const matchingContact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: data.matchingName,
                emails: [`${data.matchingName.toLowerCase().replace(' ', '.')}@example.com`],
                phones: [],
                role: 'buyer',
                relationshipNotes: [],
              },
            });

            // Create non-matching contact
            const nonMatchingContact = await prisma.contact.create({
              data: {
                userId: testUserId,
                name: data.nonMatchingName,
                emails: [`${data.nonMatchingName.toLowerCase().replace(' ', '.')}@example.com`],
                phones: [],
                role: 'vendor',
                relationshipNotes: [],
              },
            });

            // Search with term that should only match first contact
            const req = {
              query: { search: data.searchTerm },
              user: { userId: testUserId },
            } as unknown as Request;

            let responseData: any;
            const res = {
              status: (code: number) => ({
                json: (data: any) => {
                  responseData = { statusCode: code, ...data };
                },
              }),
            } as unknown as Response;

            await contactsController.listContacts(req, res);

            // Property: Only matching contact should be returned
            expect(responseData.statusCode).toBe(200);
            const contactIds = responseData.contacts.map((c: any) => c.id);

            // Should contain matching contact
            expect(contactIds).toContain(matchingContact.id);

            // Should NOT contain non-matching contact
            expect(contactIds).not.toContain(nonMatchingContact.id);

            // Clean up
            await prisma.contact.delete({ where: { id: matchingContact.id } });
            await prisma.contact.delete({ where: { id: nonMatchingContact.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
