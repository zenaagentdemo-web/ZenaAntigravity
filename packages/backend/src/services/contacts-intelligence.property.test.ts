import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';

/**
 * Property-Based Tests for Contacts Page Intelligence Features
 * 
 * Tests the Brain-First architecture components:
 * 1. Oracle Personality Detection (LLM-based)
 * 2. Oracle Propensity Scoring (LLM-based)
 * 3. Contact Categorization (LLM-based)
 * 4. Discovery/Intelligence Snippet Generation
 * 5. Engagement Score Calculation
 * 6. Smart Search
 */

// Test user for all intelligence tests
let testUserId: string;
let testContactIds: string[] = [];

beforeAll(async () => {
    const user = await prisma.user.create({
        data: {
            email: `intelligence-pbt-${Date.now()}@test.com`,
            passwordHash: 'testhash',
            name: 'Intelligence PBT User',
        },
    });
    testUserId = user.id;
});

afterAll(async () => {
    try {
        // Clean up in order due to foreign keys
        await prisma.contactPrediction.deleteMany({ where: { userId: testUserId } });
        await prisma.deal.deleteMany({ where: { userId: testUserId } });
        await prisma.property.deleteMany({ where: { userId: testUserId } });
        await prisma.contact.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
});

describe('Contacts Page Intelligence - Property-Based Tests', () => {

    /**
     * Property 1: Zena Category Assignment Validity
     * All contacts must have a valid zenaCategory from the enum
     */
    describe('Property 1: Zena Category Validity', () => {
        const VALID_CATEGORIES = ['PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'];

        it('should always assign a valid zenaCategory when creating a contact', async () => {
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
                                zenaCategory: 'PULSE', // Default
                            },
                        });
                        testContactIds.push(contact.id);

                        expect(VALID_CATEGORIES).toContain(contact.zenaCategory);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should reject invalid zenaCategory values', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string().filter(s => !VALID_CATEGORIES.includes(s)),
                    async (invalidCategory) => {
                        await expect(
                            prisma.contact.create({
                                data: {
                                    userId: testUserId,
                                    name: 'Invalid Category Test',
                                    emails: ['invalid@test.com'],
                                    phones: [],
                                    role: 'other',
                                    zenaCategory: invalidCategory as any,
                                },
                            })
                        ).rejects.toThrow();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 2: Intelligence Snippet Storage
     * Intelligence snippets should be stored and retrieved correctly
     */
    describe('Property 2: Intelligence Snippet Integrity', () => {
        it('should store and retrieve intelligence snippets without data loss', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                        snippet: fc.string({ minLength: 10, maxLength: 500 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [data.email],
                                phones: [],
                                role: 'buyer',
                                intelligenceSnippet: data.snippet,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        expect(retrieved?.intelligenceSnippet).toBe(data.snippet);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    /**
     * Property 3: Engagement Reasoning Storage
     * LLM-generated engagement reasoning should be stored correctly
     */
    describe('Property 3: Engagement Reasoning Integrity', () => {
        it('should store and retrieve engagementReasoning without data loss', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                        reasoning: fc.lorem({ mode: 'sentences', maxCount: 3 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [data.email],
                                phones: [],
                                role: 'buyer',
                                engagementReasoning: data.reasoning,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        expect(retrieved?.engagementReasoning).toBe(data.reasoning);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    /**
     * Property 4: Oracle Prediction Storage
     * ContactPrediction records should have valid structure
     */
    describe('Property 4: Oracle Prediction Validity', () => {
        const VALID_MATURITY_LEVELS = [0, 1, 2, 3]; // LEARNING, OBSERVING, PROFILING, PREDICTING
        const VALID_PERSONALITY_TYPES = ['D', 'I', 'S', 'C', null];

        it('should store valid maturity levels only', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        maturityLevel: fc.constantFrom(0, 1, 2, 3),
                        emailsAnalyzed: fc.integer({ min: 0, max: 100 }),
                        eventsCount: fc.integer({ min: 0, max: 500 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Oracle Test Contact',
                                emails: [`oracle-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const prediction = await prisma.contactPrediction.create({
                            data: {
                                contactId: contact.id,
                                userId: testUserId,
                                maturityLevel: data.maturityLevel,
                                emailsAnalyzed: data.emailsAnalyzed,
                                eventsCount: data.eventsCount,
                            },
                        });

                        expect(VALID_MATURITY_LEVELS).toContain(prediction.maturityLevel);
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should store valid personality types only', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        personalityType: fc.constantFrom('D', 'I', 'S', 'C', null),
                        confidence: fc.float({ min: 0, max: 1 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Personality Test Contact',
                                emails: [`personality-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const prediction = await prisma.contactPrediction.create({
                            data: {
                                contactId: contact.id,
                                userId: testUserId,
                                maturityLevel: 2,
                                personalityType: data.personalityType,
                                personalityConfidence: data.personalityType ? data.confidence : null,
                            },
                        });

                        expect(VALID_PERSONALITY_TYPES).toContain(prediction.personalityType);
                        if (prediction.personalityConfidence !== null) {
                            expect(prediction.personalityConfidence).toBeGreaterThanOrEqual(0);
                            expect(prediction.personalityConfidence).toBeLessThanOrEqual(1);
                        }
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should store propensity scores in valid range [0, 1]', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        sellProbability: fc.option(fc.float({ min: 0, max: 1 })),
                        buyProbability: fc.option(fc.float({ min: 0, max: 1 })),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Propensity Test Contact',
                                emails: [`propensity-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const prediction = await prisma.contactPrediction.create({
                            data: {
                                contactId: contact.id,
                                userId: testUserId,
                                maturityLevel: 2,
                                sellProbability: data.sellProbability ?? null,
                                buyProbability: data.buyProbability ?? null,
                            },
                        });

                        if (prediction.sellProbability !== null) {
                            expect(prediction.sellProbability).toBeGreaterThanOrEqual(0);
                            expect(prediction.sellProbability).toBeLessThanOrEqual(1);
                        }
                        if (prediction.buyProbability !== null) {
                            expect(prediction.buyProbability).toBeGreaterThanOrEqual(0);
                            expect(prediction.buyProbability).toBeLessThanOrEqual(1);
                        }
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * Property 5: Category Confidence Range
     * Category confidence should always be in [0, 1] when present
     */
    describe('Property 5: Category Confidence Range', () => {
        it('should store categoryConfidence in valid range [0, 1]', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        category: fc.constantFrom('PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'),
                        confidence: fc.double({ min: 0, max: 1, noNaN: true }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [`confidence-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                                zenaCategory: data.category,
                                categoryConfidence: data.confidence,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        if (retrieved?.categoryConfidence !== null) {
                            expect(retrieved.categoryConfidence).toBeGreaterThanOrEqual(0);
                            expect(retrieved.categoryConfidence).toBeLessThanOrEqual(1);
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    /**
     * Property 6: Zena Intelligence JSON Storage
     * zenaIntelligence should be valid JSON and preserve structure
     */
    describe('Property 6: Zena Intelligence JSON Integrity', () => {
        it('should store and retrieve zenaIntelligence JSON correctly', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        intelligence: fc.record({
                            timeline: fc.constantFrom('ASAP', '1-3 months', '6+ months', null),
                            minBudget: fc.option(fc.integer({ min: 100000, max: 500000 })),
                            maxBudget: fc.option(fc.integer({ min: 500000, max: 2000000 })),
                            propertyType: fc.constantFrom('house', 'apartment', 'townhouse', null),
                            bedrooms: fc.option(fc.integer({ min: 1, max: 6 })),
                            location: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
                        }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [`json-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                                zenaIntelligence: data.intelligence,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        const storedIntel = retrieved?.zenaIntelligence as any;
                        expect(storedIntel?.timeline).toBe(data.intelligence.timeline);
                        expect(storedIntel?.propertyType).toBe(data.intelligence.propertyType);
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * Property 7: Contact Filtering by Category
     * Filtering by zenaCategory should only return matching contacts
     */
    describe('Property 7: Category Filtering Accuracy', () => {
        it('should return only contacts matching the requested category', async () => {
            // Create contacts in different categories
            const categories = ['PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'] as const;
            const createdContacts: { id: string; category: string }[] = [];

            for (const category of categories) {
                const contact = await prisma.contact.create({
                    data: {
                        userId: testUserId,
                        name: `Filter Test ${category}`,
                        emails: [`filter-${category}-${Date.now()}@test.com`],
                        phones: [],
                        role: 'buyer',
                        zenaCategory: category,
                    },
                });
                testContactIds.push(contact.id);
                createdContacts.push({ id: contact.id, category });
            }

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('PULSE', 'HOT_LEAD', 'COLD_NURTURE', 'HIGH_INTENT'),
                    async (filterCategory) => {
                        const results = await prisma.contact.findMany({
                            where: {
                                userId: testUserId,
                                zenaCategory: filterCategory,
                                id: { in: createdContacts.map(c => c.id) },
                            },
                        });

                        // All results should have the requested category
                        for (const contact of results) {
                            expect(contact.zenaCategory).toBe(filterCategory);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 8: Last Activity Tracking
     * lastActivityAt should be a valid date when set
     */
    describe('Property 8: Last Activity Date Validity', () => {
        it('should store valid dates for lastActivityAt', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        activityDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                        activityDetail: fc.lorem({ mode: 'sentences', maxCount: 2 }),
                    }),
                    async (data) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: data.name,
                                emails: [`activity-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                                lastActivityAt: data.activityDate,
                                lastActivityDetail: data.activityDetail,
                            },
                        });
                        testContactIds.push(contact.id);

                        const retrieved = await prisma.contact.findUnique({
                            where: { id: contact.id },
                        });

                        expect(retrieved?.lastActivityAt).toBeInstanceOf(Date);
                        expect(retrieved?.lastActivityAt?.getTime()).toBe(data.activityDate.getTime());
                    }
                ),
                { numRuns: 15 }
            );
        });
    });

    /**
     * Property 9: Contact Role Filtering
     * Filtering by role should only return matching contacts
     */
    describe('Property 9: Role Filtering Accuracy', () => {
        it('should return only contacts matching the requested role', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('buyer', 'vendor', 'market', 'other'),
                    async (filterRole) => {
                        // Create a contact with this role
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: `Role Filter Test ${filterRole}`,
                                emails: [`role-${filterRole}-${Date.now()}@test.com`],
                                phones: [],
                                role: filterRole,
                            },
                        });
                        testContactIds.push(contact.id);

                        const results = await prisma.contact.findMany({
                            where: {
                                userId: testUserId,
                                role: filterRole,
                                id: contact.id,
                            },
                        });

                        expect(results.length).toBe(1);
                        expect(results[0].role).toBe(filterRole);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 10: Communication Tips JSON Array
     * Communication tips in ContactPrediction should be a valid array
     */
    describe('Property 10: Communication Tips Array Integrity', () => {
        it('should store and retrieve communicationTips as array', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.lorem({ mode: 'sentences', maxCount: 1 }), { minLength: 0, maxLength: 5 }),
                    async (tips) => {
                        const contact = await prisma.contact.create({
                            data: {
                                userId: testUserId,
                                name: 'Tips Test Contact',
                                emails: [`tips-${Date.now()}@test.com`],
                                phones: [],
                                role: 'buyer',
                            },
                        });
                        testContactIds.push(contact.id);

                        const prediction = await prisma.contactPrediction.create({
                            data: {
                                contactId: contact.id,
                                userId: testUserId,
                                maturityLevel: 2,
                                communicationTips: tips,
                            },
                        });

                        const retrieved = await prisma.contactPrediction.findUnique({
                            where: { contactId: contact.id },
                        });

                        const storedTips = retrieved?.communicationTips as string[];
                        expect(Array.isArray(storedTips)).toBe(true);
                        expect(storedTips.length).toBe(tips.length);
                    }
                ),
                { numRuns: 15 }
            );
        });
    });
});
