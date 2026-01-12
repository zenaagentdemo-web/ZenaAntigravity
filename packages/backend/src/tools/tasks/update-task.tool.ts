/**
 * Task: Update Task Tool
 * 
 * Updates task fields.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { taskService } from '../../services/task.service.js';

interface UpdateTaskInput {
    taskId: string;
    label?: string;
    dueDate?: string;
    dealId?: string;
    propertyId?: string;
    contactId?: string;
}

interface UpdateTaskOutput {
    success: boolean;
    task: {
        id: string;
        label: string;
        status: string;
    };
}

export const updateTaskTool: ZenaToolDefinition<UpdateTaskInput, UpdateTaskOutput> = {
    name: 'task.update',
    domain: 'task',
    description: 'Update task label, due date, or linked entities',

    inputSchema: {
        type: 'object',
        properties: {
            taskId: {
                type: 'string',
                description: 'ID of the task to update (optional if taskLabel provided)'
            },
            taskLabel: {
                type: 'string',
                description: 'Label of the task to update (will resolve to ID)'
            },
            label: {
                type: 'string',
                description: 'New task label/description'
            },
            dueDate: {
                type: 'string',
                description: 'New due date (ISO format)'
            },
            dealId: {
                type: 'string',
                description: 'Link to a deal'
            },
            propertyId: {
                type: 'string',
                description: 'Link to a property'
            },
            contactId: {
                type: 'string',
                description: 'Link to a contact'
            },
            propertyAddress: {
                type: 'string',
                description: 'Resolve to propertyId'
            },
            contactName: {
                type: 'string',
                description: 'Resolve to contactId'
            }
        },
        required: []
    },

    recommendedFields: ['label', 'dueDate', 'dealId', 'propertyId', 'contactId', 'propertyAddress', 'contactName', 'taskLabel'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            task: { type: 'object' }
        }
    },

    permissions: ['tasks:write'],
    requiresApproval: false,

    async execute(params: UpdateTaskInput & { taskLabel?: string; propertyAddress?: string; contactName?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<UpdateTaskOutput>> {
        try {
            const userId = context.userId;
            let taskId = params.taskId;
            let propertyId = params.propertyId;
            let contactId = params.contactId;

            // 🧠 ZENA INTEL: Resolve task label
            if (!taskId && params.taskLabel) {
                const task = await taskService.getTasks(userId);
                const match = task.find(t => t.label.toLowerCase().includes(params.taskLabel!.toLowerCase()));
                if (match) taskId = match.id;
            }

            if (!taskId) return { success: false, error: 'Task ID or Label required' };

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

            const updates: any = {};
            if (params.label) updates.label = params.label;
            if (params.dueDate) updates.dueDate = new Date(params.dueDate);
            if (params.dealId !== undefined) updates.dealId = params.dealId || null;
            if (propertyId !== undefined) updates.propertyId = propertyId || null;
            if (contactId !== undefined) updates.contactId = contactId || null;

            const task = await taskService.updateTask(userId, taskId, updates);

            return {
                success: true,
                data: {
                    success: true,
                    task: {
                        id: task.id,
                        label: task.label,
                        status: task.status
                    }
                }
            };
        } catch (error) {
            console.error('[task.update] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update task'
            };
        }
    },

    auditLogFormat(input: UpdateTaskInput, _output: ToolExecutionResult<UpdateTaskOutput>) {
        return {
            action: 'TASK_UPDATE',
            summary: `Updated task ${input.taskId}`,
            entityType: 'task',
            entityId: input.taskId
        };
    }
};

toolRegistry.register(updateTaskTool);
