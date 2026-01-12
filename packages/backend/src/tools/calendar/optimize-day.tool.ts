import { ZenaToolDefinition } from '../types.js';
import { toolRegistry } from '../registry.js';
import { calendarActionsService } from '../../services/calendar-actions.service.js';

export const optimizeDayTool: ZenaToolDefinition = {
    name: 'calendar.optimize_day',
    domain: 'calendar',
    description: 'Optimize the agent\'s schedule for a specific day to minimize travel and maximize efficiency.',

    inputSchema: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'ISO date string' }
        },
        required: ['date']
    },

    outputSchema: {
        type: 'object',
        properties: {
            optimization: { type: 'object' }
        }
    },

    permissions: ['calendar:read'],
    requiresApproval: false,

    execute: async (params, context) => {
        const { date } = params;
        const userId = context.userId;

        const optimization = await calendarActionsService.optimizeDay(userId, date);

        return {
            success: true,
            data: { optimization }
        };
    },

    auditLogFormat: (input, _output) => ({
        action: 'CALENDAR_OPTIMIZE_DAY',
        summary: `Optimized schedule for ${input.date}`
    })
};

toolRegistry.register(optimizeDayTool);
