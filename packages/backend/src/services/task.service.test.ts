import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { taskService } from './task.service.js';

const prisma = new PrismaClient();
const testUserId = 'test-task-user-id';

describe('TaskService', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.task.deleteMany({ where: { userId: testUserId } });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.timelineEvent.deleteMany({ where: { userId: testUserId } });
    await prisma.task.deleteMany({ where: { userId: testUserId } });
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Follow up with client',
        source: 'manual',
      });

      expect(task).toBeDefined();
      expect(task.userId).toBe(testUserId);
      expect(task.label).toBe('Follow up with client');
      expect(task.status).toBe('open');
      expect(task.source).toBe('manual');
    });

    it('should create a task with due date', async () => {
      const dueDate = new Date('2024-12-31');
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Complete paperwork',
        dueDate,
        source: 'manual',
      });

      expect(task.dueDate).toBeDefined();
      expect(task.dueDate?.toISOString()).toBe(dueDate.toISOString());
    });

    it('should create a task linked to a deal', async () => {
      const dealId = 'test-deal-id';
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Schedule viewing',
        dealId,
        source: 'ai_suggested',
      });

      expect(task.dealId).toBe(dealId);
    });

    it('should create timeline event when task is created with deal', async () => {
      const dealId = 'test-deal-id';
      await taskService.createTask({
        userId: testUserId,
        label: 'Schedule viewing',
        dealId,
        source: 'manual',
      });

      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId: testUserId,
          entityType: 'deal',
          entityId: dealId,
          type: 'task',
        },
      });

      expect(timelineEvents.length).toBeGreaterThan(0);
      expect(timelineEvents[0].summary).toContain('Task created');
    });
  });

  describe('getTasks', () => {
    it('should return all tasks for a user', async () => {
      await taskService.createTask({
        userId: testUserId,
        label: 'Task 1',
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Task 2',
        source: 'manual',
      });

      const tasks = await taskService.getTasks({ userId: testUserId });

      expect(tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      const task1 = await taskService.createTask({
        userId: testUserId,
        label: 'Open task',
        source: 'manual',
      });

      const task2 = await taskService.createTask({
        userId: testUserId,
        label: 'Completed task',
        status: 'completed',
        source: 'manual',
      });

      const openTasks = await taskService.getTasks({
        userId: testUserId,
        status: 'open',
      });

      expect(openTasks).toHaveLength(1);
      expect(openTasks[0].id).toBe(task1.id);
    });

    it('should filter tasks by dealId', async () => {
      const dealId = 'test-deal-id';

      await taskService.createTask({
        userId: testUserId,
        label: 'Deal task',
        dealId,
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Other task',
        source: 'manual',
      });

      const dealTasks = await taskService.getTasks({
        userId: testUserId,
        dealId,
      });

      expect(dealTasks).toHaveLength(1);
      expect(dealTasks[0].dealId).toBe(dealId);
    });

    it('should return overdue tasks', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await taskService.createTask({
        userId: testUserId,
        label: 'Overdue task',
        dueDate: yesterday,
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Future task',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        source: 'manual',
      });

      const overdueTasks = await taskService.getTasks({
        userId: testUserId,
        overdue: true,
      });

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].label).toBe('Overdue task');
    });
  });

  describe('updateTask', () => {
    it('should update task label', async () => {
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Original label',
        source: 'manual',
      });

      const updated = await taskService.updateTask(testUserId, task.id, {
        label: 'Updated label',
      });

      expect(updated.label).toBe('Updated label');
    });

    it('should complete a task and set completedAt', async () => {
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Task to complete',
        source: 'manual',
      });

      const updated = await taskService.updateTask(testUserId, task.id, {
        status: 'completed',
      });

      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
    });

    it('should create timeline event when task is completed', async () => {
      const dealId = 'test-deal-id';
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Task to complete',
        dealId,
        source: 'manual',
      });

      // Clear timeline events from creation
      await prisma.timelineEvent.deleteMany({
        where: { userId: testUserId },
      });

      await taskService.updateTask(testUserId, task.id, {
        status: 'completed',
      });

      const timelineEvents = await prisma.timelineEvent.findMany({
        where: {
          userId: testUserId,
          entityType: 'deal',
          entityId: dealId,
          type: 'task',
        },
      });

      expect(timelineEvents.length).toBeGreaterThan(0);
      expect(timelineEvents[0].summary).toContain('Task completed');
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskService.updateTask(testUserId, 'non-existent-id', {
          label: 'Updated',
        })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const task = await taskService.createTask({
        userId: testUserId,
        label: 'Task to delete',
        source: 'manual',
      });

      await taskService.deleteTask(testUserId, task.id);

      const deleted = await prisma.task.findUnique({
        where: { id: task.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('getOverdueTasks', () => {
    it('should return only overdue tasks', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await taskService.createTask({
        userId: testUserId,
        label: 'Overdue task',
        dueDate: yesterday,
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Future task',
        dueDate: tomorrow,
        source: 'manual',
      });

      const overdueTasks = await taskService.getOverdueTasks(testUserId);

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].label).toBe('Overdue task');
    });
  });

  describe('getEntityTasks', () => {
    it('should return tasks for a specific deal', async () => {
      const dealId = 'test-deal-id';

      await taskService.createTask({
        userId: testUserId,
        label: 'Deal task 1',
        dealId,
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Deal task 2',
        dealId,
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Other task',
        source: 'manual',
      });

      const dealTasks = await taskService.getEntityTasks(
        testUserId,
        'deal',
        dealId
      );

      expect(dealTasks).toHaveLength(2);
      expect(dealTasks.every((t) => t.dealId === dealId)).toBe(true);
    });

    it('should filter entity tasks by status', async () => {
      const propertyId = 'test-property-id';

      await taskService.createTask({
        userId: testUserId,
        label: 'Open property task',
        propertyId,
        status: 'open',
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Completed property task',
        propertyId,
        status: 'completed',
        source: 'manual',
      });

      const openTasks = await taskService.getEntityTasks(
        testUserId,
        'property',
        propertyId,
        'open'
      );

      expect(openTasks).toHaveLength(1);
      expect(openTasks[0].status).toBe('open');
    });
  });

  describe('getOpenTasksCount', () => {
    it('should return count of open tasks for an entity', async () => {
      const contactId = 'test-contact-id';

      await taskService.createTask({
        userId: testUserId,
        label: 'Open task 1',
        contactId,
        status: 'open',
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Open task 2',
        contactId,
        status: 'open',
        source: 'manual',
      });

      await taskService.createTask({
        userId: testUserId,
        label: 'Completed task',
        contactId,
        status: 'completed',
        source: 'manual',
      });

      const count = await taskService.getOpenTasksCount(
        testUserId,
        'contact',
        contactId
      );

      expect(count).toBe(2);
    });
  });
});
