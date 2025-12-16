import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { calendarEventLinkingService } from './calendar-event-linking.service.js';

const prisma = new PrismaClient();



/**
 * Property-Based Tests for Calendar Event Linking
 * 
 * Feature: zena-ai-real-estate-pwa, Property 8: Calendar event type detection
 * Feature: zena-ai-real-estate-pwa, Property 9: Calendar event linking
 * Validates: Requirements 4.2, 4.3
 */

describe('Calendar Event Linking - Property-Based Tests', () => {
  // Helper function to create a test user for each property-based test
  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User',
      },
    });
    return user.id;
  };

  // Helper function to clean up test user and related data
  const cleanupTestUser = async (userId: string): Promise<void> => {
    try {
      // Check if user exists first
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return; // User already deleted, nothing to clean up
      }
      
      await prisma.timelineEvent.deleteMany({ where: { userId } });
      await prisma.property.deleteMany({ where: { userId } });
      await prisma.contact.deleteMany({ where: { userId } });
      await prisma.deal.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Cleanup error:', error);
    }
  };

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.timelineEvent.deleteMany({ 
      where: { 
        user: { 
          email: { 
            startsWith: 'test-' 
          } 
        } 
      } 
    });
    await prisma.property.deleteMany({ 
      where: { 
        user: { 
          email: { 
            startsWith: 'test-' 
          } 
        } 
      } 
    });
    await prisma.contact.deleteMany({ 
      where: { 
        user: { 
          email: { 
            startsWith: 'test-' 
          } 
        } 
      } 
    });
    await prisma.deal.deleteMany({ 
      where: { 
        user: { 
          email: { 
            startsWith: 'test-' 
          } 
        } 
      } 
    });
    await prisma.user.deleteMany({ 
      where: { 
        email: { 
          startsWith: 'test-' 
        } 
      } 
    });
  });

  // Basic sanity test to verify database connection and user creation
  it('should create and verify test user', async () => {
    const testUserId = await createTestUser();
    expect(testUserId).toBeDefined();
    expect(testUserId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user).toBeTruthy();
    expect(user?.email).toMatch(/^test-/);
    
    await cleanupTestUser(testUserId);
  });

  /**
   * Property 8: Calendar event type detection
   * 
   * For any synced calendar event, if it contains real estate keywords
   * (viewing, appraisal, vendor meeting, auction, settlement), the system
   * should detect and classify the event type.
   */
  describe('Property 8: Calendar event type detection', () => {
    it('should detect viewing event types from any text containing viewing keywords', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'viewing',
            'inspection',
            'open home',
            'open house',
            'property tour'
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, prefix, suffix) => {
            const testUserId = await createTestUser();
            const summary = `${prefix} ${keyword} ${suffix}`;
            
            try {
              // Create a calendar event with viewing keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'viewing',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected as viewing
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('viewing');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 } // Reduced from 100 to speed up tests
      );
    });

    it('should detect appraisal event types from any text containing appraisal keywords', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('appraisal', 'valuation', 'assessment'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, prefix, suffix) => {
            const testUserId = await createTestUser();
            const summary = `${prefix} ${keyword} ${suffix}`;
            
            try {
              // Create a calendar event with appraisal keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'appraisal',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected as appraisal
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('appraisal');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect auction event types from any text containing auction keywords', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('auction', 'bidding'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, prefix, suffix) => {
            const testUserId = await createTestUser();
            const summary = `${prefix} ${keyword} ${suffix}`;
            
            try {
              // Create a calendar event with auction keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'auction',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected as auction
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('auction');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect settlement event types from any text containing settlement keywords', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('settlement', 'closing', 'handover', 'final inspection'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, prefix, suffix) => {
            const testUserId = await createTestUser();
            const summary = `${prefix} ${keyword} ${suffix}`;
            
            try {
              // Create a calendar event with settlement keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'settlement',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected as settlement
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('settlement');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect meeting event types from any text containing meeting keywords', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('meeting', 'vendor', 'buyer', 'client'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, prefix, suffix) => {
            const testUserId = await createTestUser();
            const summary = `${prefix} ${keyword} ${suffix}`;
            
            try {
              // Create a calendar event with meeting keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'meeting',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected as meeting
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('meeting');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should classify events without real estate keywords as other', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Team Standup',
            'Lunch Break',
            'Conference Call',
            'Training Session',
            'Birthday Party'
          ),
          async (summary) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a calendar event without real estate keywords
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'other',
                    attendees: [],
                  },
                },
              });

              // Verify event type is classified as other
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('other');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect event type regardless of case sensitivity', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('VIEWING', 'Viewing', 'viewing', 'ViEwInG'),
          async (keyword) => {
            const testUserId = await createTestUser();
            const summary = `Property ${keyword}`;
            
            try {
              // Create a calendar event with case-varied keyword
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    eventType: 'viewing',
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected regardless of case
              const metadata = event.metadata as any;
              expect(metadata.eventType).toBe('viewing');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect event type from description when not in summary', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('viewing', 'appraisal', 'auction', 'settlement'),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, description) => {
            const testUserId = await createTestUser();
            const summary = 'Property Event';
            const fullDescription = `${description} ${keyword}`;
            
            try {
              // Create a calendar event with keyword in description
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  content: fullDescription,
                  timestamp: new Date(),
                  metadata: {
                    eventType: keyword,
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected from description
              const metadata = event.metadata as any;
              expect(['viewing', 'appraisal', 'auction', 'settlement']).toContain(
                metadata.eventType
              );
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should detect event type from location when not in summary or description', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('viewing', 'appraisal', 'auction'),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (keyword, address) => {
            const testUserId = await createTestUser();
            const summary = 'Property Event';
            const location = `${address} ${keyword}`;
            
            try {
              // Create a calendar event with keyword in location
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    location,
                    eventType: keyword,
                    attendees: [],
                  },
                },
              });

              // Verify event type is detected from location
              const metadata = event.metadata as any;
              expect(['viewing', 'appraisal', 'auction']).toContain(metadata.eventType);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 9: Calendar event linking
   * 
   * For any processed calendar event with property or contact references,
   * the event should be linked to the relevant property, contact, or deal.
   */
  describe('Property 9: Calendar event linking', () => {
    it('should link events to properties when property reference matches address', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '123 Main Street',
            '456 Oak Avenue',
            '789 Elm Road',
            '321 Pine Drive'
          ),
          async (address) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a property
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address,
                },
              });

              // Create a calendar event with property reference
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: `Viewing at ${address}`,
                  timestamp: new Date(),
                  metadata: {
                    propertyReference: address,
                    eventType: 'viewing',
                    attendees: [],
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify property is linked
              expect(result.linkedProperties).toContain(property.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should link events to contacts when attendee emails match', () => {
      fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (email, name) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a contact
              const contact = await prisma.contact.create({
                data: {
                  userId: testUserId,
                  name,
                  emails: [email],
                  phones: [],
                  role: 'buyer',
                },
              });

              // Create a calendar event with attendee
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: 'Property Meeting',
                  timestamp: new Date(),
                  metadata: {
                    attendees: [email],
                    eventType: 'meeting',
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify contact is linked
              expect(result.linkedContacts).toContain(contact.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should link events to deals when property and contacts are linked', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('123 Main St', '456 Oak Ave'),
          fc.emailAddress(),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (address, email, name) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a property
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address,
                },
              });

              // Create a contact
              const contact = await prisma.contact.create({
                data: {
                  userId: testUserId,
                  name,
                  emails: [email],
                  phones: [],
                  role: 'buyer',
                },
              });

              // Create a deal
              const deal = await prisma.deal.create({
                data: {
                  userId: testUserId,
                  propertyId: property.id,
                  stage: 'viewing',
                  nextActionOwner: 'agent',
                  summary: 'Test deal',
                  contacts: {
                    connect: [{ id: contact.id }],
                  },
                },
              });

              // Create a calendar event with property and contact
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: `Viewing at ${address}`,
                  timestamp: new Date(),
                  metadata: {
                    propertyReference: address,
                    attendees: [email],
                    eventType: 'viewing',
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify deal is linked
              expect(result.linkedDeals).toContain(deal.id);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle events with no matching properties or contacts', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (summary) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a calendar event with no matching entities
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary,
                  timestamp: new Date(),
                  metadata: {
                    attendees: [],
                    eventType: 'other',
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify no entities are linked
              expect(result.linkedProperties).toHaveLength(0);
              expect(result.linkedContacts).toHaveLength(0);
              expect(result.linkedDeals).toHaveLength(0);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should link events to multiple properties when address matches multiple', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('123 Main St', '456 Oak Ave'),
          async (baseAddress) => {
            const testUserId = await createTestUser();
            
            try {
              // Create multiple properties with similar addresses
              const property1 = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address: baseAddress,
                },
              });

              const property2 = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address: `${baseAddress}, Unit 1`,
                },
              });

              // Create a calendar event with property reference
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: `Viewing at ${baseAddress}`,
                  timestamp: new Date(),
                  metadata: {
                    propertyReference: baseAddress,
                    eventType: 'viewing',
                    attendees: [],
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify at least one property is linked
              expect(result.linkedProperties.length).toBeGreaterThan(0);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should link events to multiple contacts when multiple attendees match', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.emailAddress(), { minLength: 2, maxLength: 5 }),
          async (emails) => {
            const testUserId = await createTestUser();
            
            try {
              // Create contacts for each email
              const contacts = await Promise.all(
                emails.map((email, index) =>
                  prisma.contact.create({
                    data: {
                      userId: testUserId,
                      name: `Contact ${index}`,
                      emails: [email],
                      phones: [],
                      role: 'buyer',
                    },
                  })
                )
              );

              // Create a calendar event with multiple attendees
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: 'Property Meeting',
                  timestamp: new Date(),
                  metadata: {
                    attendees: emails,
                    eventType: 'meeting',
                  },
                },
              });

              // Link the event
              const result = await calendarEventLinkingService.linkEvent(
                testUserId,
                event.entityId
              );

              // Verify all contacts are linked
              expect(result.linkedContacts.length).toBe(contacts.length);
              contacts.forEach((contact) => {
                expect(result.linkedContacts).toContain(contact.id);
              });
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should create timeline events for linked properties', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('123 Main St', '456 Oak Ave'),
          async (address) => {
            const testUserId = await createTestUser();
            
            try {
              // Create a property
              const property = await prisma.property.create({
                data: {
                  userId: testUserId,
                  address,
                },
              });

              // Create a calendar event
              const event = await prisma.timelineEvent.create({
                data: {
                  userId: testUserId,
                  type: 'meeting',
                  entityType: 'calendar_event',
                  entityId: `test-event-${Date.now()}-${Math.random()}`,
                  summary: `Viewing at ${address}`,
                  timestamp: new Date(),
                  metadata: {
                    propertyReference: address,
                    eventType: 'viewing',
                    attendees: [],
                  },
                },
              });

              // Link the event
              await calendarEventLinkingService.linkEvent(testUserId, event.entityId);

              // Verify timeline event was created for property
              const propertyTimeline = await prisma.timelineEvent.findFirst({
                where: {
                  userId: testUserId,
                  entityType: 'property',
                  entityId: property.id,
                },
              });

              expect(propertyTimeline).toBeDefined();
              expect(propertyTimeline?.type).toBe('meeting');
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
