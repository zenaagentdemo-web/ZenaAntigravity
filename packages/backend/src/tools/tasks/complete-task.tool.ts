/**
 * Task: Complete Task Tool
 * 
 * Marks a task as completed.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface CompleteTaskInput {
    taskId: string;
}

interface CompleteTaskOutput {
    success: boolean;
    task: {
        id: string;
        label: string;
        status: string;
        completedAt: string;
    };
}

export const completeTaskTool: ZenaToolDefinition<CompleteTaskInput, CompleteTaskOutput> = {
    name: 'task.complete',
    domain: 'task',
    description: 'Mark a task as completed',

    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'The ID of the task to complete (optional if taskLabel provided)'
            },
            taskLabel: {
                type: 'string',
                description: 'The label/title of the task to complete (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['taskLabel'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            task: { type: 'object' }
        }
    },

    permissions: ['tasks:write'],
    requiresApproval: false, // Completing is reversible

    async execute(params: CompleteTaskInput & { taskLabel?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<CompleteTaskOutput>> {
        try {
            let taskId = params.taskId;
            const userId = context.userId;

            // 🧠 ZENA INTEL: Resolve task label
            if (!taskId && params.taskLabel) {
                const task = await prisma.task.findFirst({
                    where: { userId, label: { contains: params.taskLabel, mode: 'insensitive' }, status: 'open' }
                });
                if (task) taskId = task.id;
            }

            if (!taskId) {
                return { success: false, error: 'Task ID or valid label required' };
            }

            // Fetch task
            const task = await prisma.task.findFirst({
                where: {
                    id: taskId,
                    userId
                }
            });

            if (!task) {
                return {
                    success: false,
                    error: 'Task not found'
                };
            }

            const now = new Date();

            // Update task
            await prisma.task.update({
                where: { id: params.taskId },
                data: {
                    status: 'completed',
                    completedAt: now
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    task: {
                        id: task.id,
                        label: task.label,
                        status: 'completed',
                        completedAt: now.toISOString()
                    }
                }
            };
        } catch (error) {
            console.error('[task.complete] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to complete task'
            };
        }
    },

    // Rollback: reopen task
    async rollback(params: CompleteTaskInput, _context: ToolExecutionContext): Promise<void> {
        await prisma.task.update({
            where: { id: params.taskId },
            data: {
                status: 'open',
                completedAt: null
            }
        });
    },

    auditLogFormat(input, output) {
        const label = output.success && output.data ? output.data.task.label : 'Unknown';
        return {
            action: 'TASK_COMPLETE',
            summary: `Completed task: "${label}"`,
            entityType: 'task',
            entityId: input.taskId
        };
    }
};

toolRegistry.register(completeTaskTool);
