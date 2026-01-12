import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const updateCalendarEventTool: ZenaToolDefinition = {
    name: 'calendar.update',
    domain: 'calendar',
    description: 'Update an existing calendar event.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The external ID of the event (optional if eventSummary provided)' },
            eventSummary: { type: 'string', description: 'The summary/title of the event to update (will resolve to ID)' },
            summary: { type: 'string' },
            description: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            location: { type: 'string' }
        },
        required: []
    },

    recommendedFields: ['id', 'eventSummary', 'summary', 'description', 'startTime', 'endTime', 'location'],

    outputSchema: {
        type: 'object',
        properties: {
            event: { type: 'object' }
        }
    },

    permissions: ['calendar:write'],
    requiresApproval: false,

    execute: async (params: any, context) => {
        const { id, eventSummary, summary, description, startTime, endTime, location } = params;
        const userId = context.userId;

        let resolvedId = id;

        // 🧠 ZENA INTEL: Resolve event summary
        if (!resolvedId && eventSummary) {
            const event = await prisma.timelineEvent.findFirst({
                where: { userId, entityType: 'calendar_event', summary: { contains: eventSummary, mode: 'insensitive' } }
            });
            if (event) resolvedId = event.entityId;
        }

        if (!resolvedId) return { success: false, error: 'Event ID or Summary required' };

        const existing = await prisma.timelineEvent.findFirst({
            where: { userId, entityType: 'calendar_event', entityId: resolvedId }
        });

        if (!existing) return { success: false, error: 'Event not found' };

        const metadata = (existing.metadata as any) || {};
        const updatedEvent = await prisma.timelineEvent.update({
            where: { id: existing.id },
            data: {
                summary: summary || existing.summary,
                content: description || existing.content,
                timestamp: startTime ? new Date(startTime) : existing.timestamp,
                metadata: {
                    ...metadata,
                    ...(endTime && { endTime }),
                    ...(location && { location }),
                    isPendingSync: true
                }
            }
        });

        return {
            success: true,
            data: {
                event: {
                    id: updatedEvent.entityId,
                    localId: updatedEvent.id,
                    summary: updatedEvent.summary,
                    startTime: updatedEvent.timestamp.toISOString(),
                    metadata: updatedEvent.metadata
                }
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_UPDATE',
        summary: `Updated calendar event ${input.id}`
    })
};

toolRegistry.register(updateCalendarEventTool);
