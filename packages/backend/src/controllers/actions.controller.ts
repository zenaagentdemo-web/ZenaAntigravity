import { Request, Response } from 'express';
import { actionService } from '../services/action.service.js';

/**
 * Actions Controller
 * Handles custom actions triggered from Zena chat
 */

/**
 * POST /api/actions/email/draft
 */
export async function draftEmail(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            res.status(400).json({ error: 'Missing required fields: to, subject, body' });
            return;
        }

        const { draftId } = await actionService.draftEmail({ userId, to, subject, body });
        res.status(200).json({ success: true, draftId });
    } catch (error) {
        console.error('Error in draftEmail:', error);
        res.status(500).json({ error: 'Failed to draft email', message: error instanceof Error ? error.message : 'Unknown error' });
    }
}

/**
 * POST /api/actions/report/generate
 */
export async function generateReport(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { address } = req.body;

        if (!address) {
            res.status(400).json({ error: 'Address is required' });
            return;
        }

        const { exportId } = await actionService.generateReport(userId, address);
        res.status(200).json({ success: true, exportId, downloadUrl: `/api/export/${exportId}/download` });
    } catch (error) {
        console.error('Error in generateReport:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
}

/**
 * POST /api/actions/calendar/event
 */
export async function addCalendarEvent(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { summary, description, startTime, endTime, location } = req.body;

        if (!summary || !startTime || !endTime) {
            res.status(400).json({ error: 'Missing required fields: summary, startTime, endTime' });
            return;
        }

        await actionService.addCalendarEvent({ userId, summary, description, startTime, endTime, location });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in addCalendarEvent:', error);
        res.status(500).json({ error: 'Failed to add calendar event' });
    }
}
