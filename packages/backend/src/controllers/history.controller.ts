import { Request, Response } from 'express';
import { historyService } from '../services/history.service.js';

/**
 * Get all conversations for the authenticated user
 */
export async function getConversations(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const conversations = await historyService.getConversations(userId);
        res.status(200).json({ conversations });
    } catch (error) {
        console.error('Error in getConversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
}

/**
 * Get a specific conversation with its messages
 */
export async function getConversation(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const conversation = await historyService.getConversation(id, userId);
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.status(200).json({ conversation });
    } catch (error) {
        console.error('Error in getConversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
}

/**
 * Create a new conversation
 */
export async function createConversation(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        const { title } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const conversation = await historyService.createConversation(userId, title);
        res.status(201).json({ conversation });
    } catch (error) {
        console.error('Error in createConversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        await historyService.deleteConversation(id, userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in deleteConversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
}

/**
 * Update conversation title
 */
export async function updateTitle(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;
        const { title } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!title || typeof title !== 'string') {
            res.status(400).json({ error: 'Title is required' });
            return;
        }

        await historyService.updateTitle(id, userId, title);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in updateTitle:', error);
        res.status(500).json({ error: 'Failed to update conversation title' });
    }
}
