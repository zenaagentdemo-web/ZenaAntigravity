import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const getCalendarEventTool: ZenaToolDefinition = {
    name: 'calendar.get',
    domain: 'calendar',
    description: 'Get details of a specific calendar event by its external ID.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The external ID of the calendar event' }
        },
        required: ['id']
    },

    outputSchema: {
        type: 'object',
        properties: {
            event: { type: 'object' }
        }
    },

    permissions: ['calendar:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { id } = params;
        const userId = context.userId;

        const event = await prisma.timelineEvent.findFirst({
            where: {
                userId,
                entityType: 'calendar_event',
                entityId: id
            }
        });

        if (!event) {
            return { success: false, error: 'Calendar event not found' };
        }

        return {
            success: true,
            data: {
                event: {
                    id: event.entityId,
                    localId: event.id,
                    summary: event.summary,
                    description: event.content,
                    startTime: event.timestamp.toISOString(),
                    metadata: event.metadata
                }
            }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_GET',
        summary: `Retrieved calendar event ${input.id}`
    })
};

toolRegistry.register(getCalendarEventTool);
