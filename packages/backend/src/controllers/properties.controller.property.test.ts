import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as fc from 'fast-check';
import { propertiesController } from './properties.controller.js';
import { threadLinkingService } from '../services/thread-linking.service.js';

const prisma = new PrismaClient();

describe('Properties Controller - Property-Based Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User',
      },
    });
    testUserId = user.id;
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
   * Feature: zena-ai-real-estate-pwa, Property 35: Property creation and linking
   * 
   * For any property address added by an agent, the system should create a property 
   * record and begin linking relevant threads.
   * 
   * Validates: Requirements 11.1
   */
  describe('Property 35: Property creation and linking', () => {
    it('should create property and link threads mentioning the address', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random property address
          fc.record({
            streetNumber: fc.integer({ min: 1, max: 9999 }),
            streetName: fc.constantFrom('Main St', 'Oak Ave', 'Elm Rd', 'Park Blvd', 'Lake Dr'),
            city: fc.constantFrom('Sydney', 'Melbourne', 'Brisbane', 'Perth'),
          }),
          async (addressParts) => {
            const address = `${addressParts.streetNumber} ${addressParts.streetName}, ${addressParts.city}`;

            // Create an email account for threads
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

            // Create threads that mention this address
            const threadWithAddress = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}-1`,
                subject: `Property viewing at ${address}`,
                participants: [
                  { name: 'John Buyer', email: 'john@example.com', role: 'buyer' },
                ],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: `Discussion about the property at ${address}`,
              },
            });

            // Create a thread that doesn't mention the address
            const threadWithoutAddress = await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `ext-${Date.now()}-2`,
                subject: 'General inquiry',
                participants: [
                  { name: 'Jane Buyer', email: 'jane@example.com', role: 'buyer' },
                ],
                classification: 'buyer',
                category: 'focus',
                nextActionOwner: 'agent',
                lastMessageAt: new Date(),
                summary: 'General real estate inquiry',
              },
            });

            // Create mock request and response
            const req: any = {
              user: { userId: testUserId },
              body: { address },
            };

            let responseStatus: number = 0;
            let responseData: any = null;

            const res: any = {
              status: (code: number) => {
                responseStatus = code;
                return res;
              },
              json: (data: any) => {
                responseData = data;
              },
            };

            // Create the property
            await propertiesController.createProperty(req, res);

            // Verify property was created
            expect(responseStatus).toBe(201);
            expect(responseData.property).toBeDefined();
            expect(responseData.property.address).toBe(address);

            const propertyId = responseData.property.id;

            // Verify thread linking was triggered
            // The thread with the address should be linked
            const linkedThread = await prisma.thread.findUnique({
              where: { id: threadWithAddress.id },
            });

            expect(linkedThread?.propertyId).toBe(propertyId);

            // The thread without the address should not be linked
            const unlinkedThread = await prisma.thread.findUnique({
              where: { id: threadWithoutAddress.id },
            });

            expect(unlinkedThread?.propertyId).toBeNull();

            // Clean up
            await prisma.thread.deleteMany({
              where: { id: { in: [threadWithAddress.id, threadWithoutAddress.id] } },
            });
            await prisma.property.delete({ where: { id: propertyId } });
            await prisma.emailAccount.delete({ where: { id: emailAccount.id } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 36: Property view completeness
   * 
   * For any property viewed by an agent, the display should show associated buyers, 
   * vendor communications, and campaign milestones.
   * 
   * Validates: Requirements 11.2
   */
  describe('Property 36: Property view completeness', () => {
    it('should display all property details including buyers, vendors, and milestones', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random property data
          fc.record({
            address: fc.string({ minLength: 10, maxLength: 50 }),
            numVendors: fc.integer({ min: 1, max: 3 }),
            numBuyers: fc.integer({ min: 0, max: 5 }),
            numMilestones: fc.integer({ min: 0, max: 5 }),
          }),
          async (propertyData) => {
            // Create vendor contacts
            const vendors = await Promise.all(
              Array.from({ length: propertyData.numVendors }, async (_, i) => {
                return await prisma.contact.create({
                  data: {
                    userId: testUserId,
                    name: `Vendor ${i + 1}`,
                    emails: [`vendor${i + 1}@example.com`],
                    phones: [`555-000${i + 1}`],
                    role: 'vendor',
                    relationshipNotes: [],
                  },
                });
              })
            );

            // Create buyer contacts
            const buyers = await Promise.all(
              Array.from({ length: propertyData.numBuyers }, async (_, i) => {
                return await prisma.contact.create({
                  data: {
                    userId: testUserId,
                    name: `Buyer ${i + 1}`,
                    emails: [`buyer${i + 1}@example.com`],
                    phones: [`555-100${i + 1}`],
                    role: 'buyer',
                    relationshipNotes: [],
                  },
                });
              })
            );

            // Create milestones
            const milestones = Array.from({ length: propertyData.numMilestones }, (_, i) => ({
              id: `milestone-${i + 1}`,
              type: ['listing', 'first_open', 'offer_received', 'conditional', 'unconditional'][i % 5],
              date: new Date(Date.now() - i * 86400000).toISOString(),
              notes: `Milestone ${i + 1} notes`,
            }));

            // Create property with all associations
            const property = await prisma.property.create({
              data: {
                userId: testUserId,
                address: propertyData.address,
                milestones,
                vendors: {
                  connect: vendors.map(v => ({ id: v.id })),
                },
                buyers: {
                  connect: buyers.map(b => ({ id: b.id })),
                },
              },
            });

            // Create mock request and response
            const req: any = {
              user: { userId: testUserId },
              params: { id: property.id },
            };

            let responseStatus: number = 0;
            let responseData: any = null;

            const res: any = {
              status: (code: number) => {
                responseStatus = code;
                return res;
              },
              json: (data: any) => {
                responseData = data;
              },
            };

            // Get the property
            await propertiesController.getProperty(req, res);

            // Verify response
            expect(responseStatus).toBe(200);
            expect(responseData.property).toBeDefined();

            // Verify all required data is present
            const returnedProperty = responseData.property;

            // Check address
            expect(returnedProperty.address).toBe(propertyData.address);

            // Check vendors are included
            expect(returnedProperty.vendors).toBeDefined();
            expect(returnedProperty.vendors).toHaveLength(propertyData.numVendors);
            returnedProperty.vendors.forEach((vendor: any) => {
              expect(vendor.id).toBeDefined();
              expect(vendor.name).toBeDefined();
              expect(vendor.emails).toBeDefined();
              expect(vendor.role).toBe('vendor');
            });

            // Check buyers are included
            expect(returnedProperty.buyers).toBeDefined();
            expect(returnedProperty.buyers).toHaveLength(propertyData.numBuyers);
            returnedProperty.buyers.forEach((buyer: any) => {
              expect(buyer.id).toBeDefined();
              expect(buyer.name).toBeDefined();
              expect(buyer.emails).toBeDefined();
              expect(buyer.role).toBe('buyer');
            });

            // Check milestones are included
            expect(returnedProperty.milestones).toBeDefined();
            expect(returnedProperty.milestones).toHaveLength(propertyData.numMilestones);

            // Verify threads are included in response
            expect(responseData.threads).toBeDefined();
            expect(Array.isArray(responseData.threads)).toBe(true);

            // Verify timeline is included in response
            expect(responseData.timeline).toBeDefined();
            expect(Array.isArray(responseData.timeline)).toBe(true);

            // Clean up
            await prisma.property.delete({ where: { id: property.id } });
            await prisma.contact.deleteMany({
              where: { id: { in: [...vendors.map(v => v.id), ...buyers.map(b => b.id)] } },
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
