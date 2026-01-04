import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from '../config/database.js';
import { propertiesController } from './properties.controller.js';
import { Request, Response } from 'express';

describe('Milestones Integration Tests', () => {
    let userId: string;
    let propertyId: string;

    beforeEach(async () => {
        // Create a test user
        const user = await prisma.user.create({
            data: {
                email: `test-milestones-${Date.now()}@example.com`,
                passwordHash: 'hash',
                name: 'Test User',
            },
        });
        userId = user.id;

        // Create a test property
        const property = await prisma.property.create({
            data: {
                userId,
                address: '123 Test St',
                milestones: [],
            },
        });
        propertyId = property.id;
    });

    afterEach(async () => {
        // Cleanup
        try {
            await prisma.timelineEvent.deleteMany({ where: { userId } });
            await prisma.property.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    });

    it('should add, update, and delete a milestone', async () => {
        // 1. ADD MILESTONE
        const addReq = {
            params: { id: propertyId },
            body: { type: 'custom', title: 'Initial Milestone', date: new Date().toISOString() },
            user: { userId }
        } as unknown as Request;

        let responseData: any;
        let statusCode: number = 200;
        const res = {
            status: (code: number) => {
                statusCode = code;
                return {
                    json: (data: any) => { responseData = data; }
                };
            }
        } as unknown as Response;

        await propertiesController.addMilestone(addReq, res);
        expect(statusCode).toBe(201);
        expect(responseData.milestone).toBeDefined();
        const milestoneId = responseData.milestone.id;
        expect(responseData.milestone.title).toBe('Initial Milestone');

        // 2. UPDATE MILESTONE
        const updateReq = {
            params: { id: propertyId, milestoneId },
            body: { title: 'Updated Milestone', notes: 'New notes' },
            user: { userId }
        } as unknown as Request;

        await propertiesController.updateMilestone(updateReq, res);
        expect(statusCode).toBe(200);
        expect(responseData.milestone.title).toBe('Updated Milestone');
        expect(responseData.milestone.notes).toBe('New notes');

        // 3. DELETE MILESTONE
        const deleteReq = {
            params: { id: propertyId, milestoneId },
            user: { userId }
        } as unknown as Request;

        await propertiesController.deleteMilestone(deleteReq, res);
        expect(statusCode).toBe(200);
        expect(responseData.success).toBe(true);

        // Verify it's gone from the property
        const finalProperty = await prisma.property.findUnique({ where: { id: propertyId } });
        expect((finalProperty?.milestones as any[]).length).toBe(0);
    });
});
