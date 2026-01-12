/**
 * Task: Search Task Tool
 * 
 * Search for tasks by label/title.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SearchTaskInput {
    query: string;
    includeCompleted?: boolean;
}

interface SearchTaskOutput {
    bestMatch?: {
        id: string;
        label: string;
        status: string;
        dueDate?: string;
    };
    alternatives: Array<{
        id: string;
        label: string;
        status: string;
        dueDate?: string;
    }>;
}

export const searchTaskTool: ZenaToolDefinition<SearchTaskInput, SearchTaskOutput> = {
    name: 'task.search',
    domain: 'task',
    description: 'Search for a task by its label or title. Use this to find a taskId before completing or updating a task.',

    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search term (label or title piece)'
            },
            includeCompleted: {
                type: 'boolean',
                description: 'Whether to include completed tasks in results',
                default: false
            }
        },
        required: ['query']
    },

    outputSchema: {
        type: 'object',
        properties: {
            bestMatch: { type: 'object' },
            alternatives: { type: 'array' }
        }
    },

    permissions: ['tasks:read'],
    requiresApproval: false,

    async execute(params: SearchTaskInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SearchTaskOutput>> {
        try {
            const userId = context.userId;
            const statusFilter = params.includeCompleted ? undefined : 'open';

            const tasks = await prisma.task.findMany({
                where: {
                    userId,
                    label: { contains: params.query, mode: 'insensitive' },
                    ...(statusFilter && { status: statusFilter })
                },
                take: 5,
                orderBy: { dueDate: 'asc' }
            });

            if (tasks.length === 0) {
                return {
                    success: true,
                    data: { alternatives: [] }
                };
            }

            const formatted = tasks.map(t => ({
                id: t.id,
                label: t.label,
                status: t.status,
                dueDate: t.dueDate?.toISOString()
            }));

            return {
                success: true,
                data: {
                    bestMatch: formatted[0],
                    alternatives: formatted.slice(1)
                }
            };
        } catch (error) {
            console.error('[task.search] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search tasks'
            };
        }
    }
};

toolRegistry.register(searchTaskTool);
