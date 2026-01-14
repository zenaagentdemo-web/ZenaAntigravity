import { Request, Response } from 'express';
import { calendarOptimizerService } from '../services/calendar-optimizer.service.js';
import { logger } from '../services/logger.service.js';

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
        logger.error('Optimise Day Error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({
            success: false,
            message: 'Failed to optimise day.',
            error: error instanceof Error ? error.message : String(error)
        });
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

export const checkConflict = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id || req.body.userId || 'user-123';
        const { start, end } = req.body;

        if (!start || !end) {
            return res.status(400).json({ success: false, message: 'Start and End times required.' });
        }

        const conflictResult = await calendarOptimizerService.checkConflict(
            userId,
            new Date(start),
            new Date(end)
        );

        res.json({
            success: true,
            ...conflictResult
        });

    } catch (error) {
        console.error('Check Conflict Error:', error);
        res.status(500).json({ success: false, message: 'Failed to check conflict.' });
    }
};

export const getBriefing = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id || req.body.userId || 'user-123';
        const date = req.query.date ? new Date(req.query.date as string) : new Date();

        const briefing = await calendarOptimizerService.getDailyBriefing(userId, date);
        res.json({ success: true, ...briefing });
    } catch (error) {
        console.error('Get Briefing Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get briefing.' });
    }
};

export const analyzeIntelligence = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id || req.body.userId || 'user-123';
        const { appointments } = req.body;

        if (!appointments || !Array.isArray(appointments)) {
            return res.status(400).json({ success: false, message: 'Appointments array required.' });
        }

        const warnings = await calendarOptimizerService.analyzeScheduleIntelligence(userId, appointments);
        res.json({ success: true, warnings });
    } catch (error) {
        console.error('Analyze Intelligence Error:', error);
        res.status(500).json({ success: false, message: 'Failed to analyze intelligence.' });
    }
};
