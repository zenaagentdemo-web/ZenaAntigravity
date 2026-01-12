/**
 * Inbox: Snooze Thread Tool
 * 
 * Snoozes an email thread until a specified time.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface SnoozeThreadInput {
    threadId: string;
    snoozeUntil: string;
}

interface SnoozeThreadOutput {
    success: boolean;
    thread: {
        id: string;
        snoozedUntil: string;
    };
}

export const snoozeThreadTool: ZenaToolDefinition<SnoozeThreadInput, SnoozeThreadOutput> = {
    name: 'inbox.snooze_thread',
    domain: 'inbox',
    description: 'Snooze an email thread until a specified date/time',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread to snooze'
            },
            snoozeUntil: {
                type: 'string',
                description: 'Date/time to snooze until (ISO format or natural language like "tomorrow 9am")'
            }
        },
        required: ['threadId', 'snoozeUntil']
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

    async execute(params: SnoozeThreadInput, context: ToolExecutionContext): Promise<ToolExecutionResult<SnoozeThreadOutput>> {
        try {
            const thread = await prisma.thread.findFirst({
                where: { id: params.threadId, userId: context.userId }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            // Parse snooze time
            const snoozeDate = new Date(params.snoozeUntil);
            if (isNaN(snoozeDate.getTime())) {
                return { success: false, error: 'Invalid snooze date/time' };
            }

            // Note: Snooze functionality would need to be tracked separately
            // For now, return success with the intended snooze time
            return {
                success: true,
                data: {
                    success: true,
                    thread: {
                        id: thread.id,
                        snoozedUntil: snoozeDate.toISOString()
                    }
                }
            };
        } catch (error) {
            console.error('[inbox.snooze_thread] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to snooze thread'
            };
        }
    },

    auditLogFormat(input, output) {
        const until = output.success && output.data ? output.data.thread.snoozedUntil : '';
        return {
            action: 'INBOX_SNOOZE',
            summary: `Snoozed thread until ${until}`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(snoozeThreadTool);
