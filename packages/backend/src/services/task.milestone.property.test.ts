import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as fc from 'fast-check';
import { taskService } from './task.service.js';

const prisma = new PrismaClient();
let testUserId: string;

describe('Task Milestone Property-Based Tests', () => {
    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                email: `pbt-milestone-${Date.now()}@example.com`,
                passwordHash: 'hash',
                name: 'PBT User'
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

    it('should correctly map any valid milestone structure to a virtual task', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        // ID is optional in some legacy data, but usually present
                        id: fc.option(fc.uuid()),
                        title: fc.option(fc.string({ minLength: 1 })),
                        type: fc.option(fc.string({ minLength: 1 })),
                        notes: fc.option(fc.string({ minLength: 1 })),
                        date: fc.date().map(d => d.toISOString()),
                        status: fc.option(fc.constantFrom('pending', 'completed', 'active'))
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                async (milestones) => {
                    // Create property with these random milestones
                    const property = await prisma.property.create({
                        data: {
                            userId: testUserId,
                            address: `PBT Address ${Math.random()}`,
                            milestones: milestones as any
                        }
                    });

                    try {
                        const tasks = await taskService.getTasks({ userId: testUserId });
                        const virtualTasks = tasks.filter(t => t.propertyId === property.id && t.source === 'milestone');

                        // Should have one task per milestone
                        expect(virtualTasks).toHaveLength(milestones.length);

                        // Verify each milestone has a corresponding task
                        milestones.forEach(ms => {
                            // Replicate the logic: title || type || notes || 'Untitled'
                            const expectedLabel = ms.title || ms.type || ms.notes || 'Untitled Milestone';
                            const found = virtualTasks.find(t => t.label === expectedLabel);
                            expect(found).toBeDefined();

                            // Check date match (virtual task returns Date object)
                            // Allow slight variance if implementation does incomplete date parsing, but standard ISO should match
                            expect(found?.dueDate?.toISOString()).toBe(ms.date);
                        });

                    } finally {
                        await prisma.property.delete({ where: { id: property.id } });
                    }
                }
            ),
            { numRuns: 20 } // run 20 random permutations
        );
    }, 10000); // 10s timeout
});
