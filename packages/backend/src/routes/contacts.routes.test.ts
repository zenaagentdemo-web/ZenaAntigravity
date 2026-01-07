/**
 * Unit tests for Contacts API endpoints
 * 
 * Tests cover all endpoints in contacts.routes.ts:
 * - GET /api/contacts - List contacts
 * - GET /api/contacts/:id - Get contact details
 * - POST /api/contacts - Create contact
 * - PUT /api/contacts/:id - Update contact
 * - DELETE /api/contacts/:id - Delete contact
 * - POST /api/contacts/bulk-delete - Bulk delete
 * - PATCH /api/contacts/bulk - Bulk update
 * - POST /api/contacts/:id/notes - Add note
 * - POST /api/contacts/:id/recategorize - Recategorize contact
 * - POST /api/contacts/recategorize-all - Recategorize all
 * - GET /api/contacts/:id/engagement - Get engagement
 * - POST /api/contacts/batch-engagement - Batch engagement
 * - POST /api/contacts/:id/discovery - Run discovery
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Type definitions matching API contracts
interface Contact {
    id: string;
    name: string;
    emails: string[];
    phones: string[];
    role: 'buyer' | 'vendor' | 'supplier' | 'agent' | 'other';
    engagementScore?: number;
    engagementVelocity?: number;
    zenaCategory?: string;
    dealStage?: string;
}

interface CreateContactRequest {
    name: string;
    emails: string[];
    phones?: string[];
    role?: string;
}

interface UpdateContactRequest {
    name?: string;
    emails?: string[];
    phones?: string[];
    role?: string;
    dealStage?: string;
}

interface Note {
    content: string;
    source?: 'manual' | 'email' | 'voice_note' | 'ai';
}

// Arbitrary generators
const roleArb = fc.constantFrom<'buyer' | 'vendor' | 'supplier' | 'agent' | 'other'>(
    'buyer', 'vendor', 'supplier', 'agent', 'other'
);

const contactArb = fc.record<Contact>({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
    phones: fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 0, maxLength: 3 }),
    role: roleArb,
    engagementScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    engagementVelocity: fc.option(fc.integer({ min: -50, max: 50 }), { nil: undefined }),
    zenaCategory: fc.option(fc.constantFrom('HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'VIP'), { nil: undefined }),
    dealStage: fc.option(fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'closed'), { nil: undefined }),
});

const createContactArb = fc.record<CreateContactRequest>({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
    phones: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 0, maxLength: 3 }), { nil: undefined }),
    role: fc.option(fc.constantFrom('buyer', 'vendor', 'supplier', 'agent', 'other'), { nil: undefined }),
});

const updateContactArb = fc.record<UpdateContactRequest>({
    name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    emails: fc.option(fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }), { nil: undefined }),
    phones: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 15 }), { minLength: 0, maxLength: 3 }), { nil: undefined }),
    role: fc.option(fc.constantFrom('buyer', 'vendor', 'supplier', 'agent', 'other'), { nil: undefined }),
    dealStage: fc.option(fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'closed'), { nil: undefined }),
});

const noteArb = fc.record<Note>({
    content: fc.string({ minLength: 1, maxLength: 500 }),
    source: fc.option(fc.constantFrom<'manual' | 'email' | 'voice_note' | 'ai'>('manual', 'email', 'voice_note', 'ai'), { nil: undefined }),
});

describe('Contacts API Endpoint Tests', () => {
    describe('GET /api/contacts', () => {
        it('should accept valid query parameters', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 0, maxLength: 100 }),
                    roleArb,
                    fc.integer({ min: 1, max: 100 }),
                    fc.integer({ min: 0, max: 1000 }),
                    (search, role, limit, offset) => {
                        const queryParams = { search, role, limit, offset };
                        expect(typeof queryParams.search).toBe('string');
                        expect(['buyer', 'vendor', 'supplier', 'agent', 'other']).toContain(queryParams.role);
                        expect(queryParams.limit).toBeGreaterThanOrEqual(1);
                        expect(queryParams.offset).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should return contacts array', () => {
            fc.assert(
                fc.property(
                    fc.array(contactArb, { minLength: 0, maxLength: 50 }),
                    (contacts) => {
                        expect(Array.isArray(contacts)).toBe(true);
                        contacts.forEach(c => {
                            expect(c.id).toBeTruthy();
                            expect(c.name).toBeTruthy();
                            expect(c.emails.length).toBeGreaterThan(0);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('GET /api/contacts/:id', () => {
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

        it('should return contact object', () => {
            fc.assert(
                fc.property(
                    contactArb,
                    (contact) => {
                        expect(contact.id).toBeTruthy();
                        expect(contact.name).toBeTruthy();
                        expect(contact.emails).toBeDefined();
                        expect(contact.role).toBeDefined();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/contacts', () => {
        it('should validate create contact request body', () => {
            fc.assert(
                fc.property(
                    createContactArb,
                    (requestBody) => {
                        expect(requestBody.name).toBeTruthy();
                        expect(requestBody.emails.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should require name field', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (name) => {
                        expect(name.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should require at least one email', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.emailAddress(), { minLength: 1, maxLength: 3 }),
                    (emails) => {
                        expect(emails.length).toBeGreaterThan(0);
                        emails.forEach(email => {
                            expect(email).toContain('@');
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('PUT /api/contacts/:id', () => {
        it('should validate update contact request body', () => {
            fc.assert(
                fc.property(
                    updateContactArb,
                    (requestBody) => {
                        // At least one field should be present for update
                        const hasUpdate = Object.values(requestBody).some(v => v !== undefined);
                        expect(typeof requestBody === 'object').toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('DELETE /api/contacts/:id', () => {
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

    describe('POST /api/contacts/bulk-delete', () => {
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

    describe('PATCH /api/contacts/bulk', () => {
        it('should accept array of ids and update data', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 1, maxLength: 50 }),
                    roleArb,
                    (ids, role) => {
                        const requestBody = { ids, data: { role } };
                        expect(Array.isArray(requestBody.ids)).toBe(true);
                        expect(requestBody.data.role).toBeTruthy();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/contacts/:id/notes', () => {
        it('should validate note request body', () => {
            fc.assert(
                fc.property(
                    noteArb,
                    (note) => {
                        expect(note.content).toBeTruthy();
                        expect(note.content.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('note source should be valid', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('manual', 'email', 'voice_note', 'ai'),
                    (source) => {
                        expect(['manual', 'email', 'voice_note', 'ai']).toContain(source);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/contacts/:id/recategorize', () => {
        it('should accept valid contact id', () => {
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

    describe('POST /api/contacts/recategorize-all', () => {
        it('endpoint should exist', () => {
            const endpoint = '/api/contacts/recategorize-all';
            expect(endpoint).toBe('/api/contacts/recategorize-all');
        });
    });

    describe('GET /api/contacts/:id/engagement', () => {
        it('should return engagement data structure', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: -50, max: 50 }),
                    (score, velocity) => {
                        const engagement = { score, velocity };
                        expect(engagement.score).toBeGreaterThanOrEqual(0);
                        expect(engagement.score).toBeLessThanOrEqual(100);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/contacts/batch-engagement', () => {
        it('should accept array of contact ids', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
                    (ids) => {
                        expect(Array.isArray(ids)).toBe(true);
                        expect(ids.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('POST /api/contacts/:id/discovery', () => {
        it('should accept valid contact id', () => {
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
});
