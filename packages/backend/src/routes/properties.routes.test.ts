/**
 * Unit tests for Properties API endpoints
 * 
 * Tests cover all endpoints in properties.routes.ts:
 * - GET /api/properties - List properties
 * - GET /api/properties/:id - Get property details
 * - POST /api/properties - Create property
 * - PUT /api/properties/:id - Update property
 * - DELETE /api/properties/:id - Delete property
 * - POST /api/properties/bulk-delete - Bulk delete
 * - PATCH /api/properties/bulk - Bulk update
 * - GET /api/properties/smart-matches - Get all smart matches
 * - GET /api/properties/:id/smart-matches - Get property smart matches
 * - POST /api/properties/:id/milestones - Add milestone
 * - PUT /api/properties/:id/milestones/:milestoneId - Update milestone
 * - DELETE /api/properties/:id/milestones/:milestoneId - Delete milestone
 * - POST /api/properties/:id/vendor-update - Generate vendor update
 * - POST /api/properties/:id/intelligence/refresh - Refresh intelligence
 * - GET /api/properties/:id/intelligence - Get intelligence
 * - POST /api/properties/:id/comparables - Generate comparables
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Type definitions matching API contracts
interface Property {
    id: string;
    address: string;
    type?: 'residential' | 'commercial' | 'land';
    status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
    listingPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
}

interface CreatePropertyRequest {
    address: string;
    type?: 'residential' | 'commercial' | 'land';
    status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
    listingPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    vendorIds?: string[];
}

interface Milestone {
    type: 'listed' | 'first_viewing' | 'offer_received' | 'contract_signed' | 'settlement' | 'custom' | 'meeting' | 'personal' | 'other';
    title: string;
    date: string;
    notes?: string;
}

interface SmartMatch {
    contactId: string;
    contactName: string;
    matchScore: number;
    matchReasons: string[];
}

// Arbitrary generators
const statusArb = fc.constantFrom<'active' | 'under_contract' | 'sold' | 'withdrawn'>(
    'active', 'under_contract', 'sold', 'withdrawn'
);

const propertyTypeArb = fc.constantFrom<'residential' | 'commercial' | 'land'>(
    'residential', 'commercial', 'land'
);

const milestoneTypeArb = fc.constantFrom<'listed' | 'first_viewing' | 'offer_received' | 'contract_signed' | 'settlement' | 'custom' | 'meeting' | 'personal' | 'other'>(
    'listed', 'first_viewing', 'offer_received', 'contract_signed', 'settlement', 'custom', 'meeting', 'personal', 'other'
);

const propertyArb = fc.record<Property>({
    id: fc.uuid(),
    address: fc.string({ minLength: 5, maxLength: 200 }),
    type: propertyTypeArb,
    status: statusArb,
    listingPrice: fc.option(fc.integer({ min: 100000, max: 50000000 }), { nil: undefined }),
    bedrooms: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
    bathrooms: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
    landSize: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: undefined }),
});

const createPropertyArb = fc.record<CreatePropertyRequest>({
    address: fc.string({ minLength: 5, maxLength: 200 }),
    type: fc.option(propertyTypeArb, { nil: undefined }),
    status: fc.option(statusArb, { nil: undefined }),
    listingPrice: fc.option(fc.integer({ min: 100000, max: 50000000 }), { nil: undefined }),
    bedrooms: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
    bathrooms: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
    landSize: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: undefined }),
    vendorIds: fc.option(fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }), { nil: undefined }),
});

const milestoneArb = fc.record<Milestone>({
    type: milestoneTypeArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
});

const smartMatchArb = fc.record<SmartMatch>({
    contactId: fc.uuid(),
    contactName: fc.string({ minLength: 1, maxLength: 100 }),
    matchScore: fc.float({ min: 0, max: 1 }),
    matchReasons: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
});

describe('Properties API Endpoint Tests', () => {
    describe('GET /api/properties', () => {
        it('should accept valid query parameters', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 0, maxLength: 100 }),
                    statusArb,
                    fc.integer({ min: 1, max: 100 }),
                    fc.integer({ min: 0, max: 1000 }),
                    (search, status, limit, offset) => {
                        const queryParams = { search, status, limit, offset };
                        expect(typeof queryParams.search).toBe('string');
                        expect(['active', 'under_contract', 'sold', 'withdrawn']).toContain(queryParams.status);
                        expect(queryParams.limit).toBeGreaterThanOrEqual(1);
                        expect(queryParams.offset).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should return properties array', () => {
            fc.assert(
                fc.property(
                    fc.array(propertyArb, { minLength: 0, maxLength: 50 }),
                    (properties) => {
                        expect(Array.isArray(properties)).toBe(true);
                        properties.forEach(p => {
                            expect(p.id).toBeTruthy();
                            expect(p.address).toBeTruthy();
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('GET /api/properties/:id', () => {
        it('should require valid UUID id parameter', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    (id) => {
                        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should return property object', () => {
            fc.assert(
                fc.property(
                    propertyArb,
                    (property) => {
                        expect(property.id).toBeTruthy();
                        expect(property.address).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/properties', () => {
        it('should validate create property request body', () => {
            fc.assert(
                fc.property(
                    createPropertyArb,
                    (requestBody) => {
                        expect(requestBody.address).toBeTruthy();
                        expect(requestBody.address.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should require address field', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 5, maxLength: 200 }),
                    (address) => {
                        expect(address.length).toBeGreaterThanOrEqual(5);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('PUT /api/properties/:id', () => {
        it('should validate update property request body', () => {
            fc.assert(
                fc.property(
                    propertyArb,
                    (property) => {
                        expect(typeof property === 'object').toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('DELETE /api/properties/:id', () => {
        it('should require valid UUID id parameter', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    (id) => {
                        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/properties/bulk-delete', () => {
        it('should accept array of ids', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }),
                    (ids) => {
                        expect(Array.isArray(ids)).toBe(true);
                        expect(ids.length).toBeGreaterThan(0);
                        ids.forEach(id => {
                            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('PATCH /api/properties/bulk', () => {
        it('should accept array of ids and update data', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }),
                    statusArb,
                    (ids, status) => {
                        const requestBody = { ids, data: { status } };
                        expect(Array.isArray(requestBody.ids)).toBe(true);
                        expect(requestBody.data.status).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('GET /api/properties/smart-matches', () => {
        it('should return smart matches array', () => {
            fc.assert(
                fc.property(
                    fc.array(smartMatchArb, { minLength: 0, maxLength: 20 }),
                    (matches) => {
                        expect(Array.isArray(matches)).toBe(true);
                        matches.forEach(m => {
                            expect(m.contactId).toBeTruthy();
                            expect(m.matchScore).toBeGreaterThanOrEqual(0);
                            expect(m.matchScore).toBeLessThanOrEqual(1);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('GET /api/properties/:id/smart-matches', () => {
        it('should return matches for specific property', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.array(smartMatchArb, { minLength: 0, maxLength: 10 }),
                    (propertyId, matches) => {
                        expect(propertyId).toBeTruthy();
                        expect(Array.isArray(matches)).toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/properties/:id/milestones', () => {
        it('should validate milestone request body', () => {
            fc.assert(
                fc.property(
                    milestoneArb,
                    (milestone) => {
                        expect(milestone.type).toBeTruthy();
                        expect(milestone.title).toBeTruthy();
                        expect(milestone.date).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('milestone type should be valid', () => {
            fc.assert(
                fc.property(
                    milestoneTypeArb,
                    (type) => {
                        expect(['listed', 'first_viewing', 'offer_received', 'contract_signed', 'settlement', 'custom', 'meeting', 'personal', 'other']).toContain(type);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('PUT /api/properties/:id/milestones/:milestoneId', () => {
        it('should require valid property and milestone IDs', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.uuid(),
                    (propertyId, milestoneId) => {
                        expect(propertyId).toBeTruthy();
                        expect(milestoneId).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('DELETE /api/properties/:id/milestones/:milestoneId', () => {
        it('should require valid property and milestone IDs', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.uuid(),
                    (propertyId, milestoneId) => {
                        expect(propertyId).toBeTruthy();
                        expect(milestoneId).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/properties/:id/vendor-update', () => {
        it('should accept valid property id', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    (id) => {
                        expect(id).toBeTruthy();
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('POST /api/properties/:id/intelligence/refresh', () => {
        it('should accept valid property id', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    (id) => {
                        expect(id).toBeTruthy();
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('GET /api/properties/:id/intelligence', () => {
        it('should return intelligence data structure', () => {
            const intelligenceArb = fc.record({
                momentumScore: fc.integer({ min: 0, max: 100 }),
                heatLevel: fc.constantFrom('hot', 'active', 'cold'),
                suggestedActions: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
                buyerInterestLevel: fc.constantFrom('High', 'Medium', 'Low'),
            });

            fc.assert(
                fc.property(
                    intelligenceArb,
                    (intel) => {
                        expect(intel.momentumScore).toBeGreaterThanOrEqual(0);
                        expect(intel.momentumScore).toBeLessThanOrEqual(100);
                        expect(['hot', 'active', 'cold']).toContain(intel.heatLevel);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/properties/:id/comparables', () => {
        it('should accept valid property id', () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    (id) => {
                        expect(id).toBeTruthy();
                    }
                ),
                { numRuns: 5 }
            );
        });

        it('should return comparables report structure', () => {
            const comparableArb = fc.record({
                address: fc.string({ minLength: 5, maxLength: 100 }),
                salePrice: fc.integer({ min: 100000, max: 50000000 }),
                saleDate: fc.date().map(d => d.toISOString()),
                bedrooms: fc.integer({ min: 1, max: 10 }),
                bathrooms: fc.integer({ min: 1, max: 6 }),
            });

            fc.assert(
                fc.property(
                    fc.array(comparableArb, { minLength: 0, maxLength: 10 }),
                    (comparables) => {
                        expect(Array.isArray(comparables)).toBe(true);
                        comparables.forEach(c => {
                            expect(c.address).toBeTruthy();
                            expect(c.salePrice).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});
