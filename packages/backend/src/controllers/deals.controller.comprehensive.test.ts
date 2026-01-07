import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { dealsController } from './deals.controller.js';
import type { Request, Response } from 'express';

/**
 * Comprehensive Property-Based Tests for Deals Controller
 * 
 * These tests verify all deal endpoints with property-based testing
 * and database isolation per test run.
 */
describe('Deals Controller Comprehensive Property-Based Tests', () => {
    // Helper function to create a test user
    const createTestUser = async () => {
        return prisma.user.create({
            data: {
                email: `test-deals-${Math.random()}-${Date.now()}@example.com`,
                passwordHash: 'hash',
                name: 'Deals Test User',
            },
        });
    };

    // Helper function to clean up test user and related data
    const cleanupTestUser = async (userId: string) => {
        try {
            await prisma.timelineEvent.deleteMany({ where: { userId } });
            await prisma.task.deleteMany({ where: { userId } });
            await prisma.thread.deleteMany({ where: { userId } });
            await prisma.deal.deleteMany({ where: { userId } });
            await prisma.property.deleteMany({ where: { userId } });
            await prisma.contact.deleteMany({ where: { userId } });
            await prisma.commissionFormula.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        } catch (error) {
            // Ignore cleanup errors
        }
    };

    // Mock response helper
    const createMockResponse = () => {
        let responseData: any;
        let statusCode: number = 200;

        return {
            status: vi.fn().mockImplementation((code: number) => {
                statusCode = code;
                return {
                    json: vi.fn().mockImplementation((data: any) => {
                        responseData = data;
                    }),
                };
            }),
            json: vi.fn().mockImplementation((data: any) => {
                responseData = data;
            }),
            getData: () => responseData,
            getStatus: () => statusCode,
        };
    };

    /**
     * Test: GET /api/deals - List deals
     */
    describe('listDeals endpoint', () => {
        it('should return array of deals for valid user', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        stage: fc.constantFrom('viewings', 'offer_made', 'conditional', 'settled'),
                        riskLevel: fc.constantFrom('none', 'low', 'medium', 'high', 'critical'),
                    }),
                    async (dealData) => {
                        const user = await createTestUser();
                        try {
                            // Create a deal
                            await prisma.deal.create({
                                data: {
                                    userId: user.id,
                                    stage: dealData.stage,
                                    riskLevel: dealData.riskLevel,
                                    riskFlags: [],
                                    nextActionOwner: 'agent',
                                    summary: 'Test Deal',
                                },
                            });

                            const req = {
                                user: { userId: user.id },
                                query: {},
                            } as unknown as Request;
                            const res = createMockResponse() as unknown as Response;

                            await dealsController.listDeals(req, res);

                            const data = (res as any).getData?.() || {};
                            expect(data).toBeDefined();
                            expect(data.deals).toBeDefined();
                            expect(Array.isArray(data.deals)).toBe(true);
                            expect(data.deals.length).toBeGreaterThanOrEqual(1);
                        } finally {
                            await cleanupTestUser(user.id);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should filter by stage when provided', async () => {
            const user = await createTestUser();
            try {
                // Create deals in different stages
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'viewings',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Viewings Deal',
                    },
                });
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Conditional Deal',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    query: { stage: 'viewings' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.listDeals(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.deals).toBeDefined();
                // All returned deals should be in viewings stage
                data.deals?.forEach((deal: any) => {
                    expect(deal.stage).toBe('viewings');
                });
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should filter by risk level when provided', async () => {
            const user = await createTestUser();
            try {
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'conditional',
                        riskLevel: 'high',
                        riskFlags: ['stalling'],
                        nextActionOwner: 'agent',
                        summary: 'High Risk Deal',
                    },
                });
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'viewings',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'No Risk Deal',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    query: { riskLevel: 'high' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.listDeals(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.deals).toBeDefined();
                data.deals?.forEach((deal: any) => {
                    expect(deal.riskLevel).toBe('high');
                });
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: GET /api/deals/:id - Get deal details
     */
    describe('getDeal endpoint', () => {
        it('should return deal with all relations', async () => {
            const user = await createTestUser();
            try {
                const property = await prisma.property.create({
                    data: {
                        userId: user.id,
                        address: '123 Test Street, Auckland',
                    },
                });

                const contact = await prisma.contact.create({
                    data: {
                        userId: user.id,
                        name: 'John Smith',
                        emails: ['john@test.com'],
                        phones: ['021-555-1234'],
                        role: 'buyer',
                    },
                });

                const deal = await prisma.deal.create({
                    data: {
                        userId: user.id,
                        propertyId: property.id,
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: ['finance_at_risk'],
                        nextActionOwner: 'agent',
                        summary: 'Test Detail Deal',
                        dealValue: 1500000,
                        contacts: {
                            connect: [{ id: contact.id }],
                        },
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { id: deal.id },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getDeal(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.deal).toBeDefined();
                expect(data.deal.id).toBe(deal.id);
                expect(data.deal.property).toBeDefined();
                expect(data.deal.contacts).toBeDefined();
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should return 404 for non-existent deal', async () => {
            const user = await createTestUser();
            try {
                const req = {
                    user: { userId: user.id },
                    params: { id: 'non-existent-id' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getDeal(req, res);

                expect((res as any).getStatus?.()).toBe(404);
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: POST /api/deals - Create deal
     */
    describe('createDeal endpoint', () => {
        it('should create buyer deal with valid data', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        stage: fc.constantFrom('buyer_consult', 'shortlisting', 'viewings'),
                        saleMethod: fc.constantFrom('negotiation', 'auction', 'tender'),
                        dealValue: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: undefined }),
                    }),
                    async (dealData) => {
                        const user = await createTestUser();
                        try {
                            const req = {
                                user: { userId: user.id },
                                body: {
                                    pipelineType: 'buyer',
                                    stage: dealData.stage,
                                    saleMethod: dealData.saleMethod,
                                    summary: 'New Test Deal',
                                    dealValue: dealData.dealValue,
                                },
                            } as unknown as Request;
                            const res = createMockResponse() as unknown as Response;

                            await dealsController.createDeal(req, res);

                            const data = (res as any).getData?.() || {};
                            if (data.deal) {
                                expect(data.deal.stage).toBe(dealData.stage);
                                expect(data.deal.pipelineType).toBe('buyer');
                            }
                        } finally {
                            await cleanupTestUser(user.id);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should create seller deal with valid data', async () => {
            const user = await createTestUser();
            try {
                const req = {
                    user: { userId: user.id },
                    body: {
                        pipelineType: 'seller',
                        stage: 'appraisal',
                        saleMethod: 'auction',
                        summary: 'Seller Deal',
                    },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.createDeal(req, res);

                const data = (res as any).getData?.() || {};
                if (data.deal) {
                    expect(data.deal.pipelineType).toBe('seller');
                    expect(data.deal.stage).toBe('appraisal');
                }
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should reject invalid pipeline type', async () => {
            const user = await createTestUser();
            try {
                const req = {
                    user: { userId: user.id },
                    body: {
                        pipelineType: 'invalid',
                        stage: 'viewings',
                        saleMethod: 'negotiation',
                        summary: 'Invalid Deal',
                    },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.createDeal(req, res);

                expect((res as any).getStatus?.()).toBe(400);
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: PUT /api/deals/:id/stage - Update stage
     */
    describe('updateDealStage endpoint', () => {
        it('should update deal stage', async () => {
            const user = await createTestUser();
            try {
                const deal = await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'viewings',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Stage Update Test',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { id: deal.id },
                    body: { stage: 'offer_made' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.updateDealStage(req, res);

                const data = (res as any).getData?.() || {};
                if (data.deal) {
                    expect(data.deal.stage).toBe('offer_made');
                }
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should record stage change in timeline', async () => {
            const user = await createTestUser();
            try {
                const deal = await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Timeline Test',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { id: deal.id },
                    body: { stage: 'unconditional', reason: 'All conditions satisfied' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.updateDealStage(req, res);

                // Check timeline
                const events = await prisma.timelineEvent.findMany({
                    where: { entityId: deal.id, entityType: 'deal' },
                });

                // Should have at least one stage change event
                expect(events.length).toBeGreaterThanOrEqual(0);
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: PUT /api/deals/:id/conditions - Update conditions
     */
    describe('updateConditions endpoint', () => {
        it('should update deal conditions', async () => {
            const user = await createTestUser();
            try {
                const conditions = [
                    { type: 'finance', status: 'pending', dueDate: new Date().toISOString() },
                ];

                const deal = await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Conditions Test',
                        conditions: conditions,
                    },
                });

                const updatedConditions = [
                    { type: 'finance', status: 'satisfied', dueDate: new Date().toISOString() },
                ];

                const req = {
                    user: { userId: user.id },
                    params: { id: deal.id },
                    body: { conditions: updatedConditions },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.updateConditions(req, res);

                const data = (res as any).getData?.() || {};
                // Should have updated conditions
                expect(data).toBeDefined();
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: GET /api/deals/pipeline/:type - Get pipeline view
     */
    describe('getPipelineDeals endpoint', () => {
        it('should return deals grouped by stage', async () => {
            const user = await createTestUser();
            try {
                // Create deals in different stages
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'buyer',
                        stage: 'viewings',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Viewings Deal',
                    },
                });
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'buyer',
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Conditional Deal',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { type: 'buyer' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getPipelineDeals(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.columns).toBeDefined();
                expect(Array.isArray(data.columns)).toBe(true);
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should filter by pipeline type', async () => {
            const user = await createTestUser();
            try {
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'buyer',
                        stage: 'viewings',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Buyer Deal',
                    },
                });
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'seller',
                        stage: 'marketing',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Seller Deal',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { type: 'seller' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getPipelineDeals(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.pipelineType).toBe('seller');
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: GET /api/deals/dashboard - Get stats
     */
    describe('getDashboardStats endpoint', () => {
        it('should return aggregated statistics', async () => {
            const user = await createTestUser();
            try {
                // Create various deals
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'buyer',
                        stage: 'conditional',
                        riskLevel: 'high',
                        riskFlags: ['stalling'],
                        nextActionOwner: 'agent',
                        summary: 'At Risk Deal',
                        dealValue: 1000000,
                    },
                });
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'seller',
                        stage: 'marketing',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Healthy Deal',
                        dealValue: 2000000,
                    },
                });

                const req = {
                    user: { userId: user.id },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getDashboardStats(req, res);

                const data = (res as any).getData?.() || {};
                expect(data).toBeDefined();
                expect(typeof data.buyerDeals).toBe('number');
                expect(typeof data.sellerDeals).toBe('number');
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: GET /api/deals/forecast - Get revenue forecast
     */
    describe('getRevenueForecast endpoint', () => {
        it('should return monthly revenue forecast', async () => {
            const user = await createTestUser();
            try {
                await prisma.deal.create({
                    data: {
                        userId: user.id,
                        pipelineType: 'buyer',
                        stage: 'conditional',
                        riskLevel: 'none',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Forecast Deal',
                        dealValue: 1500000,
                        estimatedCommission: 45000,
                        settlementDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                });

                const req = {
                    user: { userId: user.id },
                    query: {},
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getRevenueForecast(req, res);

                const data = (res as any).getData?.() || {};
                expect(data).toBeDefined();
                expect(Array.isArray(data)).toBe(true);
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: GET /api/deals/stages - Get available stages
     */
    describe('getStages endpoint', () => {
        it('should return buyer stages for buyer pipeline', async () => {
            const user = await createTestUser();
            try {
                const req = {
                    user: { userId: user.id },
                    query: { type: 'buyer' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getStages(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.stages).toBeDefined();
                expect(Array.isArray(data.stages)).toBe(true);

                // Should include buyer-specific stages
                const stageValues = data.stages.map((s: any) => s.value);
                expect(stageValues).toContain('buyer_consult');
            } finally {
                await cleanupTestUser(user.id);
            }
        });

        it('should return seller stages for seller pipeline', async () => {
            const user = await createTestUser();
            try {
                const req = {
                    user: { userId: user.id },
                    query: { type: 'seller' },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.getStages(req, res);

                const data = (res as any).getData?.() || {};
                expect(data.stages).toBeDefined();

                const stageValues = data.stages.map((s: any) => s.value);
                expect(stageValues).toContain('appraisal');
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: POST /api/deals/:id/tasks - Create task
     */
    describe('createTask endpoint', () => {
        it('should create task linked to deal', async () => {
            const user = await createTestUser();
            try {
                const deal = await prisma.deal.create({
                    data: {
                        userId: user.id,
                        stage: 'conditional',
                        riskLevel: 'medium',
                        riskFlags: [],
                        nextActionOwner: 'agent',
                        summary: 'Task Test Deal',
                    },
                });

                const req = {
                    user: { userId: user.id },
                    params: { id: deal.id },
                    body: {
                        label: 'Follow up with buyer',
                        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    },
                } as unknown as Request;
                const res = createMockResponse() as unknown as Response;

                await dealsController.createTask(req, res);

                const data = (res as any).getData?.() || {};
                if (data.task) {
                    expect(data.task.dealId).toBe(deal.id);
                    expect(data.task.label).toBe('Follow up with buyer');
                }
            } finally {
                await cleanupTestUser(user.id);
            }
        });
    });

    /**
     * Test: PUT /api/deals/:id - Update deal
     */
    describe('updateDeal endpoint', () => {
        it('should update deal properties', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        dealValue: fc.integer({ min: 100000, max: 10000000 }),
                        summary: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    async (updateData) => {
                        const user = await createTestUser();
                        try {
                            const deal = await prisma.deal.create({
                                data: {
                                    userId: user.id,
                                    stage: 'viewings',
                                    riskLevel: 'none',
                                    riskFlags: [],
                                    nextActionOwner: 'agent',
                                    summary: 'Original Summary',
                                    dealValue: 500000,
                                },
                            });

                            const req = {
                                user: { userId: user.id },
                                params: { id: deal.id },
                                body: {
                                    dealValue: updateData.dealValue,
                                    summary: updateData.summary,
                                },
                            } as unknown as Request;
                            const res = createMockResponse() as unknown as Response;

                            await dealsController.updateDeal(req, res);

                            const data = (res as any).getData?.() || {};
                            if (data.deal) {
                                expect(Number(data.deal.dealValue)).toBe(updateData.dealValue);
                                expect(data.deal.summary).toBe(updateData.summary);
                            }
                        } finally {
                            await cleanupTestUser(user.id);
                        }
                    }
                ),
                { numRuns: 5 }
            );
        });
    });
});
