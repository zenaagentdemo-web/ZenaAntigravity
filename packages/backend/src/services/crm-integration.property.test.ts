import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { CRMIntegrationService, ICRMConnector, CRMCredentials } from './crm-integration.service';

/**
 * Mock CRM Connector for testing
 */
class MockCRMConnector implements ICRMConnector {
  private records: Map<string, Map<string, any>> = new Map([
    ['contact', new Map()],
    ['property', new Map()],
    ['deal', new Map()],
  ]);

  async authenticate(_credentials: CRMCredentials): Promise<boolean> {
    return true;
  }

  async pushContact(contact: any): Promise<string> {
    const id = `contact_${Date.now()}_${Math.random()}`;
    this.records.get('contact')!.set(id, contact);
    return id;
  }

  async pushProperty(property: any): Promise<string> {
    const id = `property_${Date.now()}_${Math.random()}`;
    this.records.get('property')!.set(id, property);
    return id;
  }

  async pushDeal(deal: any): Promise<string> {
    const id = `deal_${Date.now()}_${Math.random()}`;
    this.records.get('deal')!.set(id, deal);
    return id;
  }

  async findExistingRecord(
    type: 'contact' | 'property' | 'deal',
    identifier: any
  ): Promise<string | null> {
    const records = this.records.get(type)!;
    
    for (const [id, record] of records.entries()) {
      if (type === 'contact' && identifier.email && record.emails?.includes(identifier.email)) {
        return id;
      }
      if (type === 'property' && identifier.address && record.address === identifier.address) {
        return id;
      }
      if (type === 'deal' && identifier.propertyId && record.propertyId === identifier.propertyId) {
        return id;
      }
    }
    
    return null;
  }

  async updateRecord(
    type: 'contact' | 'property' | 'deal',
    crmRecordId: string,
    data: any
  ): Promise<void> {
    const records = this.records.get(type)!;
    if (records.has(crmRecordId)) {
      records.set(crmRecordId, data);
    }
  }

  // Helper method for testing
  getRecordCount(type: 'contact' | 'property' | 'deal'): number {
    return this.records.get(type)!.size;
  }

  // Helper method for testing
  getRecord(type: 'contact' | 'property' | 'deal', id: string): any {
    return this.records.get(type)!.get(id);
  }
}

/**
 * Generators for property-based testing
 */

const contactArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
  phones: fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 0, maxLength: 2 }),
  role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
  relationshipNotes: fc.array(
    fc.record({
      id: fc.uuid(),
      content: fc.string({ minLength: 1, maxLength: 200 }),
      source: fc.constantFrom('email', 'voice_note', 'manual'),
      createdAt: fc.date(),
    }),
    { maxLength: 5 }
  ),
});

const propertyArb = fc.record({
  id: fc.uuid(),
  address: fc.string({ minLength: 10, maxLength: 100 }),
  vendors: fc.array(fc.record({ id: fc.uuid() }), { maxLength: 3 }),
  buyers: fc.array(fc.record({ id: fc.uuid() }), { maxLength: 5 }),
  milestones: fc.array(
    fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('listing', 'first_open', 'offer_received', 'conditional', 'unconditional', 'settled'),
      date: fc.date(),
      notes: fc.option(fc.string({ maxLength: 100 })),
    }),
    { maxLength: 10 }
  ),
  riskOverview: fc.option(fc.string({ maxLength: 200 })),
});

const dealArb = fc.record({
  id: fc.uuid(),
  propertyId: fc.option(fc.uuid()),
  stage: fc.constantFrom('lead', 'qualified', 'viewing', 'offer', 'conditional', 'pre_settlement', 'sold', 'nurture'),
  riskLevel: fc.constantFrom('none', 'low', 'medium', 'high'),
  riskFlags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
  nextAction: fc.option(fc.string({ maxLength: 200 })),
  nextActionOwner: fc.constantFrom('agent', 'other'),
  summary: fc.string({ minLength: 1, maxLength: 500 }),
  contacts: fc.array(fc.record({ id: fc.uuid() }), { maxLength: 5 }),
});

describe('CRM Integration Service - Property-Based Tests', () => {
  let mockConnector: MockCRMConnector;

  beforeEach(() => {
    mockConnector = new MockCRMConnector();
  });

  describe('Property 78: CRM duplicate prevention', () => {
    /**
     * Feature: zena-ai-real-estate-pwa, Property 78: CRM duplicate prevention
     * 
     * For any data push to a connected CRM, if an existing record is detected,
     * the system should update it rather than create a duplicate.
     */

    it('should not create duplicate contacts when pushing the same contact twice', async () => {
      await fc.assert(
        fc.asyncProperty(contactArb, async (contact) => {
          // First push - should create new record
          const firstId = await mockConnector.pushContact(contact);
          expect(firstId).toBeDefined();
          expect(mockConnector.getRecordCount('contact')).toBe(1);

          // Check if record exists
          const existingId = await mockConnector.findExistingRecord('contact', {
            email: contact.emails[0],
            name: contact.name,
          });
          expect(existingId).toBe(firstId);

          // Second push - should update existing record, not create duplicate
          if (existingId) {
            await mockConnector.updateRecord('contact', existingId, contact);
          } else {
            await mockConnector.pushContact(contact);
          }

          // Should still have only 1 record
          expect(mockConnector.getRecordCount('contact')).toBe(1);

          // Verify the record was updated, not duplicated
          const finalRecord = mockConnector.getRecord('contact', firstId);
          expect(finalRecord).toBeDefined();
          expect(finalRecord.emails).toEqual(contact.emails);
        }),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate properties when pushing the same property twice', async () => {
      await fc.assert(
        fc.asyncProperty(propertyArb, async (property) => {
          // First push - should create new record
          const firstId = await mockConnector.pushProperty(property);
          expect(firstId).toBeDefined();
          expect(mockConnector.getRecordCount('property')).toBe(1);

          // Check if record exists
          const existingId = await mockConnector.findExistingRecord('property', {
            address: property.address,
          });
          expect(existingId).toBe(firstId);

          // Second push - should update existing record, not create duplicate
          if (existingId) {
            await mockConnector.updateRecord('property', existingId, property);
          } else {
            await mockConnector.pushProperty(property);
          }

          // Should still have only 1 record
          expect(mockConnector.getRecordCount('property')).toBe(1);

          // Verify the record was updated, not duplicated
          const finalRecord = mockConnector.getRecord('property', firstId);
          expect(finalRecord).toBeDefined();
          expect(finalRecord.address).toBe(property.address);
        }),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate deals when pushing the same deal twice', async () => {
      await fc.assert(
        fc.asyncProperty(dealArb, async (deal) => {
          // Skip deals without propertyId as they can't be deduplicated
          if (!deal.propertyId) {
            return;
          }

          // First push - should create new record
          const firstId = await mockConnector.pushDeal(deal);
          expect(firstId).toBeDefined();
          expect(mockConnector.getRecordCount('deal')).toBe(1);

          // Check if record exists
          const existingId = await mockConnector.findExistingRecord('deal', {
            propertyId: deal.propertyId,
            stage: deal.stage,
          });
          expect(existingId).toBe(firstId);

          // Second push - should update existing record, not create duplicate
          if (existingId) {
            await mockConnector.updateRecord('deal', existingId, deal);
          } else {
            await mockConnector.pushDeal(deal);
          }

          // Should still have only 1 record
          expect(mockConnector.getRecordCount('deal')).toBe(1);

          // Verify the record was updated, not duplicated
          const finalRecord = mockConnector.getRecord('deal', firstId);
          expect(finalRecord).toBeDefined();
          expect(finalRecord.propertyId).toBe(deal.propertyId);
          expect(finalRecord.stage).toBe(deal.stage);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify existing contacts by email', async () => {
      await fc.assert(
        fc.asyncProperty(contactArb, async (contact) => {
          // Push contact
          const id = await mockConnector.pushContact(contact);

          // Search by email should find the contact
          const foundId = await mockConnector.findExistingRecord('contact', {
            email: contact.emails[0],
          });

          expect(foundId).toBe(id);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify existing properties by address', async () => {
      await fc.assert(
        fc.asyncProperty(propertyArb, async (property) => {
          // Push property
          const id = await mockConnector.pushProperty(property);

          // Search by address should find the property
          const foundId = await mockConnector.findExistingRecord('property', {
            address: property.address,
          });

          expect(foundId).toBe(id);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify existing deals by propertyId', async () => {
      await fc.assert(
        fc.asyncProperty(dealArb, async (deal) => {
          // Skip deals without propertyId
          if (!deal.propertyId) {
            return;
          }

          // Push deal
          const id = await mockConnector.pushDeal(deal);

          // Search by propertyId should find the deal
          const foundId = await mockConnector.findExistingRecord('deal', {
            propertyId: deal.propertyId,
            stage: deal.stage,
          });

          expect(foundId).toBe(id);
        }),
        { numRuns: 100 }
      );
    });

    it('should return null when searching for non-existent records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.uuid(),
          async (email, address, propertyId) => {
            // Search for non-existent contact
            const contactId = await mockConnector.findExistingRecord('contact', { email });
            expect(contactId).toBeNull();

            // Search for non-existent property
            const propertyIdResult = await mockConnector.findExistingRecord('property', { address });
            expect(propertyIdResult).toBeNull();

            // Search for non-existent deal
            const dealId = await mockConnector.findExistingRecord('deal', { propertyId });
            expect(dealId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve record IDs when updating instead of creating duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(contactArb, contactArb, async (contact1, contact2) => {
          // Make sure both contacts have the same email (to trigger deduplication)
          const sharedEmail = contact1.emails[0];
          contact2.emails = [sharedEmail, ...contact2.emails.slice(1)];

          // Push first contact
          const firstId = await mockConnector.pushContact(contact1);

          // Try to push second contact with same email
          const existingId = await mockConnector.findExistingRecord('contact', {
            email: sharedEmail,
          });

          if (existingId) {
            await mockConnector.updateRecord('contact', existingId, contact2);
          } else {
            await mockConnector.pushContact(contact2);
          }

          // Should still have only 1 record
          expect(mockConnector.getRecordCount('contact')).toBe(1);

          // The ID should be the same as the first push
          const finalId = await mockConnector.findExistingRecord('contact', {
            email: sharedEmail,
          });
          expect(finalId).toBe(firstId);
        }),
        { numRuns: 100 }
      );
    });
  });
});
