/**
 * Task: Delete Task Tool
 * 
 * Deletes a task permanently.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { taskService } from '../../services/task.service.js';

interface DeleteTaskInput {
    taskId: string;
}

interface DeleteTaskOutput {
    success: boolean;
    deletedId: string;
}

export const deleteTaskTool: ZenaToolDefinition<DeleteTaskInput, DeleteTaskOutput> = {
    name: 'task.delete',
    domain: 'task',
    description: 'Delete a task permanently',

    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'ID of the task to delete (optional if taskLabel provided)'
            },
            taskLabel: {
                type: 'string',
                description: 'Label of the task to delete (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['taskId', 'taskLabel'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            deletedId: { type: 'string' }
        }
    },

    permissions: ['tasks:delete'],
    requiresApproval: true,
    approvalType: 'destructive',

    confirmationPrompt: (_params: DeleteTaskInput) => {
        return `⚠️ Delete this task?`;
    },

    async execute(params: DeleteTaskInput & { taskLabel?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<DeleteTaskOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Task deletion requires approval'
            };
        }

        try {
            let taskId = params.taskId;
            const userId = context.userId;

            // 🧠 ZENA INTEL: Resolve task label
            if (!taskId && params.taskLabel) {
                const task = await prisma.task.findFirst({
                    where: { userId, label: { contains: params.taskLabel, mode: 'insensitive' } }
                });
                if (task) taskId = task.id;
            }

            if (!taskId) return { success: false, error: 'Task ID or Label required' };

            await taskService.deleteTask(userId, taskId);

            return {
                success: true,
                data: {
                    success: true,
                    deletedId: params.taskId
                }
            };
        } catch (error) {
            console.error('[task.delete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete task'
            };
        }
    },

    auditLogFormat(input: DeleteTaskInput, _output: ToolExecutionResult<DeleteTaskOutput>) {
        return {
            action: 'TASK_DELETE',
            summary: `Deleted task ${input.taskId}`,
            entityType: 'task',
            entityId: input.taskId
        };
    }
};

toolRegistry.register(deleteTaskTool);
