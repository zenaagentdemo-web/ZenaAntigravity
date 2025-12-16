import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as fc from 'fast-check';
import { taskService } from './task.service.js';

const prisma = new PrismaClient();
const testUserId = 'test-task-property-user-id';

describe('Task Property-Based Tests', () => {
  beforeEach(async () => {
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.task.deleteMany({ where: { userId: testUserId } });
  });

  afterEach(async () => {
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.task.deleteMany({ where: { userId: testUserId } });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 47: Task extraction from communications
   * 
   * Property: For any email or voice note containing action items, the system should 
   * create tasks with labels and optional due dates.
   * 
   * Validates: Requirements 14.1
   * 
   * This property tests that:
   * 1. Tasks can be created from different sources (email, voice_note, manual, ai_suggested)
   * 2. Tasks have required fields (label, source)
   * 3. Tasks can have optional due dates
   * 4. Tasks are properly stored and retrievable
   * 
   * Note: AI-based extraction is not yet implemented, so this tests the infrastructure
   * that will support extraction once AI processing is added.
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

              // Label should be preserved
              expect(task.label).toBe(input.label);

              // Source should be preserved
              expect(task.source).toBe(input.source);

              // Due date should be preserved if provided
              if (input.dueDate) {
                expect(task.dueDate).toBeDefined();
                expect(task.dueDate?.toISOString()).toBe(
                  input.dueDate.toISOString()
                );
              }

              // Task should have an ID
              expect(task.id).toBeDefined();

              // Task should be linked to user
              expect(task.userId).toBe(testUserId);

              // Task should default to open status
              expect(task.status).toBe('open');
            }

            // Property: All tasks should be retrievable
            const retrievedTasks = await taskService.getTasks({
              userId: testUserId,
            });

            expect(retrievedTasks.length).toBe(createdTasks.length);

            // Property: Tasks from different sources should all be stored
            const sources = new Set(retrievedTasks.map((t) => t.source));
            const inputSources = new Set(taskInputs.map((t) => t.source));
            expect(sources.size).toBe(inputSources.size);
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
            // Create tasks with and without due dates
            for (const input of taskInputs) {
              await taskService.createTask({
                userId: testUserId,
                label: input.label,
                source: 'ai_suggested',
                dueDate: input.hasDueDate ? input.dueDate : undefined,
              });
            }

            // Property: Tasks with due dates should be retrievable
            const allTasks = await taskService.getTasks({ userId: testUserId });
            const tasksWithDueDates = allTasks.filter((t) => t.dueDate !== null);
            const tasksWithoutDueDates = allTasks.filter(
              (t) => t.dueDate === null
            );

            const expectedWithDueDates = taskInputs.filter(
              (t) => t.hasDueDate
            ).length;
            const expectedWithoutDueDates = taskInputs.filter(
              (t) => !t.hasDueDate
            ).length;

            expect(tasksWithDueDates.length).toBe(expectedWithDueDates);
            expect(tasksWithoutDueDates.length).toBe(expectedWithoutDueDates);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 48: Task entity linking
   * 
   * Property: For any created task, the system should link it to the relevant 
   * deal, property, or contact.
   * 
   * Validates: Requirements 14.2
   * 
   * This property tests that:
   * 1. Tasks can be linked to deals, properties, or contacts
   * 2. Tasks can be retrieved by entity
   * 3. Multiple tasks can be linked to the same entity
   * 4. Entity links are preserved correctly
   */
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
            // Create tasks linked to various entities
            const createdTasks = [];
            for (const input of taskInputs) {
              const taskData: any = {
                userId: testUserId,
                label: input.label,
                source: 'manual',
              };

              // Link to appropriate entity
              if (input.entityType === 'deal') {
                taskData.dealId = input.entityId;
              } else if (input.entityType === 'property') {
                taskData.propertyId = input.entityId;
              } else if (input.entityType === 'contact') {
                taskData.contactId = input.entityId;
              }

              const task = await taskService.createTask(taskData);
              createdTasks.push(task);
            }

            // Property: All tasks should be created with entity links
            for (let i = 0; i < createdTasks.length; i++) {
              const task = createdTasks[i];
              const input = taskInputs[i];

              if (input.entityType === 'deal') {
                expect(task.dealId).toBe(input.entityId);
              } else if (input.entityType === 'property') {
                expect(task.propertyId).toBe(input.entityId);
              } else if (input.entityType === 'contact') {
                expect(task.contactId).toBe(input.entityId);
              }
            }

            // Property: Tasks should be retrievable by entity
            // Group tasks by entity
            const tasksByEntity = new Map<string, typeof taskInputs>();
            for (const input of taskInputs) {
              const key = `${input.entityType}:${input.entityId}`;
              if (!tasksByEntity.has(key)) {
                tasksByEntity.set(key, []);
              }
              tasksByEntity.get(key)!.push(input);
            }

            // Verify each entity has the correct tasks
            for (const [key, expectedTasks] of tasksByEntity) {
              const [entityType, entityId] = key.split(':');
              const entityTasks = await taskService.getEntityTasks(
                testUserId,
                entityType as any,
                entityId
              );

              expect(entityTasks.length).toBe(expectedTasks.length);
              expect(
                entityTasks.every((t) => {
                  if (entityType === 'deal') return t.dealId === entityId;
                  if (entityType === 'property')
                    return t.propertyId === entityId;
                  if (entityType === 'contact') return t.contactId === entityId;
                  return false;
                })
              ).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support multiple tasks linked to the same entity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // entityId
          fc.constantFrom('deal', 'property', 'contact'), // entityType
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
            minLength: 2,
            maxLength: 10,
          }), // task labels
          async (entityId, entityType, labels) => {
            // Create multiple tasks for the same entity
            for (const label of labels) {
              const taskData: any = {
                userId: testUserId,
                label,
                source: 'manual',
              };

              if (entityType === 'deal') {
                taskData.dealId = entityId;
              } else if (entityType === 'property') {
                taskData.propertyId = entityId;
              } else if (entityType === 'contact') {
                taskData.contactId = entityId;
              }

              await taskService.createTask(taskData);
            }

            // Property: All tasks should be linked to the same entity
            const entityTasks = await taskService.getEntityTasks(
              testUserId,
              entityType as any,
              entityId
            );

            expect(entityTasks.length).toBe(labels.length);

            // Property: All tasks should have the correct entity link
            expect(
              entityTasks.every((t) => {
                if (entityType === 'deal') return t.dealId === entityId;
                if (entityType === 'property') return t.propertyId === entityId;
                if (entityType === 'contact') return t.contactId === entityId;
                return false;
              })
            ).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: zena-ai-real-estate-pwa, Property 50: Task completion recording
   * 
   * Property: For any completed task, the system should update its status and 
   * record the completion in the timeline.
   * 
   * Validates: Requirements 14.4
   * 
   * This property tests that:
   * 1. When a task is marked as completed, its status changes
   * 2. A completedAt timestamp is set
   * 3. A timeline event is created for the completion
   * 4. The timeline event is linked to the correct entity
   */
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
            // Create tasks
            const createdTasks = [];
            for (const input of taskInputs) {
              const taskData: any = {
                userId: testUserId,
                label: input.label,
                source: 'manual',
              };

              if (input.entityType === 'deal') {
                taskData.dealId = input.entityId;
              } else if (input.entityType === 'property') {
                taskData.propertyId = input.entityId;
              } else if (input.entityType === 'contact') {
                taskData.contactId = input.entityId;
              }

              const task = await taskService.createTask(taskData);
              createdTasks.push({ task, input });
            }

            // Clear timeline events from creation
            await prisma.timelineEvent.deleteMany({
              where: { userId: testUserId },
            });

            // Complete all tasks
            for (const { task } of createdTasks) {
              await taskService.updateTask(testUserId, task.id, {
                status: 'completed',
              });
            }

            // Property: All tasks should be marked as completed
            const completedTasks = await taskService.getTasks({
              userId: testUserId,
              status: 'completed',
            });

            expect(completedTasks.length).toBe(createdTasks.length);

            // Property: All completed tasks should have completedAt timestamp
            for (const task of completedTasks) {
              expect(task.status).toBe('completed');
              expect(task.completedAt).toBeDefined();
              expect(task.completedAt).toBeInstanceOf(Date);
            }

            // Property: Timeline events should be created for each completion
            const timelineEvents = await prisma.timelineEvent.findMany({
              where: {
                userId: testUserId,
                type: 'task',
              },
            });

            expect(timelineEvents.length).toBe(createdTasks.length);

            // Property: Each timeline event should reference task completion
            for (const event of timelineEvents) {
              expect(event.summary).toContain('Task completed');
            }

            // Property: Timeline events should be linked to correct entities
            for (const { task, input } of createdTasks) {
              const taskEvents = timelineEvents.filter(
                (e) => e.entityId === input.entityId
              );

              expect(taskEvents.length).toBeGreaterThan(0);
              expect(taskEvents[0].entityType).toBe(input.entityType);
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
            // Create a task
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

            // Complete the task
            await taskService.updateTask(testUserId, task.id, {
              status: 'completed',
            });

            // Get timeline events after first completion
            const eventsAfterFirst = await prisma.timelineEvent.findMany({
              where: { userId: testUserId, type: 'task' },
            });

            expect(eventsAfterFirst.length).toBe(1);

            // Try to complete again (should not create new event)
            await taskService.updateTask(testUserId, task.id, {
              status: 'completed',
            });

            // Property: No new timeline event should be created
            const eventsAfterSecond = await prisma.timelineEvent.findMany({
              where: { userId: testUserId, type: 'task' },
            });

            expect(eventsAfterSecond.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
