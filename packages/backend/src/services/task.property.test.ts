import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as fc from 'fast-check';
import { taskService } from './task.service.js';

const prisma = new PrismaClient();

describe('Task Property-Based Tests', () => {
  // Helper function to create a test user for each property-based test
  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `test-task-pbt-${Math.random()}-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Test User Task PBT',
      },
    });
    return user.id;
  };

  // Helper function to clean up test user and related data
  const cleanupTestUser = async (userId: string): Promise<void> => {
    try {
      await prisma.timelineEvent.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  /**
   * Feature: zena-ai-real-estate-pwa, Property 47: Task extraction from communications
   */
  describe('Property 47: Task extraction from communications', () => {
    it('should create tasks with labels and optional due dates from any source', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 200 }),
              source: fc.constantFrom(
                'email',
                'voice_note',
                'manual',
                'ai_suggested'
              ),
              dueDate: fc.option(
                fc.date({
                  min: new Date(),
                  max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                })
              ),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (taskInputs) => {
            const testUserId = await createTestUser();
            try {
              // Create tasks from various sources
              const createdTasks = [];
              for (const input of taskInputs) {
                const task = await taskService.createTask({
                  userId: testUserId,
                  label: input.label,
                  source: input.source as any,
                  dueDate: input.dueDate || undefined,
                });
                createdTasks.push(task);
              }

              // Property: All tasks should be created
              expect(createdTasks.length).toBe(taskInputs.length);

              // Property: Each task should have required fields
              for (let i = 0; i < createdTasks.length; i++) {
                const task = createdTasks[i];
                const input = taskInputs[i];
                expect(task.label).toBe(input.label);
                expect(task.source).toBe(input.source);
                if (input.dueDate) {
                  expect(task.dueDate).toBeDefined();
                  expect(task.dueDate?.toISOString()).toBe(input.dueDate.toISOString());
                }
                expect(task.id).toBeDefined();
                expect(task.userId).toBe(testUserId);
                expect(task.status).toBe('open');
              }

              // Property: All tasks should be retrievable
              const retrievedTasks = await taskService.getTasks({ userId: testUserId });
              expect(retrievedTasks.length).toBe(createdTasks.length);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with and without due dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 100 }),
              hasDueDate: fc.boolean(),
              dueDate: fc.date({
                min: new Date(),
                max: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              }),
            }),
            { minLength: 2, maxLength: 15 }
          ),
          async (taskInputs) => {
            const testUserId = await createTestUser();
            try {
              for (const input of taskInputs) {
                await taskService.createTask({
                  userId: testUserId,
                  label: input.label,
                  source: 'ai_suggested',
                  dueDate: input.hasDueDate ? input.dueDate : undefined,
                });
              }

              const allTasks = await taskService.getTasks({ userId: testUserId });
              const tasksWithDueDates = allTasks.filter((t) => t.dueDate !== null);
              const tasksWithoutDueDates = allTasks.filter((t) => t.dueDate === null);

              const expectedWithDueDates = taskInputs.filter((t) => t.hasDueDate).length;
              const expectedWithoutDueDates = taskInputs.filter((t) => !t.hasDueDate).length;

              expect(tasksWithDueDates.length).toBe(expectedWithDueDates);
              expect(tasksWithoutDueDates.length).toBe(expectedWithoutDueDates);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 48: Task entity linking', () => {
    it('should link tasks to relevant entities (deal, property, contact)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 100 }),
              entityType: fc.constantFrom('deal', 'property', 'contact'),
              entityId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (taskInputs) => {
            const testUserId = await createTestUser();
            try {
              const createdTasks = [];
              for (const input of taskInputs) {
                const taskData: any = {
                  userId: testUserId,
                  label: input.label,
                  source: 'manual',
                };
                if (input.entityType === 'deal') taskData.dealId = input.entityId;
                else if (input.entityType === 'property') taskData.propertyId = input.entityId;
                else if (input.entityType === 'contact') taskData.contactId = input.entityId;

                const task = await taskService.createTask(taskData);
                createdTasks.push(task);
              }

              for (let i = 0; i < createdTasks.length; i++) {
                const task = createdTasks[i];
                const input = taskInputs[i];
                if (input.entityType === 'deal') expect(task.dealId).toBe(input.entityId);
                else if (input.entityType === 'property') expect(task.propertyId).toBe(input.entityId);
                else if (input.entityType === 'contact') expect(task.contactId).toBe(input.entityId);
              }

              for (const input of taskInputs) {
                const entityTasks = await taskService.getEntityTasks(testUserId, input.entityType as any, input.entityId);
                expect(entityTasks.length).toBeGreaterThan(0);
              }
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support multiple tasks linked to the same entity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('deal', 'property', 'contact'),
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 10 }),
          async (entityId, entityType, labels) => {
            const testUserId = await createTestUser();
            try {
              for (const label of labels) {
                const taskData: any = { userId: testUserId, label, source: 'manual' };
                if (entityType === 'deal') taskData.dealId = entityId;
                else if (entityType === 'property') taskData.propertyId = entityId;
                else if (entityType === 'contact') taskData.contactId = entityId;
                await taskService.createTask(taskData);
              }

              const entityTasks = await taskService.getEntityTasks(testUserId, entityType as any, entityId);
              expect(entityTasks.length).toBe(labels.length);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 50: Task completion recording', () => {
    it('should update status and record completion in timeline for any task', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 100 }),
              entityType: fc.constantFrom('deal', 'property', 'contact'),
              entityId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 8 }
          ),
          async (taskInputs) => {
            const testUserId = await createTestUser();
            try {
              const createdTasks = [];
              for (const input of taskInputs) {
                const taskData: any = { userId: testUserId, label: input.label, source: 'manual' };
                if (input.entityType === 'deal') taskData.dealId = input.entityId;
                else if (input.entityType === 'property') taskData.propertyId = input.entityId;
                else if (input.entityType === 'contact') taskData.contactId = input.entityId;
                const task = await taskService.createTask(taskData);
                createdTasks.push({ task, input });
              }

              // Clear timeline events from creation
              await prisma.timelineEvent.deleteMany({
                where: { userId: testUserId },
              });

              for (const { task } of createdTasks) {
                await taskService.updateTask(testUserId, task.id, { status: 'completed' });
              }

              const completedTasks = await taskService.getTasks({ userId: testUserId, status: 'completed' });
              expect(completedTasks.length).toBe(createdTasks.length);

              const timelineEvents = await prisma.timelineEvent.findMany({ where: { userId: testUserId, type: 'task' } });
              expect(timelineEvents.length).toBe(createdTasks.length);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate timeline events when completing already completed tasks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 100 }),
            dealId: fc.uuid(),
          }),
          async (input) => {
            const testUserId = await createTestUser();
            try {
              const task = await taskService.createTask({
                userId: testUserId,
                label: input.label,
                dealId: input.dealId,
                source: 'manual',
              });

              // Clear timeline events
              await prisma.timelineEvent.deleteMany({
                where: { userId: testUserId },
              });

              await taskService.updateTask(testUserId, task.id, { status: 'completed' });
              const eventsAfterFirst = await prisma.timelineEvent.findMany({ where: { userId: testUserId, type: 'task' } });
              expect(eventsAfterFirst.length).toBe(1);

              await taskService.updateTask(testUserId, task.id, { status: 'completed' });
              const eventsAfterSecond = await prisma.timelineEvent.findMany({ where: { userId: testUserId, type: 'task' } });
              expect(eventsAfterSecond.length).toBe(1);
            } finally {
              await cleanupTestUser(testUserId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
