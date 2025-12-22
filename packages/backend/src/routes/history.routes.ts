import { Router } from 'express';
import * as historyController from '../controllers/history.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * All history routes require authentication
 */
router.use(authenticate);

// GET /api/history - List all conversations
router.get('/', historyController.getConversations);

// POST /api/history - Create a new conversation
router.post('/', historyController.createConversation);

// GET /api/history/:id - Get a specific conversation with messages
router.get('/:id', historyController.getConversation);

// POST /api/history/:id/messages - Add a message to a conversation
router.post('/:id/messages', historyController.addMessage);

// DELETE /api/history/:id - Delete a conversation
router.delete('/:id', historyController.deleteConversation);

// PATCH /api/history/:id/title - Update conversation title
router.patch('/:id/title', historyController.updateTitle);

export default router;
