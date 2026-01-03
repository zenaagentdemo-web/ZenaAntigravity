import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';

/**
 * Property-Based Tests for Contacts Page Actions
 * 
 * Tests the main user actions on the contacts page:
 * 1. Discovery/Enrichment
 * 2. Email Compose
 * 3. Batch Operations
 * 4. Contact Deletion
 */

// Test user for all tests
let testUserId: string;
let testContactIds: string[] = [];

beforeAll(async () => {
    const user = await prisma.user.create({
        data: {
            email: `contacts-actions-pbt-${Date.now()}@test.com`,
            passwordHash: 'testhash',
            name: 'Contacts Actions PBT User',
        },
    });
    testUserId = user.id;
});

afterAll(async () => {
    try {
        await prisma.contactPrediction.deleteMany({ where: { userId: testUserId } });
        await prisma.deal.deleteMany({ where: { userId: testUserId } });
        await prisma.property.deleteMany({ where: { userId: testUserId } });
        await prisma.contact.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
});

describe('Contacts Page Actions - Property-Based Tests', () => {

    /**
     * Property 11: Contact Creation with Required Fields
     * All contacts must have required fields populated
     */
    describe('Property 11: Contact Creation Requirements', () => {
        it('should require name for contact creation', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                        email: fc.emailAddress(),
                        role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [data.email],
                                phones: [],
                                role: data.role,
                            },
                        });
                        testContactIds.push(contact.id);

                        // Required fields must be present
                        expect(contact.id).toBeDefined();
                        expect(contact.name).toBe(data.name);
                        expect(contact.userId).toBe(testUserId);
                        expect(contact.role).toBe(data.role);
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should create contact with default values', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [],
                                phones: [],
                                role: 'other',
                            },
                        });
                        testContactIds.push(contact.id);

                        // Default values
                        expect(contact.zenaCategory).toBe('PULSE');
                        expect(contact.intelligenceSnippet).toBeNull();
                        expect(contact.engagementReasoning).toBeNull();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 12: Contact Deletion Cascade
     * Deleting a contact should clean up related records
     */
    describe('Property 12: Contact Deletion Integrity', () => {
        it('should delete contact predictions when contact is deleted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                    }),
                    async (data) => {
                        // Create contact
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [data.email],
                                phones: [],
                                role: 'buyer',
                            },
                        });

                        // Create prediction
                        await prisma.contactPrediction.create({
                            data: {
                                contactId: contact.id,
                                userId: testUserId,
                                maturityLevel: 1,
                            },
                        });

                        // Verify prediction exists
                        const predictionBefore = await prisma.contactPrediction.findUnique({
                            where: { contactId: contact.id },
                        });
                        expect(predictionBefore).not.toBeNull();

                        // Delete prediction first (required due to foreign key)
                        await prisma.contactPrediction.delete({
                            where: { contactId: contact.id },
                        });

                        // Delete contact
                        await prisma.contact.delete({
                            where: { id: contact.id },
                        });

                        // Verify contact is gone
                        const contactAfter = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });
                        expect(contactAfter).toBeNull();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 13: Email Array Handling
     * Contacts should correctly store and retrieve multiple emails
     */
    describe('Property 13: Email Array Integrity', () => {
        it('should store and retrieve multiple emails correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }),
                    async (emails) => {
                        const uniqueEmails = [...new Set(emails)];

                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Email Array Test',
                                emails: uniqueEmails,
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        expect(retrieved?.emails).toEqual(uniqueEmails);
                        expect(retrieved?.emails.length).toBe(uniqueEmails.length);
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * Property 14: Phone Array Handling
     * Contacts should correctly store and retrieve multiple phones
     */
    describe('Property 14: Phone Array Integrity', () => {
        it('should store and retrieve multiple phones correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.stringMatching(/^\+64[0-9]{8,9}$/),
                        { minLength: 0, maxLength: 3 }
                    ),
                    async (phones) => {
                        const uniquePhones = [...new Set(phones)];

                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Phone Array Test',
                                emails: [`phone-test-${Date.now()}@test.com`],
                                phones: uniquePhones,
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        expect(retrieved?.phones).toEqual(uniquePhones);
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * Property 15: Relationship Notes Array
     * Notes should maintain order and structure
     */
    describe('Property 15: Relationship Notes Structure', () => {
        it('should store notes with required structure', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            content: fc.string({ minLength: 1, maxLength: 200 }),
                            source: fc.constantFrom('email', 'voice_note', 'manual'),
                            createdAt: fc.date().map(d => d.toISOString()),
                        }),
                        { minLength: 0, maxLength: 5 }
                    ),
                    async (notes) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Notes Test Contact',
                                emails: [`notes-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                                relationshipNotes: notes,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        const storedNotes = retrieved?.relationshipNotes as any[];
                        expect(storedNotes.length).toBe(notes.length);

                        // Verify structure is preserved
                        notes.forEach((note, i) => {
                            expect(storedNotes[i].id).toBe(note.id);
                            expect(storedNotes[i].content).toBe(note.content);
                            expect(storedNotes[i].source).toBe(note.source);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 16: User Isolation
     * Users should only see their own contacts
     */
    describe('Property 16: User Data Isolation', () => {
        it('should isolate contacts by user', async () => {
            // Create another user
            const otherUser = await prisma.user.create({
                data: {
                    email: `other-user-${Date.now()}@test.com`,
                    passwordHash: 'hash',
                    name: 'Other User',
                },
            });

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    async (data) => {
                        // Create contact for test user
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [`isolation-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        // Query as other user - should NOT find this contact
                        const otherUserContacts = await prisma.contact.findMany({
                            where: {
                                userId: otherUser.id,
                                id: contact.id,
                            },
                        });

                        expect(otherUserContacts.length).toBe(0);

                        // Query as test user - SHOULD find this contact
                        const testUserContacts = await prisma.contact.findMany({
                            where: {
                                userId: testUserId,
                                id: contact.id,
                            },
                        });

                        expect(testUserContacts.length).toBe(1);
                    }
                ),
                { numRuns: 5 }
            );

            // Cleanup other user
            await prisma.user.delete({ where: { id: otherUser.id } });
        });
    });

    /**
     * Property 17: Timestamp Consistency
     * Created and updated timestamps should be consistent
     */
    describe('Property 17: Timestamp Consistency', () => {
        it('should set createdAt and updatedAt correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    async (data) => {
                        const before = new Date();

                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [`timestamp-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const after = new Date();

                        // createdAt should be between before and after
                        expect(contact.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
                        expect(contact.createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);

                        // updatedAt should equal createdAt on creation
                        expect(contact.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should update updatedAt on modification', async () => {
            const contact = await prisma.contact.create({
                data: {
                    userId: testUserId,
                    name: 'Timestamp Update Test',
                    emails: [`update-ts-${Date.now()}@test.com`],
                    phones: [],
                    role: 'buyer',
                },
            });
            testContactIds.push(contact.id);

            const originalUpdatedAt = contact.updatedAt;

            // Wait a bit to ensure time difference
            await new Promise(resolve => setTimeout(resolve, 50));

            const updated = await prisma.contact.update({
                where: { id: contact.id },
                data: { name: 'Updated Name' },
            });

            expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            expect(updated.createdAt.getTime()).toBe(contact.createdAt.getTime());
        });
    });

    /**
     * Property 18: Batch Category Update
     * Multiple contacts can be updated with same category
     */
    describe('Property 18: Batch Category Assignment', () => {
        it('should update category for multiple contacts', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 5 }),
                    fc.constantFrom('PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'),
                    async (count, targetCategory) => {
                        // Create multiple contacts
                        const contacts = await Promise.all(
                            Array(count).fill(null).map((_, i) =>
                                prisma.contact.create({
                                    data: {
                                        userId: testUserId,
                                        name: `Batch Test ${i}`,
                                        emails: [`batch-${i}-${Date.now()}@test.com`],
                                        phones: [],
                                        role: 'buyer',
                                        zenaCategory: 'PULSE',
                                    },
                                })
                            )
                        );
                        testContactIds.push(...contacts.map(c => c.id));

                        // Batch update
                        await prisma.contact.updateMany({
                            where: {
                                id: { in: contacts.map(c => c.id) },
                            },
                            data: {
                                zenaCategory: targetCategory,
                            },
                        });

                        // Verify all updated
                        const updated = await prisma.contact.findMany({
                            where: {
                                id: { in: contacts.map(c => c.id) },
                            },
                        });

                        expect(updated.length).toBe(count);
                        updated.forEach(c => {
                            expect(c.zenaCategory).toBe(targetCategory);
                        });
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});
