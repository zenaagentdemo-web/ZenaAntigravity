import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { calendarActionsService } from '../../services/calendar-actions.service.js';

export const suggestSlotsTool: ZenaToolDefinition = {
    name: 'calendar.suggest_slots',
    domain: 'calendar',
    description: 'Suggest optimal open home slots for a property using Zena Intelligence.',

    inputSchema: {
        type: 'object',
        properties: {
            propertyId: { type: 'string' }
        },
        required: ['propertyId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            suggestions: { type: 'array' }
        }
    },

    permissions: ['calendar:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { propertyId } = params;
        const userId = context.userId;

        const suggestions = await calendarActionsService.suggestOpenHomeSlots(propertyId, userId);

        return {
            success: true,
            data: { suggestions }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_SUGGEST_SLOTS',
        summary: `Suggested open home slots for property ${input.propertyId}`
    })
};

toolRegistry.register(suggestSlotsTool);
