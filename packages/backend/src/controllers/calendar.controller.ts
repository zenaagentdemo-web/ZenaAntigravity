import { Request, Response } from 'express';
import { calendarOptimizerService } from '../services/calendar-optimizer.service.js';

export const optimiseDay = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id || req.body.userId || 'user-123';
        const date = req.body.date ? new Date(req.body.date) : new Date();

        console.log(`[CalendarController] Optimising day for user: ${userId} on date: ${date.toISOString()}`);

        const p = await calendarOptimizerService.optimizeDay(userId, date);

        res.json({
            success: true,
            data: p
        });

    } catch (error) {
        console.error('Optimise Day Error:', error);
        res.status(500).json({ success: false, message: 'Failed to optimise day.' });
    }
};

export const applyDay = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id || req.body.userId || 'user-123';
        const { schedule } = req.body;

        console.log(`[CalendarController] Applying schedule for user: ${userId}`);

        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({ success: false, message: 'Invalid schedule data.' });
        }

        await calendarOptimizerService.applySchedule(userId, schedule);

        res.json({
            success: true,
            message: 'Schedule applied successfully.'
        });

    } catch (error) {
        console.error('Apply Day Error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply schedule.' });
    }
};
