import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

export const deleteCalendarEventTool: ZenaToolDefinition = {
    name: 'calendar.delete',
    domain: 'calendar',
    description: 'Remove a calendar event. Requires explicit confirmation.',

    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The external ID of the event' }
        },
        required: ['id']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' }
        }
    },

    permissions: ['calendar:write'],
    requiresApproval: true,
    confirmationPrompt: (_input) => `Are you sure you want to PERMANENTLY remove this calendar event? This will also remove it from your external calendar in the next sync.`,

    execute: async (params, context) => {
        const { id } = params;
        const userId = context.userId;

        const existing = await prisma.timelineEvent.findFirst({
            where: { userId, entityType: 'calendar_event', entityId: id }
        });

        if (!existing) return { success: false, error: 'Event not found' };

        await prisma.timelineEvent.delete({
            where: { id: existing.id }
        });

        return {
            success: true,
            data: { success: true }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_DELETE',
        summary: `Deleted calendar event ${input.id}`
    })
};

toolRegistry.register(deleteCalendarEventTool);
