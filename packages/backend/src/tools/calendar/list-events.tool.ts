import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const listCalendarEventsTool: ZenaToolDefinition = {
    name: 'calendar.list',
    domain: 'calendar',
    description: 'List calendar events with optional filters for date range and entity links.',

    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'ISO start date' },
            endDate: { type: 'string', description: 'ISO end date' },
            limit: { type: 'number', default: 20 }
        }
    },

    outputSchema: {
        type: 'object',
        properties: {
            events: {
                type: 'array',
                items: { type: 'object' }
            },
            count: { type: 'number' }
        }
    },

    permissions: ['calendar:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { startDate, endDate, limit = 20 } = params;
        const userId = context.userId;

        const where: any = {
            userId,
            entityType: 'calendar_event'
        };

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const events = await prisma.timelineEvent.findMany({
            where,
            take: limit,
            orderBy: { timestamp: 'asc' }
        });

        return {
            success: true,
            data: {
                events: events.map(e => ({
                    id: e.entityId,
                    localId: e.id,
                    summary: e.summary,
                    description: e.content,
                    startTime: e.timestamp.toISOString(),
                    metadata: e.metadata
                })),
                count: events.length
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_LIST',
        summary: `Listed calendar events ${input.startDate ? `from ${input.startDate}` : ''}`
    })
};

toolRegistry.register(listCalendarEventsTool);
