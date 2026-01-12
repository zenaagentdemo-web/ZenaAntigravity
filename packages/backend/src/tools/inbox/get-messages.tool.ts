/**
 * Inbox: Get Messages Tool
 * 
 * Gets all messages in an email thread.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface GetMessagesInput {
    threadId: string;
}

interface GetMessagesOutput {
    success: boolean;
    messages: Array<{
        id: string;
        subject: string;
        from: string;
        snippet: string;
        receivedAt: string;
    }>;
}

export const getMessagesTool: ZenaToolDefinition<GetMessagesInput, GetMessagesOutput> = {
    name: 'inbox.get_messages',
    domain: 'inbox',
    description: 'Get all messages in an email thread',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread to get messages from'
            }
        },
        required: ['threadId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            messages: { type: 'array' }
        }
    },

    permissions: ['inbox:read'],
    requiresApproval: false,

    async execute(params: GetMessagesInput, context: ToolExecutionContext): Promise<ToolExecutionResult<GetMessagesOutput>> {
        try {
            const thread = await prisma.thread.findFirst({
                where: { id: params.threadId, userId: context.userId },
                include: {
                    messages: {
                        orderBy: { receivedAt: 'asc' }
                    }
                }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            return {
                success: true,
                data: {
                    success: true,
                    messages: thread.messages.map((m: any) => ({
                        id: m.id,
                        subject: m.subject,
                        from: m.from,
                        snippet: m.snippet || '',
                        receivedAt: m.receivedAt.toISOString()
                    }))
                }
            };
        } catch (error) {
            console.error('[inbox.get_messages] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get messages'
            };
        }
    },

    auditLogFormat(input, output) {
        const count = output.success && output.data ? output.data.messages.length : 0;
        return {
            action: 'INBOX_GET_MESSAGES',
            summary: `Retrieved ${count} messages from thread`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(getMessagesTool);
