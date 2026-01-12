/**
 * Task: Get Overdue Tool
 * 
 * Gets all overdue tasks.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { taskService } from '../../services/task.service.js';

interface GetOverdueTasksInput {
    limit?: number;
}

interface GetOverdueTasksOutput {
    success: boolean;
    tasks: Array<{
        id: string;
        label: string;
        dueDate: string;
        daysOverdue: number;
    }>;
    count: number;
}

export const getOverdueTasksTool: ZenaToolDefinition<GetOverdueTasksInput, GetOverdueTasksOutput> = {
    name: 'task.get_overdue',
    domain: 'task',
    description: 'Get all overdue tasks',

    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Maximum number of tasks to return'
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            tasks: { type: 'array' },
            count: { type: 'number' }
        }
    },

    permissions: ['tasks:read'],
    requiresApproval: false,

    async execute(params: GetOverdueTasksInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetOverdueTasksOutput>> {
        try {
            const tasks = await taskService.getOverdueTasks(context.userId);
            const now = new Date();

            const limitedTasks = params.limit ? tasks.slice(0, params.limit) : tasks;

            return {
                success: true,
                data: {
                    success: true,
                    tasks: limitedTasks.map(t => {
                        const daysOverdue = t.dueDate
                            ? Math.floor((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                        return {
                            id: t.id,
                            label: t.label,
                            dueDate: t.dueDate?.toISOString() || '',
                            daysOverdue
                        };
                    }),
                    count: tasks.length
                }
            };
        } catch (error) {
            console.error('[task.get_overdue] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get overdue tasks'
            };
        }
    },

    auditLogFormat(_input: GetOverdueTasksInput, output: ToolExecutionResult<GetOverdueTasksOutput>) {
        const count = output.success && output.data ? output.data.count : 0;
        return {
            action: 'TASK_GET_OVERDUE',
            summary: `Retrieved ${count} overdue tasks`,
            entityType: 'task'
        };
    }
};

toolRegistry.register(getOverdueTasksTool);
