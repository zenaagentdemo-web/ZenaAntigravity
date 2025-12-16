import prisma from '../config/database.js';
import { timelineService } from './timeline.service.js';
import { websocketService } from './websocket.service.js';

export interface TaskInput {
  userId: string;
  label: string;
  status?: 'open' | 'completed';
  dueDate?: Date;
  dealId?: string;
  propertyId?: string;
  contactId?: string;
  source: 'email' | 'voice_note' | 'manual' | 'ai_suggested';
}

export interface TaskQueryOptions {
  userId: string;
  status?: 'open' | 'completed';
  dealId?: string;
  propertyId?: string;
  contactId?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(input: TaskInput) {
    const task = await prisma.task.create({
      data: {
        userId: input.userId,
        label: input.label,
        status: input.status || 'open',
        dueDate: input.dueDate,
        dealId: input.dealId,
        propertyId: input.propertyId,
        contactId: input.contactId,
        source: input.source,
      },
    });

    // Create timeline event for task creation
    if (input.dealId) {
      await timelineService.createTaskEvent(
        input.userId,
        'deal',
        input.dealId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    } else if (input.propertyId) {
      await timelineService.createTaskEvent(
        input.userId,
        'property',
        input.propertyId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    } else if (input.contactId) {
      await timelineService.createTaskEvent(
        input.userId,
        'contact',
        input.contactId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    }

    // Emit task.created event
    websocketService.broadcastToUser(input.userId, 'task.created', {
      taskId: task.id,
      label: task.label,
      dueDate: task.dueDate,
      dealId: task.dealId,
      propertyId: task.propertyId,
      contactId: task.contactId,
      source: task.source,
    });

    return task;
  }

  /**
   * Extract tasks from email or voice note content using AI
   * This is a placeholder for AI-based task extraction
   */
  async extractTasksFromContent(
    userId: string,
    content: string,
    source: 'email' | 'voice_note',
    entityId?: string,
    entityType?: 'deal' | 'property' | 'contact'
  ): Promise<any[]> {
    // TODO: Implement AI-based task extraction using LLM
    // For now, return empty array
    // This would use the AI processing service to:
    // 1. Analyze content for action items
    // 2. Extract task labels and due dates
    // 3. Link to relevant entities
    
    return [];
  }

  /**
   * Get tasks with filters
   */
  async getTasks(options: TaskQueryOptions) {
    const where: any = {
      userId: options.userId,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.dealId) {
      where.dealId = options.dealId;
    }

    if (options.propertyId) {
      where.propertyId = options.propertyId;
    }

    if (options.contactId) {
      where.contactId = options.contactId;
    }

    if (options.overdue) {
      where.status = 'open';
      where.dueDate = {
        lt: new Date(),
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // Open tasks first
        { dueDate: 'asc' }, // Earliest due date first
        { createdAt: 'desc' }, // Most recent first
      ],
      take: options.limit,
      skip: options.offset,
    });

    return tasks;
  }

  /**
   * Get a single task by ID
   */
  async getTask(userId: string, taskId: string) {
    return await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });
  }

  /**
   * Update a task
   */
  async updateTask(
    userId: string,
    taskId: string,
    updates: {
      label?: string;
      status?: 'open' | 'completed';
      dueDate?: Date | null;
      dealId?: string | null;
      propertyId?: string | null;
      contactId?: string | null;
    }
  ) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // If completing the task, set completedAt
    const updateData: any = { ...updates };
    if (updates.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Create timeline event for task completion
    if (updates.status === 'completed' && task.status !== 'completed') {
      if (task.dealId) {
        await timelineService.createTaskEvent(
          userId,
          'deal',
          task.dealId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      } else if (task.propertyId) {
        await timelineService.createTaskEvent(
          userId,
          'property',
          task.propertyId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      } else if (task.contactId) {
        await timelineService.createTaskEvent(
          userId,
          'contact',
          task.contactId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      }
    }

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(userId: string, taskId: string) {
    return await prisma.task.deleteMany({
      where: {
        id: taskId,
        userId,
      },
    });
  }

  /**
   * Get overdue tasks for a user
   */
  async getOverdueTasks(userId: string) {
    return await this.getTasks({
      userId,
      overdue: true,
    });
  }

  /**
   * Get tasks for a specific entity
   */
  async getEntityTasks(
    userId: string,
    entityType: 'deal' | 'property' | 'contact',
    entityId: string,
    status?: 'open' | 'completed'
  ) {
    const options: TaskQueryOptions = {
      userId,
      status,
    };

    if (entityType === 'deal') {
      options.dealId = entityId;
    } else if (entityType === 'property') {
      options.propertyId = entityId;
    } else if (entityType === 'contact') {
      options.contactId = entityId;
    }

    return await this.getTasks(options);
  }

  /**
   * Get open tasks count for an entity
   */
  async getOpenTasksCount(
    userId: string,
    entityType: 'deal' | 'property' | 'contact',
    entityId: string
  ): Promise<number> {
    const where: any = {
      userId,
      status: 'open',
    };

    if (entityType === 'deal') {
      where.dealId = entityId;
    } else if (entityType === 'property') {
      where.propertyId = entityId;
    } else if (entityType === 'contact') {
      where.contactId = entityId;
    }

    return await prisma.task.count({ where });
  }
}

export const taskService = new TaskService();
