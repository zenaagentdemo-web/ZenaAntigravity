import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getOverdueTasks,
} from '../controllers/task.controller.js';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// Get overdue tasks (must be before /:id route)
router.get('/overdue', getOverdueTasks);

// Get all tasks with filters
router.get('/', getTasks);

// Create a new task
router.post('/', createTask);

// Get a single task
router.get('/:id', getTask);

// Update a task
router.put('/:id', updateTask);

// Delete a task
router.delete('/:id', deleteTask);

export default router;
