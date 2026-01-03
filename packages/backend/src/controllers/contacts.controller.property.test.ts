import { describe, it, expect } from 'vitest';
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
  // Helper function to create a test user for each property-based test
  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `test-contacts-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Test User Contacts PBT',
      },
    });
    return user.id;
  };

  // Helper function to clean up test user and related data
  const cleanupTestUser = async (userId: string): Promise<void> => {
    try {
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  /**
   * Feature: zena-ai-real-estate-pwa, Property 31: Contact view completeness
   * 
   * Validates: Requirements 10.1
   * 
   * Property: For any contact viewed by an agent, the display should include 
   * all active deals, roles, and key relationship notes.
   */
  describe('Property 31: Contact view completeness', () => {
    it('should return complete contact information including all deals, role, and notes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.constantFrom('John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Williams', 'Michael Brown'),
            emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
            phones: fc.array(fc.stringMatching(/^\+61[0-9]{9}$/), { minLength: 0, maxLength: 2 }),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
            noteCount: fc.integer({ min: 0, max: 5 }),
            dealCount: fc.integer({ min: 0, max: 3 }),
          }),
          async (contactData) => {
            const testUserId = await createTestUser();
            try {
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
                    stage: ['buyer_consult', 'shortlisting', 'viewings', 'offer_made'][i % 4],
                    pipelineType: 'buyer',
                    saleMethod: 'negotiation',
                    riskLevel: ['none', 'low', 'medium', 'high'][i % 4],
                    riskFlags: [],
                    nextActionOwner: 'agent',
                    summary: `Deal ${i} summary`,
                    contacts: {
                      connect: [{ id: contact.id }],
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
              expect(responseData.contact.id).toBe(contact.id);
              expect(responseData.contact.deals).toHaveLength(contactData.dealCount);
              expect(responseData.contact.role).toBe(contactData.role);
              expect(responseData.contact.relationshipNotes).toHaveLength(contactData.noteCount);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 20 }
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
            const testUserId = await createTestUser();
            try {
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
              for (let i = 0; i < contactData.vendorPropertyCount; i++) {
                await prisma.property.create({
                  data: {
                    userId: testUserId,
                    address: `${100 + i + Math.random()} Vendor Street, Sydney`,
                    milestones: [],
                    vendors: { connect: { id: contact.id } },
                  },
                });
              }

              // Create properties where contact is buyer
              for (let i = 0; i < contactData.buyerPropertyCount; i++) {
                await prisma.property.create({
                  data: {
                    userId: testUserId,
                    address: `${200 + i + Math.random()} Buyer Avenue, Melbourne`,
                    milestones: [],
                    buyers: { connect: { id: contact.id } },
                  },
                });
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

              expect(responseData.contact.vendorProperties).toHaveLength(contactData.vendorPropertyCount);
              expect(responseData.contact.buyerProperties).toHaveLength(contactData.buyerPropertyCount);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return empty arrays when contact has no deals or properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
          }),
          async (contactData) => {
            const testUserId = await createTestUser();
            try {
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

              const req = { params: { id: contact.id }, user: { userId: testUserId } } as unknown as Request;
              let responseData: any;
              const res = { status: (c: number) => ({ json: (d: any) => { responseData = { statusCode: c, ...d }; } }) } as unknown as Response;

              await contactsController.getContact(req, res);

              expect(responseData.statusCode).toBe(200);
              expect(responseData.contact.deals).toHaveLength(0);
              expect(responseData.contact.vendorProperties).toHaveLength(0);
              expect(responseData.contact.buyerProperties).toHaveLength(0);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

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
            const testUserId = await createTestUser();
            try {
              const fullName = `${contactData.firstName} ${contactData.lastName}`;
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

              const req = { query: { search: contactData.firstName.toLowerCase() }, user: { userId: testUserId } } as unknown as Request;
              let responseData: any;
              const res = { status: (c: number) => ({ json: (d: any) => { responseData = { statusCode: c, ...d }; } }) } as unknown as Response;

              await contactsController.listContacts(req, res);

              expect(responseData.statusCode).toBe(200);
              const contactIds = responseData.contacts.map((c: any) => c.id);
              expect(contactIds).toContain(contact.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);

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
            const testUserId = await createTestUser();
            try {
              const email = `${contactData.emailPrefix}@${contactData.emailDomain}`;
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

              const req = { query: { search: email }, user: { userId: testUserId } } as unknown as Request;
              let responseData: any;
              const res = { status: (c: number) => ({ json: (d: any) => { responseData = { statusCode: c, ...d }; } }) } as unknown as Response;

              await contactsController.listContacts(req, res);

              expect(responseData.statusCode).toBe(200);
              const contactIds = responseData.contacts.map((c: any) => c.id);
              expect(contactIds).toContain(contact.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);
  });

  describe('Property 34: Contact updating', () => {
    it('should correctly update contact fields and persist changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialName: fc.string({ minLength: 1 }),
            updatedName: fc.string({ minLength: 1 }),
            updatedRole: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
            updatedEmails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 2 }),
          }),
          async (data) => {
            const testUserId = await createTestUser();
            try {
              const contact = await prisma.contact.create({
                data: {
                  userId: testUserId,
                  name: data.initialName,
                  role: 'other',
                  emails: ['initial@example.com'],
                  phones: [],
                },
              });

              const req = {
                params: { id: contact.id },
                body: {
                  name: data.updatedName,
                  role: data.updatedRole,
                  emails: data.updatedEmails,
                },
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

              await contactsController.updateContact(req, res);

              expect(responseData.statusCode).toBe(200);
              expect(responseData.contact.name).toBe(data.updatedName);
              expect(responseData.contact.role).toBe(data.updatedRole);
              expect(responseData.contact.emails).toEqual(data.updatedEmails);

              // Verify in DB
              const dbContact = await prisma.contact.findUnique({ where: { id: contact.id } });
              expect(dbContact?.name).toBe(data.updatedName);
              expect(dbContact?.role).toBe(data.updatedRole);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 35: Contact relationship notes', () => {
    it('should append new notes without losing existing ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              content: fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0),
              source: fc.constantFrom('email', 'voice_note', 'manual'),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (notes) => {
            const testUserId = await createTestUser();
            try {
              const contact = await prisma.contact.create({
                data: {
                  userId: testUserId,
                  name: 'Test Note Contact',
                  role: 'other',
                  emails: [],
                  phones: [],
                  relationshipNotes: [],
                },
              });

              for (const note of notes) {
                const req = {
                  params: { id: contact.id },
                  body: note,
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

                await contactsController.addNote(req, res);
                expect(responseData.statusCode).toBe(201);
              }

              // Verify all notes are present in order
              const dbContact = await prisma.contact.findUnique({ where: { id: contact.id } });
              const savedNotes = dbContact?.relationshipNotes as any[];
              expect(savedNotes).toHaveLength(notes.length);
              notes.forEach((note, i) => {
                expect(savedNotes[i].content).toBe(note.content);
                expect(savedNotes[i].source).toBe(note.source);
              });
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
