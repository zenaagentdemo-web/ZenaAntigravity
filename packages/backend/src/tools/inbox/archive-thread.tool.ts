/**
 * Inbox: Archive Thread Tool
 * 
 * Archives a thread (moves to archived state, reversible).
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import prisma from '../../config/database.js';

interface ArchiveThreadInput {
    threadId: string;
}

interface ArchiveThreadOutput {
    success: boolean;
    threadId: string;
    previousCategory: string;
}

export const archiveThreadTool: ZenaToolDefinition<ArchiveThreadInput, ArchiveThreadOutput> = {
    name: 'inbox.archive_thread',
    domain: 'inbox',
    description: 'Archive an email thread. This is reversible - the thread can be unarchived later.',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'The ID of the thread to archive (optional if threadSubject provided)'
            },
            threadSubject: {
                type: 'string',
                description: 'The subject of the thread to archive (will resolve to ID)'
            }
        },
        required: []
    },

    recommendedFields: ['threadId', 'threadSubject'],

    outputSchema: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            threadId: { type: 'string' },
            previousCategory: { type: 'string' }
        }
    },

    permissions: ['email:write'],
    requiresApproval: false,  // Archive is reversible, no approval needed

    async execute(params: ArchiveThreadInput & { threadSubject?: string }, context: ToolExecutionContext): Promise<ToolExecutionResult<ArchiveThreadOutput>> {
        try {
            const userId = context.userId;
            let threadId = params.threadId;

            // 🧠 ZENA INTEL: Resolve thread subject
            if (!threadId && params.threadSubject) {
                const thread = await prisma.thread.findFirst({
                    where: { userId, subject: { contains: params.threadSubject, mode: 'insensitive' } }
                });
                if (thread) threadId = thread.id;
            }

            if (!threadId) return { success: false, error: 'Thread ID or Subject required' };

            // Get current state first
            const thread = await prisma.thread.findFirst({
                where: {
                    id: threadId,
                    userId
                }
            });

            if (!thread) {
                return {
                    success: false,
                    error: 'Thread not found'
                };
            }

            const previousCategory = thread.category;

            // Archive the thread by changing category to 'archived'
            // Note: The schema may not have 'archived' as a valid category,
            // so we might need to use a different approach
            await prisma.thread.update({
                where: { id: params.threadId },
                data: {
                    category: 'archived'
                }
            });

            return {
                success: true,
                data: {
                    success: true,
                    threadId: params.threadId,
                    previousCategory
                }
            };
        } catch (error) {
            console.error('[inbox.archive_thread] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to archive thread'
            };
        }
    },

    // Rollback: unarchive the thread
    async rollback(params: ArchiveThreadInput, _context: ToolExecutionContext): Promise<void> {
        try {
            await prisma.thread.update({
                where: { id: params.threadId },
                data: {
                    category: 'focus'
                }
            });
        } catch (error) {
            console.error('[inbox.archive_thread] Rollback failed:', error);
        }
    },

    auditLogFormat(input, _output) {
        return {
            action: 'INBOX_ARCHIVE',
            summary: `Archived thread ${input.threadId}`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

// Auto-register
toolRegistry.register(archiveThreadTool);
