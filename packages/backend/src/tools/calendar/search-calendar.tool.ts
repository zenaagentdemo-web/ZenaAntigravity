/**
 * Calendar: Search Calendar Tool
 * 
 * Search for calendar events by summary or time.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchCalendarInput {
    query?: string;
    date?: string;
}

interface SearchCalendarOutput {
    bestMatch?: {
        id: string;
        summary: string;
        startTime: string;
        location?: string;
    };
    alternatives: Array<{
        id: string;
        summary: string;
        startTime: string;
        location?: string;
    }>;
}

export const searchCalendarTool: ZenaToolDefinition<SearchCalendarInput, SearchCalendarOutput> = {
    name: 'calendar.search',
    domain: 'calendar',
    description: 'Search for a calendar event by summary or date. Use this to find an eventId before updating or deleting.',

    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search term for the event summary'
            },
            date: {
                type: 'string',
                description: 'Search for events on this date (ISO format or YYYY-MM-DD)'
            }
        }
    },

    outputSchema: {
        type: 'object',
        properties: {
            bestMatch: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['calendar:read'],
    requiresApproval: false,

    async execute(params: SearchCalendarInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchCalendarOutput>> {
        try {
            const userId = context.userId;
            const where: any = { userId, entityType: 'calendar_event' };

            if (params.query) {
                where.summary = { contains: params.query, mode: 'insensitive' };
            }

            if (params.date) {
                const startDate = new Date(params.date);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(params.date);
                endDate.setHours(23, 59, 59, 999);
                where.timestamp = { gte: startDate, lte: endDate };
            }

            const events = await prisma.timelineEvent.findMany({
                where,
                take: 5,
                orderBy: { timestamp: 'asc' }
            });

            const formatted = events.map(e => ({
                id: e.entityId, // External ID used by other tools
                summary: e.summary || '(No summary)',
                startTime: e.timestamp.toISOString(),
                location: (e.metadata as any)?.location
            }));

            return {
                success: true,
                data: {
                    bestMatch: formatted[0],
                    alternatives: formatted.slice(1)
                }
            };
        } catch (error) {
            console.error('[calendar.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search calendar'
            };
        }
    }
};

toolRegistry.register(searchCalendarTool);
