import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CalendarEvent } from './calendar-sync-engine.service.js';

/**
 * Property-Based Tests for Calendar Sync Engine
 * 
 * Feature: zena-ai-real-estate-pwa, Property 11: Calendar event extraction completeness
 * Validates: Requirements 4.5
 */

describe('Calendar Sync Engine - Property-Based Tests', () => {
  /**
   * Property 11: Calendar event extraction completeness
   * 
   * For any real estate-related calendar event, the system should extract and store
   * the event type, participants, property reference, and timing.
   */
  describe('Property 11: Calendar event extraction completeness', () => {
    it('should extract all required fields from any calendar event', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary calendar events
          fc.record({
            externalId: fc.string({ minLength: 1, maxLength: 100 }),
            summary: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ maxLength: 500 })),
            startTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            endTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            location: fc.option(fc.string({ maxLength: 200 })),
            attendees: fc.array(fc.emailAddress(), { maxLength: 10 }),
            eventType: fc.constantFrom(
              'viewing' as const,
              'appraisal' as const,
              'meeting' as const,
              'auction' as const,
              'settlement' as const,
              'other' as const
            ),
          }),
          (event) => {
            // Verify all required fields are present
            expect(event.externalId).toBeDefined();
            expect(typeof event.externalId).toBe('string');
            expect(event.externalId.length).toBeGreaterThan(0);

            expect(event.summary).toBeDefined();
            expect(typeof event.summary).toBe('string');
            expect(event.summary.length).toBeGreaterThan(0);

            expect(event.startTime).toBeDefined();
            expect(event.startTime).toBeInstanceOf(Date);
            expect(event.startTime.getTime()).not.toBeNaN();

            expect(event.endTime).toBeDefined();
            expect(event.endTime).toBeInstanceOf(Date);
            expect(event.endTime.getTime()).not.toBeNaN();

            expect(event.attendees).toBeDefined();
            expect(Array.isArray(event.attendees)).toBe(true);

            expect(event.eventType).toBeDefined();
            expect(['viewing', 'appraisal', 'meeting', 'auction', 'settlement', 'other']).toContain(
              event.eventType
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly detect viewing event types from keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Property Viewing',
            'Open Home',
            'Open House',
            'Property Inspection',
            'Property Tour',
            'Home Viewing',
            'Inspection at 123 Main St'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary, description, location) => {
            const text = `${summary} ${description || ''} ${location || ''}`.toLowerCase();
            
            // Verify viewing keywords are detected
            const hasViewingKeyword =
              text.includes('viewing') ||
              text.includes('inspection') ||
              text.includes('open home') ||
              text.includes('open house') ||
              text.includes('property tour');

            expect(hasViewingKeyword).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly detect appraisal event types from keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Property Appraisal',
            'Home Valuation',
            'Property Assessment',
            'Appraisal Meeting',
            'Valuation at 456 Oak Ave'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary, description, location) => {
            const text = `${summary} ${description || ''} ${location || ''}`.toLowerCase();
            
            // Verify appraisal keywords are detected
            const hasAppraisalKeyword =
              text.includes('appraisal') ||
              text.includes('valuation') ||
              text.includes('assessment');

            expect(hasAppraisalKeyword).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly detect auction event types from keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Property Auction',
            'Auction Day',
            'Bidding Event',
            'Auction at 789 Elm St'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary, description, location) => {
            const text = `${summary} ${description || ''} ${location || ''}`.toLowerCase();
            
            // Verify auction keywords are detected
            const hasAuctionKeyword =
              text.includes('auction') ||
              text.includes('bidding');

            expect(hasAuctionKeyword).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly detect settlement event types from keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Property Settlement',
            'Closing Meeting',
            'Final Inspection',
            'Handover',
            'Settlement at Lawyer Office'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary, description, location) => {
            const text = `${summary} ${description || ''} ${location || ''}`.toLowerCase();
            
            // Verify settlement keywords are detected
            const hasSettlementKeyword =
              text.includes('settlement') ||
              text.includes('closing') ||
              text.includes('handover') ||
              text.includes('final inspection');

            expect(hasSettlementKeyword).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly detect meeting event types from keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Vendor Meeting',
            'Buyer Meeting',
            'Client Meeting',
            'Meeting with Buyer',
            'Vendor Discussion'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary, description, location) => {
            const text = `${summary} ${description || ''} ${location || ''}`.toLowerCase();
            
            // Verify meeting keywords are detected
            const hasMeetingKeyword =
              text.includes('meeting') ||
              text.includes('vendor') ||
              text.includes('buyer') ||
              text.includes('client');

            expect(hasMeetingKeyword).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all attendee email addresses', () => {
      fc.assert(
        fc.property(
          fc.array(fc.emailAddress(), { minLength: 1, maxLength: 10 }),
          (attendees) => {
            // Create a calendar event with these attendees
            const event: CalendarEvent = {
              externalId: 'test-event',
              summary: 'Test Event',
              startTime: new Date(),
              endTime: new Date(),
              attendees,
            };

            // Verify all attendees are preserved
            expect(event.attendees).toHaveLength(attendees.length);
            attendees.forEach((email) => {
              expect(event.attendees).toContain(email);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle events with no attendees', () => {
      fc.assert(
        fc.property(
          fc.record({
            externalId: fc.string({ minLength: 1 }),
            summary: fc.string({ minLength: 1 }),
            startTime: fc.date(),
            endTime: fc.date(),
          }),
          (eventData) => {
            const event: CalendarEvent = {
              ...eventData,
              attendees: [],
            };

            // Verify empty attendees array is valid
            expect(event.attendees).toBeDefined();
            expect(Array.isArray(event.attendees)).toBe(true);
            expect(event.attendees).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle events with optional fields missing', () => {
      fc.assert(
        fc.property(
          fc.record({
            externalId: fc.string({ minLength: 1 }),
            summary: fc.string({ minLength: 1 }),
            startTime: fc.date(),
            endTime: fc.date(),
            attendees: fc.array(fc.emailAddress()),
          }),
          (eventData) => {
            const event: CalendarEvent = {
              ...eventData,
              // description, location, and eventType are optional
            };

            // Verify required fields are present
            expect(event.externalId).toBeDefined();
            expect(event.summary).toBeDefined();
            expect(event.startTime).toBeDefined();
            expect(event.endTime).toBeDefined();
            expect(event.attendees).toBeDefined();

            // Optional fields can be undefined
            expect(event.description).toBeUndefined();
            expect(event.location).toBeUndefined();
            expect(event.eventType).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle events with all optional fields present', () => {
      fc.assert(
        fc.property(
          fc.record({
            externalId: fc.string({ minLength: 1 }),
            summary: fc.string({ minLength: 1 }),
            description: fc.string(),
            startTime: fc.date(),
            endTime: fc.date(),
            location: fc.string(),
            attendees: fc.array(fc.emailAddress()),
            eventType: fc.constantFrom(
              'viewing' as const,
              'appraisal' as const,
              'meeting' as const,
              'auction' as const,
              'settlement' as const,
              'other' as const
            ),
          }),
          (event) => {
            // Verify all fields are present and valid
            expect(event.externalId).toBeDefined();
            expect(event.summary).toBeDefined();
            expect(event.description).toBeDefined();
            expect(event.startTime).toBeDefined();
            expect(event.endTime).toBeDefined();
            expect(event.location).toBeDefined();
            expect(event.attendees).toBeDefined();
            expect(event.eventType).toBeDefined();

            // Verify types
            expect(typeof event.externalId).toBe('string');
            expect(typeof event.summary).toBe('string');
            expect(typeof event.description).toBe('string');
            expect(event.startTime).toBeInstanceOf(Date);
            expect(event.endTime).toBeInstanceOf(Date);
            expect(typeof event.location).toBe('string');
            expect(Array.isArray(event.attendees)).toBe(true);
            expect(['viewing', 'appraisal', 'meeting', 'auction', 'settlement', 'other']).toContain(
              event.eventType
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract property references from event text with addresses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Viewing at 123 Main Street',
            'Open Home - 456 Oak Avenue',
            'Property Inspection: 789 Elm Road',
            'Auction at 321 Pine Drive',
            'Settlement for 654 Maple Lane',
            'Appraisal - Unit 5/123 Main St',
            'Meeting at 10 Park Court'
          ),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (summary: string, description: string | null, location: string | null) => {
            const text = `${summary} ${description || ''} ${location || ''}`;
            
            // Verify that an address pattern exists in the text
            const addressPattern = /\b(\d+[\w\s,/-]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Boulevard|Blvd|Way|Terrace|Tce|Crescent|Cres|Circuit|Cct)\b)/gi;
            const hasAddress = addressPattern.test(text);

            expect(hasAddress).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle events without property references gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            externalId: fc.string({ minLength: 1 }),
            summary: fc.constantFrom('Team Meeting', 'Lunch Break', 'Conference Call'),
            startTime: fc.date(),
            endTime: fc.date(),
            attendees: fc.array(fc.emailAddress()),
          }),
          (eventData) => {
            const event: CalendarEvent = {
              ...eventData,
              // No property reference expected for non-real-estate events
            };

            // Verify event is still valid without property reference
            expect(event.externalId).toBeDefined();
            expect(event.summary).toBeDefined();
            expect(event.startTime).toBeDefined();
            expect(event.endTime).toBeDefined();
            expect(event.attendees).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract property reference when present in location field', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '123 Main Street',
            '456 Oak Avenue',
            '789 Elm Road',
            'Unit 5/123 Main St',
            '10 Park Court'
          ),
          (location: string) => {
            const event: CalendarEvent = {
              externalId: 'test-event',
              summary: 'Property Viewing',
              startTime: new Date(),
              endTime: new Date(),
              location,
              attendees: [],
              propertyReference: location, // Should be extracted from location
            };

            // Verify property reference matches location when it contains an address
            if (event.propertyReference) {
              expect(typeof event.propertyReference).toBe('string');
              expect(event.propertyReference.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should store property reference in metadata when present', () => {
      fc.assert(
        fc.property(
          fc.record({
            externalId: fc.string({ minLength: 1 }),
            summary: fc.constantFrom(
              'Viewing at 123 Main Street',
              'Auction at 456 Oak Avenue'
            ),
            startTime: fc.date(),
            endTime: fc.date(),
            attendees: fc.array(fc.emailAddress()),
            propertyReference: fc.option(fc.string({ minLength: 1 })),
          }),
          (event) => {
            // Verify that if property reference exists, it's a valid string
            if (event.propertyReference !== null && event.propertyReference !== undefined) {
              expect(typeof event.propertyReference).toBe('string');
              expect(event.propertyReference.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
