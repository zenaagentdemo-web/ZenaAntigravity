import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { vendorUpdateService } from './vendor-update.service.js';

const prisma = new PrismaClient();

describe('Vendor Update Service - Property-Based Tests', () => {
  let testUserId: string;
  
  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        name: 'Test User',
      },
    });
    testUserId = user.id;
  });
  
  afterEach(async () => {
    // Clean up test data
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.thread.deleteMany({ where: { userId: testUserId } });
    await prisma.deal.deleteMany({ where: { userId: testUserId } });
    await prisma.property.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });
  
  /**
   * Feature: zena-ai-real-estate-pwa, Property 92: Vendor update compilation
   * 
   * For any vendor update request for a property, the system should compile 
   * buyer feedback, viewing activity, and communication summaries.
   * 
   * Validates: Requirements 25.1
   */
  it('Property 92: Vendor update includes all required components', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random property data
        fc.record({
          address: fc.string({ minLength: 10, maxLength: 100 }),
          viewingCount: fc.integer({ min: 0, max: 20 }),
          inquiryCount: fc.integer({ min: 0, max: 15 }),
          offerCount: fc.integer({ min: 0, max: 5 }),
        }),
        async (propertyData) => {
          // Create property with vendor
          const vendor = await prisma.contact.create({
            data: {
              userId: testUserId,
              name: 'Test Vendor',
              emails: ['vendor@example.com'],
              phones: [],
              role: 'vendor',
              relationshipNotes: [],
            },
          });
          
          const property = await prisma.property.create({
            data: {
              userId: testUserId,
              address: propertyData.address,
              milestones: [],
              vendors: {
                connect: { id: vendor.id },
              },
            },
          });
          
          // Create viewing timeline events
          for (let i = 0; i < propertyData.viewingCount; i++) {
            await prisma.timelineEvent.create({
              data: {
                userId: testUserId,
                type: 'meeting',
                entityType: 'property',
                entityId: property.id,
                summary: `Property viewing ${i + 1}`,
                timestamp: new Date(Date.now() - i * 86400000),
              },
            });
          }
          
          // Create buyer threads (inquiries)
          for (let i = 0; i < propertyData.inquiryCount; i++) {
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: (await prisma.emailAccount.create({
                  data: {
                    userId: testUserId,
                    provider: 'gmail',
                    email: `test${i}@example.com`,
                    accessToken: 'token',
                    refreshToken: 'refresh',
                    tokenExpiry: new Date(Date.now() + 3600000),
                  },
                })).id,
                externalId: `thread-${i}`,
                subject: `Inquiry about ${propertyData.address}`,
                participants: [{ name: `Buyer ${i}`, email: `buyer${i}@example.com` }],
                classification: 'buyer',
                category: 'waiting',
                propertyId: property.id,
                nextActionOwner: 'other',
                lastMessageAt: new Date(Date.now() - i * 86400000),
                summary: `Buyer ${i} is interested in the property`,
              },
            });
          }
          
          // Create deals (offers)
          for (let i = 0; i < propertyData.offerCount; i++) {
            await prisma.deal.create({
              data: {
                userId: testUserId,
                propertyId: property.id,
                stage: 'offer',
                riskLevel: 'none',
                riskFlags: [],
                nextActionOwner: 'agent',
                summary: `Offer ${i + 1}`,
              },
            });
          }
          
          // Generate vendor update
          const vendorUpdate = await vendorUpdateService.generateVendorUpdate({
            propertyId: property.id,
            userId: testUserId,
          });
          
          // Verify all components are present
          expect(vendorUpdate.propertyAddress).toBe(propertyData.address);
          expect(vendorUpdate.metrics).toBeDefined();
          expect(vendorUpdate.metrics.viewings).toBe(propertyData.viewingCount);
          expect(vendorUpdate.metrics.inquiries).toBe(propertyData.inquiryCount);
          expect(vendorUpdate.metrics.offers).toBe(propertyData.offerCount);
          expect(vendorUpdate.buyerFeedback).toBeDefined();
          expect(Array.isArray(vendorUpdate.buyerFeedback)).toBe(true);
          expect(vendorUpdate.communicationSummary).toBeDefined();
          expect(vendorUpdate.emailDraft).toBeDefined();
          expect(vendorUpdate.emailDraft.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
  
  /**
   * Feature: zena-ai-real-estate-pwa, Property 93: Buyer feedback anonymization
   * 
   * For any vendor update including buyer feedback, buyer identities should be 
   * anonymized unless explicitly identified.
   * 
   * Validates: Requirements 25.3
   */
  it('Property 93: Buyer identities are anonymized in feedback', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random buyer data
        fc.array(
          fc.record({
            name: fc.string({ minLength: 5, maxLength: 30 }),
            email: fc.emailAddress(),
            feedback: fc.string({ minLength: 20, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (buyers) => {
          // Create property
          const property = await prisma.property.create({
            data: {
              userId: testUserId,
              address: '123 Test Street',
              milestones: [],
            },
          });
          
          // Create email account
          const emailAccount = await prisma.emailAccount.create({
            data: {
              userId: testUserId,
              provider: 'gmail',
              email: 'test@example.com',
              accessToken: 'token',
              refreshToken: 'refresh',
              tokenExpiry: new Date(Date.now() + 3600000),
            },
          });
          
          // Create buyer threads with feedback containing buyer names
          for (let i = 0; i < buyers.length; i++) {
            const buyer = buyers[i];
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `thread-${i}`,
                subject: 'Property inquiry',
                participants: [{ name: buyer.name, email: buyer.email }],
                classification: 'buyer',
                category: 'waiting',
                propertyId: property.id,
                nextActionOwner: 'other',
                lastMessageAt: new Date(),
                summary: `${buyer.name} said: ${buyer.feedback}`,
              },
            });
          }
          
          // Generate vendor update
          const vendorUpdate = await vendorUpdateService.generateVendorUpdate({
            propertyId: property.id,
            userId: testUserId,
          });
          
          // Verify buyer names are anonymized in feedback
          for (const buyer of buyers) {
            for (const feedback of vendorUpdate.buyerFeedback) {
              // Check that buyer name is not present in feedback
              expect(feedback.toLowerCase()).not.toContain(buyer.name.toLowerCase());
              // Check that buyer email is not present in feedback
              expect(feedback.toLowerCase()).not.toContain(buyer.email.toLowerCase());
            }
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
  
  /**
   * Feature: zena-ai-real-estate-pwa, Property 94: Vendor update metrics inclusion
   * 
   * For any vendor update, the system should highlight key metrics including 
   * number of viewings, inquiries, and offers.
   * 
   * Validates: Requirements 25.4
   */
  it('Property 94: Vendor update includes key metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random metrics
        fc.record({
          viewings: fc.integer({ min: 0, max: 50 }),
          inquiries: fc.integer({ min: 0, max: 30 }),
          offers: fc.integer({ min: 0, max: 10 }),
        }),
        async (expectedMetrics) => {
          // Create property
          const property = await prisma.property.create({
            data: {
              userId: testUserId,
              address: '456 Metric Avenue',
              milestones: [],
            },
          });
          
          // Create viewing events
          for (let i = 0; i < expectedMetrics.viewings; i++) {
            await prisma.timelineEvent.create({
              data: {
                userId: testUserId,
                type: 'meeting',
                entityType: 'property',
                entityId: property.id,
                summary: `Viewing ${i + 1}`,
                timestamp: new Date(),
              },
            });
          }
          
          // Create email account for threads
          const emailAccount = await prisma.emailAccount.create({
            data: {
              userId: testUserId,
              provider: 'gmail',
              email: 'metrics@example.com',
              accessToken: 'token',
              refreshToken: 'refresh',
              tokenExpiry: new Date(Date.now() + 3600000),
            },
          });
          
          // Create inquiry threads
          for (let i = 0; i < expectedMetrics.inquiries; i++) {
            await prisma.thread.create({
              data: {
                userId: testUserId,
                emailAccountId: emailAccount.id,
                externalId: `inquiry-${i}`,
                subject: 'Inquiry',
                participants: [],
                classification: 'buyer',
                category: 'waiting',
                propertyId: property.id,
                nextActionOwner: 'other',
                lastMessageAt: new Date(),
                summary: 'Inquiry',
              },
            });
          }
          
          // Create offer deals
          for (let i = 0; i < expectedMetrics.offers; i++) {
            await prisma.deal.create({
              data: {
                userId: testUserId,
                propertyId: property.id,
                stage: 'offer',
                riskLevel: 'none',
                riskFlags: [],
                nextActionOwner: 'agent',
                summary: `Offer ${i + 1}`,
              },
            });
          }
          
          // Generate vendor update
          const vendorUpdate = await vendorUpdateService.generateVendorUpdate({
            propertyId: property.id,
            userId: testUserId,
          });
          
          // Verify metrics are present and correct
          expect(vendorUpdate.metrics).toBeDefined();
          expect(vendorUpdate.metrics.viewings).toBe(expectedMetrics.viewings);
          expect(vendorUpdate.metrics.inquiries).toBe(expectedMetrics.inquiries);
          expect(vendorUpdate.metrics.offers).toBe(expectedMetrics.offers);
          
          // Verify metrics are included in email draft
          expect(vendorUpdate.emailDraft).toContain(`Viewings: ${expectedMetrics.viewings}`);
          expect(vendorUpdate.emailDraft).toContain(`Inquiries: ${expectedMetrics.inquiries}`);
          expect(vendorUpdate.emailDraft).toContain(`Offers: ${expectedMetrics.offers}`);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
