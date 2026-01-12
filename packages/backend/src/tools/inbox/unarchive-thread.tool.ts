/**
 * Inbox: Unarchive Thread Tool
 * 
 * Restores an archived thread back to focus/new mail.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface UnarchiveThreadInput {
    threadId: string;
    restoreTo?: 'new_mail' | 'awaiting';
}

interface UnarchiveThreadOutput {
    success: boolean;
    threadId: string;
    restoredTo: string;
}

export const unarchiveThreadTool: ZenaToolDefinition<UnarchiveThreadInput, UnarchiveThreadOutput> = {
    name: 'inbox.unarchive_thread',
    domain: 'inbox',
    description: 'Restore an archived thread back to New Mail or Awaiting tab',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'The ID of the thread to unarchive'
            },
            restoreTo: {
                type: 'string',
                enum: ['new_mail', 'awaiting'],
                description: 'Which tab to restore the thread to. Defaults to new_mail.',
                default: 'new_mail'
            }
        },
        required: ['threadId']
    },

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            threadId: { type: 'string' },
            restoredTo: { type: 'string' }
        }
    },

    permissions: ['email:write'],
    requiresApproval: false,

    async execute(params: UnarchiveThreadInput, context: ToolExecutionContext): Promise<ToolExecutionResult<UnarchiveThreadOutput>> {
        try {
            const thread = await prisma.thread.findFirst({
                where: {
                    id: params.threadId,
                    userId: context.userId
                }
            });

            if (!thread) {
                return {
                    success: false,
                    error: 'Thread not found'
                };
            }

            // Map tab name to category
            const category = params.restoreTo === 'awaiting' ? 'waiting' : 'focus';

            await prisma.thread.update({
                where: { id: params.threadId },
                data: { category }
            });

            return {
                success: true,
                data: {
                    success: true,
                    threadId: params.threadId,
                    restoredTo: params.restoreTo || 'new_mail'
                }
            };
        } catch (error) {
            console.error('[inbox.unarchive_thread] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unarchive thread'
            };
        }
    },

    auditLogFormat(input, _output) {
        return {
            action: 'INBOX_UNARCHIVE',
            summary: `Restored thread ${input.threadId} to ${input.restoreTo || 'new_mail'}`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(unarchiveThreadTool);
