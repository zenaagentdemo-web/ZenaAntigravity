/**
 * Task: Get Task Tool
 * 
 * Gets details of a specific task.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { taskService } from '../../services/task.service.js';

interface GetTaskInput {
    taskId: string;
}

interface GetTaskOutput {
    success: boolean;
    task: {
        id: string;
        label: string;
        status: string;
        dueDate?: string;
        dealId?: string;
        propertyId?: string;
        contactId?: string;
    };
}

export const getTaskTool: ZenaToolDefinition<GetTaskInput, GetTaskOutput> = {
    name: 'task.get',
    domain: 'task',
    description: 'Get details of a specific task',

    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'ID of the task to retrieve'
            }
        },
        required: ['taskId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            task: { type: 'object' }
        }
    },

    permissions: ['tasks:read'],
    requiresApproval: false,

    async execute(params: GetTaskInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetTaskOutput>> {
        try {
            const task = await taskService.getTask(context.userId, params.taskId);

            if (!task) {
                return { success: false, error: 'Task not found' };
            }

            return {
                success: true,
                data: {
                    success: true,
                    task: {
                        id: task.id,
                        label: task.label,
                        status: task.status,
                        dueDate: task.dueDate?.toISOString(),
                        dealId: task.dealId || undefined,
                        propertyId: task.propertyId || undefined,
                        contactId: task.contactId || undefined
                    }
                }
            };
        } catch (error) {
            console.error('[task.get] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get task'
            };
        }
    },

    auditLogFormat(input, output) {
        const label = output.success && output.data ? output.data.task.label : '';
        return {
            action: 'TASK_GET',
            summary: `Viewed task: "${label}"`,
            entityType: 'task',
            entityId: input.taskId
        };
    }
};

toolRegistry.register(getTaskTool);
