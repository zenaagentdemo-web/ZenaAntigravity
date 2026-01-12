/**
 * Inbox: Move to Awaiting Tool
 * 
 * Moves an email thread to the Waiting category.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface MoveToAwaitingInput {
    threadId: string;
}

interface MoveToAwaitingOutput {
    success: boolean;
    thread: {
        id: string;
        actionCategory: string;
    };
}

export const moveToAwaitingTool: ZenaToolDefinition<MoveToAwaitingInput, MoveToAwaitingOutput> = {
    name: 'inbox.move_to_awaiting',
    domain: 'inbox',
    description: 'Move an email thread to the Waiting category',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread to move'
            }
        },
        required: ['threadId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            thread: { type: 'object' }
        }
    },

    permissions: ['inbox:write'],
    requiresApproval: false,

    async execute(params: MoveToAwaitingInput, context: ToolExecutionContext): Promise<ToolExecutionResult<MoveToAwaitingOutput>> {
        try {
            const thread = await prisma.thread.findFirst({
                where: { id: params.threadId, userId: context.userId }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            const updated = await prisma.thread.update({
                where: { id: params.threadId },
                data: { category: 'waiting' }
            });

            return {
                success: true,
                data: {
                    success: true,
                    thread: {
                        id: updated.id,
                        actionCategory: updated.category || 'waiting'
                    }
                }
            };
        } catch (error) {
            console.error('[inbox.move_to_awaiting] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to move thread'
            };
        }
    },

    auditLogFormat(input: MoveToAwaitingInput, _output: ToolExecutionResult<MoveToAwaitingOutput>) {
        return {
            action: 'INBOX_MOVE_AWAITING',
            summary: 'Moved thread to Waiting',
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(moveToAwaitingTool);
