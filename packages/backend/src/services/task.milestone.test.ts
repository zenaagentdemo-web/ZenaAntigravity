import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { taskService } from './task.service.js';

const prisma = new PrismaClient();
let testUserId: string;

describe('TaskService - Milestone Integration', () => {
    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                email: `test-milestone-${Date.now()}@example.com`,
                passwordHash: 'test-hash',
                name: 'Test Milestone User',
            }
        });
        testUserId = user.id;
    });

    afterAll(async () => {
        if (testUserId) {
            await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
            await prisma.task.deleteMany({ where: { userId: testUserId } });
            await prisma.property.deleteMany({ where: { userId: testUserId } });
            await prisma.user.delete({ where: { id: testUserId } });
        }
    });

    beforeEach(async () => {
        // Clean up entity data but keep user
        await prisma.task.deleteMany({ where: { userId: testUserId } });
        await prisma.property.deleteMany({ where: { userId: testUserId } });
    });


    it('should return property milestones as virtual tasks', async () => {
        // 1. Create a property with milestones
        const property = await prisma.property.create({
            data: {
                userId: testUserId,
                address: '123 Test St',
                milestones: [
                    {
                        id: 'ms_1',
                        title: 'Photography',
                        date: new Date().toISOString(),
                        status: 'pending'
                    },
                    {
                        id: 'ms_2',
                        title: 'Listing Live',
                        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        status: 'pending'
                    }
                ]
            }
        });

        // 2. Fetch tasks
        const tasks = await taskService.getTasks({ userId: testUserId });

        // 3. Verify
        const milestoneTasks = tasks.filter(t => (t as any).isVirtual);
        expect(milestoneTasks).toHaveLength(2);
        expect(milestoneTasks.find(t => t.label === 'Photography')).toBeDefined();
        expect(milestoneTasks.find(t => t.label === 'Listing Live')).toBeDefined();

        // ensure property data is attached
        expect(milestoneTasks[0].property).toBeDefined();
        expect(milestoneTasks[0].property?.id).toBe(property.id);
    });

    it('should handle legacy milestones missing titles (fallback)', async () => {
        // 1. Create property with legacy milestone (no title, just type)
        await prisma.property.create({
            data: {
                userId: testUserId,
                address: '456 Legacy Ln',
                milestones: [
                    {
                        id: 'legacy_1',
                        type: 'open_home',
                        date: new Date().toISOString(),
                        status: 'pending',
                        notes: 'Sunday Open Home'
                    }
                ]
            }
        });

        // 2. Fetch tasks
        const tasks = await taskService.getTasks({ userId: testUserId });
        const legacyTask = tasks.find(t => t.source === 'milestone');

        // 3. Verify fallback label
        expect(legacyTask).toBeDefined();
        // It should use 'open_home' (type) or 'Sunday Open Home' (notes) depending on fallback order
        // Current logic: title || type || notes
        expect(legacyTask?.label).toBe('open_home');
    });

    it('should update property milestone when virtual task is completed', async () => {
        // 1. Create property
        const property = await prisma.property.create({
            data: {
                userId: testUserId,
                address: '789 Update Ave',
                milestones: [
                    {
                        id: 'ms_to_complete',
                        title: 'Signboard Up',
                        date: new Date().toISOString(),
                        status: 'pending'
                    }
                ]
            }
        });

        // 2. Get the virtual task ID
        const tasks = await taskService.getTasks({ userId: testUserId });
        const virtualTask = tasks.find(t => t.label === 'Signboard Up');
        expect(virtualTask).toBeDefined();
        if (!virtualTask) return;

        // 3. Update the task status
        await taskService.updateTask(testUserId, virtualTask.id, { status: 'completed' });

        // 4. Verify property record updated
        const updatedProperty = await prisma.property.findUnique({ where: { id: property.id } });
        const milestones = updatedProperty?.milestones as any[];
        const updatedMs = milestones.find(m => m.id === 'ms_to_complete');

        expect(updatedMs.status).toBe('completed');
    });

    it('should support reopening a virtual task', async () => {
        // 1. Create property with completed milestone
        const property = await prisma.property.create({
            data: {
                userId: testUserId,
                address: '321 Reopen Rd',
                milestones: [
                    {
                        id: 'ms_completed',
                        title: 'Done Deal',
                        date: new Date().toISOString(),
                        status: 'completed'
                    }
                ]
            }
        });

        // 2. Get task
        const tasks = await taskService.getTasks({ userId: testUserId, status: 'completed' });
        const virtualTask = tasks.find(t => t.label === 'Done Deal');
        expect(virtualTask).toBeDefined();
        if (!virtualTask) return;

        // 3. Reopen
        await taskService.reopenTask(testUserId, virtualTask.id);

        // 4. Verify property
        const updatedProperty = await prisma.property.findUnique({ where: { id: property.id } });
        const ms = (updatedProperty?.milestones as any[])[0];
        expect(ms.status).toBe('pending');
    });
});
