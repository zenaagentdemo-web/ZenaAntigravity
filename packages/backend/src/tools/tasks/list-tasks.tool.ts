/**
 * Task: List Tasks Tool
 * 
 * Lists tasks with optional filters.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ListTasksInput {
    status?: 'open' | 'completed';
    dealId?: string;
    propertyId?: string;
    dueBefore?: string;
    limit?: number;
}

interface TaskSummary {
    id: string;
    label: string;
    status: string;
    dueDate?: string;
    dealId?: string;
    propertyId?: string;
    isOverdue: boolean;
}

interface ListTasksOutput {
    tasks: TaskSummary[];
    total: number;
    overdueCount: number;
}

export const listTasksTool: ZenaToolDefinition<ListTasksInput, ListTasksOutput> = {
    name: 'task.list',
    domain: 'task',
    description: 'List tasks with optional filters for status, linked deal, or due date',

    inputSchema: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['open', 'completed'],
                description: 'Filter by task status'
            },
            dealId: {
                type: 'string',
                description: 'Filter by linked deal'
            },
            propertyId: {
                type: 'string',
                description: 'Filter by linked property'
            },
            dueBefore: {
                type: 'string',
                description: 'Filter tasks due before this date (ISO format)'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of tasks to return',
                default: 20
            }
        },
        required: []
    },

    outputSchema: {
        type: 'object',
        properties: {
            tasks: { type: 'array' },
            total: { type: 'number' },
            overdueCount: { type: 'number' }
        }
    },

    permissions: ['tasks:read'],
    requiresApproval: false,

    async execute(params: ListTasksInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ListTasksOutput>> {
        try {
            const limit = params.limit || 20;
            const now = new Date();

            // Build query
            const where: any = {
                userId: context.userId
            };

            if (params.status) {
                where.status = params.status;
            }
            if (params.dealId) {
                where.dealId = params.dealId;
            }
            if (params.propertyId) {
                where.propertyId = params.propertyId;
            }
            if (params.dueBefore) {
                where.dueDate = { lte: new Date(params.dueBefore) };
            }

            // Fetch tasks
            const tasks = await prisma.task.findMany({
                where,
                orderBy: { dueDate: 'asc' },
                take: limit
            });

            // Get total count
            const total = await prisma.task.count({ where });

            // Format output
            const taskSummaries: TaskSummary[] = tasks.map(t => {
                const isOverdue = t.status === 'open' && t.dueDate && t.dueDate < now;
                return {
                    id: t.id,
                    label: t.label,
                    status: t.status,
                    dueDate: t.dueDate?.toISOString(),
                    dealId: t.dealId || undefined,
                    propertyId: t.propertyId || undefined,
                    isOverdue: isOverdue || false
                };
            });

            const overdueCount = taskSummaries.filter(t => t.isOverdue).length;

            return {
                success: true,
                data: {
                    tasks: taskSummaries,
                    total,
                    overdueCount
                }
            };
        } catch (error) {
            console.error('[task.list] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list tasks'
            };
        }
    },

    auditLogFormat(_input, output) {
        const count = output.success && output.data ? output.data.tasks.length : 0;
        const overdue = output.success && output.data ? output.data.overdueCount : 0;
        return {
            action: 'TASK_LIST',
            summary: `Listed ${count} tasks (${overdue} overdue)`
        };
    }
};

toolRegistry.register(listTasksTool);
