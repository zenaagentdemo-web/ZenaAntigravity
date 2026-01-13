
import { Router } from 'express';
import { calendarActionsController } from '../controllers/calendar-actions.controller.js';

const router = Router();

router.post('/events/:id/finish', (req, res) => calendarActionsController.finishEvent(req, res));
router.post('/events/:id/trigger-cma', (req, res) => calendarActionsController.triggerCMA(req, res));
router.post('/events/:id/delegate', (req, res) => calendarActionsController.delegateViewing(req, res));
router.get('/events/:id/waitlist', (req, res) => calendarActionsController.getWaitlistSuggestion(req, res));
router.get('/events/:id/weather', (req, res) => calendarActionsController.getWeatherInsight(req, res));
router.get('/travel-risk', (req, res) => calendarActionsController.getTravelRisk(req, res));
router.get('/missed-syncs', (req, res) => calendarActionsController.getMissedSyncs(req, res));
router.get('/proactive-agenda', (req, res) => calendarActionsController.getProactiveAgenda(req, res));
router.get('/events/:id/reschedule-suggestions', (req, res) => calendarActionsController.getRescheduleSuggestions(req, res));
router.post('/resolve-conflicts', (req, res) => calendarActionsController.resolveConflicts(req, res));

export default router;
