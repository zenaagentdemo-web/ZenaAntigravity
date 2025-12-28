import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { contactsController } from './contacts.controller.js';
import type { Request, Response } from 'express';

describe('Contacts Filter Property-Based Tests', () => {
    const createTestUser = async (): Promise<string> => {
        const user = await prisma.user.create({
            data: {
                email: `test-filter-pbt-${Math.random()}-${Date.now()}@example.com`,
                passwordHash: 'hash',
                name: 'Test Filter PBT User',
            },
        });
        return user.id;
    };

    const cleanupTestUser = async (userId: string): Promise<void> => {
        try {
            await prisma.contact.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        } catch (error) { }
    };

    it('should only return contacts matching the specified role', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
                    }),
                    { minLength: 5, maxLength: 20 }
                ),
                fc.constantFrom('buyer', 'vendor', 'market', 'other'),
                async (contactsData, targetRole) => {
                    const testUserId = await createTestUser();
                    try {
                        // Create contacts
                        await Promise.all(
                            contactsData.map(c =>
                                prisma.contact.create({
                                    data: {
                                        userId: testUserId,
                                        name: c.name,
                                        role: c.role,
                                        emails: [],
                                        phones: [],
                                    },
                                })
                            )
                        );

                        // Mock request and response
                        const req = {
                            query: { role: targetRole },
                            user: { userId: testUserId },
                        } as unknown as Request;

                        let responseData: any;
                        const res = {
                            status: (code: number) => ({
                                json: (data: any) => {
                                    responseData = { statusCode: code, ...data };
                                },
                            }),
                        } as unknown as Response;

                        await contactsController.listContacts(req, res);

                        // Invariant: Every returned contact MUST have the target role
                        expect(responseData.statusCode).toBe(200);
                        responseData.contacts.forEach((c: any) => {
                            expect(c.role).toBe(targetRole);
                        });

                        // Invariant: Total count should match number of contacts with that role in DB
                        const expectedCount = contactsData.filter(c => c.role === targetRole).length;
                        expect(responseData.contacts.length).toBe(expectedCount);
                    } finally {
                        await cleanupTestUser(testUserId);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should return all contacts when no role filter is applied', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        role: fc.constantFrom('buyer', 'vendor', 'market', 'other'),
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                async (contactsData) => {
                    const testUserId = await createTestUser();
                    try {
                        await Promise.all(
                            contactsData.map(c =>
                                prisma.contact.create({
                                    data: {
                                        userId: testUserId,
                                        name: c.name,
                                        role: c.role,
                                        emails: [],
                                        phones: [],
                                    },
                                })
                            )
                        );

                        const req = {
                            query: {},
                            user: { userId: testUserId },
                        } as unknown as Request;

                        let responseData: any;
                        const res = {
                            status: (code: number) => ({
                                json: (data: any) => {
                                    responseData = { statusCode: code, ...data };
                                },
                            }),
                        } as unknown as Response;

                        await contactsController.listContacts(req, res);

                        expect(responseData.statusCode).toBe(200);
                        expect(responseData.contacts.length).toBe(contactsData.length);
                    } finally {
                        await cleanupTestUser(testUserId);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });
});
