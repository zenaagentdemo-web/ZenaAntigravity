/**
 * Task: Create Task Tool
 * 
 * Creates a new task with optional links to deals/properties.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface CreateTaskInput {
    label: string;
    dueDate?: string;
    dealId?: string;
    propertyId?: string;
    contactId?: string;
}

interface CreateTaskOutput {
    success: boolean;
    task: {
        id: string;
        label: string;
        status: string;
        dueDate?: string;
        dealId?: string;
        propertyId?: string;
    };
}

export const createTaskTool: ZenaToolDefinition<CreateTaskInput, CreateTaskOutput> = {
    name: 'task.create',
    domain: 'task',
    description: 'Create a new task. Can optionally link to a deal, property, or contact.',

    inputSchema: {
        type: 'object',
        properties: {
            label: {
                type: 'string',
                description: 'The task description/label'
            },
            dueDate: {
                type: 'string',
                description: 'Optional due date in ISO format (e.g., "2026-01-15T09:00:00Z")'
            },
            dealId: {
                type: 'string',
                description: 'Optional deal ID to link the task to'
            },
            propertyId: {
                type: 'string',
                description: 'Optional property ID to link the task to'
            },
            contactId: {
                type: 'string',
                description: 'Optional contact ID to link the task to'
            },
            propertyAddress: {
                type: 'string',
                description: 'Optional property address to link the task to'
            },
            contactName: {
                type: 'string',
                description: 'Optional contact name to link the task to'
            }
        },
        required: ['label']
    },

    recommendedFields: ['dueDate', 'dealId', 'propertyId', 'contactId', 'propertyAddress', 'contactName'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            task: { type: 'object' }
        }
    },

    permissions: ['tasks:write'],
    requiresApproval: true, // Require approval for task creation
    approvalType: 'standard',

    confirmationPrompt: (params) => {
        let prompt = `Create task: "${params.label}"`;
        if (params.dueDate) {
            const date = new Date(params.dueDate);
            prompt += ` due ${date.toLocaleDateString()}`;
        }
        return prompt + '?';
    },

    async execute(params: CreateTaskInput, context: ToolExecutionContext): Promise<ToolExecutionResult<CreateTaskOutput>> {
        if (!context.approvalConfirmed) {
            return {
                success: false,
                error: 'Task creation requires approval'
            };
        }

        try {
            const userId = context.userId;
            let { propertyId, contactId } = params;

            // 🧠 ZENA INTEL: Resolve property address
            if (!propertyId && params.propertyAddress) {
                const property = await prisma.property.findFirst({
                    where: { userId, address: { contains: params.propertyAddress, mode: 'insensitive' } }
                });
                if (property) propertyId = property.id;
            }

            // 🧠 ZENA INTEL: Resolve contact name
            if (!contactId && params.contactName) {
                const contact = await prisma.contact.findFirst({
                    where: { userId, name: { contains: params.contactName, mode: 'insensitive' } }
                });
                if (contact) contactId = contact.id;
            }

            // Create task with source = 'ai_suggested' for agent-created tasks
            const task = await prisma.task.create({
                data: {
                    userId,
                    label: params.label,
                    status: 'open',
                    source: 'ai_suggested',
                    dueDate: params.dueDate ? new Date(params.dueDate) : null,
                    dealId: params.dealId || null,
                    propertyId: propertyId || null,
                    contactId: contactId || null
                }
            });

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
                        propertyId: task.propertyId || undefined
                    }
                }
            };
        } catch (error) {
            console.error('[task.create] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create task'
            };
        }
    },

    auditLogFormat(input, output) {
        return {
            action: 'TASK_CREATE',
            summary: `Created task: "${input.label}"`,
            entityType: 'task',
            entityId: output.success && output.data ? output.data.task.id : undefined
        };
    }
};

toolRegistry.register(createTaskTool);
