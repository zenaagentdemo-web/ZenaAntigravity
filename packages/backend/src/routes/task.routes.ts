import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getOverdueTasks,
  reopenTask,
  detectCompletions,
  getGravity,
  batchDefer,
  syncRecurring,
  pivotTasks,
  getDelegationSuggestion,
  pruneTasks,
} from '../controllers/task.controller.js';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// 🧠 ZENA INTELLIGENCE: Detect potential task completions from activity
router.get('/detect-completions', detectCompletions);

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

// Reopen a completed task (undo)
router.patch('/:id/reopen', reopenTask);

// Batch Defer
router.post('/batch-defer', batchDefer);

// Crisis Pivot
router.post('/crisis-pivot', pivotTasks);

// Recurring Sync
router.post('/recurring-sync', syncRecurring);

// Delete a task
router.delete('/:id', deleteTask);

// Orbital Gravity
router.get('/:id/gravity', getGravity);

// Delegation Suggestion
router.get('/:id/delegate', getDelegationSuggestion);

// Prune Tasks
router.delete('/prune', pruneTasks);

export default router;

