/**
 * Task: Reschedule Task Tool
 * 
 * Changes a task's due date.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { taskService } from '../../services/task.service.js';

interface RescheduleTaskInput {
    taskId: string;
    newDueDate: string;
}

interface RescheduleTaskOutput {
    success: boolean;
    task: {
        id: string;
        label: string;
        dueDate: string;
    };
}

export const rescheduleTaskTool: ZenaToolDefinition<RescheduleTaskInput, RescheduleTaskOutput> = {
    name: 'task.reschedule',
    domain: 'task',
    description: 'Change a task\'s due date',

    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'ID of the task to reschedule'
            },
            newDueDate: {
                type: 'string',
                description: 'New due date (ISO format or natural language like "tomorrow")'
            }
        },
        required: ['taskId', 'newDueDate']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            task: { type: 'object' }
        }
    },

    permissions: ['tasks:write'],
    requiresApproval: false,

    async execute(params: RescheduleTaskInput, context: ToolExecutionContext): Promise<ToolExecutionResult<RescheduleTaskOutput>> {
        try {
            const dueDate = new Date(params.newDueDate);
            if (isNaN(dueDate.getTime())) {
                return { success: false, error: 'Invalid date format' };
            }

            const task = await taskService.updateTask(context.userId, params.taskId, { dueDate });

            return {
                success: true,
                data: {
                    success: true,
                    task: {
                        id: task.id,
                        label: task.label,
                        dueDate: task.dueDate?.toISOString() || ''
                    }
                }
            };
        } catch (error) {
            console.error('[task.reschedule] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reschedule task'
            };
        }
    },

    auditLogFormat(input, output) {
        const date = output.success && output.data ? output.data.task.dueDate : '';
        return {
            action: 'TASK_RESCHEDULE',
            summary: `Rescheduled task to ${date}`,
            entityType: 'task',
            entityId: input.taskId
        };
    }
};

toolRegistry.register(rescheduleTaskTool);
