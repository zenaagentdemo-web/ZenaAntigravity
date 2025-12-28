import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { propertiesController } from './properties.controller.js';
import type { Request, Response } from 'express';

/**
 * Property-Based Tests for Properties Controller
 */

describe('Properties Controller Property-Based Tests', () => {
  // Helper function to create a test user for each property-based test
  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `test-properties-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User Properties PBT',
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

  describe('Property 32: Property detail view', () => {
    it('should display all property details including buyers, vendors, and milestones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            address: fc.string({ minLength: 10 }),
            milestoneCount: fc.integer({ min: 0, max: 3 }),
            vendorCount: fc.integer({ min: 1, max: 2 }),
            buyerCount: fc.integer({ min: 0, max: 2 }),
          }),
          async (data) => {
            const testUserId = await createTestUser();
            try {
              // Create vendors
              const vendors = [];
              for (let i = 0; i < data.vendorCount; i++) {
                const contact = await prisma.contact.create({
                  data: {
                    userId: testUserId,
                    name: `Vendor ${i}`,
                    emails: [`vendor${i}@example.com`],
                    role: 'vendor',
                  },
                });
                vendors.push(contact);
              }

              // Create buyers
              const buyers = [];
              for (let i = 0; i < data.buyerCount; i++) {
                const contact = await prisma.contact.create({
                  data: {
                    userId: testUserId,
                    name: `Buyer ${i}`,
                    emails: [`buyer${i}@example.com`],
                    role: 'buyer',
                  },
                });
                buyers.push(contact);
              }

              // Create property
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address: data.address,
                  milestones: Array.from({ length: data.milestoneCount }).map((_, i) => ({
                    id: `m${i}`,
                    title: `Milestone ${i}`,
                    status: 'completed',
                  })),
                  vendors: { connect: vendors.map((v) => ({ id: v.id })) },
                  buyers: { connect: buyers.map((b) => ({ id: b.id })) },
                },
              });

              const req = { params: { id: property.id }, user: { userId: testUserId } } as unknown as Request;
              let responseData: any;
              const res = { status: (c: number) => ({ json: (d: any) => { responseData = { statusCode: c, ...d }; } }) } as unknown as Response;

              await propertiesController.getProperty(req, res);

              expect(responseData.statusCode).toBe(200);
              expect(responseData.property.address).toBe(data.address);
              expect(responseData.property.vendors).toHaveLength(data.vendorCount);
              expect(responseData.property.buyers).toHaveLength(data.buyerCount);
              expect(responseData.property.milestones).toHaveLength(data.milestoneCount);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 34: Property search matching', () => {
    it('should return properties matching search query by address', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            streetNumber: fc.integer({ min: 1, max: 999 }),
            streetName: fc.constantFrom('Main Street', 'Oak Avenue', 'Park Lane'),
            city: fc.constantFrom('Sydney', 'Melbourne', 'Brisbane'),
          }),
          async (data) => {
            const testUserId = await createTestUser();
            try {
              const address = `${data.streetNumber} ${data.streetName}, ${data.city}`;
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address,
                  milestones: [],
                },
              });

              const req = { query: { search: data.streetName.toLowerCase() }, user: { userId: testUserId } } as unknown as Request;
              let responseData: any;
              const res = { status: (c: number) => ({ json: (d: any) => { responseData = { statusCode: c, ...d }; } }) } as unknown as Response;

              await propertiesController.listProperties(req, res);

              expect(responseData.statusCode).toBe(200);
              const propertyIds = responseData.properties.map((p: any) => p.id);
              expect(propertyIds).toContain(property.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
