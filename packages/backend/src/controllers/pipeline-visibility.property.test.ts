import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import prisma from '../config/database.js';
import { propertiesController } from './properties.controller.js';
import { dealsController } from './deals.controller.js';
import type { Request, Response } from 'express';

/**
 * Property-Based Tests for Pipeline Visibility
 * Verifies that deals created from properties are correctly visible in the pipeline.
 */

describe('Pipeline Visibility Property-Based Tests', () => {
    const createTestUser = async (): Promise<string> => {
        const user = await prisma.user.create({
            data: {
                email: `test-visibility-pbt-${Math.random()}-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Test User Pipeline PBT',
            },
        });
        return user.id;
    };

    const cleanupTestUser = async (userId: string): Promise<void> => {
        try {
            await prisma.deal.deleteMany({ where: { userId } });
            await prisma.property.deleteMany({ where: { userId } });
            await prisma.contact.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        } catch (error) {
            // Ignore cleanup errors
        }
    };

    it('should show newly created property-deals in the seller pipeline', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    address: fc.string({ minLength: 10 }).filter(s => s.trim().length > 0),
                    dealStage: fc.constantFrom('buyer_consult', 'appraisal', 'listing_signed'),
                    saleMethod: fc.constantFrom('auction', 'negotiation', 'tender'),
                }),
                async (data) => {
                    const testUserId = await createTestUser();
                    try {
                        // 1. Create a property with deal flow enabled
                        const reqCreate = {
                            body: {
                                address: data.address,
                                createDealFlowCard: true,
                                dealStage: data.dealStage,
                                saleMethod: data.saleMethod,
                                vendorIds: [], // We'll skip vendors for this check or create one
                            },
                            user: { userId: testUserId }
                        } as unknown as Request;

                        let createResponse: any;
                        const resCreate = {
                            status: (c: number) => ({ json: (d: any) => { createResponse = { statusCode: c, ...d }; } })
                        } as unknown as Response;

                        await propertiesController.createProperty(reqCreate, resCreate);
                        if (createResponse.statusCode !== 201) {
                            console.error('Create property failed:', createResponse);
                        }
                        expect(createResponse.statusCode).toBe(201);

                        // 2. Fetch the seller pipeline
                        const reqPipeline = {
                            params: { type: 'seller' },
                            user: { userId: testUserId }
                        } as unknown as Request;

                        let pipelineResponse: any;
                        const resPipeline = {
                            status: (c: number) => ({ json: (d: any) => { pipelineResponse = { statusCode: c, ...d }; } })
                        } as unknown as Response;

                        await dealsController.getPipelineDeals(reqPipeline, resPipeline);
                        expect(pipelineResponse.statusCode).toBe(200);

                        // 3. Verify the deal is in the pipeline
                        const allDeals = pipelineResponse.columns.flatMap((col: any) => col.deals);
                        const foundDeal = allDeals.find((d: any) => d.property.address === data.address);

                        expect(foundDeal).toBeDefined();
                        expect(foundDeal.stage).toBe(data.dealStage);
                        expect(foundDeal.pipelineType).toBe('seller');
                    } finally {
                        await cleanupTestUser(testUserId);
                    }
                }
            ),
            { numRuns: 20 } // Reduced for faster feedback during dev
        );
    });
});
