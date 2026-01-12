/**
 * Inbox: Classify Thread Tool
 * 
 * Triggers AI classification for an email thread.
 */

import { ZenaToolDefinition, ToolExecutionContext, ToolExecutionResult } from '../types.js';
import { toolRegistry } from '../registry.js';
import { aiProcessingService } from '../../services/ai-processing.service.js';
import prisma from '../../config/database.js';

interface ClassifyThreadInput {
    threadId: string;
}

interface ClassifyThreadOutput {
    success: boolean;
    thread: {
        id: string;
        category: string;
        actionCategory: string;
    };
}

export const classifyThreadTool: ZenaToolDefinition<ClassifyThreadInput, ClassifyThreadOutput> = {
    name: 'inbox.classify_thread',
    domain: 'inbox',
    description: 'Trigger AI classification for an email thread (Buyer/Vendor/Focus/Waiting)',

    inputSchema: {
        type: 'object',
        properties: {
            threadId: {
                type: 'string',
                description: 'ID of the thread to classify'
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

    async execute(params: ClassifyThreadInput, context: ToolExecutionContext): Promise<ToolExecutionResult<ClassifyThreadOutput>> {
        try {
            const thread = await prisma.thread.findFirst({
                where: { id: params.threadId, userId: context.userId }
            });

            if (!thread) {
                return { success: false, error: 'Thread not found' };
            }

            // Trigger AI classification
            await aiProcessingService.classifyThread({ id: params.threadId } as any);

            // Fetch updated thread
            const updated = await prisma.thread.findUnique({
                where: { id: params.threadId }
            });

            return {
                success: true,
                data: {
                    success: true,
                    thread: {
                        id: updated!.id,
                        category: updated!.classification || 'unknown',
                        actionCategory: updated!.category || 'unknown'
                    }
                }
            };
        } catch (error) {
            console.error('[inbox.classify_thread] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to classify thread'
            };
        }
    },

    auditLogFormat(input, output) {
        const category = output.success && output.data ? output.data.thread.category : '';
        return {
            action: 'INBOX_CLASSIFY',
            summary: `Classified thread as ${category}`,
            entityType: 'thread',
            entityId: input.threadId
        };
    }
};

toolRegistry.register(classifyThreadTool);
