
import { Request, Response } from 'express';
import { calendarActionsService } from '../services/calendar-actions.service.js';

class CalendarActionsController {
    /**
     * POST /api/calendar/events/:id/finish
     * S66: Open Home Feedback Loop
     */
    async finishEvent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const analysis = await calendarActionsService.analyzeOpenHome(id, userId);
            res.status(200).json(analysis);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/events/:id/weather
     * S69: Weather Insight
     */
    async getWeatherInsight(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const impact = await calendarActionsService.getWeatherImpact(id);
            res.status(200).json(impact);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/travel-risk
     * S70: Travel Time Buffer
     */
    async getTravelRisk(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const { date } = req.query;
            const risks = await calendarActionsService.checkTravelRisk(userId, String(date));
            res.status(200).json({ risks });
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * POST /api/calendar/events/resolve-conflicts
     * S67: Calendar Clash Resolution
     */
    async resolveConflicts(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const { date } = req.body;
            const resolutions = await calendarActionsService.resolveConflicts(userId, date);
            res.status(200).json({ resolutions });
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * POST /api/calendar/events/:id/trigger-cma
     * S68: Proactive CMA Generation
     */
    async triggerCMA(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const result = await calendarActionsService.triggerCMA(id, userId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * POST /api/calendar/events/:id/delegate
     * S71: Team Delegation
     */
    async delegateViewing(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { delegateId } = req.body;
            const result = await calendarActionsService.delegateViewing(id, delegateId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/events/:id/waitlist
     * S72: Waitlist Auto-Invite
     */
    async getWaitlistSuggestion(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await calendarActionsService.getWaitlistSuggestion(id);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/missed-syncs
     * S74: Missed Recurring Logic
     */
    async getMissedSyncs(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const missed = await calendarActionsService.detectMissedSync(userId);
            res.status(200).json({ missed });
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/proactive-agenda
     * S75: Proactive Agenda
     */
    async getProactiveAgenda(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const agenda = await calendarActionsService.getProactiveAgenda(userId);
            res.status(200).json(agenda);
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * GET /api/calendar/events/:id/reschedule-suggestions
     */
    async getRescheduleSuggestions(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { entityType } = req.query;
            const userId = (req as any).user?.id || (req as any).user?.userId;
            const suggestions = await calendarActionsService.getRescheduleSuggestions(userId, id, entityType as any);
            res.status(200).json({ suggestions });
        } catch (error) {
            res.status(500).json({ error: 'Failed' });
        }
    }
}

export const calendarActionsController = new CalendarActionsController();
