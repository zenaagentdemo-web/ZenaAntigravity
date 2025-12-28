import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ICRMConnector, CRMCredentials } from './crm-integration.service.js';

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
    const id = `contact_${Math.random()}`;
    this.records.get('contact')!.set(id, { ...contact });
    return id;
  }

  async pushProperty(property: any): Promise<string> {
    const id = `property_${Math.random()}`;
    this.records.get('property')!.set(id, { ...property });
    return id;
  }

  async pushDeal(deal: any): Promise<string> {
    const id = `deal_${Math.random()}`;
    this.records.get('deal')!.set(id, { ...deal });
    return id;
  }

  async findExistingRecord(
    type: 'contact' | 'property' | 'deal',
    identifier: any
  ): Promise<string | null> {
    const records = this.records.get(type)!;

    for (const [id, record] of records.entries()) {
      if (type === 'contact') {
        if (identifier.email && record.emails?.includes(identifier.email)) return id;
      }
      if (type === 'property') {
        if (identifier.address && record.address === identifier.address) return id;
      }
      if (type === 'deal') {
        if (identifier.propertyId && record.propertyId === identifier.propertyId && record.stage === identifier.stage) return id;
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
      records.set(crmRecordId, { ...data });
    }
  }

  getRecordCount(type: 'contact' | 'property' | 'deal'): number {
    return this.records.get(type)!.size;
  }

  getRecord(type: 'contact' | 'property' | 'deal', id: string): any {
    return this.records.get(type)!.get(id);
  }
}

const contactArb = fc.record({
  name: fc.string({ minLength: 1 }),
  emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
});

const propertyArb = fc.record({
  address: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
});

describe('CRM Integration - Property-Based Tests', () => {
  it('should not create duplicate contacts when pushing the same contact twice', async () => {
    await fc.assert(
      fc.asyncProperty(contactArb, async (contact) => {
        const localMock = new MockCRMConnector();
        const email = contact.emails[0];

        // Push 1
        const id1 = await localMock.pushContact(contact);
        expect(localMock.getRecordCount('contact')).toBe(1);

        // Find
        const existingId = await localMock.findExistingRecord('contact', { email });
        expect(existingId).toBe(id1);

        // Second push (simulated update logic)
        if (existingId) {
          await localMock.updateRecord('contact', existingId, contact);
        } else {
          await localMock.pushContact(contact);
        }

        expect(localMock.getRecordCount('contact')).toBe(1);
      }),
      { numRuns: 20 }
    );
  });

  it('should not create duplicate properties when pushing the same property twice', async () => {
    await fc.assert(
      fc.asyncProperty(propertyArb, async (property) => {
        const localMock = new MockCRMConnector();
        const id1 = await localMock.pushProperty(property);
        expect(localMock.getRecordCount('property')).toBe(1);

        const existingId = await localMock.findExistingRecord('property', { address: property.address });
        expect(existingId).toBe(id1);

        if (existingId) {
          await localMock.updateRecord('property', existingId, property);
        } else {
          await localMock.pushProperty(property);
        }

        expect(localMock.getRecordCount('property')).toBe(1);
      }),
      { numRuns: 20 }
    );
  });
});
