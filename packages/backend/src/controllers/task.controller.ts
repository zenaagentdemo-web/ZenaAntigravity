import { Request, Response } from 'express';
import { taskService } from '../services/task.service.js';

/**
 * Get tasks with filters
 * GET /api/tasks
 * Query params:
 * - status: filter by status (open, completed)
 * - dealId: filter by deal ID
 * - propertyId: filter by property ID
 * - contactId: filter by contact ID
 * - overdue: filter overdue tasks (true/false)
 * - limit: max number of tasks to return
 * - offset: pagination offset
 */
export async function getTasks(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, dealId, propertyId, contactId, overdue, limit, offset } =
      req.query;

    const options: any = {
      userId,
    };

    if (status) {
      options.status = status as string;
    }

    if (dealId) {
      options.dealId = dealId as string;
    }

    if (propertyId) {
      options.propertyId = propertyId as string;
    }

    if (contactId) {
      options.contactId = contactId as string;
    }

    if (overdue === 'true') {
      options.overdue = true;
    }

    if (limit) {
      options.limit = parseInt(limit as string, 10);
    }

    if (offset) {
      options.offset = parseInt(offset as string, 10);
    }

    const tasks = await taskService.getTasks(options);

    res.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new task
 * POST /api/tasks
 * Body:
 * - label: task description (required)
 * - dueDate: optional due date
 * - dealId: optional deal ID
 * - propertyId: optional property ID
 * - contactId: optional contact ID
 */
export async function createTask(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { label, dueDate, dealId, propertyId, contactId } = req.body;

    // Validate required fields
    if (!label) {
      return res.status(400).json({
        error: 'Missing required field: label',
      });
    }

    // Validate that at least one entity is linked (optional but recommended)
    // Tasks can exist without entity links for general todos

    const task = await taskService.createTask({
      userId,
      label,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      dealId,
      propertyId,
      contactId,
      source: 'manual',
    });

    res.status(201).json({
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get a single task
 * GET /api/tasks/:id
 */
export async function getTask(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const task = await taskService.getTask(userId, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      error: 'Failed to fetch task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update a task
 * PUT /api/tasks/:id
 * Body:
 * - label: optional new label
 * - status: optional new status (open, completed)
 * - dueDate: optional new due date (or null to remove)
 * - dealId: optional new deal ID (or null to remove)
 * - propertyId: optional new property ID (or null to remove)
 * - contactId: optional new contact ID (or null to remove)
 */
export async function updateTask(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { label, status, dueDate, dealId, propertyId, contactId } = req.body;

    const updates: any = {};

    if (label !== undefined) {
      updates.label = label;
    }

    if (status !== undefined) {
      if (status !== 'open' && status !== 'completed') {
        return res.status(400).json({
          error: 'Invalid status. Must be "open" or "completed"',
        });
      }
      updates.status = status;
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (dealId !== undefined) {
      updates.dealId = dealId || null;
    }

    if (propertyId !== undefined) {
      updates.propertyId = propertyId || null;
    }

    if (contactId !== undefined) {
      updates.contactId = contactId || null;
    }

    const task = await taskService.updateTask(userId, id, updates);

    res.json({
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    if (error instanceof Error && error.message === 'Task not found') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({
      error: 'Failed to update task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
export async function deleteTask(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await taskService.deleteTask(userId, id);

    if (result.count === 0) {
      return res.status(404).json({
        error: 'Task not found',
      });
    }

    res.json({
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get overdue tasks
 * GET /api/tasks/overdue
 */
export async function getOverdueTasks(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tasks = await taskService.getOverdueTasks(userId);

    res.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch overdue tasks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
