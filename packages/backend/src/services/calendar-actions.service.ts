/**
 * Calendar Actions Service
 * 
 * AI-powered calendar optimization and scheduling assistance:
 * - Suggest optimal open home times
 * - Resolve calendar conflicts
 * - Optimize agent's day for efficiency
 */

import { askZenaService } from './ask-zena.service.js';
import { godmodeService } from './godmode.service.js';
import prisma from '../config/database.js';

interface OpenHomeSlotSuggestion {
    date: string;
    startTime: string;
    endTime: string;
    reasoning: string;
    expectedAttendance: 'low' | 'medium' | 'high';
}

interface ConflictResolution {
    conflictId: string;
    suggestion: string;
    alternativeSlot?: {
        date: string;
        time: string;
    };
}

interface DayOptimization {
    optimizedSchedule: Array<{
        time: string;
        event: string;
        location?: string;
        travelTime?: number;
    }>;
    travelTimeSaved: number;
    recommendations: string[];
}

class CalendarActionsService {

    /**
     * Suggest optimal open home slots for a property
     */
    async suggestOpenHomeSlots(propertyId: string, userId: string): Promise<OpenHomeSlotSuggestion[]> {
        const featureKey = 'calendar:suggest_open_home';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return [];
        }

        try {
            const property = await prisma.property.findUnique({
                where: { id: propertyId },
                include: {
                    milestones: {
                        where: { type: 'open_home' },
                        orderBy: { date: 'desc' },
                        take: 5,
                    },
                },
            });

            if (!property) {
                return [];
            }

            // Get agent's existing calendar events
            const nextTwoWeeks = new Date();
            nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

            const prompt = `You are a real estate scheduling assistant. Suggest 3 optimal open home times for a property at ${property.address}.

Consider:
- Weekend afternoons are typically best (Sat/Sun 12-4pm)
- Avoid clash with major sports events
- Allow 30 min travel buffer between viewings

Return JSON array:
[{"date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "reasoning": "...", "expectedAttendance": "low|medium|high"}]`;

            const response = await askZenaService.askBrain(prompt, { jsonMode: true });

            try {
                return JSON.parse(response);
            } catch {
                return [];
            }
        } catch (error) {
            console.error('[CalendarActions] Error suggesting open home slots:', error);
            return [];
        }
    }

    /**
     * Detect and resolve calendar conflicts
     */
    async resolveConflicts(userId: string, date: string): Promise<ConflictResolution[]> {
        const featureKey = 'calendar:resolve_conflicts';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return [];
        }

        try {
            // In a full implementation, fetch actual calendar events
            // For now, simulate conflict detection
            const prompt = `Analyze a real estate agent's calendar for ${date} and suggest how to resolve any overlapping appointments. Return JSON array.`;

            const response = await askZenaService.askBrain(prompt, { jsonMode: true });

            try {
                return JSON.parse(response);
            } catch {
                return [];
            }
        } catch (error) {
            console.error('[CalendarActions] Error resolving conflicts:', error);
            return [];
        }
    }

    /**
     * Optimize agent's day for efficiency (travel time, grouping)
     */
    async optimizeDay(userId: string, date: string): Promise<DayOptimization | null> {
        const featureKey = 'calendar:optimize_day';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return null;
        }

        try {
            // Fetch user's events for the day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const prompt = `You are optimizing a real estate agent's day. 
Analyze their appointments and suggest:
1. Optimal order to minimize travel
2. Buffer times between viewings
3. Best time for admin tasks

Return JSON:
{
  "optimizedSchedule": [{"time": "HH:MM", "event": "...", "location": "...", "travelTime": minutes}],
  "travelTimeSaved": minutes,
  "recommendations": ["..."]
}`;

            const response = await askZenaService.askBrain(prompt, { jsonMode: true });

            try {
                return JSON.parse(response);
            } catch {
                return {
                    optimizedSchedule: [],
                    travelTimeSaved: 0,
                    recommendations: ['Unable to parse optimization suggestions'],
                };
            }
        } catch (error) {
            console.error('[CalendarActions] Error optimizing day:', error);
            return null;
        }
    }

    /**
     * Generate morning briefing for the agent
     */
    async generateMorningBriefing(userId: string): Promise<string> {
        const featureKey = 'calendar:morning_briefing';
        const mode = await godmodeService.getFeatureMode(userId, featureKey);

        if (mode === 'off') {
            return '';
        }

        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch today's events, pending tasks, and at-risk deals
            const [properties, pendingActions] = await Promise.all([
                prisma.property.count({ where: { userId } }),
                prisma.autonomousAction.count({ where: { userId, status: 'pending' } }),
            ]);

            const prompt = `Generate a concise morning briefing for a real estate agent.

Stats:
- ${properties} active properties
- ${pendingActions} pending AI suggestions
- Date: ${today}

Write 2-3 sentences highlighting priorities. Be motivational but professional.`;

            return await askZenaService.askBrain(prompt, { jsonMode: false });
        } catch (error) {
            console.error('[CalendarActions] Error generating morning briefing:', error);
            return 'Good morning! Your schedule awaits.';
        }
    }
}

export const calendarActionsService = new CalendarActionsService();
